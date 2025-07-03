import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  connectionType?: string;
}

export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0
  });

  useEffect(() => {
    // Measure page load time
    const loadTime = performance.now();
    
    // Measure render time
    const renderStart = performance.now();
    
    requestAnimationFrame(() => {
      const renderEnd = performance.now();
      
      setMetrics(prev => ({
        ...prev,
        loadTime,
        renderTime: renderEnd - renderStart,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
        connectionType: (navigator as any).connection?.effectiveType
      }));
    });

    // Log slow renders in development
    if (process.env.NODE_ENV === 'development') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 16) { // >16ms indicates dropped frame
            console.warn(`Slow render detected: ${entry.name} took ${entry.duration}ms`);
          }
        }
      });
      
      if ('observe' in observer) {
        observer.observe({ entryTypes: ['measure'] });
      }
      
      return () => observer.disconnect();
    }
  }, []);

  const logInteraction = (action: string, duration?: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`User interaction: ${action}${duration ? ` (${duration}ms)` : ''}`);
    }
  };

  return { metrics, logInteraction };
}