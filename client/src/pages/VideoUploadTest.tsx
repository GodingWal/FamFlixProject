import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoUpload } from '@/components/VideoUpload';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';

export default function VideoUploadTest() {
  const [uploadResult, setUploadResult] = useState<{
    videoUrl?: string;
    videoData?: string;
  } | null>(null);

  const handleUploadSuccess = (videoUrl: string, videoData?: string) => {
    setUploadResult({ videoUrl, videoData });
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Video Upload Testing</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload Video</CardTitle>
            <CardDescription>
              Upload a video file to test the face extraction process.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-6">
              <Info className="h-4 w-4" />
              <AlertTitle>Upload Guidelines</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>Upload a video with clear faces for best results</li>
                  <li>Maximum file size: 100MB</li>
                  <li>Supported formats: MP4, MOV, AVI</li>
                  <li>Recommended length: 10-30 seconds</li>
                </ul>
              </AlertDescription>
            </Alert>
            
            <VideoUpload 
              onSuccess={handleUploadSuccess}
              buttonText="Upload Face Video"
              endpoint="/api/upload/video"
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Upload Result</CardTitle>
            <CardDescription>
              View the uploaded video and processing status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadResult ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Video uploaded successfully! The system is now processing the video to extract faces.
                </p>
                
                {uploadResult.videoData && (
                  <div className="aspect-video relative rounded-md overflow-hidden border">
                    <video 
                      src={uploadResult.videoData} 
                      controls 
                      className="w-full h-full object-contain bg-black"
                    />
                  </div>
                )}
                
                <div className="text-xs text-muted-foreground mt-2">
                  <p>Video URL: {uploadResult.videoUrl}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                <p>No video uploaded yet</p>
                <p className="text-sm mt-2">Upload a video to see the result here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}