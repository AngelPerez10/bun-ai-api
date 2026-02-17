import { logger } from './logger';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor() {
    this.maxRequests = parseInt(process.env.RATE_LIMIT_MAX || '100');
    this.windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000');
    
    setInterval(() => this.cleanup(), 60000);
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    let entry = this.limits.get(identifier);

    if (!entry || now > entry.resetAt) {
      entry = {
        count: 0,
        resetAt: now + this.windowMs,
      };
      this.limits.set(identifier, entry);
    }

    if (entry.count >= this.maxRequests) {
      logger.warn('Rate limit exceeded', { 
        identifier: identifier.substring(0, 10) + '...',
        count: entry.count,
        max: this.maxRequests 
      });
      
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    entry.count++;

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key);
      }
    }
  }

  getStats(identifier: string): { count: number; limit: number; resetAt: number | null } {
    const entry = this.limits.get(identifier);
    
    if (!entry || Date.now() > entry.resetAt) {
      return {
        count: 0,
        limit: this.maxRequests,
        resetAt: null,
      };
    }

    return {
      count: entry.count,
      limit: this.maxRequests,
      resetAt: entry.resetAt,
    };
  }
}

export const rateLimiter = new RateLimiter();
