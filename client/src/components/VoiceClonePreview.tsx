import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Pause, Square, Shuffle, Volume2, Loader2, Sparkles, RefreshCw, Workflow, CheckCircle2, XCircle } from 'lucide-react';
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
  qc?: {
    decision: 'pass' | 'fail';
    wer?: number;
    speaker_cosine?: number;
  };
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
  const [isCloning, setIsCloning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
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
      
      // Generate story content
      const storyContent = `Once upon a time, ${randomPrompt}. This is a short story told in ${personName}'s voice to demonstrate the voice cloning technology.`;
      
      const newStory: GeneratedStory = {
        id: Date.now().toString(),
        title: randomPrompt,
        content: storyContent,
        isGenerating: true
      };

  // Start clone with QC pipeline (server proxies to VoiceAgent)
  const startCloneWithQC = async () => {
    if (!voiceRecordingId) {
      toast({ title: 'No Voice Recording', description: 'Record a voice sample first.', variant: 'destructive' });
      return;
    }
    try {
      setIsCloning(true);
      // Ensure we have a current story
      if (!currentStory) {
        await generateRandomStory();
      }
      const story = currentStory || stories[0];
      if (!story) return;

      // Resolve person voiceId
      const personRes = await apiRequest('GET', `/api/people/${personId}`);
      if (!personRes.ok) throw new Error('Failed to get person');
      const person = await personRes.json();

      // Start job
      const startRes = await apiRequest('POST', '/api/voice/clone/start', {
        text: story.content,
        voice_id: person.elevenlabsVoiceId,
        mode: 'narration',
        provider: 'elevenlabs',
        consent_flag: true,
        // Optional: if server has a reference wav path, include raw_audio_path
        qc: { max_wer: 0.2, min_cosine: 0.78 }
      });
      if (!startRes.ok) {
        const errData = await startRes.json();
        throw new Error(errData.message || 'Failed to start clone job');
      }
      const startData = await startRes.json();
      const jid = startData.job_id || startData.id || startData.jobId;
      if (!jid) throw new Error('No job id returned');
      setJobId(String(jid));
      toast({ title: 'Clone Started', description: `Job ${jid} started` });

      // Poll until done
      await pollCloneJob(String(jid));
    } catch (e: any) {
      toast({ title: 'Clone Failed', description: e.message || 'Unknown error', variant: 'destructive' });
    } finally {
      setIsCloning(false);
    }
  };

  const pollCloneJob = async (jid: string) => {
    let attempts = 0;
    const maxAttempts = 40; // ~40s
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    while (attempts < maxAttempts) {
      attempts++;
      const res = await apiRequest('GET', `/api/voice/jobs/${encodeURIComponent(jid)}`);
      if (!res.ok) {
        await sleep(1000);
        continue;
      }
      const data = await res.json();
      const status = data.status || data.state;
      if (status === 'completed' || status === 'done' || data.result) {
        const result = data.result || data;
        const audioB64 = result.audio_base64 || result.audioBase64;
        const qc = result.qc || {};
        const audioUrl = audioB64 ? `data:audio/mpeg;base64,${audioB64}` : undefined;
        // Update current story with audio and QC
        setStories(prev => prev.map(s => s.id === (currentStory?.id || s.id) ? {
          ...s,
          audioUrl,
          isGenerating: false,
          qc: qc.decision ? { decision: qc.decision, wer: qc.metrics?.wer, speaker_cosine: qc.metrics?.speaker_cosine } : s.qc
        } : s));
        if (currentStory) {
          setCurrentStory(cs => cs ? {
            ...cs,
            audioUrl,
            isGenerating: false,
            qc: qc.decision ? { decision: qc.decision, wer: qc.metrics?.wer, speaker_cosine: qc.metrics?.speaker_cosine } : cs.qc
          } : cs);
        }
        toast({ title: 'Clone Ready', description: qc?.decision ? `QC: ${qc.decision}` : 'Audio generated' });
        return;
      }
      if (status === 'failed' || data.error) {
        throw new Error(data.error || 'Clone failed');
      }
      await sleep(1000);
    }
    throw new Error('Timed out waiting for job');
  };

      setStories(prev => [newStory, ...prev.slice(0, 4)]); // Keep only 5 stories
      setCurrentStory(newStory);

      // Generate voice clone using TTS preview endpoint
      console.log('Generating voice clone for person:', personId, 'with recording:', voiceRecordingId);
      
      // Get person's voice ID first
      const personResponse = await apiRequest('GET', `/api/people/${personId}`);
      if (!personResponse.ok) {
        throw new Error('Failed to get person data');
      }
      const personData = await personResponse.json();
      
      const voiceResponse = await apiRequest('POST', '/api/voice/preview', {
        text: storyContent,
        voiceId: personData.elevenlabsVoiceId,
        mode: 'narration'
      });

      if (!voiceResponse.ok) {
        const errorData = await voiceResponse.json();
        throw new Error(errorData.error || 'Failed to generate cloned voice');
      }

      const voiceData = await voiceResponse.json();
      
      // Create audio URL from base64 data
      const audioUrl = voiceData.audio_base64 ? `data:audio/mpeg;base64,${voiceData.audio_base64}` : undefined;
      
      // Update story with generated audio
      const updatedStory: GeneratedStory = {
        ...newStory,
        audioUrl: audioUrl,
        isGenerating: false
      };

      setStories(prev => prev.map(s => s.id === newStory.id ? updatedStory : s));
      setCurrentStory(updatedStory);
      
      toast({
        title: "Voice Clone Ready!",
        description: `${personName}'s cloned voice has generated the story`
      });
      
    } catch (error: any) {
      let errorMessage = error.message || "Failed to generate story";
      
      // Handle specific errors
      if (error.message?.includes('Voice clone not ready')) {
        errorMessage = "Voice clone is still processing. Please wait a few moments and try again.";
      } else if (error.message?.includes('cannot be decrypted') || error.message?.includes('encryption key')) {
        errorMessage = "Your voice recording cannot be decrypted. Please record a new voice sample to enable voice cloning.";
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

                {/* QC Controls */}
                <div className="flex items-center justify-center gap-3 mt-2">
                  <Button onClick={startCloneWithQC} disabled={isCloning || isGenerating} variant="secondary">
                    {isCloning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Workflow className="h-4 w-4 mr-2" />}
                    Start Clone (QC)
                  </Button>
                </div>

                {/* QC Metrics */}
                {currentStory?.qc && (
                  <div className="flex items-center justify-center gap-3 mt-3 text-sm">
                    {currentStory.qc.decision === 'pass' ? (
                      <span className="flex items-center text-green-600"><CheckCircle2 className="h-4 w-4 mr-1" /> QC Pass</span>
                    ) : (
                      <span className="flex items-center text-red-600"><XCircle className="h-4 w-4 mr-1" /> QC Fail</span>
                    )}
                    {typeof currentStory.qc.wer === 'number' && (
                      <span className="text-muted-foreground">WER: {(currentStory.qc.wer * 100).toFixed(1)}%</span>
                    )}
                    {typeof currentStory.qc.speaker_cosine === 'number' && (
                      <span className="text-muted-foreground">Cosine: {currentStory.qc.speaker_cosine.toFixed(2)}</span>
                    )}
                  </div>
                )}
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