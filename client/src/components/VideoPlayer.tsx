import { useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Play, Volume2, VolumeX, Maximize, Download } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useRef } from 'react';

interface VideoPlayerProps {
  src: string;
  isLoading: boolean;
  altText: string;
  title?: string;
  downloadable?: boolean;
  onDownload?: () => void;
  poster?: string;
  className?: string;
}

const VideoPlayer = ({ 
  src, 
  isLoading, 
  altText, 
  title, 
  downloadable = false, 
  onDownload,
  poster,
  className = ""
}: VideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      videoRef.current.requestFullscreen();
    }
  };

  const memoizedVideo = useMemo(() => (
    <div className="relative group">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        autoPlay={false}
        loop
        muted={isMuted}
        className={`w-full rounded-lg shadow-lg ${className}`}
        aria-label={altText}
        title={altText}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Custom Controls Overlay */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePlayPause}
            className="text-white hover:bg-white/20"
          >
            <Play className={`h-4 w-4 ${isPlaying ? 'hidden' : 'block'}`} />
            <div className={`w-4 h-4 ${isPlaying ? 'block' : 'hidden'}`}>⏸️</div>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMuteToggle}
            className="text-white hover:bg-white/20"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          {downloadable && onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              className="text-white hover:bg-white/20"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFullscreen}
            className="text-white hover:bg-white/20"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  ), [src, altText, isPlaying, isMuted, downloadable, onDownload, poster, className]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <Skeleton className="w-full h-64 rounded-lg" />
          {title && <Skeleton className="h-6 w-3/4" />}
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            {downloadable && <Skeleton className="h-8 w-20" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {title && (
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            {downloadable && onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        )}
        {memoizedVideo}
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;