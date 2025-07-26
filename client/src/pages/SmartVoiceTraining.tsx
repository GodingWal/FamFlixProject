import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle, 
  AlertCircle,
  Brain,
  Radio,
  Target,
  TrendingUp,
  Volume2,
  Settings
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VoiceAnalysis {
  transcript: string;
  voiceCharacteristics: {
    tone: string;
    pace: string;
    clarity: string;
    expressiveness: string;
  };
  suggestions: string[];
}

interface TrainingScript {
  id: string;
  title: string;
  content: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  focus: string;
  estimatedDuration: number;
}

export function SmartVoiceTraining() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [currentScript, setCurrentScript] = useState<TrainingScript | null>(null);
  const [voiceAnalysis, setVoiceAnalysis] = useState<VoiceAnalysis | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const trainingScripts: TrainingScript[] = [
    {
      id: '1',
      title: 'Warm-up Exercise',
      content: 'Hello there! My name is [Your Name] and I love telling stories to children. Today we\'re going to go on a magical adventure together. Are you ready to explore?',
      difficulty: 'beginner',
      focus: 'Basic tone and clarity',
      estimatedDuration: 30
    },
    {
      id: '2',
      title: 'Emotional Expression',
      content: 'Once upon a time, in a land far, far away, there lived a very happy little bunny named Fluffy. Fluffy loved to hop and play all day long! But one day, Fluffy felt very sad because he couldn\'t find his favorite carrot.',
      difficulty: 'intermediate',
      focus: 'Emotional range and expression',
      estimatedDuration: 45
    },
    {
      id: '3',
      title: 'Character Voices',
      content: 'The big, gruff bear said in a deep voice: "Who\'s been eating my porridge?" The sweet little bird chirped: "Tweet, tweet! I saw someone go that way!" And the wise old owl hooted: "Whooo could it be?"',
      difficulty: 'advanced',
      focus: 'Character differentiation',
      estimatedDuration: 60
    }
  ];

  const analyzeVoiceMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'voice_sample.wav');
      
      const response = await fetch('/api/ai/analyze-voice', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error(`Voice analysis failed: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: (analysis: VoiceAnalysis) => {
      setVoiceAnalysis(analysis);
      toast({ title: "Voice analysis complete!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Analysis failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingProgress(0);

      // Progress tracking
      recordingIntervalRef.current = setInterval(() => {
        setRecordingProgress(prev => {
          if (prev >= 100) {
            stopRecording();
            return 100;
          }
          return prev + 2; // 2% per interval (50 intervals = 100%)
        });
      }, 100);

    } catch (error) {
      toast({ 
        title: "Recording failed", 
        description: "Please allow microphone access",
        variant: "destructive" 
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setVoiceAnalysis(null);
    setRecordingProgress(0);
  };

  const playAudio = () => {
    if (audioBlob) {
      const audio = new Audio(URL.createObjectURL(audioBlob));
      audio.play();
    }
  };

  const handleAnalyze = () => {
    if (audioBlob) {
      analyzeVoiceMutation.mutate(audioBlob);
    }
  };

  const getCharacteristicColor = (value: string) => {
    const colors: Record<string, string> = {
      'excellent': 'bg-green-100 text-green-800',
      'good': 'bg-blue-100 text-blue-800',
      'fair': 'bg-yellow-100 text-yellow-800',
      'high': 'bg-green-100 text-green-800',
      'medium': 'bg-blue-100 text-blue-800',
      'low': 'bg-yellow-100 text-yellow-800',
      'warm': 'bg-orange-100 text-orange-800',
      'cheerful': 'bg-yellow-100 text-yellow-800',
      'calm': 'bg-blue-100 text-blue-800',
      'energetic': 'bg-red-100 text-red-800',
      'slow': 'bg-blue-100 text-blue-800',
      'moderate': 'bg-green-100 text-green-800',
      'fast': 'bg-red-100 text-red-800',
    };
    return colors[value.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 pb-20 sm:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
          Smart Voice Training
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          AI-powered voice analysis and improvement for storytelling
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Training Scripts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Training Scripts
            </CardTitle>
            <CardDescription>
              Choose a script to practice your storytelling voice
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {trainingScripts.map((script) => (
              <div
                key={script.id}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  currentScript?.id === script.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setCurrentScript(script)}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{script.title}</h4>
                  <Badge 

                    variant={script.difficulty === 'beginner' ? 'default' : 
                            script.difficulty === 'intermediate' ? 'secondary' : 'outline'}
                  >
                    {script.difficulty}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 mb-2">{script.focus}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>~{script.estimatedDuration}s</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recording Interface */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-green-600" />
              Voice Recording
            </CardTitle>
            <CardDescription>
              Record yourself reading the selected script
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentScript && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">{currentScript.title}</h4>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {currentScript.content}
                </p>
              </div>
            )}

            <div className="text-center space-y-4">
              {isRecording && (
                <div className="space-y-2">
                  <div className="animate-pulse">
                    <Mic className="h-8 w-8 mx-auto text-red-500" />
                  </div>
                  <Progress value={recordingProgress} className="w-full" />
                  <p className="text-sm text-gray-600">Recording... {Math.round(recordingProgress)}%</p>
                </div>
              )}

              {!isRecording && !audioBlob && (
                <Button
                  onClick={startRecording}
                  disabled={!currentScript}
                  className="w-full"
                  size="lg"
                >
                  <Mic className="h-5 w-5 mr-2" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <Button
                  onClick={stopRecording}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop Recording
                </Button>
              )}

              {audioBlob && !isRecording && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Button onClick={playAudio} variant="outline" className="flex-1">
                      <Play className="h-4 w-4 mr-2" />
                      Play
                    </Button>
                    <Button onClick={resetRecording} variant="outline" className="flex-1">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry
                    </Button>
                  </div>
                  <Button 
                    onClick={handleAnalyze}
                    disabled={analyzeVoiceMutation.isPending}
                    className="w-full"
                  >
                    {analyzeVoiceMutation.isPending ? (
                      <>
                        <Brain className="h-4 w-4 mr-2 animate-pulse" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Analyze Voice
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Voice Analysis Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              Voice Analysis
            </CardTitle>
            <CardDescription>
              AI insights and recommendations for improvement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {voiceAnalysis ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Transcript</h4>
                  <p className="text-sm text-gray-600 italic border-l-2 border-gray-300 pl-3">
                    "{voiceAnalysis.transcript}"
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Voice Characteristics</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(voiceAnalysis.voiceCharacteristics).map(([key, value]) => (
                      <div key={key} className="text-center">
                        <div className="text-xs text-gray-500 mb-1 capitalize">{key}</div>
                        <Badge className={getCharacteristicColor(value)}>
                          {value}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {voiceAnalysis.suggestions.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Improvement Suggestions
                    </h4>
                    <div className="space-y-2">
                      {voiceAnalysis.suggestions.map((suggestion, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-blue-800">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Volume2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Record and analyze your voice</p>
                <p className="text-sm">Get AI-powered feedback and suggestions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default SmartVoiceTraining;