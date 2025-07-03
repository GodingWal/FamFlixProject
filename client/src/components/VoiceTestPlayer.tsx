import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Play, 
  Pause, 
  Loader2, 
  RefreshCw, 
  Volume2, 
  Wand2,
  FileText,
  Sparkles,
  Mic,
  MicOff,
  Users,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VoiceTestPlayerProps {
  personId: number;
  personName: string;
  hasTrainedVoice: boolean;
}

interface VoiceComparison {
  userAudioUrl: string;
  aiAudioUrl: string;
  transcript: string;
  similarity: number;
  duration: number;
  timestamp: string;
}

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioData: Blob | null;
}

// Sample scripts for voice testing
const sampleScripts = [
  {
    id: 'educational',
    title: 'Educational Story',
    text: "Welcome to our learning adventure! Today we're going to explore the wonderful world of numbers. Can you count with me? One, two, three, four, five! Great job! Numbers help us understand how many things we have."
  },
  {
    id: 'bedtime',
    title: 'Bedtime Story',
    text: "Once upon a time, in a magical forest far away, there lived a friendly little owl named Hoot. Every night, Hoot would fly through the starry sky, watching over all the sleeping animals and making sure they had sweet dreams."
  },
  {
    id: 'learning',
    title: 'Learning Colors',
    text: "Let's learn about colors together! Look around you and find something red. Red like a beautiful rose or a shiny fire truck. Now find something blue, like the bright sky or the deep ocean. Colors make our world so beautiful!"
  },
  {
    id: 'encouragement',
    title: 'Encouragement',
    text: "You are amazing and special! Every day you learn something new and grow a little bit more. Remember to be kind, be brave, and always believe in yourself. You can do anything you set your mind to!"
  },
  {
    id: 'animals',
    title: 'Animal Sounds',
    text: "Let's visit the farm and meet all the animals! The cow says 'moo', the sheep says 'baa', the duck says 'quack', and the rooster says 'cock-a-doodle-doo'! What's your favorite farm animal?"
  }
];

export function VoiceTestPlayer({ personId, personName, hasTrainedVoice }: VoiceTestPlayerProps) {
  const [currentScript, setCurrentScript] = useState(sampleScripts[0].text);
  const [selectedScriptId, setSelectedScriptId] = useState(sampleScripts[0].id);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'compare'>('generate');
  
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioData: null
  });
  
  // Voice comparison state
  const [voiceComparison, setVoiceComparison] = useState<VoiceComparison | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  // Media recorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  
  const { toast } = useToast();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorder.mimeType 
        });
        setRecordingState(prev => ({
          ...prev,
          audioData: audioBlob,
          isRecording: false
        }));
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        duration: 0
      }));
      
      // Start timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 0.1
        }));
      }, 100);
      
    } catch (error) {
      toast({
        title: 'Recording failed',
        description: 'Unable to access microphone. Please check permissions.',
        variant: 'destructive'
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  // Voice comparison mutation
  const compareVoicesMutation = useMutation({
    mutationFn: async () => {
      if (!recordingState.audioData) {
        throw new Error('No recorded audio available');
      }

      setIsTranscribing(true);
      
      // Convert audio blob to base64
      const audioBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.readAsDataURL(recordingState.audioData!);
      });

      const response = await apiRequest('POST', '/api/voice/compare', {
        personId,
        userAudio: audioBase64,
        scriptText: currentScript,
        duration: recordingState.duration
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to compare voices');
      }

      return await response.json();
    },
    onSuccess: (data) => {
      setVoiceComparison({
        userAudioUrl: data.userAudioUrl,
        aiAudioUrl: data.aiAudioUrl,
        transcript: data.transcript || currentScript,
        similarity: data.similarity || 0,
        duration: recordingState.duration,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: 'Voice comparison complete!',
        description: `Similarity score: ${data.similarity || 0}%`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Voice comparison failed',
        description: error.message,
        variant: 'destructive'
      });
    },
    onSettled: () => {
      setIsTranscribing(false);
      setIsAnalyzing(false);
    }
  });

  // Generate voice preview mutation
  const generateVoiceMutation = useMutation({
    mutationFn: async (script: string) => {
      const response = await apiRequest('POST', '/api/voice/preview', {
        personId,
        text: script,
        quality: 'standard'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate voice preview');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.audioUrl) {
        setAudioUrl(data.audioUrl);
        toast({
          title: 'Voice preview ready!',
          description: `${personName}'s voice has been generated for the script.`
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Voice generation failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleGenerateVoice = () => {
    if (!currentScript.trim()) {
      toast({
        title: 'Empty script',
        description: 'Please enter some text for the voice to read.',
        variant: 'destructive'
      });
      return;
    }

    if (!hasTrainedVoice) {
      toast({
        title: 'No trained voice',
        description: 'This person needs voice training before generating speech.',
        variant: 'destructive'
      });
      return;
    }

    generateVoiceMutation.mutate(currentScript);
  };

  const handlePlayPause = () => {
    if (!audioUrl) return;

    if (!audioElement) {
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onpause = () => setIsPlaying(false);
      audio.onplay = () => setIsPlaying(true);
      setAudioElement(audio);
      audio.play();
    } else {
      if (isPlaying) {
        audioElement.pause();
      } else {
        audioElement.play();
      }
    }
  };

  const handleScriptSelect = (scriptId: string) => {
    const script = sampleScripts.find(s => s.id === scriptId);
    if (script) {
      setSelectedScriptId(scriptId);
      setCurrentScript(script.text);
      // Clear previous audio when changing script
      setAudioUrl(null);
      setIsPlaying(false);
      if (audioElement) {
        audioElement.pause();
        setAudioElement(null);
      }
    }
  };

  const generateRandomScript = () => {
    const randomScript = sampleScripts[Math.floor(Math.random() * sampleScripts.length)];
    setSelectedScriptId(randomScript.id);
    setCurrentScript(randomScript.text);
    // Clear previous audio when changing script
    setAudioUrl(null);
    setIsPlaying(false);
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5 text-primary" />
          Interactive Voice Testing
        </CardTitle>
        <CardDescription>
          Generate AI voice or compare your voice with {personName}'s trained model
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {!hasTrainedVoice ? (
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-800">Voice Training Required</h3>
                <p className="text-sm text-amber-700 mt-1">
                  {personName} needs to complete voice training before you can test their voice.
                  Complete at least one voice recording to enable voice testing.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'generate' | 'compare')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="generate" className="flex items-center gap-2">
                <Wand2 className="h-4 w-4" />
                Generate Voice
              </TabsTrigger>
              <TabsTrigger value="compare" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Voice Comparison
              </TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              {/* Script Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="script-select">Choose a script</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateRandomScript}
                    className="gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Random Script
                  </Button>
                </div>
                
                <Select value={selectedScriptId} onValueChange={handleScriptSelect}>
                  <SelectTrigger id="script-select">
                    <SelectValue placeholder="Select a script type" />
                  </SelectTrigger>
                  <SelectContent>
                    {sampleScripts.map((script) => (
                      <SelectItem key={script.id} value={script.id}>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          {script.title}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Script Editor */}
              <div className="space-y-2">
                <Label htmlFor="script-text">Script text</Label>
                <Textarea
                  id="script-text"
                  value={currentScript}
                  onChange={(e) => setCurrentScript(e.target.value)}
                  placeholder="Enter the text you want the voice to read..."
                  className="min-h-[120px] resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {currentScript.length} characters • Estimated {Math.ceil(currentScript.length / 180)} seconds
                </p>
              </div>

              {/* Generate Voice Button */}
              <div className="flex gap-3">
                <Button
                  onClick={handleGenerateVoice}
                  disabled={generateVoiceMutation.isPending || !currentScript.trim()}
                  className="flex-1 gap-2"
                >
                  {generateVoiceMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {generateVoiceMutation.isPending ? 'Generating...' : 'Generate Voice'}
                </Button>
                
                {audioUrl && (
                  <Button
                    variant="outline"
                    onClick={handlePlayPause}
                    className="gap-2"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                )}
              </div>

              {/* Status Badge */}
              {audioUrl && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Volume2 className="h-3 w-3" />
                    Voice ready to play
                  </Badge>
                </div>
              )}

              {generateVoiceMutation.isPending && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-800">Generating voice preview...</p>
                      <p className="text-sm text-blue-600">
                        Using {personName}'s trained voice model to read the script
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="compare" className="space-y-4">
              <div className="space-y-4">
                {/* Script Display for Recording */}
                <div className="space-y-2">
                  <Label>Script to read aloud</Label>
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <p className="text-sm leading-relaxed">{currentScript}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Read this script clearly into your microphone for comparison
                  </p>
                </div>

                {/* Recording Controls */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Voice Recording</Label>
                    {recordingState.isRecording && (
                      <Badge variant="destructive" className="gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Recording {recordingState.duration.toFixed(1)}s
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    {!recordingState.isRecording ? (
                      <Button
                        onClick={startRecording}
                        disabled={!currentScript.trim()}
                        className="gap-2"
                      >
                        <Mic className="h-4 w-4" />
                        Start Recording
                      </Button>
                    ) : (
                      <Button
                        onClick={stopRecording}
                        variant="destructive"
                        className="gap-2"
                      >
                        <MicOff className="h-4 w-4" />
                        Stop Recording
                      </Button>
                    )}
                    
                    {recordingState.audioData && (
                      <Button
                        onClick={() => compareVoicesMutation.mutate()}
                        disabled={compareVoicesMutation.isPending}
                        variant="outline"
                        className="gap-2"
                      >
                        {compareVoicesMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BarChart3 className="h-4 w-4" />
                        )}
                        Compare Voices
                      </Button>
                    )}
                  </div>
                </div>

                {/* Recording Progress */}
                {recordingState.isRecording && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Recording in progress...</span>
                      <span>{recordingState.duration.toFixed(1)}s</span>
                    </div>
                    <Progress value={Math.min((recordingState.duration / 10) * 100, 100)} />
                  </div>
                )}

                {/* Voice Comparison Results */}
                {voiceComparison && (
                  <div className="space-y-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Voice Comparison Results</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* User Recording */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Your Voice</Label>
                        <div className="p-3 bg-white rounded border">
                          <audio controls className="w-full" src={voiceComparison.userAudioUrl} />
                          <p className="text-xs text-muted-foreground mt-1">
                            Duration: {voiceComparison.duration.toFixed(1)}s
                          </p>
                        </div>
                      </div>
                      
                      {/* AI Generated Voice */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">{personName}'s AI Voice</Label>
                        <div className="p-3 bg-white rounded border">
                          <audio controls className="w-full" src={voiceComparison.aiAudioUrl} />
                          <p className="text-xs text-muted-foreground mt-1">
                            AI Generated
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Similarity Score */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">Voice Similarity</Label>
                        <Badge variant={voiceComparison.similarity > 70 ? "default" : voiceComparison.similarity > 40 ? "secondary" : "outline"}>
                          {voiceComparison.similarity}% Match
                        </Badge>
                      </div>
                      <Progress value={voiceComparison.similarity} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {voiceComparison.similarity > 70 ? "Excellent match!" : 
                         voiceComparison.similarity > 40 ? "Good similarity" : 
                         "Room for improvement"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Analysis Status */}
                {isTranscribing && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-800">Analyzing voices...</p>
                        <p className="text-sm text-blue-600">
                          Comparing speech patterns and generating similarity score
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}