import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Play, Lock, CreditCard } from "lucide-react";
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
    switch(processedVideo.status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "processing":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800">Processing</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>;
      case "failed":
        return <Badge variant="outline" className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return null;
    }
  };
  
  // For navigation
  const [, navigate] = useLocation();

  // Action button based on video type
  const actionButton = () => {
    if (isProcessed) {
      const processedVideo = video as ProcessedVideo;
      if (processedVideo.status === "completed") {
        return (
          <Link href={`/player/${video.id}`}>
            <Button className="w-full gap-2">
              <Play size={16} />
              Watch Video
            </Button>
          </Link>
        );
      } else {
        return (
          <Button disabled={true} className="w-full gap-2">
            <Play size={16} />
            {processedVideo.status === "failed" ? "Processing Failed" : "Processing..."}
          </Button>
        );
      }
    } else {
      // Handle template videos
      const template = video as VideoTemplate;
      
      // If it's a premium template, show the purchase button
      if (template.isPremium) {
        return (
          <div className="space-y-2">
            {template.price && (
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="flex items-center bg-yellow-100 text-yellow-800 font-medium">
                  <Lock size={12} className="mr-1" />
                  Premium
                </Badge>
                <span className="font-bold text-primary">${template.price.toFixed(2)}</span>
              </div>
            )}
            <Button 
              onClick={() => navigate(`/checkout/${template.id}`)}
              className="w-full gap-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600"
            >
              <CreditCard size={16} />
              Purchase
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
              className="w-full gap-2"
            >
              Use This Template
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
    <Card className="h-full flex flex-col overflow-hidden transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer">
      <div className="relative group">
        <img 
          src={videoData.thumbnailUrl} 
          alt={videoData.title} 
          className="w-full aspect-video object-cover transition-all duration-300 group-hover:brightness-90"
        />
        {/* Play button overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30">
          <div className="bg-black/70 text-white rounded-full p-3">
            <Play size={24} />
          </div>
        </div>
        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md flex items-center text-xs">
          <Clock size={12} className="mr-1" />
          {formatDuration(videoData.duration)}
        </div>
        {!isProcessed && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-primary/80 text-white">
              {videoData.category}
            </Badge>
          </div>
        )}
      </div>
      <CardContent className="flex-grow pt-4">
        <div className="flex justify-between items-start">
          <h3 className="font-semibold text-lg">{videoData.title}</h3>
          {getStatusBadge()}
        </div>
        <div className="flex items-center mt-1 mb-2">
          {!isProcessed && (
            <Badge variant="outline" className="text-xs mr-2">
              {videoData.ageRange} years
            </Badge>
          )}
          {getStatusBadge() && (
            <span className="text-xs text-muted-foreground">
              {isProcessed ? 'Created ' : 'Added '} 
              {new Date((video as any).createdAt).toLocaleDateString()}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {videoData.description}
        </p>
      </CardContent>
      <CardFooter className="pt-0">
        {actionButton()}
      </CardFooter>
    </Card>
  );
};

export default VideoCard;
