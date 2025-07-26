import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import AudioRecorder from "@/components/AudioRecorder";
import VoiceClonePreview from "@/components/VoiceClonePreview";
import { ArrowLeft, ArrowRight, CheckCircle, Mic, AlertCircle, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMobile } from "@/hooks/use-mobile";

interface VoiceTrainingGuideProps {
  userId: number;
  personId: number;
  personName: string;
  onComplete: () => void;
  onCancel: () => void;
}

// Script content for the voice recording prompts
const voicePrompts = [
  {
    id: "introduction",
    title: "Introduction",
    description: "Record a casual introduction",
    script: "Hello, my name is [your name]. I'm excited to create personalized videos for kids.",
    type: "casual",
  },
  {
    id: "counting",
    title: "Counting Numbers",
    description: "Count from one to ten",
    script: "One, two, three, four, five, six, seven, eight, nine, ten.",
    type: "instructional",
  },
  {
    id: "questions",
    title: "Questions",
    description: "Ask some simple questions",
    script: "What's your name? How old are you? What's your favorite animal? What's your favorite color?",
    type: "question",
  },
  {
    id: "storytelling",
    title: "Storytelling",
    description: "Use an animated storytelling voice",
    script: "Once upon a time, there was a brave little bunny who went on an amazing adventure through the enchanted forest.",
    type: "storytelling",
  },
  {
    id: "happy",
    title: "Happy Expression",
    description: "Sound excited and happy",
    script: "Wow! That's amazing! I'm so happy to see you! Let's have fun together!",
    type: "happy",
  }
];

const VoiceTrainingGuide = ({ userId, personId, personName, onComplete, onCancel }: VoiceTrainingGuideProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState<Blob | null>(null);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string>("");
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [customScript, setCustomScript] = useState<string>(voicePrompts[currentStep].script);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [defaultVoiceRecordingId, setDefaultVoiceRecordingId] = useState<number | null>(null);
  const [isRetraining, setIsRetraining] = useState(false);
  const { toast } = useToast();
  const { isMobile } = useMobile();

  const totalSteps = voicePrompts.length;

  // Mutation for starting retraining (clears old recordings)
  const startRetrainingMutation = useMutation({
    mutationFn: async () => {
      // Clear existing voice recordings for this person
      const response = await apiRequest("DELETE", `/api/people/${personId}/voice-recordings`);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Ready for retraining!",
        description: "Previous recordings cleared. You can now record fresh voice samples with enhanced audio cleaning.",
      });
      setIsRetraining(false);
      setIsComplete(false);
      setCurrentStep(0);
      setCompletedSteps([]);
      setDefaultVoiceRecordingId(null);
      setCustomScript(voicePrompts[0].script);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Retraining failed",
        description: error.message || "Please try again.",
      });
      setIsRetraining(false);
    },
  });

  // Mutation for combining recordings and creating voice clone
  const combineRecordingsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/voice/combine-recordings", {
        personId: personId
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Enhanced voice clone created!",
        description: `Combined ${(data as any).recordingsCount} cleaned recordings into a high-quality voice clone.`,
      });
      setIsComplete(true);
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create voice clone",
        description: error.message || "Please try again.",
      });
    },
  });
  
  // Create voice recording mutation
  const createVoiceRecordingMutation = useMutation({
    mutationFn: async (voiceData: { 
      audioData: string, 
      name: string, 
      personId: number, 
      userId: number, 
      duration: number, 
      type: string,
      isDefault: boolean 
    }) => {
      const res = await apiRequest("POST", "/api/voiceRecordings", voiceData);
      return await res.json();
    },
    onSuccess: (data) => {
      // Mark current step as completed
      setCompletedSteps(prev => [...prev, voicePrompts[currentStep].id]);
      
      // Store the first recording ID as default
      if (currentStep === 0) {
        setDefaultVoiceRecordingId(data.id);
      }
      
      // Clear recording state
      setRecordedVoiceBlob(null);
      setRecordedVoiceUrl("");
      setVoiceDuration(0);
      
      // Show success message
      toast({
        title: "Voice recording saved",
        description: `"${voicePrompts[currentStep].title}" recording has been saved.`,
      });
      
      // Move to next step or trigger combination
      if (currentStep < totalSteps - 1) {
        setCurrentStep(currentStep + 1);
        setCustomScript(voicePrompts[currentStep + 1].script);
      } else {
        // All recordings complete - combine them into a voice clone
        toast({
          title: "All recordings complete!",
          description: "Creating enhanced voice clone from all recordings...",
        });
        combineRecordingsMutation.mutate();
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveRecording = () => {
    if (!recordedVoiceBlob) {
      toast({
        title: "No recording",
        description: "Please record your voice first",
        variant: "destructive",
      });
      return;
    }

    // Convert audio to base64
    const reader = new FileReader();
    reader.readAsDataURL(recordedVoiceBlob);
    reader.onloadend = () => {
      const base64data = reader.result as string;
      
      // Save the recording with proper audioUrl field
      createVoiceRecordingMutation.mutate({
        audioData: base64data,
        name: voicePrompts[currentStep].title,
        personId: personId,
        userId: userId,
        duration: voiceDuration,
        type: voicePrompts[currentStep].type,
        isDefault: currentStep === 0 // Make first recording default
      });
    };
  };
  
  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setCustomScript(voicePrompts[currentStep + 1].script);
      setRecordedVoiceBlob(null);
      setRecordedVoiceUrl("");
    } else {
      // Training complete - ensure we have saved recordings
      if (completedSteps.length === 0) {
        toast({
          title: "Training incomplete",
          description: "Please save at least one voice recording before completing training.",
          variant: "destructive",
        });
        return;
      }
      // All steps completed - trigger completion callback and show preview
      setIsComplete(true);
      onComplete(); // Notify parent component that training is complete
      toast({
        title: "Voice training complete!",
        description: `${personName}'s voice has been successfully trained. Voice cloning is now in progress.`,
      });
    }
  };
  
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setCustomScript(voicePrompts[currentStep - 1].script);
      setRecordedVoiceBlob(null);
      setRecordedVoiceUrl("");
      setVoiceDuration(0);
    }
    // We no longer handle cancellation here since it's directly called on the button
  };
  
  if (isComplete) {
    return (
      <div className="space-y-6">
        {/* Completion Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-green-700">
            {combineRecordingsMutation.isPending ? "Creating Enhanced Voice Clone..." : "Training Complete!"}
          </h2>
          <p className="text-muted-foreground">
            {combineRecordingsMutation.isPending 
              ? "Combining all recordings to create a comprehensive voice clone with better accuracy..."
              : `${personName}'s voice has been successfully trained and enhanced with ${completedSteps.length} combined voice samples.`
            }
          </p>
        </div>

        {/* Voice Clone Preview */}
        <VoiceClonePreview
          personId={personId}
          personName={personName}
          voiceRecordingId={defaultVoiceRecordingId || undefined}
          className="mt-6"
        />

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 pt-6">
          <Button
            onClick={onComplete}
            disabled={combineRecordingsMutation.isPending}
            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Finish & Continue
          </Button>
          <Button
            onClick={() => {
              setIsComplete(false);
              setCurrentStep(0);
              setCustomScript(voicePrompts[0].script);
              setCompletedSteps([]);
              setDefaultVoiceRecordingId(null);
            }}
            variant="outline"
            disabled={combineRecordingsMutation.isPending}
          >
            Start Fresh Training
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold mb-2">Voice Training for {personName}</h1>
        <p className="text-muted-foreground">
          Step {currentStep + 1} of {totalSteps}: Record your voice for better quality voice replacement
        </p>
        
        {/* Progress indicators */}
        <div className="flex justify-center mt-4 space-x-2">
          {voicePrompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentStep
                  ? "bg-primary w-8"
                  : index < currentStep || completedSteps.includes(prompt.id)
                  ? "bg-primary"
                  : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{voicePrompts[currentStep].title}</CardTitle>
              <CardDescription>{voicePrompts[currentStep].description}</CardDescription>
            </div>
            <Badge>{voicePrompts[currentStep].type}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="script">Script to read</Label>
            <Textarea
              id="script"
              value={customScript}
              onChange={(e) => setCustomScript(e.target.value)}
              className="h-24 font-medium text-lg leading-relaxed"
            />
            <p className="text-xs text-muted-foreground mt-2">
              You can customize this script if you wish, but try to maintain a similar length and tone.
            </p>
          </div>
          
          <div className="border rounded-lg p-6 bg-muted/10">
            <div className="mb-4">
              <Label>Voice Recording</Label>
              <p className="text-sm text-muted-foreground mb-4">
                Read the script clearly at a normal pace. Try to maintain the emotion indicated by the prompt type.
              </p>
            </div>
            
            <AudioRecorder
              onRecordingComplete={(audioBlob, audioUrl, duration) => {
                setRecordedVoiceBlob(audioBlob);
                setRecordedVoiceUrl(audioUrl);
                setVoiceDuration(duration);
              }}
              existingRecording={recordedVoiceUrl}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={currentStep === 0 ? onCancel : handlePrevious}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {currentStep === 0 ? "Cancel" : "Previous"}
          </Button>
          
          <div className="flex gap-2">
            {recordedVoiceBlob && (
              <Button 
                onClick={handleSaveRecording}
                disabled={createVoiceRecordingMutation.isPending}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {createVoiceRecordingMutation.isPending ? "Saving..." : "Save Recording"}
              </Button>
            )}
            
            <Button 
              onClick={handleNext}
              disabled={currentStep < totalSteps - 1 && !completedSteps.includes(voicePrompts[currentStep].id)}
            >
              {currentStep === totalSteps - 1 ? "Complete Training" : "Next"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VoiceTrainingGuide;