import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Play, Pause, Volume2, Music, BookOpen, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoicePreviewProps {
  personId: number;
  personName: string;
  voiceRecordingCount: number;
}

// Sample texts for voice preview
const PREVIEW_TEXTS = {
  story: {
    title: "Story Reading",
    icon: BookOpen,
    content: "Once upon a time, in a magical forest filled with wonder, there lived a curious little rabbit who loved to explore. Every day brought new adventures and exciting discoveries!",
    type: "story"
  },
  greeting: {
    title: "Friendly Greeting", 
    icon: Volume2,
    content: "Hello there! I'm so excited to be in your video today. We're going to have so much fun together, and I can't wait to share this amazing adventure with you!",
    type: "greeting"
  },
  song: {
    title: "Happy Song",
    icon: Music,
    content: "🎵 Sunshine, sunshine, bright and new, Making everything happy and blue! Let's sing together, me and you, Happy songs the whole day through! 🎵",
    type: "song"
  }
};

export function VoicePreview({ personId, personName, voiceRecordingCount }: VoicePreviewProps) {
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const { toast } = useToast();

  // Generate voice preview mutation
  const generatePreviewMutation = useMutation({
    mutationFn: async ({ textType, content }: { textType: string; content: string }) => {
      const response = await apiRequest('POST', '/api/voice/preview', {
        personId,
        textType,
        content
      });
      return await response.json();
    },
    onSuccess: (data, variables) => {
      if (data.audioUrl) {
        playAudio(variables.textType, data.audioUrl);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Preview Generation Failed",
        description: error.message || "Could not generate voice preview",
        variant: "destructive",
      });
    },
  });

  const playAudio = (textType: string, audioUrl: string) => {
    // Stop any currently playing audio
    Object.values(audioElements).forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setCurrentlyPlaying(null);

    // Create new audio element with error handling
    const audio = new Audio();
    
    audio.addEventListener('loadstart', () => {
      console.log('Audio loading started for:', textType);
    });
    
    audio.addEventListener('canplay', () => {
      console.log('Audio can play for:', textType);
      setCurrentlyPlaying(textType);
    });
    
    audio.addEventListener('loadeddata', () => {
      console.log('Audio data loaded for:', textType, 'Duration:', audio.duration, 'Volume:', audio.volume);
      if (currentlyPlaying === textType) {
        // Ensure volume is audible
        audio.volume = 1.0;
        audio.play().then(() => {
          console.log('Audio playback started successfully for:', textType);
        }).catch(error => {
          console.error('Audio play failed:', error);
          toast({
            title: "Playback Error",
            description: "Browser blocked audio playback. Click to try again.",
            variant: "destructive",
          });
          setCurrentlyPlaying(null);
        });
      }
    });
    
    audio.addEventListener('ended', () => {
      console.log('Audio playback ended for:', textType);
      setCurrentlyPlaying(null);
    });
    
    let logInterval: NodeJS.Timeout;
    audio.addEventListener('play', () => {
      console.log('Audio play event triggered for:', textType);
      logInterval = setInterval(() => {
        if (!audio.paused && !audio.ended) {
          console.log('Audio actively playing:', textType, 'Time:', audio.currentTime.toFixed(1) + 's', 'Volume:', audio.volume);
        }
      }, 1000);
    });
    
    audio.addEventListener('pause', () => {
      console.log('Audio paused for:', textType);
      if (logInterval) clearInterval(logInterval);
    });
    
    audio.addEventListener('ended', () => {
      console.log('Audio ended for:', textType);
      if (logInterval) clearInterval(logInterval);
    });
    
    audio.addEventListener('error', (e) => {
      console.error('Audio error:', e, audio.error);
      toast({
        title: "Audio Load Error",
        description: "Could not load the voice preview file",
        variant: "destructive",
      });
      setCurrentlyPlaying(null);
    });

    setAudioElements(prev => ({ ...prev, [textType]: audio }));
    
    // Set source and load with cache busting
    audio.src = `${audioUrl}?t=${Date.now()}`;
    audio.preload = 'auto';
    audio.load();
  };

  const stopAudio = (textType: string) => {
    const audio = audioElements[textType];
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrentlyPlaying(null);
  };

  const handlePreviewClick = (textType: string, content: string) => {
    if (currentlyPlaying === textType) {
      stopAudio(textType);
    } else {
      // Test browser audio capabilities first
      console.log('Testing browser audio context...');
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        console.log('Audio context state:', audioContext.state);
        
        if (audioContext.state === 'suspended') {
          audioContext.resume().then(() => {
            console.log('Audio context resumed');
          });
        }
        
        // Create a simple test beep
        if (textType === 'test') {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 1);
          
          console.log('Direct audio context beep should play');
          return;
        }
      } catch (error) {
        console.error('Audio context test failed:', error);
      }
      
      // Check if we already have audio for this type
      const existingAudio = audioElements[textType];
      if (existingAudio && existingAudio.src && !existingAudio.error) {
        setCurrentlyPlaying(textType);
        existingAudio.currentTime = 0;
        existingAudio.play().catch(error => {
          console.error('Replay failed:', error);
          // If replay fails, generate new preview
          generatePreviewMutation.mutate({ textType, content });
        });
      } else {
        generatePreviewMutation.mutate({ textType, content });
      }
    }
  };

  if (voiceRecordingCount === 0) {
    return (
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800">
            <Volume2 className="h-5 w-5" />
            Voice Preview
          </CardTitle>
          <CardDescription className="text-orange-700">
            Voice previews will be available after completing voice training
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          Voice Preview
        </CardTitle>
        <CardDescription>
          Listen to how {personName}'s trained voice sounds with different types of content
        </CardDescription>
        <Badge variant="secondary" className="w-fit">
          {voiceRecordingCount} voice sample{voiceRecordingCount !== 1 ? 's' : ''} trained
        </Badge>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
          <div>
            <h4 className="font-medium text-red-900 text-sm">Audio System Test</h4>
            <p className="text-xs text-red-700">Click to test browser audio with direct tone generation</p>
          </div>
          <Button
            onClick={() => handlePreviewClick('test', 'test')}
            variant="outline"
            size="sm"
            className="text-red-700 border-red-300 hover:bg-red-100"
          >
            <Play className="w-4 h-4 mr-1" />
            Test Beep
          </Button>
        </div>
        
        {Object.entries(PREVIEW_TEXTS).map(([key, preview]) => {
          const IconComponent = preview.icon;
          const isPlaying = currentlyPlaying === key;
          const isGenerating = generatePreviewMutation.isPending && generatePreviewMutation.variables?.textType === key;
          
          return (
            <div key={key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{preview.title}</span>
                </div>
                
                <Button
                  variant={isPlaying ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => handlePreviewClick(key, preview.content)}
                  disabled={isGenerating}
                  className={cn(
                    "min-w-[80px]",
                    isPlaying && "bg-purple-100 text-purple-700 border-purple-200"
                  )}
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isPlaying ? (
                    <>
                      <Pause className="h-4 w-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-1" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/30 p-3 rounded-md">
                {preview.content}
              </p>
              
              {key !== 'song' && <Separator />}
            </div>
          );
        })}
        
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-700">
            Voice previews use AI to generate how {personName}'s voice would sound reading different content. 
            The quality depends on the number and variety of voice training samples.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default VoicePreview;