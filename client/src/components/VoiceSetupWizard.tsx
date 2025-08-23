import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, ChevronLeft, ChevronRight, Mic, Camera, Sparkles } from "lucide-react";
import VoiceTrainingGuide from "@/components/VoiceTrainingGuide";
import FaceTrainingGuide from "@/components/FaceTrainingGuide";
import VoiceClonePreview from "@/components/VoiceClonePreview";

interface VoiceSetupWizardProps {
  userId: number;
  personId: number;
  personName: string;
  onComplete?: () => void;
  onCancel?: () => void;
}

interface VoiceRecording {
  id: number;
  isDefault?: boolean;
}

export default function VoiceSetupWizard({ userId, personId, personName, onComplete, onCancel }: VoiceSetupWizardProps) {
  const [step, setStep] = useState<number>(0); // 0=Voice, 1=Face, 2=Preview
  const [voiceRecordings, setVoiceRecordings] = useState<VoiceRecording[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(false);

  const defaultVoiceRecordingId = useMemo(() => {
    const def = voiceRecordings.find(v => v.isDefault);
    return def?.id ?? voiceRecordings[0]?.id;
  }, [voiceRecordings]);

  useEffect(() => {
    // Load voice recordings to enable preview step
    const load = async () => {
      setIsLoadingVoices(true);
      try {
        const res = await fetch(`/api/people/${personId}/voiceRecordings`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setVoiceRecordings(Array.isArray(data) ? data : []);
        }
      } finally {
        setIsLoadingVoices(false);
      }
    };
    load();
  }, [personId]);

  const StepHeader = () => (
    <div className="flex items-center justify-center gap-4 mb-4">
      <div className={`flex items-center gap-2 ${step >= 0 ? 'text-primary' : 'text-muted-foreground'}`}>
        <Mic className="h-4 w-4" />
        <span className="text-sm font-medium">Voice</span>
      </div>
      <Separator className="w-12" />
      <div className={`flex items-center gap-2 ${step >= 1 ? 'text-primary' : 'text-muted-foreground'}`}>
        <Camera className="h-4 w-4" />
        <span className="text-sm font-medium">Face</span>
      </div>
      <Separator className="w-12" />
      <div className={`flex items-center gap-2 ${step >= 2 ? 'text-primary' : 'text-muted-foreground'}`}>
        <Sparkles className="h-4 w-4" />
        <span className="text-sm font-medium">Preview</span>
      </div>
    </div>
  );

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Setup Wizard</CardTitle>
        <CardDescription>First train the voice, then capture face images, then preview.</CardDescription>
      </CardHeader>
      <CardContent>
        <StepHeader />
        <div className="border rounded-lg p-4">
          {step === 0 && (
            <VoiceTrainingGuide
              userId={userId}
              personId={personId}
              personName={personName}
              onComplete={() => {
                // refresh voice recordings then move to next step
                (async () => {
                  try {
                    const res = await fetch(`/api/people/${personId}/voiceRecordings`, { credentials: 'include' });
                    if (res.ok) setVoiceRecordings(await res.json());
                  } catch {}
                  setStep(1);
                })();
              }}
              onCancel={() => onCancel?.()}
            />
          )}

          {step === 1 && (
            <FaceTrainingGuide
              userId={userId}
              personId={personId}
              personName={personName}
              onComplete={() => setStep(2)}
              onCancel={() => onCancel?.()}
            />
          )}

          {step === 2 && (
            <div className="space-y-4">
              {!defaultVoiceRecordingId && !isLoadingVoices && (
                <div className="text-sm text-muted-foreground">
                  No voice recordings found yet. Go back to Voice step to record a sample.
                </div>
              )}
              <VoiceClonePreview
                personId={personId}
                personName={personName}
                voiceRecordingId={defaultVoiceRecordingId}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onCancel}>Close</Button>
                <Button onClick={onComplete} disabled={!defaultVoiceRecordingId}>Done</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setStep(prev => Math.max(0, prev - 1))}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Button
            onClick={() => setStep(prev => Math.min(2, prev + 1))}
            disabled={step === 2 || (step === 2 && !defaultVoiceRecordingId)}
          >
            Next <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
