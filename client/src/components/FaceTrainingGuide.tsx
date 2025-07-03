import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Video
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";

type FaceTrainingStage = 'intro' | 'camera-setup' | 'recording' | 'processing' | 'completed';
type ExpressionType = 'neutral' | 'smile' | 'profile-left' | 'profile-right' | 'talking';

interface ExpressionGuide {
  type: ExpressionType;
  title: string;
  instruction: string;
  duration: number; // seconds to record
  icon: React.ReactNode;
}

interface FaceTrainingGuideProps {
  userId: number;
  personId: number;
  personName: string;
  onComplete: () => void;
  onCancel: () => void;
}

const FaceTrainingGuide: React.FC<FaceTrainingGuideProps> = ({
  userId,
  personId,
  personName,
  onComplete,
  onCancel
}) => {
  const [stage, setStage] = useState<FaceTrainingStage>('intro');
  const [currentExpressionIndex, setCurrentExpressionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [completedExpressions, setCompletedExpressions] = useState<ExpressionType[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  
  // Define the sequence of expressions to guide the user through
  const expressionGuides: ExpressionGuide[] = [
    {
      type: 'neutral',
      title: 'Neutral Expression',
      instruction: 'Look directly at the camera with a neutral/relaxed expression',
      duration: 10,
      icon: <Camera className="h-8 w-8" />
    },
    {
      type: 'smile',
      title: 'Smiling Expression',
      instruction: 'Look at the camera and give a natural smile',
      duration: 10,
      icon: <Camera className="h-8 w-8" />
    },
    {
      type: 'profile-left',
      title: 'Left Profile',
      instruction: 'Turn your head slightly to show your left profile',
      duration: 10,
      icon: <ChevronLeft className="h-8 w-8" />
    },
    {
      type: 'profile-right',
      title: 'Right Profile',
      instruction: 'Turn your head slightly to show your right profile',
      duration: 10,
      icon: <ChevronRight className="h-8 w-8" />
    },
    {
      type: 'talking',
      title: 'Talking Expression',
      instruction: 'Look at the camera and say a few sentences naturally',
      duration: 10,
      icon: <Video className="h-8 w-8" />
    }
  ];
  
  const currentExpression = expressionGuides[currentExpressionIndex];
  
  // Initialize the camera
  const initializeCamera = async () => {
    try {
      // Stop any previous stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Get user media with video and audio
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: true
      });
      
      // Store the stream in ref and connect to video element
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setStage('camera-setup');
      setError(null);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Unable to access camera. Please check permissions and try again.');
    }
  };
  
  // Start recording
  const startRecording = () => {
    if (!streamRef.current) {
      setError('Camera not initialized. Please refresh and try again.');
      return;
    }
    
    try {
      // Create media recorder from stream
      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9'
      });
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setVideoUrl(url);
        
        // If video element exists, show the recorded video
        if (videoRef.current) {
          videoRef.current.srcObject = null;
          videoRef.current.src = url;
          videoRef.current.play();
        }
        
        setStage('processing');
      };
      
      // Start the recording
      mediaRecorder.start(200); // Collect data in 200ms chunks
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up recording state
      setIsRecording(true);
      setRecordingTime(0);
      setStage('recording');
      
      // Set up timer to track recording duration
      const startTime = Date.now();
      const timer = setInterval(() => {
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        setRecordingTime(elapsedSeconds);
        
        // Stop recording when we reach the duration
        if (elapsedSeconds >= currentExpression.duration) {
          clearInterval(timer);
          stopRecording();
        }
      }, 500);
      
      // Store the timer so we can clear it if needed
      (window as any).recordingTimer = timer;
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Unable to start recording. Please try again.');
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    // Clear any ongoing timer
    if ((window as any).recordingTimer) {
      clearInterval((window as any).recordingTimer);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
  };
  
  // Upload the recorded video
  const uploadVideo = async () => {
    if (!videoBlob) {
      setError('No video recorded. Please try again.');
      return;
    }
    
    setIsUploading(true);
    setProgress(0);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(videoBlob);
      
      reader.onload = async () => {
        const base64data = reader.result;
        
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 500);
        
        try {
          // Upload to server
          const response = await apiRequest('POST', '/api/faceVideos', {
            userId,
            personId,
            name: `${personName} - ${currentExpression.title}`,
            videoData: base64data,
            expressionType: currentExpression.type
          });
          
          const result = await response.json();
          
          // Update progress to 100%
          clearInterval(progressInterval);
          setProgress(100);
          
          // Add this expression to completed list
          setCompletedExpressions(prev => [...prev, currentExpression.type]);
          
          // Show success toast
          toast({
            title: 'Expression Recorded',
            description: `Successfully saved ${currentExpression.title} for ${personName}`,
            variant: 'default',
          });
          
          // Move to the next expression or complete
          if (currentExpressionIndex < expressionGuides.length - 1) {
            setCurrentExpressionIndex(currentExpressionIndex + 1);
            resetRecording();
          } else {
            setStage('completed');
            // Invalidate person queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ['/api/people', personId] });
            queryClient.invalidateQueries({ queryKey: ['/api/people', personId, 'faceImages'] });
          }
        } catch (err) {
          console.error('Error uploading video:', err);
          setError('Failed to upload video. Please try again.');
          clearInterval(progressInterval);
        } finally {
          setIsUploading(false);
        }
      };
      
      reader.onerror = () => {
        setError('Failed to process video data. Please try again.');
        setIsUploading(false);
      };
    } catch (err) {
      console.error('Error preparing video for upload:', err);
      setError('Failed to prepare video for upload. Please try again.');
      setIsUploading(false);
    }
  };
  
  // Reset recording state for the next expression
  const resetRecording = () => {
    // Clear previous recording
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    
    setVideoBlob(null);
    setVideoUrl(null);
    setError(null);
    setProgress(0);
    
    // Reinitialize camera
    initializeCamera();
  };
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      // Stop any ongoing recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      
      // Stop and release the camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      // Clear any video URLs
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);
  
  // Render the appropriate content based on the current stage
  const renderContent = () => {
    switch (stage) {
      case 'intro':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Face Training Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Let's train the system to recognize {personName}'s face in different angles and expressions.
                This will help create more realistic videos.
              </p>
              
              <div className="bg-primary/10 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold">What to expect:</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>You'll record short video clips with different expressions</li>
                  <li>Each recording takes about 10 seconds</li>
                  <li>The AI will extract the best frames from each recording</li>
                  <li>The entire process takes about 5 minutes</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={initializeCamera}>Start Training</Button>
            </CardFooter>
          </>
        );
        
      case 'camera-setup':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                {currentExpression.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-black relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                  style={{ minHeight: '200px' }}
                />
              </div>
              
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {currentExpression.icon}
                  <span className="font-medium">{currentExpression.instruction}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Duration: {currentExpression.duration} seconds
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={onCancel}>Cancel</Button>
              <Button onClick={startRecording}>
                Start Recording
              </Button>
            </CardFooter>
          </>
        );
        
      case 'recording':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                {currentExpression.title} - Recording
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-black relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto"
                  style={{ minHeight: '200px' }}
                />
                
                <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <span className="animate-pulse h-2 w-2 bg-white rounded-full"></span>
                  REC {recordingTime}s
                </div>
              </div>
              
              <div className="bg-primary/10 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {currentExpression.icon}
                  <span className="font-medium">{currentExpression.instruction}</span>
                </div>
                
                <Progress
                  value={(recordingTime / currentExpression.duration) * 100}
                  className="h-2 mt-2"
                />
                
                <p className="text-xs text-right mt-1">
                  {recordingTime}s / {currentExpression.duration}s
                </p>
              </div>
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={stopRecording}>Cancel</Button>
              <Button variant="destructive" onClick={stopRecording}>
                Stop Recording
              </Button>
            </CardFooter>
          </>
        );
        
      case 'processing':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg font-bold">
                {currentExpression.title} - Review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg overflow-hidden bg-black relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  controls
                  loop
                  className="w-full h-auto"
                  style={{ minHeight: '200px' }}
                />
              </div>
              
              {isUploading ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Processing video...</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    Extracting facial features. Please wait...
                  </p>
                </div>
              ) : (
                <div className="bg-primary/10 rounded-lg p-4">
                  <p className="font-medium">Does this look good?</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Make sure you can see your face clearly and the expression is correct.
                  </p>
                </div>
              )}
              
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="outline"
                onClick={resetRecording}
                disabled={isUploading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Record Again
              </Button>
              <Button
                onClick={uploadVideo}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Looks Good
                  </>
                )}
              </Button>
            </CardFooter>
          </>
        );
        
      case 'completed':
        return (
          <>
            <CardHeader>
              <CardTitle className="text-lg font-bold text-center">Training Completed!</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-4 flex items-center gap-3">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                <div>
                  <h3 className="font-semibold">All expressions recorded</h3>
                  <p className="text-sm text-muted-foreground">
                    {personName}'s face data is now ready for use in videos
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">Completed expressions:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {expressionGuides.map(guide => (
                    <div 
                      key={guide.type}
                      className={`rounded-lg p-3 border flex items-center gap-2 ${
                        completedExpressions.includes(guide.type) 
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/10' 
                          : 'border-gray-200 bg-gray-50 dark:bg-gray-800'
                      }`}
                    >
                      {completedExpressions.includes(guide.type) ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        guide.icon
                      )}
                      <span className="text-sm">{guide.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={onComplete}>
                Finish
              </Button>
            </CardFooter>
          </>
        );
    }
  };
  
  return (
    <Card className="max-w-md w-full mx-auto">
      {renderContent()}
      
      {/* Progress indicator */}
      {stage !== 'intro' && stage !== 'completed' && (
        <div className="px-6 pb-6">
          <Separator className="mb-2" />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              Expression {currentExpressionIndex + 1} of {expressionGuides.length}
            </span>
            <div className="flex gap-1">
              {expressionGuides.map((_, index) => (
                <div 
                  key={index}
                  className={`h-1.5 w-5 rounded-full ${
                    index === currentExpressionIndex
                      ? 'bg-primary'
                      : index < currentExpressionIndex
                        ? 'bg-primary/50'
                        : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default FaceTrainingGuide;