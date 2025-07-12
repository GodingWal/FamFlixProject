import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

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

export const useVoiceSynthesis = () => {
  const queryClient = useQueryClient();
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

  // Check voice service health
  const { data: healthStatus, isLoading: isCheckingHealth } = useQuery({
    queryKey: ['/api/voice/health'],
    refetchInterval: 30000, // Check every 30 seconds
  });

  // Start voice synthesis
  const synthesizeMutation = useMutation({
    mutationFn: async (request: VoiceRequest) => {
      const response = await apiRequest('/api/voice/synthesize', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    },
    onSuccess: (data) => {
      setCurrentTaskId(data.task_id);
      queryClient.invalidateQueries({ queryKey: ['/api/voice/tasks'] });
    },
  });

  // Get task status
  const { data: taskStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['/api/voice/status', currentTaskId],
    enabled: !!currentTaskId,
    refetchInterval: (data) => {
      // Stop polling if task is completed or failed
      if (data?.status === 'completed' || data?.status === 'failed') {
        return false;
      }
      return 2000; // Poll every 2 seconds while processing
    },
  });

  // Upload voice sample
  const uploadSampleMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('voiceSample', file);
      
      const response = await fetch('/api/voice/upload-sample', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
  });

  // Batch synthesis
  const batchSynthesisMutation = useMutation({
    mutationFn: async (request: BatchVoiceRequest) => {
      const response = await apiRequest('/api/voice/batch-synthesize', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/voice/tasks'] });
    },
  });

  // List all tasks
  const { data: tasks, isLoading: isLoadingTasks } = useQuery({
    queryKey: ['/api/voice/tasks'],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Delete task
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const response = await apiRequest(`/api/voice/tasks/${taskId}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/voice/tasks'] });
      if (currentTaskId) {
        setCurrentTaskId(null);
      }
    },
  });

  // Synthesize and wait for completion
  const synthesizeAndWait = useCallback(async (request: VoiceRequest): Promise<VoiceSynthesisStatus> => {
    const startResult = await synthesizeMutation.mutateAsync(request);
    const taskId = startResult.task_id;
    
    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const status = await refetchStatus();
          if (status.data) {
            if (status.data.status === 'completed') {
              clearInterval(pollInterval);
              resolve(status.data);
            } else if (status.data.status === 'failed') {
              clearInterval(pollInterval);
              reject(new Error(status.data.error || 'Synthesis failed'));
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
          reject(error);
        }
      }, 2000);

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        reject(new Error('Synthesis timeout'));
      }, 300000);
    });
  }, [synthesizeMutation, refetchStatus]);

  return {
    // Health status
    isServiceHealthy: healthStatus?.status === 'healthy',
    isCheckingHealth,
    
    // Synthesis
    synthesize: synthesizeMutation.mutate,
    synthesizeAsync: synthesizeMutation.mutateAsync,
    synthesizeAndWait,
    isSynthesizing: synthesizeMutation.isPending,
    
    // Task management
    currentTaskId,
    taskStatus,
    tasks: tasks?.tasks || [],
    totalTasks: tasks?.total || 0,
    isLoadingTasks,
    deleteTask: deleteTaskMutation.mutate,
    isDeleting: deleteTaskMutation.isPending,
    
    // File upload
    uploadSample: uploadSampleMutation.mutate,
    uploadSampleAsync: uploadSampleMutation.mutateAsync,
    isUploading: uploadSampleMutation.isPending,
    
    // Batch processing
    batchSynthesize: batchSynthesisMutation.mutate,
    batchSynthesizeAsync: batchSynthesisMutation.mutateAsync,
    isBatchProcessing: batchSynthesisMutation.isPending,
    
    // Clear current task
    clearCurrentTask: () => setCurrentTaskId(null),
  };
};

export default useVoiceSynthesis;