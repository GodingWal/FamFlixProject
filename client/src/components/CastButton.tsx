import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Monitor, Cast, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCasting } from "@/hooks/useCasting";
import { useToast } from "@/hooks/use-toast";

interface CastButtonProps {
  videoUrl: string;
  videoTitle: string;
}

const CastButton = ({ videoUrl, videoTitle }: CastButtonProps) => {
  const [isCasting, setIsCasting] = useState(false);
  const { castDevices, initiateConnection, castToDevice } = useCasting();
  const { toast } = useToast();
  
  const handleCastRequest = (deviceId: string) => {
    setIsCasting(true);
    
    // Attempt to cast to the selected device
    castToDevice(deviceId, videoUrl, videoTitle)
      .then(() => {
        toast({
          title: "Connected!",
          description: `Now casting to your TV`,
        });
      })
      .catch((error) => {
        console.error("Casting error:", error);
        toast({
          title: "Casting failed",
          description: "Unable to connect to the selected device.",
          variant: "destructive"
        });
        setIsCasting(false);
      });
  };
  
  // Scan for cast devices when the dropdown is opened
  const handleDropdownOpen = () => {
    initiateConnection();
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={isCasting ? "default" : "outline"} 
          className="gap-2"
          onClick={handleDropdownOpen}
        >
          {isCasting ? <Check size={16} /> : <Cast size={16} />}
          {isCasting ? "Casting" : "Cast to TV"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {castDevices.length > 0 ? (
          castDevices.map((device) => (
            <DropdownMenuItem 
              key={device.id}
              onClick={() => handleCastRequest(device.id)}
            >
              <Monitor className="mr-2 h-4 w-4" />
              <span>{device.name}</span>
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>
            <span>No devices found</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CastButton;
