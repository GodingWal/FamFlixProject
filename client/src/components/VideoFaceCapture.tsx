import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Video, RefreshCw, Upload, Info, AlertTriangle, Check, Play, Pause } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface VideoFaceCaptureProps {
  onVideoCapture: (videoBlob: Blob, videoUrl: string) => void;
  onProcessStart: () => void;
  onProcessComplete: (facesCount: number) => void;
  existingVideo?: string;
}

const VideoFaceCapture = ({ 
  onVideoCapture, 
  onProcessStart, 
  onProcessComplete, 
  existingVideo 
}: VideoFaceCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [capturedVideo, setCapturedVideo] = useState<string>(existingVideo || "");
  const [activeTab, setActiveTab] = useState<string>("record");
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facesDetected, setFacesDetected] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recordingInterval = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  
  const MAX_RECORDING_DURATION = 30; // 30 seconds max recording
  
  // Cleanup function
  useEffect(() => {
    return () => {
      if (recordingInterval.current) {
        window.clearInterval(recordingInterval.current);
      }
      if (stream) {
        stopCamera();
      }
    };
  }, [stream]);
  
  // Start recording camera and microphone
  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true; // Mute to prevent feedback
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          
          // Create MediaRecorder
          const recorder = new MediaRecorder(mediaStream, {
            mimeType: 'video/webm;codecs=vp9,opus'
          });
          
          // Set up event handlers
          recorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
              chunksRef.current.push(e.data);
            }
          };
          
          recorder.onstop = () => {
            const videoBlob = new Blob(chunksRef.current, { type: 'video/webm' });
            const videoUrl = URL.createObjectURL(videoBlob);
            setCapturedVideo(videoUrl);
            onVideoCapture(videoBlob, videoUrl);
            chunksRef.current = [];
            
            // Stop the recording timer
            if (recordingInterval.current) {
              window.clearInterval(recordingInterval.current);
              recordingInterval.current = null;
            }
            
            toast({
              title: "Video captured",
              description: `${recordingDuration} second video has been captured successfully.`,
              variant: "default"
            });
            
            // Start processing the video for face extraction
            processVideo(videoBlob);
          };
          
          mediaRecorderRef.current = recorder;
          recorder.start(1000); // Collect data every second
          setIsRecording(true);
          
          // Start recording timer
          setRecordingDuration(0);
          recordingInterval.current = window.setInterval(() => {
            setRecordingDuration(prev => {
              const newDuration = prev + 1;
              if (newDuration >= MAX_RECORDING_DURATION) {
                stopRecording();
                return MAX_RECORDING_DURATION;
              }
              return newDuration;
            });
          }, 1000);
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera and microphone access to record your video.",
        variant: "destructive"
      });
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
    stopCamera();
  };
  
  // Stop camera
  const stopCamera = () => {
    if (recordingInterval.current) {
      window.clearInterval(recordingInterval.current);
      recordingInterval.current = null;
    }
    
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };
  
  // Process video to extract faces using FaceSwap
  const processVideo = async (videoBlob: Blob) => {
    // Notify parent that processing is starting
    onProcessStart();
    
    // Simulate processing progress for demo purposes
    setIsProcessing(true);
    setProcessingProgress(0);
    
    // In a real implementation, we would send the video to the server for processing
    // with the FaceSwap extract tool. Here, we're just simulating the process.
    
    // Simulate processing progress over 3 seconds
    const startTime = Date.now();
    const duration = 3000; // 3 seconds of "processing"
    
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setProcessingProgress(progress);
      
      if (progress >= 100) {
        clearInterval(progressInterval);
        setIsProcessing(false);
        
        // Simulate detecting a random number of faces between 50-200
        const detectedFaces = Math.floor(Math.random() * 150) + 50;
        setFacesDetected(detectedFaces);
        
        // Notify parent of completion with faces count
        onProcessComplete(detectedFaces);
        
        toast({
          title: "Video processing complete",
          description: `Successfully extracted ${detectedFaces} face images from your video.`,
          variant: "default"
        });
      }
    }, 100);
  };
  
  // Reset capture
  const resetCapture = () => {
    setCapturedVideo("");
    setProcessingProgress(0);
    setIsProcessing(false);
    setFacesDetected(0);
  };
  
  // Handle file upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('video/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a video file (MP4, WebM, etc.).",
          variant: "destructive"
        });
        return;
      }
      
      // Check file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a video smaller than 50MB.",
          variant: "destructive"
        });
        return;
      }
      
      // Check duration (should be under 30 seconds, but difficult to check client-side)
      // In a real app, we'd use the HTML5 MediaElement API to check duration after loading
      
      const videoUrl = URL.createObjectURL(file);
      setCapturedVideo(videoUrl);
      
      // Load the video to check its duration
      const video = document.createElement('video');
      video.onloadedmetadata = () => {
        if (video.duration > MAX_RECORDING_DURATION) {
          toast({
            title: "Video too long",
            description: `Please upload a video shorter than ${MAX_RECORDING_DURATION} seconds. This video is ${Math.round(video.duration)} seconds.`,
            variant: "destructive"
          });
          setCapturedVideo("");
          URL.revokeObjectURL(videoUrl);
          return;
        }
        
        onVideoCapture(file, videoUrl);
        
        toast({
          title: "Video uploaded",
          description: "Your video has been uploaded successfully.",
          variant: "default"
        });
        
        // Start processing the video for face extraction
        processVideo(file);
      };
      video.src = videoUrl;
    }
  };
  
  // Toggle video playback
  const togglePlayback = () => {
    if (previewRef.current) {
      if (isPlaying) {
        previewRef.current.pause();
      } else {
        previewRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <Tabs defaultValue="record" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="record">Record Video</TabsTrigger>
            <TabsTrigger value="upload">Upload Video</TabsTrigger>
          </TabsList>
          
          <TabsContent value="record" className="pt-4">
            <div className="flex flex-col items-center">
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Recording Tips</AlertTitle>
                <AlertDescription>
                  Record a 10-30 second video rotating your head slowly to capture different angles.
                </AlertDescription>
              </Alert>
              
              <div className="relative w-full aspect-video max-w-[450px] bg-muted rounded-md overflow-hidden mb-4">
                {isRecording ? (
                  <>
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover"
                      autoPlay 
                      playsInline
                      muted
                    />
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-md text-xs flex items-center">
                      <span className="animate-pulse mr-1">⚫</span>
                      REC {recordingDuration}s / {MAX_RECORDING_DURATION}s
                    </div>
                  </>
                ) : capturedVideo ? (
                  <>
                    <video 
                      ref={previewRef}
                      src={capturedVideo} 
                      className="w-full h-full object-cover"
                      controls={false}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    />
                    <button 
                      onClick={togglePlayback}
                      className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      {isPlaying ? 
                        <Pause className="w-16 h-16 text-white" /> : 
                        <Play className="w-16 h-16 text-white" />
                      }
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Video size={48} className="text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground text-sm">
                      Click "Start Recording" to begin
                    </p>
                  </div>
                )}
              </div>
              
              {isProcessing && (
                <div className="w-full max-w-[450px] mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Processing video...</span>
                    <span className="text-sm text-muted-foreground">{processingProgress}%</span>
                  </div>
                  <Progress value={processingProgress} />
                </div>
              )}
              
              {facesDetected > 0 && !isProcessing && (
                <div className="w-full max-w-[450px] mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center text-green-700">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="font-medium">Extracted {facesDetected} face images!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    These will be used for high-quality face swapping.
                  </p>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2 justify-center">
                {!isRecording && !capturedVideo ? (
                  <Button onClick={startRecording} className="gap-2">
                    <Video size={18} />
                    Start Recording
                  </Button>
                ) : isRecording ? (
                  <Button onClick={stopRecording} variant="destructive" className="gap-2">
                    <span className="w-3 h-3 rounded-sm bg-white"></span>
                    Stop Recording
                  </Button>
                ) : (
                  <Button onClick={resetCapture} variant="outline" className="gap-2" disabled={isProcessing}>
                    <RefreshCw size={18} />
                    Record Again
                  </Button>
                )}
              </div>
              
              {!capturedVideo && (
                <div className="mt-4 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Turn your head slowly to capture different angles</li>
                    <li>Show a variety of expressions</li>
                    <li>Ensure good, consistent lighting</li>
                    <li>Keep your face centered in the frame</li>
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="pt-4">
            <div className="flex flex-col items-center">
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Video Requirements</AlertTitle>
                <AlertDescription>
                  Upload a 10-30 second video with your face clearly visible from different angles.
                </AlertDescription>
              </Alert>
              
              <div className="relative w-full aspect-video max-w-[450px] bg-muted rounded-md overflow-hidden mb-4">
                {capturedVideo ? (
                  <>
                    <video 
                      ref={previewRef}
                      src={capturedVideo} 
                      className="w-full h-full object-cover"
                      controls={false}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                    />
                    <button 
                      onClick={togglePlayback}
                      className="absolute inset-0 w-full h-full flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"
                    >
                      {isPlaying ? 
                        <Pause className="w-16 h-16 text-white" /> : 
                        <Play className="w-16 h-16 text-white" />
                      }
                    </button>
                  </>
                ) : (
                  <div 
                    onClick={triggerFileInput}
                    className="flex flex-col items-center justify-center h-full p-6 text-center cursor-pointer border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
                  >
                    <Upload size={48} className="text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground">
                      Click to upload a video
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      MP4, WebM, or MOV - Max 50MB
                    </p>
                  </div>
                )}
              </div>
              
              {isProcessing && (
                <div className="w-full max-w-[450px] mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Processing video...</span>
                    <span className="text-sm text-muted-foreground">{processingProgress}%</span>
                  </div>
                  <Progress value={processingProgress} />
                </div>
              )}
              
              {facesDetected > 0 && !isProcessing && (
                <div className="w-full max-w-[450px] mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center text-green-700">
                    <Check className="w-5 h-5 mr-2" />
                    <span className="font-medium">Extracted {facesDetected} face images!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    These will be used for high-quality face swapping.
                  </p>
                </div>
              )}
              
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="video/*" 
                onChange={handleVideoUpload}
              />
              
              <div className="flex flex-wrap gap-2 justify-center">
                {!capturedVideo ? (
                  <Button onClick={triggerFileInput} className="gap-2">
                    <Upload size={18} />
                    Select Video
                  </Button>
                ) : (
                  <>
                    <Button onClick={triggerFileInput} variant="default" className="gap-2" disabled={isProcessing}>
                      <Upload size={18} />
                      Change Video
                    </Button>
                    <Button onClick={resetCapture} variant="outline" className="gap-2" disabled={isProcessing}>
                      <RefreshCw size={18} />
                      Clear
                    </Button>
                  </>
                )}
              </div>
              
              {!capturedVideo && (
                <div className="mt-4 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Use a video with good lighting and no rapid movements</li>
                    <li>Choose a video where your face is clearly visible</li>
                    <li>Include different facial angles and expressions</li>
                    <li>Keep the video between 10-30 seconds</li>
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default VideoFaceCapture;