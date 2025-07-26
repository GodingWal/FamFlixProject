import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Lock, CreditCard, Sparkles, Download, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { VideoTemplate, ProcessedVideo } from "@shared/schema";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";

type VideoCardProps = {
  video: VideoTemplate | ProcessedVideo;
  type: "template" | "processed";
  onSelect?: (id: number) => void;
};

// Helper function to determine if a video is a template or processed video
const isVideoTemplate = (video: VideoTemplate | ProcessedVideo): video is VideoTemplate => {
  return 'thumbnailUrl' in video;
};

const isProcessedVideo = (video: VideoTemplate | ProcessedVideo): video is ProcessedVideo => {
  return 'status' in video;
};

const VideoCard = ({ video, type, onSelect }: VideoCardProps) => {
  // Format duration to minutes and seconds
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Check if video is processed
  const isProcessed = type === "processed";
  
  // Fetch template data if this is a processed video
  const { data: templateData } = useQuery<VideoTemplate>({
    queryKey: ['/api/videoTemplates', isProcessed ? (video as ProcessedVideo).templateId : null],
    enabled: isProcessed // Only run the query if this is a processed video
  });
  
  // Get status badge for processed videos
  const getStatusBadge = () => {
    if (!isProcessed) return null;
    
    const processedVideo = video as ProcessedVideo;
    const statusConfig = {
      pending: {
        variant: "outline" as const,
        className: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
        icon: <Clock className="h-3 w-3 mr-1" />,
        text: "Pending"
      },
      processing: {
        variant: "outline" as const,
        className: "bg-blue-500/10 text-blue-700 border-blue-200",
        icon: <Loader2 className="h-3 w-3 mr-1 animate-spin" />,
        text: "Processing"
      },
      completed: {
        variant: "outline" as const,
        className: "bg-green-500/10 text-green-700 border-green-200",
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
        text: "Completed"
      },
      failed: {
        variant: "outline" as const,
        className: "bg-red-500/10 text-red-700 border-red-200",
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
        text: "Failed"
      }
    };
    
    const config = statusConfig[processedVideo.status as keyof typeof statusConfig];
    if (!config) return null;
    
    return (
      <Badge variant={config.variant} className={`${config.className} flex items-center`}>
        {config.icon}
        {config.text}
      </Badge>
    );
  };
  
  // For navigation
  const [, navigate] = useLocation();

  // Action button based on video type
  const actionButton = () => {
    if (isProcessed) {
      const processedVideo = video as ProcessedVideo;
      if (processedVideo.status === "completed") {
        return (
          <div className="space-y-2">
            <Link href={`/player/${video.id}`} className="block">
              <Button className="w-full gap-2 button-gradient group">
                <Play size={16} className="group-hover:scale-110 transition-transform" />
                Watch Video
              </Button>
            </Link>
            <Button variant="outline" className="w-full gap-2 group">
              <Download size={16} className="group-hover:translate-y-0.5 transition-transform" />
              Download
            </Button>
          </div>
        );
      } else {
        return (
          <Button disabled={true} className="w-full gap-2">
            {processedVideo.status === "processing" ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Processing...
              </>
            ) : processedVideo.status === "failed" ? (
              <>
                <AlertCircle size={16} />
                Processing Failed
              </>
            ) : (
              <>
                <Clock size={16} />
                Pending...
              </>
            )}
          </Button>
        );
      }
    } else {
      // Handle template videos
      const template = video as VideoTemplate;
      
      // If it's a premium template, show the purchase button
      if (template.isPremium) {
        return (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Badge className="flex items-center bg-gradient-to-r from-yellow-500 to-amber-500 text-white border-0 shadow-md">
                <Sparkles size={12} className="mr-1" />
                Premium
              </Badge>
              <span className="font-bold text-2xl gradient-text">${template.price?.toFixed(2)}</span>
            </div>
            <Button 
              onClick={() => navigate(`/checkout/${template.id}`)}
              className="w-full gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all group"
            >
              <CreditCard size={16} className="group-hover:scale-110 transition-transform" />
              Purchase Now
            </Button>
          </div>
        );
      } else {
        // Special handling for Baby Shark (ID 8) - selective voice replacement
        if (template.id === 8) {
          return (
            <div className="space-y-2">
              <Button 
                onClick={() => navigate(`/selective-voice/${template.id}`)} 
                className="w-full gap-2"
              >
                Selective Voice Replacement
              </Button>
              <Button 
                onClick={() => navigate('/voice-only')} 
                variant="outline"
                className="w-full gap-2"
              >
                Replace All Voices
              </Button>
              <Link href="/simple-preview">
                <Button 
                  variant="outline" 
                  className="w-full gap-2"
                >
                  <Play size={16} />
                  Preview Original
                </Button>
              </Link>
            </div>
          );
        }
        
        // Regular non-premium template
        return (
          <div className="space-y-2">
            <Button 
              onClick={() => onSelect && onSelect(template.id)} 
              className="w-full gap-2 button-gradient group"
            >
              <Sparkles size={16} className="group-hover:rotate-12 transition-transform" />
              Use This Template
            </Button>
            <Link href="/simple-preview">
              <Button 
                variant="outline" 
                className="w-full gap-2 group hover:border-primary"
              >
                <Play size={16} className="group-hover:scale-110 transition-transform" />
                Preview Original
              </Button>
            </Link>
          </div>
        );
      }
    }
  };
  
  // Determine if we're dealing with a template or processed video
  // and get the necessary data accordingly
  const getVideoData = () => {
    if (isVideoTemplate(video)) {
      // It's a video template
      return {
        thumbnailUrl: video.thumbnailUrl,
        title: video.title,
        description: video.description,
        duration: video.duration,
        category: video.category,
        ageRange: video.ageRange
      };
    } else {
      // It's a processed video
      const processedVideo = video as ProcessedVideo;
      
      // If we have template data, use it, otherwise use placeholders
      if (templateData) {
        // Thumbnail logic: if the video is completed, use output URL, otherwise use the template thumbnail
        const thumbnailUrl = (processedVideo.status === "completed" && processedVideo.outputUrl) 
          ? processedVideo.outputUrl 
          : templateData.thumbnailUrl;
        
        return {
          thumbnailUrl,
          title: `Your ${templateData.title}`, // Customize the title
          description: templateData.description,
          duration: templateData.duration,
          category: templateData.category,
          ageRange: templateData.ageRange
        };
      } else {
        // Fallback if template data is not loaded yet
        return {
          thumbnailUrl: processedVideo.outputUrl || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iMjI1IiB2aWV3Qm94PSIwIDAgNDAwIDIyNSI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSIyMjUiIGZpbGw9IiNmMWY1ZjkiLz48ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyMDAgMTEyLjUpIj48Y2lyY2xlIHI9IjQwIiBmaWxsPSIjMGYxNzJhIiBmaWxsLW9wYWNpdHk9IjAuMiIvPjxwYXRoIGQ9Ik0tMTUgMCBMMTUgMCBNMCAtMTUgTDAgMTUiIHN0cm9rZT0iIzBmMTcyYSIgc3Ryb2tlLXdpZHRoPSI2IiBzdHJva2UtbGluZWNhcD0icm91bmQiLz48L2c+PHRleHQgeD0iMjAwIiB5PSIxODAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzBmMTcyYSI+UHJvY2Vzc2luZyB5b3VyIHZpZGVvLi4uPC90ZXh0Pjwvc3ZnPg==",
          title: "Loading...",
          description: "Loading video information...",
          duration: 0,
          category: "Custom",
          ageRange: "All"
        };
      }
    }
  };
  
  const videoData = getVideoData();
  
  return (
    <Card className="h-full flex flex-col overflow-hidden card-hover cursor-pointer border-0 shadow-lg group">
      <div className="relative group/image overflow-hidden">
        <img 
          src={videoData.thumbnailUrl} 
          alt={videoData.title} 
          className="w-full aspect-video object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-90"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="bg-white/90 backdrop-blur-sm text-primary rounded-full p-4 shadow-2xl transform scale-0 group-hover:scale-100 transition-transform duration-300">
            <Play size={28} className="fill-current" />
          </div>
        </div>
        
        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm text-white px-2.5 py-1 rounded-md flex items-center text-xs font-medium">
          <Clock size={12} className="mr-1" />
          {formatDuration(videoData.duration)}
        </div>
        
        {/* Category badge */}
        {!isProcessed && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary/90 backdrop-blur-sm text-white border-0 shadow-md">
              {videoData.category}
            </Badge>
          </div>
        )}
        
        {/* Premium indicator */}
        {!isProcessed && isVideoTemplate(video) && video.isPremium && (
          <div className="absolute top-3 right-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-lg animate-pulse-glow">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
        )}
      </div>
      
      <CardContent className="flex-grow p-5">
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-lg line-clamp-1 group-hover:text-primary transition-colors">
            {videoData.title}
          </h3>
          {getStatusBadge()}
        </div>
        
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {videoData.description}
        </p>
        
        <div className="flex items-center justify-between gap-2">
          {!isProcessed ? (
            <>
              <Badge variant="outline" className="text-xs">
                {videoData.ageRange} years
              </Badge>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-yellow-400 text-xs">★</span>
                ))}
                <span className="text-xs text-muted-foreground ml-1">5.0</span>
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Created {new Date((video as any).createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="p-5 pt-0">
        {actionButton()}
      </CardFooter>
    </Card>
  );
};

export default VideoCard;
