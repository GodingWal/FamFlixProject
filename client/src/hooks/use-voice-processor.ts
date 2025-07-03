import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface VoiceProcessorOptions {
  userId: number;
  personId: number;
}

export function useVoiceProcessor({ userId, personId }: VoiceProcessorOptions) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  /**
   * Process a voice recording and save it to the database
   * @param audioData Base64 encoded audio data
   * @param name Name of the recording
   * @param duration Duration of the recording in seconds
   */
  const processVoiceRecording = async (
    audioData: string,
    name: string,
    duration: number
  ): Promise<{ success: boolean; recordingId?: number }> => {
    try {
      setIsProcessing(true);
      setProgress(10);

      // First update the user with a toast notification
      toast({
        title: 'Processing voice recording...',
        description: 'This may take a few moments as we analyze your voice patterns.'
      });

      setProgress(30);

      // Make API call to process the voice recording
      const response = await apiRequest(
        'POST',
        '/api/voiceRecordings',
        {
          userId,
          personId,
          name,
          audioData,
          audioUrl: audioData, // Set audioUrl to same as audioData to satisfy validation
          duration,
          isDefault: true // Make this the default recording for the person
        }
      );

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process voice recording');
      }

      const recordingData = await response.json();
      
      setProgress(100);
      
      toast({
        title: 'Voice processing complete!',
        description: 'Your voice recording has been successfully processed and is ready to use.'
      });

      return {
        success: true,
        recordingId: recordingData.id
      };
    } catch (error: any) {
      toast({
        title: 'Voice processing failed',
        description: error.message || 'An error occurred while processing your voice',
        variant: 'destructive'
      });
      
      return { success: false };
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  /**
   * Check if a voice recording has ML processing
   * @param recordingId ID of the voice recording
   */
  const checkVoiceProcessingStatus = async (recordingId: number): Promise<boolean> => {
    try {
      const response = await apiRequest('GET', `/api/voiceRecordings/${recordingId}`);
      
      if (!response.ok) {
        return false;
      }
      
      const recordingData = await response.json();
      return recordingData.mlProcessed === true;
    } catch (error) {
      return false;
    }
  };

  return {
    processVoiceRecording,
    checkVoiceProcessingStatus,
    isProcessing,
    progress
  };
}