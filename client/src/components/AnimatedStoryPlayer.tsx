import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Play, 
  Pause, 
  Square, 
  Volume2, 
  VolumeX, 
  X, 
  Loader2,
  SkipBack,
  SkipForward
} from "lucide-react";
import type { AnimatedStory } from "../../../shared/schema";

interface AnimatedStoryPlayerProps {
  story: AnimatedStory;
  narratorId: number | null;
  onClose: () => void;
}

interface AnimationScene {
  id: string;
  type: "character" | "scene" | "text";
  content: string;
  duration: number;
  startTime: number;
  style?: {
    background?: string;
    animation?: string;
    position?: { x: number; y: number };
  };
}

export function AnimatedStoryPlayer({ story, narratorId, onClose }: AnimatedStoryPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [currentScene, setCurrentScene] = useState<AnimationScene | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();

  // Generate story audio mutation
  const generateAudioMutation = useMutation({
    mutationFn: async () => {
      if (!narratorId) throw new Error("No narrator selected");
      
      const response = await apiRequest("POST", "/api/stories/generate-audio", {
        storyId: story.id,
        narratorId: narratorId,
        content: story.content
      });
      return response;
    },
    onSuccess: (data: any) => {
      setAudioUrl(data.audioUrl);
      setIsGeneratingAudio(false);
      toast({
        title: "Story ready!",
        description: "Audio has been generated. Click play to start.",
      });
    },
    onError: (error: any) => {
      setIsGeneratingAudio(false);
      toast({
        variant: "destructive",
        title: "Failed to generate audio",
        description: error.message || "Please try again.",
      });
    },
  });

  // Animation scenes based on story content
  const animationScenes: AnimationScene[] = [
    {
      id: "intro",
      type: "text",
      content: story.title,
      duration: 3,
      startTime: 0,
      style: {
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        animation: "fadeInScale"
      }
    },
    {
      id: "scene1",
      type: "scene",
      content: "🌟",
      duration: story.duration * 0.3,
      startTime: 3,
      style: {
        background: story.category === "bedtime" 
          ? "linear-gradient(135deg, #2c3e50 0%, #4a6741 100%)"
          : "linear-gradient(135deg, #74b9ff 0%, #0984e3 100%)",
        animation: "float"
      }
    },
    {
      id: "scene2",
      type: "character",
      content: story.category === "adventure" ? "🦸‍♀️" : story.category === "bedtime" ? "🌙" : "📚",
      duration: story.duration * 0.4,
      startTime: 3 + (story.duration * 0.3),
      style: {
        animation: "bounce",
        position: { x: 50, y: 50 }
      }
    },
    {
      id: "scene3",
      type: "scene",
      content: "✨",
      duration: story.duration * 0.3,
      startTime: 3 + (story.duration * 0.7),
      style: {
        background: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
        animation: "sparkle"
      }
    }
  ];

  useEffect(() => {
    if (narratorId && !audioUrl && !isGeneratingAudio) {
      setIsGeneratingAudio(true);
      generateAudioMutation.mutate();
    }
  }, [narratorId, audioUrl, isGeneratingAudio]);

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [audioUrl, volume, isMuted]);

  useEffect(() => {
    const updateProgress = () => {
      if (audioRef.current && isPlaying) {
        const time = audioRef.current.currentTime;
        setCurrentTime(time);
        
        // Update current scene based on time
        const scene = animationScenes.find(s => 
          time >= s.startTime && time < s.startTime + s.duration
        );
        setCurrentScene(scene || null);
        
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, animationScenes]);

  const handlePlay = () => {
    if (!audioUrl || !audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
      setCurrentScene(null);
    }
  };

  const handleSeek = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const duration = audioRef.current?.duration || story.duration;

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-2xl">{story.title}</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Animation Canvas */}
        <div className="relative h-64 md:h-80 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50">
          {currentScene && (
            <div 
              className="absolute inset-0 flex items-center justify-center transition-all duration-1000"
              style={{ 
                background: currentScene.style?.background || 'transparent',
                transform: currentScene.style?.animation === 'float' ? 'translateY(-10px)' : 'none'
              }}
            >
              {currentScene.type === "text" ? (
                <h2 className="text-4xl md:text-6xl font-bold text-white text-center px-4 animate-pulse">
                  {currentScene.content}
                </h2>
              ) : (
                <div 
                  className="text-6xl md:text-8xl animate-bounce"
                  style={{
                    transform: currentScene.style?.position 
                      ? `translate(${currentScene.style.position.x}%, ${currentScene.style.position.y}%)`
                      : 'none'
                  }}
                >
                  {currentScene.content}
                </div>
              )}
            </div>
          )}
          
          {!currentScene && !isGeneratingAudio && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">📖</div>
                <p className="text-gray-600">Story ready to play</p>
              </div>
            </div>
          )}
          
          {isGeneratingAudio && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600">Generating personalized audio...</p>
              </div>
            </div>
          )}
        </div>

        {/* Audio Controls */}
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSeek(Math.max(0, currentTime - 10))}
              disabled={!audioUrl}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            
            <Button
              onClick={handlePlay}
              disabled={!audioUrl || isGeneratingAudio}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              {isGeneratingAudio ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleStop}
              disabled={!audioUrl}
            >
              <Square className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSeek(Math.min(duration, currentTime + 10))}
              disabled={!audioUrl}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={(currentTime / duration) * 100} 
              className="h-2 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percentage = x / rect.width;
                handleSeek(duration * percentage);
              }}
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Volume Control */}
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVolume = parseFloat(e.target.value);
                setVolume(newVolume);
                setIsMuted(newVolume === 0);
              }}
              className="w-24"
            />
          </div>
        </div>

        {/* Story Content Preview */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-2">Story Content</h3>
          <p className="text-sm text-gray-600 line-clamp-3">{story.content}</p>
        </div>

        {/* Hidden Audio Element */}
        {audioUrl && (
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentTime(0);
              setCurrentScene(null);
            }}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                setCurrentTime(0);
              }
            }}
          />
        )}
      </CardContent>
    </Card>
  );
}