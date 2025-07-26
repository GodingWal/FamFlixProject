import { ENV } from './environment';

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = ENV.ENABLE_PERFORMANCE_MONITORING;
    
    if (this.isEnabled) {
      this.setupPerformanceObservers();
    }
  }

  private setupPerformanceObservers() {
    // Monitor Core Web Vitals
    this.observeWebVitals();
    
    // Monitor resource loading
    this.observeResources();
    
    // Monitor navigation timing
    this.observeNavigation();
  }

  private observeWebVitals() {
    // First Input Delay (FID)
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const firstInputEntry = entry as PerformanceEventTiming;
        this.recordMetric('fid', firstInputEntry.processingStart - firstInputEntry.startTime);
      }
    }).observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift (CLS)
    new PerformanceObserver((list) => {
      let clsValue = 0;
      for (const entry of list.getEntries()) {
        const layoutShiftEntry = entry as any; // Use any for LayoutShift since it's not available in all TypeScript versions
        if (!layoutShiftEntry.hadRecentInput) {
          clsValue += layoutShiftEntry.value;
        }
      }
      if (clsValue > 0) {
        this.recordMetric('cls', clsValue);
      }
    }).observe({ entryTypes: ['layout-shift'] });
  }

  private observeResources() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resourceEntry = entry as PerformanceResourceTiming;
        
        this.recordMetric('resource_load_time', resourceEntry.responseEnd - resourceEntry.requestStart, {
          resource_type: resourceEntry.initiatorType,
          resource_name: resourceEntry.name.split('/').pop() || 'unknown',
        });
      }
    }).observe({ entryTypes: ['resource'] });
  }

  private observeNavigation() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const navEntry = entry as PerformanceNavigationTiming;
        
        this.recordMetric('page_load_time', navEntry.loadEventEnd - navEntry.fetchStart);
        this.recordMetric('dom_content_loaded', navEntry.domContentLoadedEventEnd - navEntry.fetchStart);
        this.recordMetric('time_to_first_byte', navEntry.responseStart - navEntry.fetchStart);
      }
    }).observe({ entryTypes: ['navigation'] });
  }

  public recordMetric(name: string, value: number, tags?: Record<string, string>) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Log slow operations in development
    if (ENV.DEV) {
      if (name === 'fcp' && value > 2500) {
        console.warn(`Slow FCP: ${value}ms`);
      }
      if (name === 'lcp' && value > 4000) {
        console.warn(`Slow LCP: ${value}ms`);
      }
      if (name === 'fid' && value > 100) {
        console.warn(`High FID: ${value}ms`);
      }
    }

    // Send metrics in batches
    if (this.metrics.length >= 10) {
      this.sendMetrics();
    }
  }

  public recordUserInteraction(action: string, duration?: number) {
    this.recordMetric('user_interaction', duration || 0, {
      action,
      page: window.location.pathname,
    });
  }

  public recordAPICall(endpoint: string, duration: number, status: number) {
    this.recordMetric('api_call', duration, {
      endpoint,
      status: status.toString(),
    });
  }

  private async sendMetrics() {
    if (!this.isEnabled || this.metrics.length === 0) return;

    try {
      await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          metrics: this.metrics,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      this.metrics = [];
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public flush() {
    this.sendMetrics();
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Send remaining metrics before page unload
window.addEventListener('beforeunload', () => {
  performanceMonitor.flush();
});