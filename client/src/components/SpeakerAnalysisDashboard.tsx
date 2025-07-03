import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Play, 
  Pause, 
  Loader2, 
  Users, 
  BarChart3,
  Clock,
  FileAudio,
  AudioWaveform,
  Download,
  RefreshCw
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface SpeakerSegment {
  speakerId: string;
  startTime: number;
  endTime: number;
  duration: number;
  confidence: number;
}

interface SpeakerStatistics {
  [speakerId: string]: {
    total_time: number;
    segment_count: number;
    percentage: number;
  };
}

interface SpeakerAnalysisResult {
  analysisId: string;
  videoTitle: string;
  templateId: number | null;
  analysis: {
    totalSpeakers: number;
    totalSegments: number;
    totalSpeechDuration: number;
    primarySpeaker: string;
    speakerStatistics: SpeakerStatistics;
    segments: SpeakerSegment[];
  };
  processedAt: string;
  processingMethod: string;
}

interface VideoTemplate {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
}

export function SpeakerAnalysisDashboard() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [analysisResult, setAnalysisResult] = useState<SpeakerAnalysisResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const { toast } = useToast();

  // Fetch video templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/videoTemplates'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/videoTemplates');
      return await response.json();
    }
  });

  // Speaker analysis mutation
  const analyzeSpeakersMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest('POST', '/api/video/analyze-speakers', {
        templateId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze speakers');
      }

      return await response.json();
    },
    onSuccess: (data: SpeakerAnalysisResult) => {
      setAnalysisResult(data);
      toast({
        title: 'Speaker analysis complete',
        description: `Found ${data.analysis.totalSpeakers} speakers in ${data.analysis.totalSegments} segments`
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Speaker analysis failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleAnalyzeTemplate = () => {
    if (!selectedTemplateId) {
      toast({
        title: 'No template selected',
        description: 'Please select a video template to analyze',
        variant: 'destructive'
      });
      return;
    }

    analyzeSpeakersMutation.mutate(selectedTemplateId);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSpeakerColor = (speakerId: string, index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AudioWaveform className="h-5 w-5 text-primary" />
            Advanced Speaker Analysis
          </CardTitle>
          <CardDescription>
            Analyze video templates using pyannote.audio to identify multiple speakers and their speech patterns
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Template Selection */}
          <div className="space-y-3">
            <Label>Select Video Template</Label>
            <div className="flex gap-3">
              <Select 
                value={selectedTemplateId?.toString() || ''} 
                onValueChange={(value) => setSelectedTemplateId(parseInt(value))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Choose a video template to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {templatesLoading ? (
                    <SelectItem value="loading" disabled>Loading templates...</SelectItem>
                  ) : (
                    templates.map((template: VideoTemplate) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        {template.title} ({formatTime(template.duration || 0)})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              
              <Button
                onClick={handleAnalyzeTemplate}
                disabled={!selectedTemplateId || analyzeSpeakersMutation.isPending}
                className="gap-2"
              >
                {analyzeSpeakersMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4" />
                )}
                Analyze Speakers
              </Button>
            </div>
          </div>

          {/* Analysis Progress */}
          {analyzeSpeakersMutation.isPending && (
            <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div>
                  <p className="font-medium text-blue-800">Analyzing speakers...</p>
                  <p className="text-sm text-blue-600">
                    Using advanced ML models to identify different voices in the video
                  </p>
                </div>
              </div>
              <Progress value={30} className="h-2" />
            </div>
          )}

          {/* Analysis Results */}
          {analysisResult && (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold text-blue-900">
                        {analysisResult.analysis.totalSpeakers}
                      </p>
                      <p className="text-sm text-blue-700">Total Speakers</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <FileAudio className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold text-green-900">
                        {analysisResult.analysis.totalSegments}
                      </p>
                      <p className="text-sm text-green-700">Speech Segments</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold text-purple-900">
                        {formatTime(analysisResult.analysis.totalSpeechDuration)}
                      </p>
                      <p className="text-sm text-purple-700">Speech Duration</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg border">
                  <div className="flex items-center gap-2">
                    <AudioWaveform className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-lg font-bold text-orange-900">
                        {analysisResult.analysis.primarySpeaker}
                      </p>
                      <p className="text-sm text-orange-700">Primary Speaker</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Speaker Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Speaker Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(analysisResult.analysis.speakerStatistics).map(([speakerId, stats], index) => (
                      <div key={speakerId} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge className={getSpeakerColor(speakerId, index)}>
                              {speakerId}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {stats.segment_count} segments
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatTime(stats.total_time)}</p>
                            <p className="text-sm text-muted-foreground">
                              {stats.percentage.toFixed(1)}%
                            </p>
                          </div>
                        </div>
                        <Progress value={stats.percentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Speech Timeline</CardTitle>
                  <CardDescription>
                    Chronological breakdown of speaker segments
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {analysisResult.analysis.segments
                      .sort((a, b) => a.startTime - b.startTime)
                      .map((segment, index) => {
                        const speakerIndex = Object.keys(analysisResult.analysis.speakerStatistics)
                          .findIndex(id => id === segment.speakerId);
                        
                        return (
                          <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <Badge className={getSpeakerColor(segment.speakerId, speakerIndex)}>
                              {segment.speakerId}
                            </Badge>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  ({segment.duration.toFixed(1)}s)
                                </span>
                              </div>
                              <div className="mt-1">
                                <Progress 
                                  value={segment.confidence * 100} 
                                  className="h-1" 
                                />
                                <span className="text-xs text-muted-foreground">
                                  {(segment.confidence * 100).toFixed(0)}% confidence
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>

              {/* Analysis Metadata */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Analysis ID: {analysisResult.analysisId}</span>
                  <span>Method: {analysisResult.processingMethod}</span>
                  <span>Processed: {new Date(analysisResult.processedAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}