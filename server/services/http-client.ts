import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { log } from '../vite';

export interface HttpClientOptions {
  baseURL?: string;
  timeoutMs?: number;
  requestId?: string;
  headers?: Record<string, string>;
}

export interface RetryOptions {
  retries?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: AxiosError | Error) => boolean;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function expBackoffDelay(attempt: number, min: number, max: number): number {
  const base = Math.min(max, min * Math.pow(2, attempt));
  const jitter = Math.random() * 0.2 * base; // 0-20% jitter
  return Math.round(base + jitter);
}

export function createHttpClient(options: HttpClientOptions = {}): AxiosInstance {
  const instance = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeoutMs ?? 15000,
    headers: {
      'X-Client': 'famflix-server',
      ...(options.requestId ? { 'X-Request-Id': options.requestId } : {}),
      ...options.headers,
    },
    // Avoid proxy issues in some environments
    proxy: false,
  });

  instance.interceptors.request.use((config) => {
    const start = Date.now();
    (config as any)._startTime = start;
    log(`HTTP ${config.method?.toUpperCase()} ${config.baseURL || ''}${config.url}`, 'http');
    return config;
  });

  instance.interceptors.response.use(
    (response) => {
      const start = (response.config as any)._startTime as number | undefined;
      const duration = start ? `${Date.now() - start}ms` : 'unknown';
      log(`HTTP ${response.status} ${response.config.method?.toUpperCase()} ${response.config.baseURL || ''}${response.config.url} in ${duration}`, 'http');
      return response;
    },
    (error: AxiosError) => {
      const cfg = error.config || {} as AxiosRequestConfig;
      const start = (cfg as any)._startTime as number | undefined;
      const duration = start ? `${Date.now() - start}ms` : 'unknown';
      const target = `${cfg.baseURL || ''}${cfg.url || ''}`;
      log(`HTTP ERROR ${error.response?.status || 'network'} ${cfg.method?.toUpperCase()} ${target} in ${duration}: ${error.message}`, 'http');
      return Promise.reject(error);
    }
  );

  return instance;
}

export async function requestWithRetry<T>(
  client: AxiosInstance,
  config: AxiosRequestConfig,
  retryOptions: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    minDelayMs = 250,
    maxDelayMs = 2000,
    shouldRetry = (err: AxiosError | Error) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        return !status || status >= 500 || status === 429;
      }
      return true;
    },
  } = retryOptions;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const resp = await client.request<T>(config);
      return resp.data as any;
    } catch (err: any) {
      if (attempt >= retries || !shouldRetry(err)) {
        throw err;
      }
      const delay = expBackoffDelay(attempt, minDelayMs, maxDelayMs);
      log(`Retrying request in ${delay}ms (attempt ${attempt + 1}/${retries})`, 'http');
      await sleep(delay);
      attempt++;
    }
  }
}