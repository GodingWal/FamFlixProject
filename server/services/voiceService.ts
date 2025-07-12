import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import { log } from '../vite';

// Configuration for voice synthesis service
const VOICE_SERVICE_URL = process.env.VOICE_SERVICE_URL || 'http://localhost:8001';
const VOICE_SERVICE_TIMEOUT = 30000; // 30 seconds

// Types for voice synthesis
export interface VoiceRequest {
  text: string;
  voice_sample: string;
  quality?: 'low' | 'standard' | 'high';
  preserve_accent?: boolean;
  preserve_emotion?: boolean;
}

export interface VoiceSynthesisStatus {
  task_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  output_path?: string;
  error?: string;
  created_at: string;
}

export interface BatchVoiceRequest {
  requests: VoiceRequest[];
  batch_name?: string;
}

class VoiceService {
  private baseURL: string;
  private axiosInstance;

  constructor() {
    this.baseURL = VOICE_SERVICE_URL;
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      timeout: VOICE_SERVICE_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for logging
    this.axiosInstance.interceptors.request.use((config) => {
      log(`Voice Service Request: ${config.method?.toUpperCase()} ${config.url}`, 'voice');
      return config;
    });

    // Response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        log(`Voice Service Response: ${response.status} ${response.config.url}`, 'voice');
        return response;
      },
      (error) => {
        log(`Voice Service Error: ${error.message}`, 'error');
        throw error;
      }
    );
  }

  /**
   * Check if voice synthesis service is available
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/health');
      return response.data.status === 'healthy';
    } catch (error) {
      log(`Voice service health check failed: ${(error as Error).message}`, 'error');
      return false;
    }
  }

  /**
   * Start voice synthesis task
   */
  async synthesizeVoice(request: VoiceRequest): Promise<{ task_id: string; status: string; message: string }> {
    try {
      const response = await this.axiosInstance.post('/synthesize', request);
      log(`Voice synthesis started: ${response.data.task_id}`, 'voice');
      return response.data;
    } catch (error) {
      log(`Voice synthesis failed: ${(error as Error).message}`, 'error');
      throw new Error(`Voice synthesis failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get synthesis task status
   */
  async getTaskStatus(taskId: string): Promise<VoiceSynthesisStatus> {
    try {
      const response = await this.axiosInstance.get(`/status/${taskId}`);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error('Task not found');
      }
      log(`Failed to get task status: ${(error as Error).message}`, 'error');
      throw new Error(`Failed to get task status: ${(error as Error).message}`);
    }
  }

  /**
   * Upload voice sample file
   */
  async uploadVoiceSample(filePath: string, originalName: string): Promise<{ filename: string; path: string; size: number }> {
    try {
      const formData = new FormData();
      const fileBuffer = await fs.readFile(filePath);
      formData.append('file', fileBuffer, originalName);

      const response = await axios.post(`${this.baseURL}/upload_sample`, formData, {
        headers: formData.getHeaders(),
        timeout: VOICE_SERVICE_TIMEOUT,
      });

      log(`Voice sample uploaded: ${response.data.filename}`, 'voice');
      return response.data;
    } catch (error) {
      log(`Voice sample upload failed: ${(error as Error).message}`, 'error');
      throw new Error(`Voice sample upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Start batch voice synthesis
   */
  async batchSynthesize(batchRequest: BatchVoiceRequest): Promise<{ batch_name: string; task_ids: string[]; total_tasks: number }> {
    try {
      const response = await this.axiosInstance.post('/batch_synthesize', batchRequest);
      log(`Batch synthesis started: ${response.data.batch_name} (${response.data.total_tasks} tasks)`, 'voice');
      return response.data;
    } catch (error) {
      log(`Batch synthesis failed: ${(error as Error).message}`, 'error');
      throw new Error(`Batch synthesis failed: ${(error as Error).message}`);
    }
  }

  /**
   * List all active tasks
   */
  async listTasks(): Promise<{ tasks: VoiceSynthesisStatus[]; total: number }> {
    try {
      const response = await this.axiosInstance.get('/tasks');
      return response.data;
    } catch (error) {
      log(`Failed to list tasks: ${(error as Error).message}`, 'error');
      throw new Error(`Failed to list tasks: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a task and its output
   */
  async deleteTask(taskId: string): Promise<{ message: string }> {
    try {
      const response = await this.axiosInstance.delete(`/tasks/${taskId}`);
      log(`Task deleted: ${taskId}`, 'voice');
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        throw new Error('Task not found');
      }
      log(`Failed to delete task: ${(error as Error).message}`, 'error');
      throw new Error(`Failed to delete task: ${(error as Error).message}`);
    }
  }

  /**
   * Wait for task completion with polling
   */
  async waitForCompletion(taskId: string, maxWaitMs: number = 60000, pollIntervalMs: number = 1000): Promise<VoiceSynthesisStatus> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getTaskStatus(taskId);
      
      if (status.status === 'completed') {
        return status;
      }
      
      if (status.status === 'failed') {
        throw new Error(`Task failed: ${status.error}`);
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error('Task timeout: synthesis took too long');
  }

  /**
   * Synthesize voice and wait for completion
   */
  async synthesizeAndWait(request: VoiceRequest, maxWaitMs?: number): Promise<VoiceSynthesisStatus> {
    const startResult = await this.synthesizeVoice(request);
    return await this.waitForCompletion(startResult.task_id, maxWaitMs);
  }
}

// Export singleton instance
export const voiceService = new VoiceService();
export default voiceService;