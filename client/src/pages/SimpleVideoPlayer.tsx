import { Button } from "@/components/ui/button";
import CastButton from "@/components/CastButton";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

const SimpleVideoPlayer = () => {
  const videoUrl = "/videos/babyshark.mp4";
  const videoTitle = "Baby Shark Dance";
  const [, navigate] = useLocation();
  
  return (
    <div className="container mx-auto p-8">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={() => navigate("/library")}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Library
      </Button>
      
      <div className="card bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Baby Shark Dance</h1>
            <CastButton 
              videoUrl={videoUrl}
              videoTitle={videoTitle}
            />
          </div>
          <div className="mt-2 text-sm text-muted-foreground">
            <span className="mr-3">Category: Children's Songs</span>
            <span>Age Range: 0-5 years</span>
          </div>
        </div>
        
        <div className="aspect-video bg-black">
          <video 
            src={videoUrl}
            className="w-full h-full" 
            controls 
            autoPlay
            poster="/thumbnails/babyshark.jpg"
          />
        </div>
        
        <div className="p-6">
          <h2 className="font-semibold text-lg mb-2">About this video</h2>
          <p className="text-muted-foreground">
            Baby Shark Dance is one of the most popular children's songs with a catchy tune and simple dance moves. 
            Watch as the friendly shark family takes you through this fun underwater adventure!
          </p>
          
          <div className="mt-6 bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Casting Instructions</h3>
            <p className="text-sm">
              To cast this video to your TV, click the "Cast to TV" button in the top right corner.
              Make sure your TV and device are on the same WiFi network. Select your TV from the list
              of available devices.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleVideoPlayer;