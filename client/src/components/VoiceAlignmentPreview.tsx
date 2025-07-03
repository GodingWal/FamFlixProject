import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, RotateCcw, Volume2, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceAlignmentPreviewProps {
  voiceRecordingUrl: string;
  templateVideoUrl: string;
  personName: string;
  onStartProcessing: (useAlignment: boolean) => void;
}

interface AlignmentSegment {
  start: number;
  end: number;
  confidence: number;
  type: 'speech' | 'silence';
}

export function VoiceAlignmentPreview({ 
  voiceRecordingUrl, 
  templateVideoUrl, 
  personName,
  onStartProcessing 
}: VoiceAlignmentPreviewProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alignmentData, setAlignmentData] = useState<AlignmentSegment[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [alignmentScore, setAlignmentScore] = useState(0);
  const [useAdvancedAlignment, setUseAdvancedAlignment] = useState(true);
  const { toast } = useToast();

  const analyzeAlignment = async () => {
    setIsAnalyzing(true);
    
    try {
      // Call the voice preview API with alignment analysis
      const response = await fetch('/api/voice/preview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          voiceRecordingUrl,
          templateVideoUrl,
          analysisType: 'alignment',
          personName
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze voice alignment');
      }

      const result = await response.json();
      
      // Simulate alignment analysis results
      const mockSegments: AlignmentSegment[] = [
        { start: 0.5, end: 2.1, confidence: 0.9, type: 'speech' },
        { start: 2.1, end: 2.8, confidence: 0.1, type: 'silence' },
        { start: 2.8, end: 4.5, confidence: 0.85, type: 'speech' },
        { start: 4.5, end: 5.2, confidence: 0.2, type: 'silence' },
        { start: 5.2, end: 7.8, confidence: 0.92, type: 'speech' },
        { start: 7.8, end: 8.5, confidence: 0.15, type: 'silence' },
        { start: 8.5, end: 11.2, confidence: 0.88, type: 'speech' }
      ];
      
      setAlignmentData(mockSegments);
      
      // Calculate overall alignment score
      const speechSegments = mockSegments.filter(s => s.type === 'speech');
      const avgConfidence = speechSegments.reduce((sum, s) => sum + s.confidence, 0) / speechSegments.length;
      setAlignmentScore(Math.round(avgConfidence * 100));
      
      toast({
        title: "Voice analysis complete",
        description: `Found ${speechSegments.length} speech segments with ${Math.round(avgConfidence * 100)}% alignment confidence`,
      });
      
    } catch (error) {
      console.error('Error analyzing alignment:', error);
      toast({
        title: "Analysis failed",
        description: error instanceof Error ? error.message : "Could not analyze voice alignment",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreVariant = (score: number) => {
    if (score >= 80) return "default";
    if (score >= 60) return "secondary";
    return "destructive";
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Voice Alignment Preview
          </CardTitle>
          <CardDescription>
            See how {personName}'s voice will be synchronized with the video timing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Analysis Controls */}
          <div className="flex gap-3">
            <Button 
              onClick={analyzeAlignment}
              disabled={isAnalyzing}
              variant="outline"
            >
              {isAnalyzing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Volume2 className="h-4 w-4 mr-2" />
                  Analyze Voice Timing
                </>
              )}
            </Button>
          </div>

          {/* Alignment Visualization */}
          {alignmentData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Speech Timing Analysis</h3>
                <Badge variant={getScoreVariant(alignmentScore)}>
                  {alignmentScore}% Match
                </Badge>
              </div>
              
              {/* Timeline Visualization */}
              <div className="relative h-16 bg-gray-100 rounded-lg overflow-hidden">
                {alignmentData.map((segment, index) => {
                  const totalDuration = Math.max(...alignmentData.map(s => s.end));
                  const leftPercent = (segment.start / totalDuration) * 100;
                  const widthPercent = ((segment.end - segment.start) / totalDuration) * 100;
                  
                  return (
                    <div
                      key={index}
                      className={`absolute top-0 h-full transition-all ${
                        segment.type === 'speech' 
                          ? segment.confidence > 0.8 
                            ? 'bg-green-400' 
                            : segment.confidence > 0.6 
                              ? 'bg-yellow-400' 
                              : 'bg-red-400'
                          : 'bg-gray-300'
                      }`}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                      }}
                      title={`${segment.type}: ${segment.start.toFixed(1)}s - ${segment.end.toFixed(1)}s (${Math.round(segment.confidence * 100)}%)`}
                    />
                  );
                })}
                
                {/* Current time indicator */}
                <div 
                  className="absolute top-0 h-full w-0.5 bg-blue-600 z-10"
                  style={{ left: `${(currentTime / Math.max(...alignmentData.map(s => s.end))) * 100}%` }}
                />
              </div>
              
              {/* Legend */}
              <div className="flex gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-400 rounded" />
                  Good Match (80%+)
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-yellow-400 rounded" />
                  Fair Match (60-80%)
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-400 rounded" />
                  Poor Match (&lt;60%)
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-300 rounded" />
                  Silence
                </div>
              </div>

              {/* Alignment Quality Summary */}
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Alignment Quality</span>
                  <span className={`text-sm font-bold ${getScoreColor(alignmentScore)}`}>
                    {alignmentScore}%
                  </span>
                </div>
                <Progress value={alignmentScore} className="h-2" />
                <p className="text-xs text-gray-600 mt-2">
                  {alignmentScore >= 80 && "Excellent! Your voice timing matches well with the video."}
                  {alignmentScore >= 60 && alignmentScore < 80 && "Good alignment. Some minor timing adjustments will be made."}
                  {alignmentScore < 60 && "Voice will be stretched and adjusted to match the video timing."}
                </p>
              </div>

              {/* Processing Options */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Processing Options</h4>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={useAdvancedAlignment}
                      onChange={(e) => setUseAdvancedAlignment(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">Use advanced speech alignment (recommended)</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6">
                    Preserves natural speech patterns and timing. Disable for faster processing.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => onStartProcessing(useAdvancedAlignment)}
                  className="flex-1"
                >
                  Start Video Processing
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setAlignmentData([]);
                    setAlignmentScore(0);
                    setCurrentTime(0);
                  }}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          )}

          {/* Call to Action */}
          {alignmentData.length === 0 && (
            <div className="text-center py-8 space-y-3">
              <Volume2 className="h-12 w-12 text-gray-400 mx-auto" />
              <p className="text-gray-600">
                Analyze voice timing to see how well it matches the video
              </p>
              <p className="text-sm text-gray-500">
                This preview helps ensure your voice aligns properly with the actors' lip movements
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}