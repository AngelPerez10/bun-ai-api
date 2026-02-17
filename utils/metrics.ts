interface ServiceMetrics {
  requests: number;
  errors: number;
  totalDuration: number;
  lastUsed: string | null;
}

class MetricsCollector {
  private metrics: Map<string, ServiceMetrics> = new Map();
  private startTime: Date = new Date();

  recordRequest(serviceName: string, duration: number, success: boolean) {
    if (!this.metrics.has(serviceName)) {
      this.metrics.set(serviceName, {
        requests: 0,
        errors: 0,
        totalDuration: 0,
        lastUsed: null,
      });
    }

    const metric = this.metrics.get(serviceName)!;
    metric.requests++;
    metric.totalDuration += duration;
    metric.lastUsed = new Date().toISOString();

    if (!success) {
      metric.errors++;
    }
  }

  getMetrics() {
    const services: Record<string, any> = {};

    for (const [name, metric] of this.metrics.entries()) {
      services[name] = {
        requests: metric.requests,
        errors: metric.errors,
        avgDuration: metric.requests > 0 ? Math.round(metric.totalDuration / metric.requests) : 0,
        lastUsed: metric.lastUsed,
        successRate: metric.requests > 0 
          ? `${(((metric.requests - metric.errors) / metric.requests) * 100).toFixed(2)}%`
          : '0%',
      };
    }

    return {
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      totalRequests: Array.from(this.metrics.values()).reduce((sum, m) => sum + m.requests, 0),
      services,
    };
  }

  reset() {
    this.metrics.clear();
    this.startTime = new Date();
  }
}

export const metrics = new MetricsCollector();
