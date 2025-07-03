import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ProcessingIndicatorProps {
  status: "pending" | "processing" | "completed" | "failed";
  errorMessage?: string;
}

const ProcessingIndicator = ({ status, errorMessage }: ProcessingIndicatorProps) => {
  const [progress, setProgress] = useState(0);
  
  // Simulate progress for UI feedback
  useEffect(() => {
    if (status === "processing") {
      const interval = setInterval(() => {
        setProgress(prevProgress => {
          const increment = Math.random() * 5;
          const newProgress = prevProgress + increment;
          return newProgress >= 95 ? 95 : newProgress;
        });
      }, 800);
      
      return () => clearInterval(interval);
    }
    
    if (status === "completed") {
      setProgress(100);
    }
    
    if (status === "failed") {
      setProgress(0);
    }
    
    if (status === "pending") {
      setProgress(5);
    }
  }, [status]);
  
  // Status message
  const getStatusMessage = () => {
    switch (status) {
      case "pending":
        return "Preparing to process...";
      case "processing":
        return "Processing your video - this may take a few minutes";
      case "completed":
        return "Processing complete!";
      case "failed":
        return `Processing failed: ${errorMessage || "Unknown error"}`;
      default:
        return "";
    }
  };
  
  // Status to determine styling
  const getStatusColor = () => {
    switch (status) {
      case "completed":
        return "text-green-600";
      case "failed":
        return "text-red-600";
      default:
        return "text-primary";
    }
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center">
          {(status === "pending" || status === "processing") && (
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          )}
          
          <h3 className={`text-lg font-medium mb-2 ${getStatusColor()}`}>
            {status === "completed" ? "Success!" : status === "failed" ? "Error" : "Processing Video"}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-4">
            {getStatusMessage()}
          </p>
          
          {(status === "pending" || status === "processing" || status === "completed") && (
            <div className="w-full">
              <Progress value={progress} className="h-2" />
              {status !== "completed" && (
                <p className="text-xs text-right mt-1">{Math.round(progress)}%</p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProcessingIndicator;
