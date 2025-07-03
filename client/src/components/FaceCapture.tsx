import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, RefreshCw, Upload, Check, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FaceCaptureProps {
  onCapture: (imageBlob: Blob, imageUrl: string) => void;
  existingImage?: string;
}

const FaceCapture = ({ onCapture, existingImage }: FaceCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string>(existingImage || "");
  const [activeTab, setActiveTab] = useState<string>("camera");
  const [showGuidelines, setShowGuidelines] = useState<boolean>(true);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const [facePosition, setFacePosition] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const { toast } = useToast();
  
  // Face detection interval reference
  const faceDetectionInterval = useRef<number | null>(null);

  // Load face-api.js models
  useEffect(() => {
    // Clear any existing interval if component unmounts
    return () => {
      if (faceDetectionInterval.current) {
        window.clearInterval(faceDetectionInterval.current);
      }
      if (stream) {
        stopCamera();
      }
    };
  }, []);

  // Updates overlay canvas with guidelines and face detection
  const updateOverlay = () => {
    if (!overlayCanvasRef.current || !videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = overlayCanvasRef.current;
    const context = canvas.getContext('2d');
    
    if (!context) return;
    
    // Set canvas size to match video
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    
    // Clear previous drawings
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    if (showGuidelines) {
      // Draw oval face guide
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radiusX = canvas.width * 0.3;
      const radiusY = canvas.height * 0.4;
      
      context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      context.lineWidth = 2;
      context.setLineDash([5, 5]);
      context.beginPath();
      context.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
      context.stroke();
      
      // Draw face position guidance text
      context.font = '16px Arial';
      context.fillStyle = 'white';
      context.textAlign = 'center';
      context.fillText('Position your face within the oval', centerX, canvas.height - 30);
    }
    
    // If face detected, draw the rectangle
    if (faceDetected && facePosition) {
      context.strokeStyle = faceDetected ? 'rgba(0, 255, 0, 0.7)' : 'rgba(255, 0, 0, 0.7)';
      context.lineWidth = 3;
      context.setLineDash([]);
      context.strokeRect(
        facePosition.x, 
        facePosition.y, 
        facePosition.width, 
        facePosition.height
      );
    }
  };
  
  // Process video frame to detect faces
  const detectFaces = async () => {
    // Mock face detection for now - in a real app, use face-api.js or similar
    // This simulates detecting a face in the center of the frame
    if (videoRef.current) {
      const videoWidth = videoRef.current.clientWidth;
      const videoHeight = videoRef.current.clientHeight;
      
      // Simulate face detection (random position with higher probability in the center)
      const centerBiasX = videoWidth / 2;
      const centerBiasY = videoHeight / 2;
      const faceWidth = videoWidth * 0.3;
      const faceHeight = videoHeight * 0.4;
      
      // 80% chance of detecting a face when camera is on
      const faceDetectionLikelihood = Math.random();
      if (faceDetectionLikelihood > 0.2) {
        setFaceDetected(true);
        
        // Position with center bias
        const x = Math.max(0, Math.min(centerBiasX - faceWidth/2 + (Math.random() - 0.5) * 50, videoWidth - faceWidth));
        const y = Math.max(0, Math.min(centerBiasY - faceHeight/2 + (Math.random() - 0.5) * 50, videoHeight - faceHeight));
        
        setFacePosition({
          x,
          y,
          width: faceWidth,
          height: faceHeight
        });
      } else {
        setFaceDetected(false);
        setFacePosition(null);
      }
      
      updateOverlay();
    }
  };

  // Start camera function with face detection
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      
      setStream(mediaStream);
      setShowGuidelines(true);
      setFaceDetected(false);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          
          // Start face detection at regular intervals
          if (faceDetectionInterval.current) {
            window.clearInterval(faceDetectionInterval.current);
          }
          
          // Update overlay initially
          updateOverlay();
          
          // Run face detection every 500ms
          faceDetectionInterval.current = window.setInterval(() => {
            detectFaces();
          }, 500);
        };
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to capture your face.",
        variant: "destructive"
      });
    }
  };
  
  // Stop camera function
  const stopCamera = () => {
    // Clear face detection interval
    if (faceDetectionInterval.current) {
      window.clearInterval(faceDetectionInterval.current);
      faceDetectionInterval.current = null;
    }
    
    // Stop all tracks in the stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
      setFaceDetected(false);
      setFacePosition(null);
    }
  };
  
  // Capture image function
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      // Only allow capture if face is detected (disabled in simulator for testing)
      // if (!faceDetected) {
      //   toast({
      //     title: "No face detected",
      //     description: "Please position your face in the center of the frame.",
      //     variant: "destructive"
      //   });
      //   return;
      // }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to the canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to image blob
        canvas.toBlob((blob) => {
          if (blob) {
            const imageUrl = URL.createObjectURL(blob);
            setCapturedImage(imageUrl);
            onCapture(blob, imageUrl);
            stopCamera();
            
            toast({
              title: "Image captured",
              description: "Your face has been captured successfully.",
              variant: "default"
            });
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };
  
  // Reset capture function
  const resetCapture = () => {
    setCapturedImage("");
    startCamera();
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an image file.",
          variant: "destructive"
        });
        return;
      }
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image smaller than 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setCapturedImage(imageUrl);
        
        // Convert to blob and pass to parent
        fetch(imageUrl)
          .then(res => res.blob())
          .then(blob => {
            onCapture(blob, imageUrl);
            
            toast({
              title: "Image uploaded",
              description: "Your photo has been uploaded successfully.",
              variant: "default"
            });
          });
      };
      reader.readAsDataURL(file);
    }
  };
  
  // Switch to camera tab and start camera
  const switchToCamera = () => {
    setActiveTab("camera");
    if (!isCameraActive && !capturedImage) {
      startCamera();
    }
  };
  
  // Switch to upload tab
  const switchToUpload = () => {
    setActiveTab("upload");
    // Stop camera if it's running
    if (isCameraActive) {
      stopCamera();
    }
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 md:p-6">
        <Tabs defaultValue="camera" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="camera" onClick={switchToCamera}>Camera Capture</TabsTrigger>
            <TabsTrigger value="upload" onClick={switchToUpload}>Upload Photo</TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="pt-4">
            <div className="flex flex-col items-center">
              <Alert className="mb-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Best Practices</AlertTitle>
                <AlertDescription>
                  Face straight-on with even lighting. Avoid angles and shadows for best results.
                </AlertDescription>
              </Alert>
              
              <div className="relative w-full aspect-square max-w-[350px] bg-muted rounded-md overflow-hidden mb-4">
                {isCameraActive ? (
                  <>
                    <video 
                      ref={videoRef} 
                      className="w-full h-full object-cover"
                      autoPlay 
                      playsInline
                      muted
                    />
                    <canvas 
                      ref={overlayCanvasRef} 
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                    />
                    {faceDetected && (
                      <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded-md text-xs flex items-center">
                        <Check size={12} className="mr-1" />
                        Face detected
                      </div>
                    )}
                  </>
                ) : capturedImage ? (
                  <img 
                    src={capturedImage} 
                    alt="Captured face" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                    <Camera size={48} className="text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground text-sm">
                      Click "Open Camera" to start face capture
                    </p>
                  </div>
                )}
              </div>
              
              {/* Hidden canvas for capture */}
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="flex flex-wrap gap-2 justify-center">
                {!isCameraActive && !capturedImage && (
                  <Button onClick={startCamera} className="gap-2">
                    <Camera size={18} />
                    Open Camera
                  </Button>
                )}
                
                {isCameraActive && (
                  <Button 
                    onClick={captureImage} 
                    className="gap-2"
                    variant={faceDetected ? "default" : "outline"}
                  >
                    <Camera size={18} />
                    Capture
                  </Button>
                )}
                
                {capturedImage && (
                  <Button onClick={resetCapture} variant="outline" className="gap-2">
                    <RefreshCw size={18} />
                    Retake
                  </Button>
                )}
              </div>
              
              {isCameraActive && (
                <div className="mt-4 text-sm text-muted-foreground">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Ensure your face is well-lit and centered</li>
                    <li>Look directly at the camera</li>
                    <li>Remove glasses and headwear for best results</li>
                    <li>Use a neutral expression or slight smile</li>
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="upload" className="pt-4">
            <div className="flex flex-col items-center">
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertTitle>Photo Requirements</AlertTitle>
                <AlertDescription>
                  Upload a clear, front-facing image with good lighting for optimal results.
                </AlertDescription>
              </Alert>
              
              <div className="relative w-full aspect-square max-w-[350px] bg-muted rounded-md overflow-hidden mb-4">
                {capturedImage ? (
                  <img 
                    src={capturedImage} 
                    alt="Uploaded face" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div 
                    onClick={triggerFileInput}
                    className="flex flex-col items-center justify-center h-full p-6 text-center cursor-pointer border-2 border-dashed border-muted-foreground/20 hover:border-muted-foreground/40 transition-colors"
                  >
                    <Upload size={48} className="text-muted-foreground opacity-50 mb-4" />
                    <p className="text-muted-foreground">
                      Click to upload an image
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      PNG, JPG, or WEBP - Max 5MB
                    </p>
                  </div>
                )}
              </div>
              
              {/* Hidden file input */}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileUpload}
              />
              
              <div className="flex flex-wrap gap-2 justify-center">
                {!capturedImage ? (
                  <Button onClick={triggerFileInput} className="gap-2">
                    <Upload size={18} />
                    Select Image
                  </Button>
                ) : (
                  <>
                    <Button onClick={triggerFileInput} variant="default" className="gap-2">
                      <Upload size={18} />
                      Change Image
                    </Button>
                    <Button onClick={() => setCapturedImage("")} variant="outline" className="gap-2">
                      <RefreshCw size={18} />
                      Clear
                    </Button>
                  </>
                )}
              </div>
              
              <div className="mt-4 text-sm text-muted-foreground">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Choose a high-resolution image</li>
                  <li>Your face should be clearly visible</li>
                  <li>Avoid images with multiple people</li>
                  <li>Use photos with consistent, even lighting</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FaceCapture;
