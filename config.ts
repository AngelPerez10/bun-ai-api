export const config = {
  port: process.env.PORT ?? 3000,
  
  // Timeouts en milisegundos
  requestTimeout: 60000, // 60 segundos
  
  // Límites
  maxMessagesPerRequest: 50,
  maxMessageLength: 10000,
  
  // Autenticación
  requireAuth: process.env.REQUIRE_AUTH === 'true',
  masterApiKey: process.env.MASTER_API_KEY,
  publicApiKeys: process.env.PUBLIC_API_KEYS?.split(',').filter(k => k.trim()) ?? [],
  
  // Rate Limiting
  rateLimitEnabled: process.env.RATE_LIMIT_ENABLED !== 'false',
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '10'),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  
  // Servicios requeridos
  requiredEnvVars: [
    'GROQ_API_KEY',
    'CEREBRAS_API_KEY',
    'OPENROUTER_API_KEY',
    'GEMINI_API_KEY',
    'HF_TOKEN',
  ] as const,
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') ?? ['*'],
} as const;

export function validateEnv(): { valid: boolean; missing: string[]; warnings: string[] } {
  const missing: string[] = [];
  const warnings: string[] = [];
  
  for (const envVar of config.requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }
  
  if (config.requireAuth && !config.masterApiKey) {
    warnings.push('REQUIRE_AUTH is true but MASTER_API_KEY is not set');
  }
  
  if (config.requireAuth && config.publicApiKeys.length === 0) {
    warnings.push('REQUIRE_AUTH is true but no PUBLIC_API_KEYS configured');
  }
  
  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}
