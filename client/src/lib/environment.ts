// Environment configuration and validation
export const ENV = {
  // API Configuration
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  
  // Feature Flags
  ENABLE_ANALYTICS: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  ENABLE_ERROR_REPORTING: import.meta.env.VITE_ENABLE_ERROR_REPORTING === 'true',
  ENABLE_PERFORMANCE_MONITORING: import.meta.env.VITE_ENABLE_PERFORMANCE_MONITORING === 'true',
  
  // External Services
  STRIPE_PUBLIC_KEY: import.meta.env.VITE_STRIPE_PUBLIC_KEY || '',
  
  // Environment Info
  NODE_ENV: import.meta.env.NODE_ENV || 'development',
  DEV: import.meta.env.DEV,
  PROD: import.meta.env.PROD,
  
  // App Info
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  BUILD_TIME: import.meta.env.VITE_BUILD_TIME || new Date().toISOString(),
} as const;

// Environment validation
export function validateEnvironment() {
  const requiredEnvVars: (keyof typeof ENV)[] = [];
  
  if (ENV.PROD) {
    requiredEnvVars.push('STRIPE_PUBLIC_KEY');
  }
  
  const missing = requiredEnvVars.filter(key => !ENV[key]);
  
  if (missing.length > 0) {
    console.warn('Missing required environment variables:', missing);
  }
  
  return missing.length === 0;
}

// Development helpers
export const isDevelopment = ENV.DEV;
export const isProduction = ENV.PROD;
export const enableDevTools = isDevelopment && typeof window !== 'undefined';