import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ProcessedVideo, VideoTemplate } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Volume2, VolumeX, Info, Play, Calendar, Clock } from "lucide-react";
import CastButton from "@/components/CastButton";
import { saveVideoToDevice } from "@/lib/ml-utils";
import { useToast } from "@/hooks/use-toast";

const VideoPlayer = () => {
  const params = useParams<{ videoId?: string, templateId?: string }>();
  const [, navigate] = useLocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  
  // Extract ID based on which parameter is present
  const videoId = params.videoId ? parseInt(params.videoId) : undefined;
  const templateId = params.templateId ? parseInt(params.templateId) : undefined;
  
  // Determine mode: preview (direct template view) or processed video
  const isPreviewMode = !!templateId;
  const isProcessedVideo = !!videoId && !isNaN(videoId);
  
  // Fetch processed video data
  const { data: processedVideo, isLoading: isLoadingProcessed } = useQuery<ProcessedVideo>({
    queryKey: [`/api/processedVideos/${videoId}`],
    enabled: isProcessedVideo,
  });
  
  // If in preview mode or we can't find a processed video, check if it's a template directly
  const { data: templateVideo, isLoading: isLoadingTemplate } = useQuery<VideoTemplate>({
    queryKey: [`/api/videoTemplates/${isPreviewMode ? templateId : videoId}`],
    enabled: isPreviewMode || (!processedVideo && isProcessedVideo),
  });
  
  // If we have a processed video, fetch its template data
  const { data: processedVideoTemplate, isLoading: isLoadingProcessedTemplate } = useQuery<VideoTemplate>({
    queryKey: [`/api/videoTemplates/${processedVideo?.templateId}`],
    enabled: !!processedVideo?.templateId,
  });
  
  // The video data to use - either processed or template
  const video = processedVideo || templateVideo;
  const isLoading = isLoadingProcessed || isLoadingTemplate || (!!processedVideo && isLoadingProcessedTemplate);

  // Function to get video URL
  const getVideoUrl = (): string => {
    if (processedVideo && processedVideo.outputUrl) {
      // For processed videos with absolute URLs
      if (processedVideo.outputUrl && processedVideo.outputUrl.startsWith('http')) {
        return processedVideo.outputUrl;
      }
      // For relative URLs stored in the database
      return processedVideo.outputUrl || '';
    } else if (templateVideo && templateVideo.videoUrl) {
      // For template videos with absolute URLs
      if (templateVideo.videoUrl.startsWith('http')) {
        return templateVideo.videoUrl;
      }
      // For relative URLs stored in the database
      return templateVideo.videoUrl;
    }
    return '';
  };

  // Function to get video thumbnail
  const getThumbnailUrl = (): string => {
    if (processedVideo && processedVideo.outputUrl) {
      return processedVideo.outputUrl;
    } else if (processedVideoTemplate && processedVideoTemplate.thumbnailUrl) {
      // For template thumbnails with absolute URLs
      if (processedVideoTemplate.thumbnailUrl.startsWith('http')) {
        return processedVideoTemplate.thumbnailUrl;
      }
      // For relative URLs stored in the database
      return processedVideoTemplate.thumbnailUrl;
    } else if (templateVideo && templateVideo.thumbnailUrl) {
      // For template thumbnails with absolute URLs
      if (templateVideo.thumbnailUrl.startsWith('http')) {
        return templateVideo.thumbnailUrl;
      }
      // For relative URLs stored in the database
      return templateVideo.thumbnailUrl;
    }
    return '';
  };

  // Function to get video title
  const getVideoTitle = (): string => {
    if (processedVideoTemplate) {
      return processedVideoTemplate.title;
    } else if (templateVideo) {
      return templateVideo.title;
    }
    return 'Video';
  };

  // Function to get video description
  const getVideoDescription = (): string => {
    if (processedVideoTemplate) {
      return processedVideoTemplate.description;
    } else if (templateVideo) {
      return templateVideo.description;
    }
    return '';
  };
  
  // Function to get the active template with null safety
  const getActiveTemplate = (): VideoTemplate | undefined => {
    return processedVideoTemplate || templateVideo || undefined;
  };
  
  // Update progress bar as video plays
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;
    
    const updateProgress = () => {
      const currentProgress = (videoElement.currentTime / videoElement.duration) * 100;
      setProgress(currentProgress);
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    
    videoElement.addEventListener('timeupdate', updateProgress);
    videoElement.addEventListener('play', handlePlay);
    videoElement.addEventListener('pause', handlePause);
    videoElement.addEventListener('ended', handleEnded);
    
    return () => {
      videoElement.removeEventListener('timeupdate', updateProgress);
      videoElement.removeEventListener('play', handlePlay);
      videoElement.removeEventListener('pause', handlePause);
      videoElement.removeEventListener('ended', handleEnded);
    };
  }, [videoRef.current]);
  
  // Toggle play/pause
  const togglePlayPause = () => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (!videoRef.current) return;
    
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(!isMuted);
  };
  
  // Handle download
  const handleDownload = () => {
    if (!video) return;
    
    const filename = `${getVideoTitle().replace(/\s+/g, '-').toLowerCase()}.mp4`;
    
    saveVideoToDevice(getVideoUrl(), filename)
      .then(success => {
        if (success) {
          toast({
            title: "Download complete",
            description: "Video saved to your device"
          });
        } else {
          toast({
            title: "Download failed",
            description: "Unable to save the video",
            variant: "destructive"
          });
        }
      });
  };
  
  // Go back
  const handleGoBack = () => {
    if (processedVideo) {
      navigate("/saved");
    } else {
      navigate("/library");
    }
  };
  
  // Check for valid ID in either mode
  if (!isPreviewMode && (videoId === undefined || isNaN(videoId)) && !templateId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Invalid video ID</h2>
            <Button onClick={() => navigate("/library")}>Go to Library</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={handleGoBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
      
      {isLoading ? (
        <Card>
          <div className="aspect-video bg-muted animate-pulse w-full" />
          <CardContent className="py-6">
            <div className="h-8 w-1/2 bg-muted animate-pulse rounded mb-4" />
            <div className="h-4 w-full bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ) : !video ? (
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Video not found</h2>
            <Button onClick={() => navigate("/library")}>Go to Library</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Video player */}
          <Card className="overflow-hidden">
            <div className="relative aspect-video bg-black">
              <video
                ref={videoRef}
                src={getVideoUrl()}
                className="w-full h-full"
                poster={getThumbnailUrl()}
                onClick={togglePlayPause}
                controls
                controlsList="nodownload"
                playsInline
              />
            </div>
          </Card>
          
          {/* Video info and controls */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold">{getVideoTitle()}</h1>
                    {processedVideo && (
                      <Badge variant={processedVideo.status === "completed" ? "default" : "secondary"}>
                        {processedVideo.status}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    {getActiveTemplate() && (
                      <>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          <span>Age: {getActiveTemplate()?.ageRange} years</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Info size={14} />
                          <span>Category: {getActiveTemplate()?.category}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={14} />
                          <span>
                            {Math.floor((getActiveTemplate()?.duration || 0) / 60)}:
                            {((getActiveTemplate()?.duration || 0) % 60).toString().padStart(2, '0')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg mb-6">
                    <p className="leading-relaxed">
                      {getVideoDescription()}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 min-w-[200px]">
                  <Button
                    size="lg"
                    className="w-full justify-start gap-2"
                    onClick={togglePlayPause}
                  >
                    <Play size={18} />
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full justify-start gap-2"
                    onClick={toggleMute}
                  >
                    {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                    {isMuted ? "Unmute" : "Mute"}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full justify-start gap-2"
                    onClick={handleDownload}
                  >
                    <Download size={18} />
                    Download
                  </Button>
                  
                  <CastButton
                    videoUrl={getVideoUrl()}
                    videoTitle={getVideoTitle()}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;
