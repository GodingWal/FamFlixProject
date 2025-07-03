import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Upload, Video, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface FaceVideoUploadProps {
  onSuccess?: (videoUrl: string, videoData?: string) => void;
  onProgress?: (progress: number) => void;
  personId: number;
  userId: number;
  endpoint?: string;
  buttonText?: string;
  className?: string;
}

export function FaceVideoUpload({
  onSuccess,
  onProgress,
  personId,
  userId,
  endpoint = '/api/upload/video',
  buttonText = 'Record Face Video',
  className = '',
}: FaceVideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
  const maxSizeInMB = 100;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;
    
    // Validate file type
    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: `Please upload a valid video file (MP4, MOV, AVI, WebM)`,
        variant: "destructive"
      });
      return;
    }
    
    // Validate file size
    const fileSizeInMB = selectedFile.size / (1024 * 1024);
    if (fileSizeInMB > maxSizeInMB) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSizeInMB}MB`,
        variant: "destructive"
      });
      return;
    }
    
    setFile(selectedFile);
    
    // Create preview URL
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No video selected",
        description: "Please select a video file to upload",
        variant: "destructive"
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      
      // Create a FormData object
      const formData = new FormData();
      formData.append('video', file);
      formData.append('personId', personId.toString());
      formData.append('userId', userId.toString());
      
      // Custom implementation using XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
          if (onProgress) {
            onProgress(progress);
          }
        }
      });
      
      // Set up completion handler
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const response = JSON.parse(xhr.responseText);
          toast({
            title: "Upload successful",
            description: "Your face video has been uploaded and is being processed for face extraction",
          });
          
          if (onSuccess && response.videoUrl) {
            onSuccess(response.videoUrl, response.videoData);
          }
        } else {
          throw new Error(`HTTP error ${xhr.status}`);
        }
        setUploading(false);
      });
      
      // Set up error handler
      xhr.addEventListener('error', () => {
        toast({
          title: "Upload failed",
          description: "There was a problem uploading the video",
          variant: "destructive"
        });
        setUploading(false);
      });
      
      // Open and send the request
      xhr.open('POST', endpoint);
      xhr.send(formData);
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "There was a problem uploading the video",
        variant: "destructive"
      });
      setUploading(false);
    }
  };

  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      <Alert className="mb-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Face Video Guidelines</AlertTitle>
        <AlertDescription>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
            <li>Record a 10-30 second video with your face clearly visible</li>
            <li>Move your head slowly to show different angles</li>
            <li>Ensure good lighting for better face detection</li>
            <li>Vary your expressions slightly for better results</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      {previewUrl && (
        <div className="w-full aspect-video rounded-lg overflow-hidden border">
          <video 
            src={previewUrl} 
            controls 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="flex items-center gap-4 w-full">
        <input
          type="file"
          id="face-video-upload"
          onChange={handleFileChange}
          accept={allowedTypes.join(',')}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor="face-video-upload"
          className="cursor-pointer flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          <Video className="h-4 w-4" />
          {file ? 'Change Video' : 'Select Video'}
        </label>
        
        <Button 
          onClick={handleUpload} 
          disabled={!file || uploading}
          className="gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {buttonText}
            </>
          )}
        </Button>
      </div>
      
      {file && (
        <div className="w-full text-sm text-gray-500 truncate">
          {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)
        </div>
      )}
      
      {uploading && (
        <div className="w-full space-y-2">
          <Progress value={uploadProgress} className="w-full h-2" />
          <div className="text-xs text-center text-gray-500">
            Uploading: {uploadProgress}%
          </div>
        </div>
      )}
    </div>
  );
}

export default FaceVideoUpload;