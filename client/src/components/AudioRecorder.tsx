import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Trash2, Play, Pause } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob, audioUrl: string, duration: number) => void;
  existingRecording?: string;
}

const AudioRecorder = ({ onRecordingComplete, existingRecording }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string>(existingRecording || "");
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();
  
  // Reset state when existingRecording changes
  useEffect(() => {
    // Reset the audio URL when existingRecording changes
    setAudioUrl(existingRecording || "");
    // Reset recording state
    if (!existingRecording) {
      setRecordingTime(0);
      if (audioRef.current) {
        audioRef.current.src = "";
      }
    }
  }, [existingRecording]);

  // Start recording function
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        onRecordingComplete(audioBlob, url, recordingTime);
        
        // Stop all tracks in the stream
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start a timer to track recording duration
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record audio.",
        variant: "destructive"
      });
    }
  };
  
  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };
  
  // Delete recording function
  const deleteRecording = () => {
    setAudioUrl("");
    
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };
  
  // Toggle play/pause function
  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Format time as mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card>
      <CardContent className="pt-4 sm:pt-6">
        <div className="flex flex-col items-center w-full max-w-full sm:max-w-md mx-auto px-3 sm:px-0">
          <h3 className="text-base sm:text-lg font-medium mb-3 sm:mb-4 text-center">Voice Recording</h3>
          
          {isRecording ? (
            <div className="w-full mb-3 sm:mb-4">
              <div className="flex justify-between items-center mb-1.5 sm:mb-2">
                <span className="text-xs sm:text-sm font-medium">Recording...</span>
                <span className="text-xs sm:text-sm">{formatTime(recordingTime)}</span>
              </div>
              <Progress value={(recordingTime % 60) * (100/60)} className="h-1" />
            </div>
          ) : audioUrl ? (
            <div className="w-full">
              <audio 
                ref={audioRef} 
                src={audioUrl} 
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <div className="flex justify-between items-center mb-2">
                <div className="flex gap-2">
                  <Button 
                    size="icon"
                    variant="outline"
                    onClick={togglePlayPause}
                  >
                    {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                  </Button>
                  <Button 
                    size="icon"
                    variant="outline"
                    onClick={deleteRecording}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
                <span className="text-[10px] sm:text-xs">Recorded Voice</span>
              </div>
            </div>
          ) : null}
          
          <div className="mt-3 sm:mt-4 w-full flex justify-center">
            {isRecording ? (
              <Button 
                variant="destructive" 
                onClick={stopRecording}
                className="gap-2 w-full sm:w-auto"
              >
                <Square size={18} />
                Stop Recording
              </Button>
            ) : !audioUrl ? (
              <Button
                onClick={startRecording}
                className="gap-2 w-full sm:w-auto"
              >
                <Mic size={18} />
                Start Recording
              </Button>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;
