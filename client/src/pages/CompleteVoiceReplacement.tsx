import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Play, Download, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SpeakerData {
  totalDuration: number;
  segments: Array<{
    speakerId: string;
    startTime: number;
    endTime: number;
    duration: number;
    confidence: number;
    text?: string;
  }>;
}

interface DiarizationResult {
  success: boolean;
  speakers: Record<string, SpeakerData>;
  totalSpeakers: number;
  originalAudio: string;
}

function CompleteVoiceReplacement() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDiarizing, setIsDiarizing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [diarizationResult, setDiarizationResult] = useState<DiarizationResult | null>(null);
  const [speakerReplacements, setSpeakerReplacements] = useState<Record<string, string>>({});
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDiarizationResult(null);
      setFinalAudioUrl(null);
      setSpeakerReplacements({});
    }
  };

  const handleDiarization = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select an audio file first",
        variant: "destructive",
      });
      return;
    }

    setIsDiarizing(true);

    try {
      const formData = new FormData();
      formData.append('audio', selectedFile);

      const response = await fetch('/api/voice/diarize', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setDiarizationResult(result);
        toast({
          title: "Diarization Complete",
          description: `${result.totalSpeakers} speakers identified`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Diarization Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDiarizing(false);
    }
  };

  const handleVoiceReplacement = async () => {
    if (!diarizationResult || Object.keys(speakerReplacements).length === 0) {
      toast({
        title: "Missing Requirements",
        description: "Please complete diarization and select voices for replacement",
        variant: "destructive",
      });
      return;
    }

    setIsReplacing(true);
    setFinalAudioUrl(null);

    try {
      const response = await fetch('/api/voice/replace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speakerReplacements,
          originalAudio: diarizationResult.originalAudio,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFinalAudioUrl(result.output);
        toast({
          title: "Voice Replacement Complete",
          description: result.message,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Voice Replacement Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReplacing(false);
    }
  };

  const updateSpeakerReplacement = (speakerId: string, voiceId: string) => {
    setSpeakerReplacements(prev => ({
      ...prev,
      [speakerId]: voiceId
    }));
  };

  const removeSpeakerReplacement = (speakerId: string) => {
    setSpeakerReplacements(prev => {
      const updated = { ...prev };
      delete updated[speakerId];
      return updated;
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Complete Voice Replacement Pipeline</CardTitle>
          <CardDescription>
            Upload audio, identify speakers, and replace voices with ElevenLabs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Step 1: Upload Audio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="audio">Select Audio File</Label>
                  <Input
                    id="audio"
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileSelect}
                  />
                </div>
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
                <Button
                  onClick={handleDiarization}
                  disabled={!selectedFile || isDiarizing}
                  className="flex items-center gap-2"
                >
                  {isDiarizing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Users className="w-4 h-4" />
                  )}
                  {isDiarizing ? 'Analyzing Speakers...' : 'Analyze Speakers'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Speaker Selection */}
          {diarizationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Configure Voice Replacements</CardTitle>
                <CardDescription>
                  {diarizationResult.totalSpeakers} speakers identified. Select which voices to replace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(diarizationResult.speakers).map(([speakerId, speakerData]) => (
                    <div key={speakerId} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{speakerId}</h4>
                        <p className="text-sm text-muted-foreground">
                          {speakerData.segments.length} segments • {speakerData.totalDuration.toFixed(1)}s total
                        </p>
                        {speakerData.segments[0]?.text && (
                          <p className="text-xs text-muted-foreground mt-1">
                            "{speakerData.segments[0].text.substring(0, 100)}..."
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={speakerReplacements[speakerId] || ''}
                          onValueChange={(value) => {
                            if (value === 'none') {
                              removeSpeakerReplacement(speakerId);
                            } else {
                              updateSpeakerReplacement(speakerId, value);
                            }
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select replacement voice" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Keep Original</SelectItem>
                            <SelectItem value="pNInz6obpgDQGcFmaJgB">Adam (Deep)</SelectItem>
                            <SelectItem value="EXAVITQu4vr4xnSDxMaL">Sarah (Female)</SelectItem>
                            <SelectItem value="VR6AewLTigWG4xSOukaG">Arnold (Strong)</SelectItem>
                            <SelectItem value="21m00Tcm4TlvDq8ikWAM">Rachel (Calm)</SelectItem>
                            <SelectItem value="AZnzlk1XvdvUeBnXmlld">Domi (Friendly)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Process Replacement */}
          {diarizationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 3: Generate Final Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {Object.keys(speakerReplacements).length} speakers selected for replacement
                  </p>
                  <Button
                    onClick={handleVoiceReplacement}
                    disabled={isReplacing || Object.keys(speakerReplacements).length === 0}
                    className="flex items-center gap-2"
                  >
                    {isReplacing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isReplacing ? 'Processing Voices...' : 'Generate Final Audio'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Final Result */}
          {finalAudioUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Final Result</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <audio controls className="w-full">
                    <source src={finalAudioUrl} type="audio/mpeg" />
                    Your browser does not support the audio element.
                  </audio>
                  <div className="flex gap-2">
                    <Button asChild>
                      <a href={finalAudioUrl} download>
                        <Download className="w-4 h-4 mr-2" />
                        Download Final Audio
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default CompleteVoiceReplacement;