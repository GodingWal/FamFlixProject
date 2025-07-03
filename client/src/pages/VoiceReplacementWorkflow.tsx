import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload, Play, Download, Users, FileAudio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Person {
  id: number;
  name: string;
  userId: number;
  defaultFaceImageId?: number;
  defaultVoiceRecordingId?: number;
}

interface VoiceRecording {
  id: number;
  personId: number;
  filename: string;
  filePath: string;
  duration: number;
  isDefault: boolean;
}

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

export default function VoiceReplacementWorkflow() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDiarizing, setIsDiarizing] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [diarizationResult, setDiarizationResult] = useState<DiarizationResult | null>(null);
  const [speakerMappings, setSpeakerMappings] = useState<Record<string, number>>({});
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user's people profiles
  const { data: people = [] } = useQuery<Person[]>({
    queryKey: ['/api/people'],
  });

  // Fetch voice recordings for each person
  const { data: voiceRecordings = [] } = useQuery<VoiceRecording[]>({
    queryKey: ['/api/voiceRecordings'],
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setDiarizationResult(null);
      setFinalAudioUrl(null);
      setSpeakerMappings({});
    }
  };

  const handleDiarization = async () => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select an audio or video file first",
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
          title: "Speaker Analysis Complete",
          description: `${result.totalSpeakers} speakers identified`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Speaker Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDiarizing(false);
    }
  };

  const handleVoiceReplacement = async () => {
    if (!diarizationResult || Object.keys(speakerMappings).length === 0) {
      toast({
        title: "Missing Requirements",
        description: "Please complete speaker analysis and map speakers to your people",
        variant: "destructive",
      });
      return;
    }

    setIsReplacing(true);
    setFinalAudioUrl(null);

    try {
      // Convert person mappings to voice IDs using their voice recordings
      const speakerReplacements: Record<string, string> = {};
      
      for (const [speakerId, personId] of Object.entries(speakerMappings)) {
        const person = people.find(p => p.id === personId);
        const voiceRecording = voiceRecordings.find(v => 
          v.personId === personId && (v.isDefault || v.id === person?.defaultVoiceRecordingId)
        );
        
        if (voiceRecording) {
          // For now, we'll use placeholder ElevenLabs voice IDs
          // In production, you'd train ElevenLabs voices from the user's recordings
          const voiceMapping: Record<string, string> = {
            1: 'pNInz6obpgDQGcFmaJgB', // Adam
            2: 'EXAVITQu4vr4xnSDxMaL', // Sarah  
            3: 'VR6AewLTigWG4xSOukaG', // Arnold
            4: '21m00Tcm4TlvDq8ikWAM', // Rachel
            5: 'AZnzlk1XvdvUeBnXmlld', // Domi
          };
          
          speakerReplacements[speakerId] = voiceMapping[personId] || 'pNInz6obpgDQGcFmaJgB';
        }
      }

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

  const updateSpeakerMapping = (speakerId: string, personId: number) => {
    setSpeakerMappings(prev => ({
      ...prev,
      [speakerId]: personId
    }));
  };

  const removeSpeakerMapping = (speakerId: string) => {
    setSpeakerMappings(prev => {
      const updated = { ...prev };
      delete updated[speakerId];
      return updated;
    });
  };

  const getPeopleWithVoices = () => {
    return people.filter(person => 
      voiceRecordings.some(v => v.personId === person.id)
    );
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Voice Replacement Workflow</CardTitle>
          <CardDescription>
            Replace voices in audio/video using your family's voice training data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileAudio className="w-5 h-5" />
                Step 1: Upload Source Audio/Video
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="media">Select Audio or Video File</Label>
                  <Input
                    id="media"
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

          {/* Step 2: Speaker Mapping */}
          {diarizationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Step 2: Map Speakers to Your People</CardTitle>
                <CardDescription>
                  {diarizationResult.totalSpeakers} speakers identified. Map them to your family members.
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
                          value={speakerMappings[speakerId]?.toString() || ''}
                          onValueChange={(value) => {
                            if (value === 'none') {
                              removeSpeakerMapping(speakerId);
                            } else {
                              updateSpeakerMapping(speakerId, parseInt(value));
                            }
                          }}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue placeholder="Select person" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Keep Original</SelectItem>
                            {getPeopleWithVoices().map((person) => (
                              <SelectItem key={person.id} value={person.id.toString()}>
                                {person.name}
                              </SelectItem>
                            ))}
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
                <CardTitle className="text-lg">Step 3: Generate Personalized Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {Object.keys(speakerMappings).length} speakers mapped to your people
                  </p>
                  <Button
                    onClick={handleVoiceReplacement}
                    disabled={isReplacing || Object.keys(speakerMappings).length === 0}
                    className="flex items-center gap-2"
                  >
                    {isReplacing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isReplacing ? 'Processing Voices...' : 'Generate Personalized Audio'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Final Result */}
          {finalAudioUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personalized Audio Ready!</CardTitle>
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
                        Download Personalized Audio
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Helper for users without voice data */}
          {people.length === 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <p className="text-sm text-orange-800">
                  You don't have any people profiles yet. Create family member profiles with voice recordings in the{' '}
                  <a href="/people" className="underline font-medium">People Management</a> section first.
                </p>
              </CardContent>
            </Card>
          )}

          {getPeopleWithVoices().length === 0 && people.length > 0 && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-800">
                  Add voice recordings to your people profiles to enable voice replacement. Visit{' '}
                  <a href="/people" className="underline font-medium">People Management</a> to add voice training data.
                </p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}