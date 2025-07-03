import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Play, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SpeakerSegment {
  speakerId: string;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number;
  text?: string;
}

function AudioStitchingTest() {
  const [originalAudioPath, setOriginalAudioPath] = useState('');
  const [segments, setSegments] = useState<SpeakerSegment[]>([]);
  const [replacementMap, setReplacementMap] = useState<Record<string, string[]>>({});
  const [isStitching, setIsStitching] = useState(false);
  const [finalAudioUrl, setFinalAudioUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const handleStitchAudio = async () => {
    if (!originalAudioPath || segments.length === 0) {
      toast({
        title: "Missing Data",
        description: "Please provide original audio path and segments",
        variant: "destructive",
      });
      return;
    }

    setIsStitching(true);
    setFinalAudioUrl(null);

    try {
      const response = await fetch('/api/voice/stitch-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          originalAudioPath,
          segments,
          replacementMap,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setFinalAudioUrl(result.finalAudioUrl);
        toast({
          title: "Stitching Complete",
          description: result.message,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Stitching Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsStitching(false);
    }
  };

  const loadSampleData = () => {
    setOriginalAudioPath('temp/voice-processing/audio_1734897268687.wav');
    setSegments([
      {
        speakerId: 'SPEAKER_00',
        startTime: 0.0,
        endTime: 3.5,
        duration: 3.5,
        confidence: 0.95,
        text: 'Hello everyone, welcome to our show'
      },
      {
        speakerId: 'SPEAKER_01',
        startTime: 3.5,
        endTime: 7.2,
        duration: 3.7,
        confidence: 0.88,
        text: 'Thank you for having me here today'
      },
      {
        speakerId: 'SPEAKER_00',
        startTime: 7.2,
        endTime: 11.0,
        duration: 3.8,
        confidence: 0.92,
        text: 'Let\'s begin with our first topic'
      }
    ]);
    setReplacementMap({
      'SPEAKER_00': [
        'output/audio_replacements/session_123/SPEAKER_00_segment_0.mp3',
        'output/audio_replacements/session_123/SPEAKER_00_segment_2.mp3'
      ],
      'SPEAKER_01': [
        'output/audio_replacements/session_123/SPEAKER_01_segment_1.mp3'
      ]
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Audio Stitching Test</CardTitle>
          <CardDescription>
            Combine original audio with ElevenLabs voice replacements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="audioPath">Original Audio Path</Label>
              <Input
                id="audioPath"
                value={originalAudioPath}
                onChange={(e) => setOriginalAudioPath(e.target.value)}
                placeholder="Path to original audio file"
              />
            </div>

            <div>
              <Label htmlFor="segments">Speaker Segments (JSON)</Label>
              <Textarea
                id="segments"
                value={JSON.stringify(segments, null, 2)}
                onChange={(e) => {
                  try {
                    setSegments(JSON.parse(e.target.value));
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder="Segments with speaker IDs and timing"
                rows={8}
              />
            </div>

            <div>
              <Label htmlFor="replacements">Replacement Audio Map (JSON)</Label>
              <Textarea
                id="replacements"
                value={JSON.stringify(replacementMap, null, 2)}
                onChange={(e) => {
                  try {
                    setReplacementMap(JSON.parse(e.target.value));
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder="Map of speaker IDs to replacement audio file paths"
                rows={6}
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={loadSampleData} variant="outline">
              Load Sample Data
            </Button>
            <Button
              onClick={handleStitchAudio}
              disabled={isStitching}
              className="flex items-center gap-2"
            >
              {isStitching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {isStitching ? 'Stitching Audio...' : 'Stitch Final Audio'}
            </Button>
          </div>

          {finalAudioUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Final Audio Result</CardTitle>
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

export default AudioStitchingTest;