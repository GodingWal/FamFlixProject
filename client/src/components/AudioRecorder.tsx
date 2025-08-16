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
    setAudioUrl(existingRecording || "");
    setRecordingTime(0);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
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
    setRecordingTime(0);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setIsPlaying(false);
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
      <CardContent className="pt-6">
        <div className="flex flex-col items-center">
          <h3 className="text-lg font-medium mb-4">Voice Recording</h3>
          
          {isRecording ? (
            <div className="w-full mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Recording...</span>
                <span className="text-sm">{formatTime(recordingTime)}</span>
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
                <span className="text-xs">Recorded Voice</span>
              </div>
            </div>
          ) : null}
          
          <div className="mt-4">
            {isRecording ? (
              <Button 
                variant="destructive" 
                onClick={stopRecording}
                className="gap-2"
              >
                <Square size={18} />
                Stop Recording
              </Button>
            ) : !audioUrl ? (
              <Button
                onClick={startRecording}
                className="gap-2"
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
