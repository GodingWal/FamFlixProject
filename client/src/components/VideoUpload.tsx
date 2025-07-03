import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface VideoUploadProps {
  onSuccess?: (videoUrl: string, videoData?: string) => void;
  onProgress?: (progress: number) => void;
  endpoint?: string;
  buttonText?: string;
  allowedTypes?: string[];
  maxSizeInMB?: number;
  className?: string;
}

export function VideoUpload({
  onSuccess,
  onProgress,
  endpoint = '/api/upload/video',
  buttonText = 'Upload Video',
  allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
  maxSizeInMB = 100,
  className = '',
}: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (!selectedFile) return;
    
    // Validate file type
    if (!allowedTypes.includes(selectedFile.type)) {
      toast({
        title: "Invalid file type",
        description: `Please upload a valid video file (${allowedTypes.join(', ')})`,
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
  };

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "No file selected",
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
      
      // Custom implementation using the apiRequest utility
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
            description: "The video was uploaded successfully",
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
      <div className="flex items-center gap-4">
        <input
          type="file"
          id="video-upload"
          onChange={handleFileChange}
          accept={allowedTypes.join(',')}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor="video-upload"
          className="cursor-pointer flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
        >
          Choose Video
        </label>
        <span className="text-sm text-gray-500 truncate max-w-[200px]">
          {file ? file.name : 'No file selected'}
        </span>
      </div>
      
      <Button 
        onClick={handleUpload} 
        disabled={!file || uploading}
        className="gap-2"
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading... {uploadProgress}%
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" />
            {buttonText}
          </>
        )}
      </Button>
      
      {uploading && (
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 mt-2">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${uploadProgress}%` }} 
          ></div>
        </div>
      )}
    </div>
  );
}

export default VideoUpload;