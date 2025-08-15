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
        title: "Voice Clone Created!",
        description: `Voice clone created successfully.`,
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
      const res = await apiRequest("POST", "/api/voiceRecordings", {
        audioUrl: voiceData.audioData,
        audioData: voiceData.audioData,
        name: voiceData.name,
        personId: voiceData.personId,
        userId: voiceData.userId,
        duration: voiceData.duration ?? 0,
        isDefault: !!voiceData.isDefault,
      });
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
      
      // Save the recording with proper audioData field
      createVoiceRecordingMutation.mutate({
        audioData: base64data,
        name: voicePrompts[currentStep].title,
        personId: personId,
        userId: userId,
        duration: voiceDuration,
        type: 'training',
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
          <h2 className="text-2xl font-semibold">Voice Training Complete</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Great job! We have enough voice samples to create a cloned voice. You can preview or retrain any step as needed.
          </p>
        </div>
        <VoiceClonePreview personId={personId} />
      </div>
    );
  }

  return (
    <Card className="w-full max-w-full sm:max-w-xl mx-auto">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-xl sm:text-2xl">Interactive Voice Training</CardTitle>
        <CardDescription className="text-sm">Step {currentStep + 1} of {totalSteps}: {voicePrompts[currentStep].title}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 px-3 sm:px-6">
        <div className="space-y-2">
          <Label htmlFor="script">Script</Label>
          <Textarea id="script" value={customScript} onChange={(e) => setCustomScript(e.target.value)} rows={4} />
        </div>
        <AudioRecorder onRecordingComplete={(blob, url, dur) => { setRecordedVoiceBlob(blob); setRecordedVoiceUrl(url); setVoiceDuration(dur); }} />
        <div className="flex gap-2 justify-between">
          <Button variant="outline" onClick={onCancel} className="w-1/2 sm:w-auto">
            <ArrowLeft className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <div className="flex gap-2 w-1/2 sm:w-auto justify-end">
            <Button onClick={handleSaveRecording} className="w-full sm:w-auto">
              <CheckCircle className="h-4 w-4 mr-2" /> Save Recording
            </Button>
            <Button onClick={handleNext} variant="secondary" className="w-full sm:w-auto">
              Next <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VoiceTrainingGuide;