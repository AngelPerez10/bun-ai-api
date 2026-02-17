import { logger } from './logger';

interface ApiKey {
  key: string;
  name: string;
  createdAt: string;
  lastUsed: string | null;
  requestCount: number;
  enabled: boolean;
}

class ApiKeyManager {
  private keys: Map<string, ApiKey> = new Map();
  private masterKey: string;

  constructor() {
    this.masterKey = process.env.MASTER_API_KEY || this.generateKey();
    
    if (!process.env.MASTER_API_KEY) {
      logger.warn('MASTER_API_KEY not set, generated temporary key');
    }

    const publicKeys = process.env.PUBLIC_API_KEYS?.split(',').filter(k => k.trim());
    if (publicKeys && publicKeys.length > 0) {
      publicKeys.forEach((key, index) => {
        this.keys.set(key.trim(), {
          key: key.trim(),
          name: `Public Key ${index + 1}`,
          createdAt: new Date().toISOString(),
          lastUsed: null,
          requestCount: 0,
          enabled: true,
        });
      });
      logger.info('Loaded public API keys', { count: publicKeys.length });
    }
  }

  generateKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = 'sk_';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }

  createKey(name: string, masterKey: string): { success: boolean; key?: string; error?: string } {
    if (masterKey !== this.masterKey) {
      return { success: false, error: 'Invalid master key' };
    }

    const newKey = this.generateKey();
    this.keys.set(newKey, {
      key: newKey,
      name,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      requestCount: 0,
      enabled: true,
    });

    logger.info('API key created', { name, key: newKey.substring(0, 10) + '...' });
    return { success: true, key: newKey };
  }

  validateKey(key: string): { valid: boolean; keyData?: ApiKey } {
    const keyData = this.keys.get(key);
    
    if (!keyData) {
      return { valid: false };
    }

    if (!keyData.enabled) {
      return { valid: false };
    }

    keyData.lastUsed = new Date().toISOString();
    keyData.requestCount++;

    return { valid: true, keyData };
  }

  listKeys(masterKey: string): { success: boolean; keys?: any[]; error?: string } {
    if (masterKey !== this.masterKey) {
      return { success: false, error: 'Invalid master key' };
    }

    const keysList = Array.from(this.keys.values()).map(k => ({
      key: k.key.substring(0, 10) + '...',
      name: k.name,
      createdAt: k.createdAt,
      lastUsed: k.lastUsed,
      requestCount: k.requestCount,
      enabled: k.enabled,
    }));

    return { success: true, keys: keysList };
  }

  revokeKey(key: string, masterKey: string): { success: boolean; error?: string } {
    if (masterKey !== this.masterKey) {
      return { success: false, error: 'Invalid master key' };
    }

    const keyData = this.keys.get(key);
    if (!keyData) {
      return { success: false, error: 'Key not found' };
    }

    keyData.enabled = false;
    logger.info('API key revoked', { key: key.substring(0, 10) + '...' });
    return { success: true };
  }

  getMasterKey(): string {
    return this.masterKey;
  }
}

export const apiKeyManager = new ApiKeyManager();

export function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.get('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  const apiKeyHeader = req.headers.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  return null;
}
