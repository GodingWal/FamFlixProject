import { useMemo, useState, useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Play, Pause, Volume2, VolumeX, Download, RotateCcw } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

interface AudioPlayerProps {
  src: string;
  isLoading: boolean;
  title?: string;
  altText: string;
  downloadable?: boolean;
  onDownload?: () => void;
  className?: string;
  quality?: 'low' | 'standard' | 'high';
  duration?: number;
}

const AudioPlayer = ({ 
  src, 
  isLoading, 
  title, 
  altText, 
  downloadable = false, 
  onDownload,
  className = "",
  quality = 'standard',
  duration 
}: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setTotalDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src]);

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (audioRef.current) {
      const newMuted = !isMuted;
      audioRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current) {
      const newTime = (value[0] / 100) * totalDuration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getQualityColor = () => {
    switch (quality) {
      case 'high': return 'bg-green-500';
      case 'standard': return 'bg-blue-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const memoizedAudio = useMemo(() => (
    <div className="space-y-4">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="hidden"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      
      {/* Header */}
      {title && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold truncate">{title}</h3>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getQualityColor()} text-white border-none`}>
              {quality.toUpperCase()}
            </Badge>
            {downloadable && onDownload && (
              <Button variant="outline" size="sm" onClick={onDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Waveform Visualization */}
      <div className="relative bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 p-4 rounded-lg">
        <div className="flex items-center justify-center">
          {isPlaying ? (
            <div className="flex items-center gap-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 bg-indigo-600 rounded-full animate-wave"
                  style={{
                    height: `${Math.random() * 30 + 10}px`,
                    animationDelay: `${i * 0.1}s`
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <Progress 
          value={totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0} 
          className="h-2 cursor-pointer"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = ((e.clientX - rect.left) / rect.width) * 100;
            handleSeek([percent]);
          }}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleRestart}
          disabled={!src}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <Button
          size="lg"
          onClick={handlePlayPause}
          disabled={!src}
          className="rounded-full h-12 w-12 bg-indigo-600 hover:bg-indigo-700"
        >
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleMuteToggle}
          disabled={!src}
        >
          {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  ), [src, isPlaying, isMuted, currentTime, totalDuration, title, quality, downloadable, onDownload]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 space-y-4">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="w-full h-16 rounded-lg" />
          <Skeleton className="h-2 w-full" />
          <div className="flex justify-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`overflow-hidden ${className}`}>
      <CardContent className="p-4">
        {memoizedAudio}
      </CardContent>
    </Card>
  );
};

export default AudioPlayer;