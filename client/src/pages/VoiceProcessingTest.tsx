import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Play, Download, Upload } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import type { VideoTemplate, Person } from '@shared/schema';

export default function VoiceProcessingTest() {
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [targetText, setTargetText] = useState('');
  const [extractedAudio, setExtractedAudio] = useState<{ 
    url: string; 
    duration: number; 
    speakers?: {
      success: boolean;
      totalSpeakers: number;
      speakers: {
        [key: string]: {
          totalDuration: number;
          segments: Array<{
            speakerId: string;
            startTime: number;
            endTime: number;
            duration: number;
            confidence: number;
          }>;
        };
      };
    };
  } | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<{ text: string; duration: number } | null>(null);
  const [processedVideo, setProcessedVideo] = useState<{ url: string; transcription?: string } | null>(null);

  const queryClient = useQueryClient();

  // Get video templates
  const { data: templates } = useQuery<VideoTemplate[]>({
    queryKey: ['/api/videoTemplates']
  });

  // Get user's people
  const { data: people } = useQuery<Person[]>({
    queryKey: ['/api/users/1/people']
  });

  // Audio extraction mutation
  const extractAudioMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch('/api/voice/extract-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoTemplateId: templateId })
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data: any) => {
      setExtractedAudio({
        url: data.audioUrl,
        duration: data.duration
      });
    }
  });

  // Test extraction mutation
  const testExtractionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/voice/test-extraction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data: any) => {
      setExtractedAudio({
        url: data.audioUrl,
        duration: data.duration
      });
    }
  });

  // Transcription mutation
  const transcribeMutation = useMutation({
    mutationFn: async (audioUrl: string) => {
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioUrl })
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data: any) => {
      setTranscriptionResult({
        text: data.text,
        duration: data.duration
      });
      if (!targetText) {
        setTargetText(data.text);
      }
    }
  });

  // Voice processing mutation
  const processVoiceMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoTemplateId: selectedTemplate,
          personId: selectedPerson,
          targetText: targetText || undefined
        })
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data: any) => {
      setProcessedVideo({
        url: data.outputUrl,
        transcription: data.transcription
      });
    }
  });

  // Voice synthesis test mutation
  const testSynthesisMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/voice/test-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: targetText || "Hello, this is a test of voice synthesis using the FamFlix platform."
        })
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    }
  });

  // Advanced extraction and diarization mutation
  const advancedExtractionMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await fetch('/api/voice/extract-and-diarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoTemplateId: templateId })
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: (data: any) => {
      setExtractedAudio({
        url: data.audioUrl,
        duration: 136, // Default duration
        speakers: {
          success: true,
          totalSpeakers: Object.keys(data.speakers).length,
          speakers: data.speakers,
          fullText: data.fullText
        }
      });
    }
  });

  const handleExtractAudio = () => {
    if (selectedTemplate) {
      extractAudioMutation.mutate(selectedTemplate);
    }
  };

  const handleTranscribe = () => {
    if (extractedAudio) {
      transcribeMutation.mutate(extractedAudio.url);
    }
  };

  const handleProcessVoice = () => {
    if (selectedTemplate && selectedPerson) {
      processVoiceMutation.mutate();
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Voice Processing Pipeline Test</h1>
        <p className="text-muted-foreground">
          Test the complete voice processing workflow: Audio extraction → Transcription → Voice synthesis → Video output
        </p>
      </div>

      {/* Step 1: Select Template and Person */}
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Select Video Template</label>
            <Select value={selectedTemplate?.toString() || ''} onValueChange={(value) => setSelectedTemplate(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a video template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.map(template => (
                  <SelectItem key={template.id} value={template.id.toString()}>
                    {template.title} ({template.duration}s)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Select Person (Voice Source)</label>
            <Select value={selectedPerson?.toString() || ''} onValueChange={(value) => setSelectedPerson(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a person with voice recording" />
              </SelectTrigger>
              <SelectContent>
                {people?.map(person => (
                  <SelectItem key={person.id} value={person.id.toString()}>
                    {person.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Step 2: Extract Audio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Step 2</span>
            Audio Extraction
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={handleExtractAudio}
              disabled={!selectedTemplate || extractAudioMutation.isPending}
            >
              {extractAudioMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Extracting Audio...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Extract Audio from Video
                </>
              )}
            </Button>
            
            <Button 
              variant="outline"
              onClick={() => testExtractionMutation.mutate()}
              disabled={testExtractionMutation.isPending}
            >
              {testExtractionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Audio Extraction'
              )}
            </Button>
          </div>

          {extractAudioMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Audio extraction failed: {extractAudioMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}

          {advancedExtractionMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Advanced extraction failed: {advancedExtractionMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}

          {testExtractionMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Test extraction failed: {testExtractionMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}

          {extractedAudio && (
            <div className="bg-green-50 border border-green-200 rounded p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Badge variant="secondary" className="mb-2">Audio Extracted</Badge>
                  <p className="text-sm">Duration: {extractedAudio.duration.toFixed(2)}s</p>
                </div>
                <audio controls src={extractedAudio.url} className="max-w-xs" />
              </div>
              
              {extractedAudio.speakers && extractedAudio.speakers.success && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Speaker Diarization Results</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Found {extractedAudio.speakers.totalSpeakers} speaker(s)
                  </p>
                  
                  {extractedAudio.speakers.fullText && (
                    <div className="mb-4 p-3 bg-blue-50 rounded border">
                      <h5 className="text-sm font-medium mb-2">Transcribed Content:</h5>
                      <p className="text-sm">{extractedAudio.speakers.fullText}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    {Object.entries(extractedAudio.speakers.speakers).map(([speakerId, speaker]) => (
                      <div key={speakerId} className="bg-white p-3 rounded border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{speakerId}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {speaker.totalDuration?.toFixed(1) || speaker.segments?.length || 0} segments
                          </span>
                        </div>
                        
                        <div className="text-xs text-muted-foreground">
                          {speaker.segments?.length || 0} segment(s):
                        </div>
                        
                        <div className="mt-1 space-y-1">
                          {(speaker.segments || []).slice(0, 3).map((segment: any, idx: number) => (
                            <div key={idx} className="text-xs bg-gray-50 p-1 rounded">
                              {segment.startTime?.toFixed(1) || segment.start?.toFixed(1) || 0}s - {segment.endTime?.toFixed(1) || segment.end?.toFixed(1) || 0}s
                              {segment.text && (
                                <div className="mt-1 text-gray-600">"{segment.text}"</div>
                              )}
                            </div>
                          ))}
                          {(speaker.segments || []).length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              ... and {(speaker.segments || []).length - 3} more segments
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {extractedAudio.speakers && !extractedAudio.speakers.success && (
                <div className="border-t pt-4">
                  <Alert>
                    <AlertDescription>
                      Speaker diarization failed: Using audio without speaker identification
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Transcription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">Step 3</span>
            Audio Transcription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleTranscribe}
            disabled={!extractedAudio || transcribeMutation.isPending}
          >
            {transcribeMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Transcribing...
              </>
            ) : (
              'Transcribe Audio with OpenAI Whisper'
            )}
          </Button>

          {transcribeMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Transcription failed: {transcribeMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}

          {transcriptionResult && (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <Badge variant="secondary" className="mb-2">Transcription Complete</Badge>
              <p className="text-sm font-medium mb-2">Detected Text:</p>
              <p className="text-sm bg-white p-2 rounded border">{transcriptionResult.text}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Target Text (optional - leave empty to use transcription)
            </label>
            <Textarea
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              placeholder="Enter custom text for voice synthesis, or leave empty to use transcribed text"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Step 4: Complete Processing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">Step 4</span>
            Complete Voice Processing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm text-yellow-800">
              This will run the complete pipeline: Extract audio → Transcribe → Synthesize voice → Replace audio in video
            </p>
          </div>

          <Button 
            onClick={handleProcessVoice}
            disabled={!selectedTemplate || !selectedPerson || processVoiceMutation.isPending}
            size="lg"
          >
            {processVoiceMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Voice Replacement...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Process Complete Voice Replacement
              </>
            )}
          </Button>

          {processVoiceMutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>
                Voice processing failed: {processVoiceMutation.error?.message}
              </AlertDescription>
            </Alert>
          )}

          {processedVideo && (
            <div className="bg-green-50 border border-green-200 rounded p-6">
              <Badge variant="default" className="mb-4">Processing Complete!</Badge>
              
              <div className="space-y-4">
                <div>
                  <p className="font-medium mb-2">Final Video:</p>
                  <video controls src={processedVideo.url} className="w-full max-w-md rounded border" />
                </div>
                
                {processedVideo.transcription && (
                  <div>
                    <p className="font-medium mb-2">Used Transcription:</p>
                    <p className="text-sm bg-white p-2 rounded border">{processedVideo.transcription}</p>
                  </div>
                )}
                
                <Button variant="outline" asChild>
                  <a href={processedVideo.url} download>
                    <Download className="mr-2 h-4 w-4" />
                    Download Processed Video
                  </a>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Status */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="font-medium">OpenAI (Whisper)</span>
              <Badge variant="outline">Required for transcription</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <span className="font-medium">ElevenLabs</span>
              <Badge variant="secondary">Optional (premium voice)</Badge>
            </div>
          </div>
          
          <Alert className="mt-4">
            <AlertDescription>
              If API keys are missing, the system will use fallback methods: 
              transcription will fail gracefully, and voice synthesis will use local TTS (espeak).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}