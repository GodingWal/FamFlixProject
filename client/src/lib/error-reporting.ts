import { ENV } from './environment';

export interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  userAgent: string;
  timestamp: string;
  userId?: number;
  sessionId?: string;
  additionalData?: Record<string, any>;
}

class ErrorReporter {
  private isEnabled: boolean;
  private sessionId: string;

  constructor() {
    this.isEnabled = ENV.ENABLE_ERROR_REPORTING && ENV.PROD;
    this.sessionId = this.generateSessionId();
    
    if (this.isEnabled) {
      this.setupGlobalErrorHandlers();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandlers() {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        additionalData: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
        },
      });
    });

    // Handle Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: event.reason?.message || 'Unhandled Promise Rejection',
        stack: event.reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId,
        additionalData: {
          reason: event.reason,
        },
      });
    });
  }

  public reportError(errorReport: ErrorReport) {
    if (!this.isEnabled) {
      console.error('Error:', errorReport);
      return;
    }

    // In production, send to error reporting service
    console.error('Error reported:', errorReport);
    
    // Here you would send to your error reporting service
    // For example: Sentry, LogRocket, or custom endpoint
    this.sendToErrorService(errorReport);
  }

  private async sendToErrorService(errorReport: ErrorReport) {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorReport),
      });
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  public reportUserError(message: string, additionalData?: Record<string, any>) {
    this.reportError({
      message,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      additionalData,
    });
  }
}

export const errorReporter = new ErrorReporter();