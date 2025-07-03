import React, { useState, ReactNode } from 'react';
import { VoiceRecorder } from '@/components/VoiceRecorder';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useVoiceProcessor } from '@/hooks/use-voice-processor';
import { Progress } from '@/components/ui/progress';
import { Loader2, Mic, Volume2, ExternalLink, Volume, VolumeX, Sparkles, AlertCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/queryClient';
import { Link } from 'wouter';
import VoiceTrainingGuide from '@/components/VoiceTrainingGuide';
import VoiceClonePreview from '@/components/VoiceClonePreview';
import { VoiceTestPlayer } from '@/components/VoiceTestPlayer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMobile } from '@/hooks/use-mobile';

interface VoiceRecording {
  id: number;
  name: string;
  audioUrl: string;
  duration: number;
  isDefault: boolean;
  mlProcessed: boolean;
  createdAt: string;
}

interface VoiceRecordingManagerProps {
  userId: number;
  personId: number;
  personName: string;
  onOpenTrainingDialog?: (component: ReactNode) => void;
}

export function VoiceRecordingManager({ userId, personId, personName, onOpenTrainingDialog }: VoiceRecordingManagerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingName, setRecordingName] = useState(`${personName}'s Voice`);
  const queryClient = useQueryClient();
  const { isMobile } = useMobile();
  
  // Voice processor hook for recording and processing voice
  const { 
    processVoiceRecording, 
    isProcessing, 
    progress 
  } = useVoiceProcessor({ 
    userId, 
    personId 
  });

  // Query to fetch voice recordings for this person
  const { 
    data: recordings = [], 
    isLoading,
    isError
  } = useQuery({
    queryKey: [`/api/people/${personId}/voiceRecordings`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/people/${personId}/voiceRecordings`);
      if (!response.ok) {
        throw new Error('Failed to fetch voice recordings');
      }
      return await response.json();
    }
  });

  // Mutation to set a recording as default
  const setDefaultMutation = useMutation({
    mutationFn: async (recordingId: number) => {
      const response = await apiRequest('PATCH', `/api/voiceRecordings/${recordingId}/setDefault`);
      if (!response.ok) {
        throw new Error('Failed to set default recording');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/people/${personId}/voiceRecordings`] });
    }
  });

  // Mutation to delete a recording
  const deleteRecordingMutation = useMutation({
    mutationFn: async (recordingId: number) => {
      const response = await apiRequest('DELETE', `/api/voiceRecordings/${recordingId}`);
      if (!response.ok) {
        throw new Error('Failed to delete recording');
      }
      return recordingId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/people/${personId}/voiceRecordings`] });
    }
  });

  // Handle voice recording save
  const handleSaveRecording = async (audioData: string, duration: number) => {
    setIsRecording(false);
    
    // Process the recording with ML
    const result = await processVoiceRecording(audioData, recordingName, duration);
    
    if (result.success) {
      // Reset recording name for next time
      setRecordingName(`${personName}'s Voice ${new Date().toLocaleDateString()}`);
      
      // Refresh the recordings list
      queryClient.invalidateQueries({ queryKey: [`/api/people/${personId}/voiceRecordings`] });
    }
  };

  // Play a recording
  const playRecording = (audioUrl: string) => {
    try {
      // Create an audio element
      const audio = new Audio();
      
      // Make sure the audioUrl is a complete data URL or has proper format
      if (audioUrl.startsWith('data:')) {
        audio.src = audioUrl;
      } else {
        // Handle case where it might be a relative URL from the server
        audio.src = audioUrl;
      }
      
      // Set up error handling
      audio.onerror = (err) => {
        console.error('Error playing audio:', err);
      };
      
      // Play the audio
      audio.play().catch(err => {
        console.error('Error playing audio:', err);
      });
    } catch (error) {
      console.error('Error creating audio element:', error);
    }
  };

  // Start new recording
  const startNewRecording = () => {
    setIsRecording(true);
  };

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{personName}'s Voice Recordings</h2>
        
        {!isRecording && (
          <Button 
            onClick={() => {
              // Initialize voice training component
              const voiceTrainingComponent = (
                <div className="py-4">
                  <VoiceTrainingGuide
                    userId={userId}
                    personId={personId}
                    personName={personName}
                    onComplete={() => {
                      // Update parent component if needed
                      queryClient.invalidateQueries({ 
                        queryKey: [`/api/people/${personId}/voiceRecordings`] 
                      });
                      
                      // If parent component has event handlers for dialog
                      if (typeof window !== 'undefined' && window.parent) {
                        const closeDialogEvent = new CustomEvent('closeTrainingDialog', {
                          detail: { type: 'voice', personId }
                        });
                        window.dispatchEvent(closeDialogEvent);
                      }
                    }}
                    onCancel={() => {
                      // If parent component has event handlers for dialog
                      if (typeof window !== 'undefined' && window.parent) {
                        const closeDialogEvent = new CustomEvent('closeTrainingDialog', {
                          detail: { type: 'voice', personId }
                        });
                        window.dispatchEvent(closeDialogEvent);
                      }
                    }}
                  />
                </div>
              );
              
              // Use the callback if provided, otherwise fall back to event dispatching
              if (onOpenTrainingDialog) {
                onOpenTrainingDialog(voiceTrainingComponent);
              } else if (typeof window !== 'undefined') {
                const openDialogEvent = new CustomEvent('openTrainingDialog', {
                  detail: { type: 'voice', component: voiceTrainingComponent, personId }
                });
                window.dispatchEvent(openDialogEvent);
              }
            }}
            className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Voice Training
          </Button>
        )}
      </div>
      
      {isProcessing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
              <p className="text-center">Processing voice recording...</p>
              <Progress value={progress} className="h-2" />
              <p className="text-center text-sm text-muted-foreground">
                This may take a few moments while our AI analyzes voice patterns
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {isRecording && (
        <Card className="border-2 border-primary/50">
          <CardHeader>
            <CardTitle>Recording Voice</CardTitle>
            <CardDescription>
              Record a clear voice sample for {personName}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <VoiceRecorder 
              onSave={handleSaveRecording}
              minDuration={5}
              maxDuration={30}
              personName={personName}
              isProcessing={isProcessing}
            />
          </CardContent>
          
          <CardFooter className="justify-between border-t px-6 py-4">
            <Button 
              variant="ghost" 
              onClick={() => setIsRecording(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
          </CardFooter>
        </Card>
      )}
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Saved Recordings</h3>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => {
              // Initialize voice training component
              const voiceTrainingComponent = (
                <div className="py-4">
                  <VoiceTrainingGuide
                    userId={userId}
                    personId={personId}
                    personName={personName}
                    onComplete={() => {
                      // Update parent component if needed
                      queryClient.invalidateQueries({ 
                        queryKey: [`/api/people/${personId}/voiceRecordings`] 
                      });
                      
                      // If parent component has event handlers for dialog
                      if (typeof window !== 'undefined' && window.parent) {
                        const closeDialogEvent = new CustomEvent('closeTrainingDialog', {
                          detail: { type: 'voice', personId }
                        });
                        window.dispatchEvent(closeDialogEvent);
                      }
                    }}
                    onCancel={() => {
                      // If parent component has event handlers for dialog
                      if (typeof window !== 'undefined' && window.parent) {
                        const closeDialogEvent = new CustomEvent('closeTrainingDialog', {
                          detail: { type: 'voice', personId }
                        });
                        window.dispatchEvent(closeDialogEvent);
                      }
                    }}
                  />
                </div>
              );
              
              // Use the callback if provided, otherwise fall back to event dispatching
              if (onOpenTrainingDialog) {
                onOpenTrainingDialog(voiceTrainingComponent);
              } else if (typeof window !== 'undefined') {
                const openDialogEvent = new CustomEvent('openTrainingDialog', {
                  detail: { type: 'voice', component: voiceTrainingComponent, personId }
                });
                window.dispatchEvent(openDialogEvent);
              }
            }}
          >
            <Sparkles className="h-4 w-4" />
            Interactive Voice Training
          </Button>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="py-6">
              <p className="text-center text-muted-foreground">
                Error loading voice recordings
              </p>
            </CardContent>
          </Card>
        ) : recordings.length === 0 ? (
          <Card>
            <CardContent className="py-10">
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <Volume2 className="h-12 w-12 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">No voice recordings yet</p>
                  <p className="text-sm text-muted-foreground">
                    Start voice training to capture high-quality voice samples
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button 
                    onClick={() => {
                      // Initialize voice training component
                      const voiceTrainingComponent = (
                        <div className="py-4">
                          <VoiceTrainingGuide
                            userId={userId}
                            personId={personId}
                            personName={personName}
                            onComplete={() => {
                              // Update parent component if needed
                              queryClient.invalidateQueries({ 
                                queryKey: [`/api/people/${personId}/voiceRecordings`] 
                              });
                              
                              // If parent component has event handlers for dialog
                              if (typeof window !== 'undefined' && window.parent) {
                                const closeDialogEvent = new CustomEvent('closeTrainingDialog', {
                                  detail: { type: 'voice', personId }
                                });
                                window.dispatchEvent(closeDialogEvent);
                              }
                            }}
                            onCancel={() => {
                              // If parent component has event handlers for dialog
                              if (typeof window !== 'undefined' && window.parent) {
                                const closeDialogEvent = new CustomEvent('closeTrainingDialog', {
                                  detail: { type: 'voice', personId }
                                });
                                window.dispatchEvent(closeDialogEvent);
                              }
                            }}
                          />
                        </div>
                      );
                      
                      // Use the callback if provided, otherwise fall back to event dispatching
                      if (onOpenTrainingDialog) {
                        onOpenTrainingDialog(voiceTrainingComponent);
                      } else if (typeof window !== 'undefined') {
                        const openDialogEvent = new CustomEvent('openTrainingDialog', {
                          detail: { type: 'voice', component: voiceTrainingComponent, personId }
                        });
                        window.dispatchEvent(openDialogEvent);
                      }
                    }}
                    className="mt-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Start Voice Training
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  ✨ Our guided voice training helps you record different speech types for better voice cloning!
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Voice Clone Preview - Show if there are recordings */}
            {recordings.length > 0 && (
              <VoiceClonePreview
                personId={personId}
                personName={personName}
                voiceRecordingId={recordings.find(r => r.voiceCloneStatus === 'completed')?.id || recordings.find(r => r.isDefault)?.id || recordings[0]?.id}
                className="mb-6"
              />
            )}
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recordings.map((recording: VoiceRecording) => (
              <Card key={recording.id} className={cn(
                "relative overflow-hidden",
                recording.isDefault && "border-primary border-2"
              )}>
                {recording.isDefault && (
                  <div className="absolute top-0 right-0">
                    <Badge className="rounded-none rounded-bl-md">Default</Badge>
                  </div>
                )}
                
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{recording.name}</CardTitle>
                  <CardDescription>
                    {new Date(recording.createdAt).toLocaleDateString()}
                    {' • '}
                    {Math.round(recording.duration)} seconds
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="pb-2">
                  <div className="flex items-center space-x-2">
                    <Volume className="h-8 w-8 text-primary" />
                    <div>
                      {recording.mlProcessed ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          ML Processed
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Basic
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-between pt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => playRecording(recording.audioUrl)}
                  >
                    <Volume className="mr-2 h-4 w-4" />
                    Play
                  </Button>
                  
                  <div className="space-x-2">
                    {!recording.isDefault && (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => setDefaultMutation.mutate(recording.id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        Set Default
                      </Button>
                    )}
                    
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => deleteRecordingMutation.mutate(recording.id)}
                      disabled={deleteRecordingMutation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
          </>
        )}
      </div>
      
      <Separator className="my-6" />
      
      <div className="bg-muted rounded-lg p-4">
        <h3 className="font-medium mb-2">Voice Recording Tips</h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <span className="bg-primary/20 p-1 rounded mr-2 text-primary">1</span>
            <span>Record in a quiet environment with minimal background noise</span>
          </li>
          <li className="flex items-start">
            <span className="bg-primary/20 p-1 rounded mr-2 text-primary">2</span>
            <span>Speak naturally and clearly at a consistent volume</span>
          </li>
          <li className="flex items-start">
            <span className="bg-primary/20 p-1 rounded mr-2 text-primary">3</span>
            <span>Try to record at least 10-15 seconds of continuous speech</span>
          </li>
          <li className="flex items-start">
            <span className="bg-primary/20 p-1 rounded mr-2 text-primary">4</span>
            <span>Advanced voice models work best with longer, varied speech samples</span>
          </li>
        </ul>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-700">Try our new Interactive Voice Training</p>
            <p className="text-xs text-blue-600 mt-1">
              Our step-by-step voice training guide helps you record specific phrases 
              designed to create the best possible voice model.
            </p>
            <Button 
              variant="link" 
              size="sm" 
              className="h-7 px-0 text-blue-600"
              onClick={() => {
                // Initialize voice training component
                const voiceTrainingComponent = (
                  <div className="py-4">
                    <VoiceTrainingGuide
                      userId={userId}
                      personId={personId}
                      personName={personName}
                      onComplete={() => {
                        // Update parent component if needed
                        queryClient.invalidateQueries({ 
                          queryKey: [`/api/people/${personId}/voiceRecordings`] 
                        });
                        
                        // If parent component has event handlers for dialog
                        if (typeof window !== 'undefined' && window.parent) {
                          const closeDialogEvent = new CustomEvent('closeTrainingDialog', {
                            detail: { type: 'voice', personId }
                          });
                          window.dispatchEvent(closeDialogEvent);
                        }
                      }}
                      onCancel={() => {
                        // If parent component has event handlers for dialog
                        if (typeof window !== 'undefined' && window.parent) {
                          const closeDialogEvent = new CustomEvent('closeTrainingDialog', {
                            detail: { type: 'voice', personId }
                          });
                          window.dispatchEvent(closeDialogEvent);
                        }
                      }}
                    />
                  </div>
                );
                
                // Use the callback if provided, otherwise fall back to event dispatching
                if (onOpenTrainingDialog) {
                  onOpenTrainingDialog(voiceTrainingComponent);
                } else if (typeof window !== 'undefined') {
                  const openDialogEvent = new CustomEvent('openTrainingDialog', {
                    detail: { type: 'voice', component: voiceTrainingComponent, personId }
                  });
                  window.dispatchEvent(openDialogEvent);
                }
              }}
            >
              Start interactive training →
            </Button>
          </div>
        </div>
      </div>

      {/* Voice Test Player - shown when there are recordings */}
      {recordings && recordings.length > 0 && (
        <div className="mt-8">
          <VoiceTestPlayer
            personId={personId}
            personName={personName}
            hasTrainedVoice={recordings.some((r: VoiceRecording) => r.mlProcessed)}
          />
        </div>
      )}
    </div>
  );
}