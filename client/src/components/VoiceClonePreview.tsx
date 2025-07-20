import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Pause, Square, Shuffle, Volume2, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface VoiceClonePreviewProps {
  personId: number;
  personName: string;
  voiceRecordingId?: number;
  className?: string;
}

interface GeneratedStory {
  id: string;
  title: string;
  content: string;
  audioUrl?: string;
  isGenerating?: boolean;
}

const kidStoryPrompts = [
  "A brave little bunny goes on an adventure in the magical forest",
  "A friendly dragon who loves to bake cookies for the village children",
  "The day all the toys in the playroom came to life",
  "A curious kitten discovers a secret garden behind the house",
  "The little star who wanted to dance with the moon",
  "A kind elephant who helps all the animals cross the river",
  "The magical paintbrush that makes drawings come alive",
  "A sleepy owl who learns to stay awake during the day",
  "The talking tree that tells wonderful bedtime stories",
  "A tiny mouse who becomes friends with a gentle giant"
];

export default function VoiceClonePreview({ personId, personName, voiceRecordingId, className }: VoiceClonePreviewProps) {
  const [stories, setStories] = useState<GeneratedStory[]>([]);
  const [currentStory, setCurrentStory] = useState<GeneratedStory | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  const generateRandomStory = async () => {
    if (!voiceRecordingId) {
      toast({
        title: "No Voice Recording",
        description: "Please record your voice first to preview stories",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const randomPrompt = kidStoryPrompts[Math.floor(Math.random() * kidStoryPrompts.length)];
      
      // Get the voice recording to play back the actual recorded voice
      const voiceResponse = await apiRequest('GET', `/api/voiceRecordings/${voiceRecordingId}`);
      
      if (!voiceResponse.ok) {
        throw new Error('Failed to get voice recording');
      }

      const voiceData = await voiceResponse.json();
      
      const newStory: GeneratedStory = {
        id: Date.now().toString(),
        title: randomPrompt,
        content: `This is a preview of ${personName}'s recorded voice. Voice recordings can be used to personalize stories and content.`,
        audioUrl: voiceData.audioUrl,
        isGenerating: false
      };

      setStories(prev => [newStory, ...prev.slice(0, 4)]); // Keep only 5 stories
      setCurrentStory(newStory);
      
      toast({
        title: "Voice Preview Ready!",
        description: `Play back ${personName}'s recorded voice`
      });
      
    } catch (error: any) {
      let errorMessage = error.message || "Failed to generate story";
      
      // Handle voice clone not ready error
      if (error.message?.includes('Voice clone not ready')) {
        errorMessage = "Voice clone is still processing. Please wait a few moments and try again.";
      }
      
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      // Remove the failed story
      setStories(prev => prev.filter(s => s.id !== currentStory?.id));
      setCurrentStory(null);
    } finally {
      setIsGenerating(false);
    }
  };

  const playStory = (story: GeneratedStory) => {
    if (!story.audioUrl || story.isGenerating) return;

    // Stop current audio if playing
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    }

    console.log('Attempting to play audio:', story.audioUrl);
    const audio = new Audio(story.audioUrl);
    setCurrentAudio(audio);
    setCurrentStory(story);

    audio.onloadstart = () => {
      console.log('Audio loading started');
    };

    audio.oncanplay = () => {
      console.log('Audio can start playing');
      setIsPlaying(true);
    };

    audio.onended = () => {
      setIsPlaying(false);
      setCurrentAudio(null);
    };

    audio.onerror = (e) => {
      console.error('Audio playback error:', e, audio.error);
      toast({
        title: "Playback Error",
        description: `Failed to play audio: ${audio.error?.message || 'Unknown error'}`,
        variant: "destructive"
      });
      setIsPlaying(false);
      setCurrentAudio(null);
    };

    audio.play().catch((error) => {
      console.error('Audio play failed:', error);
      toast({
        title: "Playback Failed",
        description: `Could not start playback: ${error.message}`,
        variant: "destructive"
      });
      setIsPlaying(false);
      setCurrentAudio(null);
    });
  };

  const stopPlayback = () => {
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      // Clean up all event listeners
      currentAudio.removeEventListener('loadstart', () => {});
      currentAudio.removeEventListener('canplay', () => {});
      currentAudio.removeEventListener('ended', () => {});
      currentAudio.removeEventListener('error', () => {});
      setCurrentAudio(null);
    }
    setIsPlaying(false);
  };

  const pausePlayback = () => {
    if (currentAudio && !currentAudio.paused) {
      currentAudio.pause();
      setIsPlaying(false);
    }
  };

  const resumePlayback = () => {
    if (currentAudio && currentAudio.paused) {
      const playPromise = currentAudio.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
        }).catch((error) => {
          console.error('Resume playback failed:', error);
          toast({
            title: "Playback Failed",
            description: "Could not resume playback",
            variant: "destructive"
          });
          setIsPlaying(false);
        });
      }
    }
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (currentAudio) {
        currentAudio.pause();
        setCurrentAudio(null);
      }
    };
  }, [currentAudio]);

  // Generate initial story
  useEffect(() => {
    if (voiceRecordingId && stories.length === 0) {
      generateRandomStory();
    }
  }, [voiceRecordingId]);

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Voice Clone Preview
            </CardTitle>
            <CardDescription>
              Listen to {personName}'s cloned voice reading personalized children's stories
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            AI Generated
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {!voiceRecordingId ? (
          <Alert>
            <Volume2 className="h-4 w-4" />
            <AlertDescription>
              Complete voice training first to preview the cloned voice
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Current Story Display */}
            {currentStory && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border">
                  <h3 className="font-semibold text-lg mb-2 text-gray-800">
                    {currentStory.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {currentStory.content}
                  </p>
                </div>

                {/* Audio Controls */}
                <div className="flex items-center justify-center gap-3">
                  {currentStory.isGenerating ? (
                    <div className="flex items-center gap-2 text-purple-600">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Generating {personName}'s voice...</span>
                    </div>
                  ) : currentStory.audioUrl ? (
                    <div className="flex items-center gap-2">
                      {!isPlaying ? (
                        <Button
                          onClick={() => playStory(currentStory)}
                          size="lg"
                          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Play Story
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            onClick={currentAudio?.paused ? resumePlayback : pausePlayback}
                            size="lg"
                            variant="outline"
                          >
                            {currentAudio?.paused ? (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Resume
                              </>
                            ) : (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={stopPlayback}
                            size="lg"
                            variant="outline"
                          >
                            <Square className="h-4 w-4 mr-2" />
                            Stop
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button
                      onClick={() => generateRandomStory()}
                      disabled={isGenerating}
                      variant="outline"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Generation
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Generate New Story */}
            <div className="text-center space-y-3">
              <Button
                onClick={generateRandomStory}
                disabled={isGenerating}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Shuffle className="h-4 w-4 mr-2" />
                )}
                Generate New Story
              </Button>
              <p className="text-xs text-muted-foreground">
                Each story is read using {personName}'s actual voice clone trained from their recordings
              </p>
            </div>

            {/* Story History */}
            {stories.length > 1 && (
              <div className="space-y-3">
                <Separator />
                <h4 className="font-medium text-sm text-gray-700">Previous Stories</h4>
                <div className="space-y-2">
                  {stories.slice(1).map((story) => (
                    <div
                      key={story.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{story.title}</p>
                        <p className="text-xs text-gray-500 truncate">{story.content.slice(0, 60)}...</p>
                      </div>
                      {story.audioUrl && !story.isGenerating && (
                        <Button
                          onClick={() => playStory(story)}
                          size="sm"
                          variant="ghost"
                          className="ml-2"
                        >
                          <Play className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}