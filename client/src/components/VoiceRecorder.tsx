import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, PlayCircle, PauseCircle, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';

interface VoiceRecorderProps {
  onSave: (audioData: string, duration: number) => void;
  minDuration?: number;
  maxDuration?: number;
  personName?: string;
  isProcessing?: boolean;
}

/**
 * Voice recorder component for capturing voice samples
 * Allows recording, playback, and saving of voice recordings
 */
export function VoiceRecorder({
  onSave,
  minDuration = 5,
  maxDuration = 30,
  personName = '',
  isProcessing = false
}: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [audioData, setAudioData] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  // Initialize audio element
  useEffect(() => {
    audioElementRef.current = new Audio();
    
    audioElementRef.current.onplay = () => setPlaying(true);
    audioElementRef.current.onpause = () => setPlaying(false);
    audioElementRef.current.onended = () => setPlaying(false);
    
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current.src = '';
      }
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Explicitly set the MIME type to webm which is better supported
      const options = { mimeType: 'audio/webm' };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      audioChunksRef.current = [];
      console.log('Using MIME type:', mediaRecorderRef.current.mimeType);
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        // Use webm which is better supported by browsers
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          console.log('Audio data format:', base64data.substring(0, 50) + '...');
          setAudioData(base64data);
          
          if (audioElementRef.current) {
            audioElementRef.current.src = base64data;
            audioElementRef.current.load();
          }
        };
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };
      
      // Start the recording
      mediaRecorderRef.current.start();
      setRecording(true);
      setElapsedTime(0);
      
      // Start a timer to track recording duration
      timerIntervalRef.current = setInterval(() => {
        setElapsedTime(prev => {
          // Stop recording if we reach max duration
          if (prev >= maxDuration - 0.1) {
            stopRecording();
            return maxDuration;
          }
          return prev + 0.1;
        });
      }, 100);
      
      toast({
        title: 'Recording started',
        description: `Speak clearly and naturally. Recording will stop automatically after ${maxDuration} seconds.`
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Could not access microphone',
        description: 'Please make sure your microphone is connected and you have granted permission to use it.',
        variant: 'destructive'
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      setDuration(elapsedTime);
      
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      
      toast({
        title: 'Recording complete',
        description: `Recorded ${elapsedTime.toFixed(1)} seconds of audio`
      });
    }
  };

  // Toggle playback
  const togglePlayback = () => {
    if (!audioElementRef.current || !audioData) return;
    
    if (playing) {
      audioElementRef.current.pause();
    } else {
      audioElementRef.current.play();
    }
  };

  // Save recording
  const saveRecording = () => {
    if (!audioData) {
      toast({
        title: 'No recording to save',
        description: 'Please record some audio first',
        variant: 'destructive'
      });
      return;
    }
    
    if (duration < minDuration) {
      toast({
        title: 'Recording too short',
        description: `Please record at least ${minDuration} seconds of audio`,
        variant: 'destructive'
      });
      return;
    }
    
    onSave(audioData, duration);
  };

  // Reset recording
  const resetRecording = () => {
    setAudioData(null);
    setDuration(0);
    setElapsedTime(0);
    
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = '';
    }
    
    toast({
      title: 'Recording reset',
      description: 'You can now start a new recording'
    });
  };

  // Format time as mm:ss
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage
  const progressPercent = Math.min(100, (elapsedTime / maxDuration) * 100);

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          {personName && (
            <h3 className="text-lg font-medium">Recording voice for {personName}</h3>
          )}
          
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{formatTime(elapsedTime)}</span>
              <span>{formatTime(maxDuration)}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
          
          {/* Recording status */}
          <div className="py-2 text-center">
            {recording ? (
              <p className="text-red-500 animate-pulse">Recording in progress...</p>
            ) : audioData ? (
              <p className="text-green-500">Recording complete - {duration.toFixed(1)}s</p>
            ) : (
              <p>Press the microphone button to start recording</p>
            )}
          </div>
          
          {/* Control buttons */}
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {!recording && !audioData && (
              <Button 
                onClick={startRecording} 
                disabled={isProcessing}
                size="lg"
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600"
              >
                <Mic />
                Start Recording
              </Button>
            )}
            
            {recording && (
              <Button 
                onClick={stopRecording}
                size="lg"
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Square />
                Stop Recording
              </Button>
            )}
            
            {audioData && !recording && (
              <>
                <Button
                  onClick={togglePlayback}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  {playing ? (
                    <>
                      <PauseCircle size={16} />
                      Pause
                    </>
                  ) : (
                    <>
                      <PlayCircle size={16} />
                      Play
                    </>
                  )}
                </Button>
                
                <Button
                  onClick={saveRecording}
                  disabled={isProcessing || duration < minDuration}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Save size={16} />
                  Save Recording
                </Button>
                
                <Button
                  onClick={resetRecording}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Reset
                </Button>
              </>
            )}
          </div>
          
          {/* Recording guidelines */}
          <div className="mt-4 px-4 py-3 bg-muted rounded-md text-sm">
            <h4 className="font-medium mb-2">Recording Tips:</h4>
            <ul className="list-disc list-inside space-y-1">
              <li>Speak clearly and at a normal pace</li>
              <li>Find a quiet location to minimize background noise</li>
              <li>Stay consistent in your tone and volume</li>
              <li>Position yourself 6-12 inches from the microphone</li>
              <li>Record for at least {minDuration} seconds to get good results</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}