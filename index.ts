import { groqService } from './services/groq';
import { cerebrasService } from './services/cerebras';
import { openrouterService } from './services/openrouter';
import { geminiService } from './services/gemini';
import { huggingfaceService } from './services/huggingface';
import type { AIService, ChatMessage } from './types';
import { config, validateEnv } from './config';
import { logger } from './utils/logger';
import { validateChatRequest, ValidationError } from './utils/validation';
import { metrics } from './utils/metrics';
import { apiKeyManager, extractApiKey } from './utils/auth';
import { rateLimiter } from './utils/ratelimit';

const services: AIService[] = [
  groqService,
  cerebrasService,
  openrouterService,
  geminiService,
  huggingfaceService,
];
let currentServiceIndex = 0;

function getNextService(): AIService {
  const service = services[currentServiceIndex];
  currentServiceIndex = (currentServiceIndex + 1) % services.length;
  return service!;
}

function setCorsHeaders(req: Request, headers: Record<string, string>) {
  const requestOrigin = req.headers.get('origin');
  const allowedOrigins = config.corsOrigins;
  const hasWildcard = allowedOrigins.includes('*');

  if (hasWildcard) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
    headers['Vary'] = 'Origin';
  } else {
    headers['Access-Control-Allow-Origin'] = allowedOrigins[0] ?? '*';
  }

  headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-API-Key';
  return headers;
}

function createErrorResponse(req: Request, message: string, status: number = 500) {
  return new Response(
    JSON.stringify({ error: message, status }),
    { 
      status, 
      headers: setCorsHeaders(req, { 'Content-Type': 'application/json' })
    }
  );
}

// Validar variables de entorno al inicio
const envCheck = validateEnv();
if (!envCheck.valid) {
  logger.warn('Missing environment variables', { missing: envCheck.missing });
  logger.info('API will start but some services may fail');
}
if (envCheck.warnings.length > 0) {
  envCheck.warnings.forEach(warning => logger.warn(warning));
}

if (config.requireAuth) {
  logger.info('Authentication enabled', { 
    masterKey: apiKeyManager.getMasterKey().substring(0, 10) + '...',
    publicKeysCount: config.publicApiKeys.length
  });
} else {
  logger.warn('Authentication is DISABLED - API is public without auth');
}

const server = Bun.serve({
  port: config.port,
  async fetch(req: Request) {
    const { pathname } = new URL(req.url);
    const startTime = Date.now();

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: setCorsHeaders(req, {}),
      });
    }

    // Health check endpoint
    if (req.method === 'GET' && pathname === '/health') {
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          services: services.map(s => s.name),
          authEnabled: config.requireAuth,
          rateLimitEnabled: config.rateLimitEnabled,
          timestamp: new Date().toISOString(),
        }),
        { 
          headers: setCorsHeaders(req, { 'Content-Type': 'application/json' })
        }
      );
    }

    // Metrics endpoint
    if (req.method === 'GET' && pathname === '/metrics') {
      if (config.requireAuth) {
        const masterKey = extractApiKey(req);
        if (!masterKey || masterKey !== apiKeyManager.getMasterKey()) {
          return createErrorResponse(req, 'Master API key required', 401);
        }
      }

      return new Response(
        JSON.stringify(metrics.getMetrics()),
        { 
          headers: setCorsHeaders(req, { 'Content-Type': 'application/json' })
        }
      );
    }

    // API Key management endpoints (require master key)
    if (pathname === '/admin/keys') {
      const masterKey = extractApiKey(req);
      
      if (!masterKey) {
        return createErrorResponse(req, 'Master API key required', 401);
      }

      if (req.method === 'POST') {
        try {
          const body = await req.json();
          const result = apiKeyManager.createKey(body.name || 'Unnamed Key', masterKey);
          
          if (!result.success) {
            return createErrorResponse(req, result.error || 'Failed to create key', 403);
          }
          
          return new Response(
            JSON.stringify({ success: true, apiKey: result.key }),
            { headers: setCorsHeaders(req, { 'Content-Type': 'application/json' }) }
          );
        } catch (err) {
          return createErrorResponse(req, 'Invalid request body', 400);
        }
      }

      if (req.method === 'GET') {
        const result = apiKeyManager.listKeys(masterKey);
        
        if (!result.success) {
          return createErrorResponse(req, result.error || 'Failed to list keys', 403);
        }
        
        return new Response(
          JSON.stringify({ success: true, keys: result.keys }),
          { headers: setCorsHeaders(req, { 'Content-Type': 'application/json' }) }
        );
      }

      if (req.method === 'DELETE') {
        try {
          const body = await req.json();
          const result = apiKeyManager.revokeKey(body.key, masterKey);
          
          if (!result.success) {
            return createErrorResponse(req, result.error || 'Failed to revoke key', 403);
          }
          
          return new Response(
            JSON.stringify({ success: true }),
            { headers: setCorsHeaders(req, { 'Content-Type': 'application/json' }) }
          );
        } catch (err) {
          return createErrorResponse(req, 'Invalid request body', 400);
        }
      }
    }

    // Chat endpoint
    if (req.method === 'POST' && pathname === '/chat') {
      try {
        // Autenticación
        if (config.requireAuth) {
          const apiKey = extractApiKey(req);
          
          if (!apiKey) {
            return createErrorResponse(req, 'API key required. Use Authorization: Bearer YOUR_KEY or X-API-Key header', 401);
          }
          
          const { valid, keyData } = apiKeyManager.validateKey(apiKey);
          
          if (!valid) {
            return createErrorResponse(req, 'Invalid or disabled API key', 403);
          }
          
          logger.debug('API key validated', { 
            key: apiKey.substring(0, 10) + '...',
            name: keyData?.name 
          });
        }
        
        // Rate limiting
        if (config.rateLimitEnabled) {
          const identifier = extractApiKey(req) || req.headers.get('x-forwarded-for') || 'anonymous';
          const rateLimit = rateLimiter.check(identifier);
          
          if (!rateLimit.allowed) {
            const resetDate = new Date(rateLimit.resetAt).toISOString();
            return new Response(
              JSON.stringify({ 
                error: 'Rate limit exceeded',
                resetAt: resetDate,
                status: 429
              }),
              { 
                status: 429,
                headers: setCorsHeaders(req, {
                  'Content-Type': 'application/json',
                  'X-RateLimit-Limit': config.rateLimitMax.toString(),
                  'X-RateLimit-Remaining': '0',
                  'X-RateLimit-Reset': resetDate,
                })
              }
            );
          }
        }
        
        // Validar request
        let body: any;
        try {
          const raw = await req.text();
          if (!raw) {
            logger.warn('Empty request body', {
              contentType: req.headers.get('content-type')
            });
            return createErrorResponse(req, 'Request body is required', 400);
          }
          body = JSON.parse(raw);
        } catch (err) {
          logger.warn('Invalid JSON body', {
            error: err instanceof Error ? err.message : String(err),
            contentType: req.headers.get('content-type'),
            bodyLength: (() => {
              try {
                return (req as any).__rawBodyLength ?? null;
              } catch {
                return null;
              }
            })()
          });
          return createErrorResponse(req, 'Invalid JSON body', 400);
        }
        const { messages } = validateChatRequest(body);

        logger.info('Chat request received', { 
          service: 'auto',
          messageCount: messages.length 
        });

        const failures: { service: string; error: string }[] = [];
        const maxAttempts = services.length;
        let stream: AsyncIterable<string> | null = null;
        let selectedServiceName = '';

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const service = getNextService();
          selectedServiceName = service.name;
          try {
            stream = await service.chat(messages);
            if (!stream) {
              throw new Error('Service returned no stream');
            }
            break;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            failures.push({ service: service.name, error: msg });
            logger.warn('Service failed, trying next', { service: service.name, error: msg });
          }
        }

        if (!stream) {
          const details = failures.map(f => `${f.service}: ${f.error}`).join(' | ');
          throw new Error(`All providers failed. ${details}`);
        }

        const textEncoder = new TextEncoder();
        const readableStream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              for await (const chunk of stream) {
                const ssePayload = chunk
                  .split('\n')
                  .map(line => `data: ${line}`)
                  .join('\n') + '\n\n';
                controller.enqueue(textEncoder.encode(ssePayload));
              }
              controller.close();
              
              const duration = Date.now() - startTime;
              metrics.recordRequest(selectedServiceName, duration, true);
              logger.info('Chat request completed', { 
                service: selectedServiceName,
                duration: `${duration}ms`
              });
            } catch (err) {
              const duration = Date.now() - startTime;
              metrics.recordRequest(selectedServiceName, duration, false);
              logger.error('Stream error', { 
                service: selectedServiceName,
                error: err instanceof Error ? err.message : String(err)
              });
              controller.error(err);
            }
          },
        });

        return new Response(readableStream, {
          headers: setCorsHeaders(req, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          }),
        });
      } catch (err) {
        const duration = Date.now() - startTime;
        
        if (err instanceof ValidationError) {
          logger.warn('Validation error', { error: err.message });
          return createErrorResponse(req, err.message, 400);
        }
        
        logger.error('Chat request failed', { 
          error: err instanceof Error ? err.message : String(err)
        });
        return createErrorResponse(req, 'Internal server error', 500);
      }
    }

    return createErrorResponse(req, 'Not found', 404);
  }
})

logger.info('Server started', { 
  url: server.url.toString(),
  services: services.map(s => s.name),
  port: config.port
});