import { useState, useEffect } from "react";
import { useLocation, useParams, Redirect } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { VideoTemplate, FaceImage, VoiceRecording, Person, insertProcessedVideoSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProcessingIndicator from "@/components/ProcessingIndicator";
import FaceCapture from "@/components/FaceCapture";
import AudioRecorder from "@/components/AudioRecorder";
import { estimateProcessingTime } from "@/lib/ml-utils";
import { ArrowLeft, Video, Save, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useFaceSwap } from "@/hooks/useFaceSwap";


// Form schema for video processing
const processingFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  useFaceSwap: z.boolean().default(true),
  useVoiceSwap: z.boolean().default(true),
});

const VideoProcessor = () => {
  const params = useParams<{ templateId: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedFaceImage, setSelectedFaceImage] = useState<{ blob: Blob, url: string } | null>(null);
  const [selectedVoiceRecording, setSelectedVoiceRecording] = useState<{ blob: Blob, url: string, duration: number } | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<"pending" | "processing" | "completed" | "failed">("pending");
  const [processedVideoId, setProcessedVideoId] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number>(0);
  
  const templateId = parseInt(params.templateId);
  const { user, isLoading: isLoadingUser } = useAuth();
  const { swapFace, isProcessing: isFaceProcessing, progress: faceProgress } = useFaceSwap();
  // Voice processing state (simplified for ElevenLabs only)
  const [isVoiceProcessing, setIsVoiceProcessing] = useState(false);
  const [voiceProgress, setVoiceProgress] = useState(0);
  
  // Redirect to auth page if not logged in
  if (!isLoadingUser && !user) {
    return <Redirect to="/auth" />;
  }
  
  // Fetch video template
  const { data: template, isLoading: isLoadingTemplate, error: templateError } = useQuery<VideoTemplate>({
    queryKey: [`/api/videoTemplates/${templateId}`],
    enabled: !isNaN(templateId),
  });
  
  // Fetch user's face images
  const { data: faceImages } = useQuery<FaceImage[]>({
    queryKey: [`/api/users/${user?.id}/faceImages`],
    enabled: !!user,
  });
  
  // Fetch user's voice recordings
  const { data: voiceRecordings } = useQuery<VoiceRecording[]>({
    queryKey: [`/api/users/${user?.id}/voiceRecordings`],
    enabled: !!user,
  });
  
  // Fetch user's people profiles
  const { data: people } = useQuery<Person[]>({
    queryKey: [`/api/users/${user?.id}/people`],
    enabled: !!user,
  });
  
  // Fetch face images for the selected person
  const { data: personFaceImages } = useQuery<FaceImage[]>({
    queryKey: [`/api/people/${selectedPersonId}/faceImages`],
    enabled: !!selectedPersonId,
  });
  
  // Fetch voice recordings for the selected person
  const { data: personVoiceRecordings } = useQuery<VoiceRecording[]>({
    queryKey: [`/api/people/${selectedPersonId}/voiceRecordings`],
    enabled: !!selectedPersonId,
  });
  
  // Set up form
  const form = useForm<z.infer<typeof processingFormSchema>>({
    resolver: zodResolver(processingFormSchema),
    defaultValues: {
      title: template ? `My version of ${template.title}` : "",
      description: template?.description || "",
      useFaceSwap: true,
      useVoiceSwap: true,
    },
  });
  
  // Update form values when template loads
  useEffect(() => {
    if (template) {
      form.setValue("title", `My version of ${template.title}`);
      form.setValue("description", template.description);
      
      // Calculate estimated processing time
      const time = estimateProcessingTime(
        template.duration,
        { face: form.getValues("useFaceSwap"), voice: form.getValues("useVoiceSwap") }
      );
      setEstimatedTime(time);
    }
  }, [template, form]);
  
  // Update estimated time when options change
  useEffect(() => {
    if (template) {
      const time = estimateProcessingTime(
        template.duration,
        { face: form.getValues("useFaceSwap"), voice: form.getValues("useVoiceSwap") }
      );
      setEstimatedTime(time);
    }
  }, [form.watch("useFaceSwap"), form.watch("useVoiceSwap"), template]);
  
  // Auto-select default face image when person is selected
  useEffect(() => {
    if (selectedPersonId && personFaceImages && personFaceImages.length > 0) {
      const defaultFace = personFaceImages.find(img => img.isDefault);
      if (defaultFace) {
        setSelectedFaceImage({
          blob: new Blob(), // Placeholder
          url: defaultFace.imageUrl
        });
      } else {
        // If no default, select the first one
        setSelectedFaceImage({
          blob: new Blob(), // Placeholder
          url: personFaceImages[0].imageUrl
        });
      }
    }
  }, [selectedPersonId, personFaceImages]);
  
  // Auto-select default voice recording when person is selected
  useEffect(() => {
    if (selectedPersonId && personVoiceRecordings && personVoiceRecordings.length > 0) {
      const defaultVoice = personVoiceRecordings.find(rec => rec.isDefault);
      if (defaultVoice) {
        setSelectedVoiceRecording({
          blob: new Blob(), // Placeholder
          url: defaultVoice.audioUrl,
          duration: defaultVoice.duration || 0
        });
      } else {
        // If no default, select the first one
        setSelectedVoiceRecording({
          blob: new Blob(), // Placeholder
          url: personVoiceRecordings[0].audioUrl,
          duration: personVoiceRecordings[0].duration || 0
        });
      }
    }
  }, [selectedPersonId, personVoiceRecordings]);
  
  // Create processed video mutation
  const createVideoMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/processedVideos", data);
      return response.json();
    },
    onSuccess: (data) => {
      setProcessedVideoId(data.id);
      setProcessingStatus("processing");
      
      // Simulate processing completion (this would be handled by backend polling in a real app)
      setTimeout(() => {
        setProcessingStatus("completed");
      }, estimatedTime * 1000);
      
      if (user) {
        queryClient.invalidateQueries({ queryKey: [`/api/users/${user.id}/processedVideos`] });
      }
    },
    onError: (error) => {
      setProcessingStatus("failed");
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: z.infer<typeof processingFormSchema>) => {
    if (!template || !user) {
      toast({
        title: "Error",
        description: "No template selected or user not logged in",
        variant: "destructive"
      });
      return;
    }
    
    // If face swap is enabled but no face is selected
    if (data.useFaceSwap && !selectedFaceImage) {
      // Check if person is selected and has face images
      if (selectedPersonId && personFaceImages && personFaceImages.length > 0) {
        // Select default face image from person
        const defaultFace = personFaceImages.find(img => img.isDefault) || personFaceImages[0];
        setSelectedFaceImage({
          blob: new Blob(), // Placeholder
          url: defaultFace.imageUrl
        });
      } else {
        toast({
          title: "Face image required",
          description: "Please capture or select a face image for face swapping",
          variant: "destructive"
        });
        return;
      }
    }
    
    // If voice swap is enabled but no voice is selected
    if (data.useVoiceSwap && !selectedVoiceRecording) {
      // Check if person is selected and has voice recordings
      if (selectedPersonId && personVoiceRecordings && personVoiceRecordings.length > 0) {
        // Select default voice recording from person
        const defaultVoice = personVoiceRecordings.find(rec => rec.isDefault) || personVoiceRecordings[0];
        setSelectedVoiceRecording({
          blob: new Blob(), // Placeholder
          url: defaultVoice.audioUrl,
          duration: defaultVoice.duration || 0
        });
      } else {
        toast({
          title: "Voice recording required",
          description: "Please record or select a voice recording for voice swapping",
          variant: "destructive"
        });
        return;
      }
    }
    
    setIsProcessing(true);
    setProcessingStatus("processing");
    
    let processedVideoUrl = template.videoUrl;
    let processingSuccessful = true;
    
    // Perform face swap if enabled
    if (data.useFaceSwap && selectedFaceImage) {
      try {
        const faceSwapResult = await swapFace(selectedFaceImage.url, template.videoUrl);
        if (faceSwapResult.success && faceSwapResult.outputUrl) {
          processedVideoUrl = faceSwapResult.outputUrl;
        } else {
          processingSuccessful = false;
          setProcessingStatus("failed");
          toast({
            title: "Face swap failed",
            description: faceSwapResult.error || "Unknown error occurred during face swap",
            variant: "destructive"
          });
          setIsProcessing(false);
          return;
        }
      } catch (error) {
        processingSuccessful = false;
        setProcessingStatus("failed");
        toast({
          title: "Face swap failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive"
        });
        setIsProcessing(false);
        return;
      }
    }
    
    // Voice processing is handled by ElevenLabs on the server side
    if (data.useVoiceSwap && selectedVoiceRecording) {
      // Voice will be processed using ElevenLabs voice cloning
      setVoiceProgress(50);
    }
    
    if (processingSuccessful) {
      // Prepare the processed video data
      const processedVideoData = {
        userId: user.id,
        templateId: template.id,
        personId: selectedPersonId || null,
        title: data.title,
        description: data.description || "",
        videoUrl: processedVideoUrl,
        thumbnailUrl: template.thumbnailUrl,
        faceImageId: data.useFaceSwap && selectedFaceImage ? 
          // If using a person's face, find the matching ID
          (selectedPersonId && personFaceImages ? 
            personFaceImages.find(img => img.imageUrl === selectedFaceImage.url)?.id || null :
            // Otherwise check user's faces
            (faceImages ? faceImages.find(img => img.imageUrl === selectedFaceImage.url)?.id || null : null)
          ) : null,
        voiceRecordingId: data.useVoiceSwap && selectedVoiceRecording ? 
          // If using a person's voice, find the matching ID
          (selectedPersonId && personVoiceRecordings ? 
            personVoiceRecordings.find(rec => rec.audioUrl === selectedVoiceRecording.url)?.id || null :
            // Otherwise check user's voices
            (voiceRecordings ? voiceRecordings.find(rec => rec.audioUrl === selectedVoiceRecording.url)?.id || null : null)
          ) : null,
        status: "completed"
      };
      
      // Submit for processing
      createVideoMutation.mutate(processedVideoData);
    }
  };
  
  // Handle person selection
  const handlePersonSelect = (personId: number) => {
    setSelectedPersonId(personId);
    setSelectedFaceImage(null);
    setSelectedVoiceRecording(null);
  };
  
  // Handle face capture
  const handleFaceCapture = (blob: Blob, url: string) => {
    setSelectedFaceImage({ blob, url });
  };
  
  // Handle voice recording
  const handleVoiceRecording = (blob: Blob, url: string, duration: number) => {
    setSelectedVoiceRecording({ blob, url, duration });
  };
  
  // Navigate to the video player when processing is complete
  const handleViewVideo = () => {
    if (processedVideoId) {
      navigate(`/player/${processedVideoId}`);
    }
  };
  
  // Go back to library
  const handleGoBack = () => {
    navigate("/library");
  };
  
  // Handle both invalid ID format (NaN) and valid ID that doesn't exist (templateError)
  if (isNaN(templateId) || (!isLoadingTemplate && templateError)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">Invalid template ID</h2>
            <p className="text-muted-foreground mb-4">
              The template you're looking for doesn't exist or may have been removed.
            </p>
            <Button onClick={handleGoBack}>Go to Library</Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 pb-20">
      <Button 
        variant="ghost" 
        className="mb-4" 
        onClick={handleGoBack}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Library
      </Button>
      
      <h1 className="text-3xl font-bold mb-6">Create Your Video</h1>
      
      {isLoadingTemplate ? (
        <Card>
          <CardContent className="py-6">
            <div className="h-8 w-3/4 bg-muted animate-pulse rounded mb-4" />
            <div className="h-40 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      ) : isProcessing ? (
        <div className="max-w-md mx-auto">
          <Card className="mb-6">
            <CardContent className="py-6">
              <h2 className="text-xl font-bold mb-4 text-center">Processing Your Video</h2>
              <ProcessingIndicator status={processingStatus} />
              
              {(isFaceProcessing || isVoiceProcessing) && processingStatus === "processing" && (
                <div className="mt-6 space-y-4">
                  {isFaceProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Face Swapping</span>
                        <span className="text-sm text-muted-foreground">{Math.round(faceProgress)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${faceProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                  
                  {isVoiceProcessing && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Voice Conversion</span>
                        <span className="text-sm text-muted-foreground">{Math.round(voiceProgress)}%</span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${voiceProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {processingStatus === "completed" && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                Your video has been successfully processed!
              </p>
              <div className="flex gap-4 justify-center">
                <Button onClick={handleViewVideo} className="gap-2">
                  <Video className="h-4 w-4" />
                  Watch Video
                </Button>
                <Button variant="outline" onClick={() => navigate("/saved")} className="gap-2">
                  <Save className="h-4 w-4" />
                  View Saved Videos
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Template preview */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-bold mb-4">{template?.title}</h2>
              <div className="aspect-video bg-muted rounded-md overflow-hidden mb-4">
                <img 
                  src={template?.thumbnailUrl} 
                  alt={template?.title} 
                  className="w-full h-full object-cover"
                />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {template?.description}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {template?.category}
                </span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {template?.ageRange} years
                </span>
                <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                  {template ? `${Math.floor(template.duration / 60)}:${(template.duration % 60).toString().padStart(2, '0')}` : ''}
                </span>
              </div>
            </CardContent>
          </Card>
          
          {/* Processing form */}
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                  <CardContent className="pt-6">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Video Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem className="mt-4">
                          <FormLabel>Description (Optional)</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-medium mb-4">Processing Options</h3>
                    
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="useFaceSwap"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-base">
                                Replace actor's face with your face
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Use face swapping technology to replace the actor
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="useVoiceSwap"
                        render={({ field }) => (
                          <FormItem className="flex items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-base">
                                Replace actor's voice with your voice
                              </FormLabel>
                              <p className="text-sm text-muted-foreground">
                                Use voice conversion to make it sound like you
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="mt-4 bg-primary/5 p-3 rounded-md">
                      <p className="text-sm">
                        <span className="font-medium">Estimated processing time:</span>{" "}
                        {Math.floor(estimatedTime / 60) > 0 ? 
                          `${Math.floor(estimatedTime / 60)} min ${estimatedTime % 60} sec` : 
                          `${estimatedTime} seconds`
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                {(form.watch("useFaceSwap") || form.watch("useVoiceSwap")) && people && people.length > 0 && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-medium mb-4">Choose a Person</h3>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Choose an existing person profile to use their face and voice in the video:
                        </p>
                        <Select onValueChange={(value) => {
                          const personId = parseInt(value);
                          if (!isNaN(personId)) {
                            handlePersonSelect(personId);
                          }
                        }}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select a person" />
                          </SelectTrigger>
                          <SelectContent>
                            {people.map(person => (
                              <SelectItem key={person.id} value={person.id.toString()}>
                                <div className="flex items-center gap-2">
                                  <User className="h-4 w-4" />
                                  <span>{person.name} ({person.relationship})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="flex items-center gap-1 mt-2">
                          <Button 
                            variant="link" 
                            onClick={() => navigate("/people")} 
                            className="text-xs h-auto p-0"
                          >
                            Manage people profiles
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {form.watch("useFaceSwap") && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-medium mb-4">Face Selection</h3>
                      
                      {selectedPersonId && personFaceImages && personFaceImages.length > 0 ? (
                        <div className="mb-4 space-y-4">
                          <label className="text-sm font-medium">Select a face for this person</label>
                          <Select onValueChange={(value) => {
                            const selectedImage = personFaceImages.find(img => img.id.toString() === value);
                            if (selectedImage) {
                              setSelectedFaceImage({ 
                                blob: new Blob(), // Placeholder, we don't need the actual blob
                                url: selectedImage.imageUrl 
                              });
                            }
                          }}
                          defaultValue={personFaceImages.find(img => img.isDefault)?.id.toString()}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a face" />
                            </SelectTrigger>
                            <SelectContent>
                              {personFaceImages.map(img => (
                                <SelectItem key={img.id} value={img.id ? img.id.toString() : "default-value"}>
                                  {img.name || "Unnamed image"} {img.isDefault ? "(Default)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <p className="text-sm text-muted-foreground mt-2">
                            Or capture a new face below:
                          </p>
                        </div>
                      ) : faceImages && faceImages.length > 0 && !selectedPersonId ? (
                        <div className="mb-4 space-y-4">
                          <label className="text-sm font-medium">Select a saved face</label>
                          <Select onValueChange={(value) => {
                            const selectedImage = faceImages.find(img => img.id.toString() === value);
                            if (selectedImage) {
                              setSelectedFaceImage({ 
                                blob: new Blob(), // Placeholder, we don't need the actual blob
                                url: selectedImage.imageUrl 
                              });
                            }
                          }}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a saved face" />
                            </SelectTrigger>
                            <SelectContent>
                              {faceImages.map(img => (
                                <SelectItem key={img.id} value={img.id ? img.id.toString() : "default-value"}>
                                  {img.name || "Unnamed image"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <p className="text-sm text-muted-foreground mt-2">
                            Or capture a new face below:
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-4">
                          {selectedPersonId 
                            ? (personFaceImages && personFaceImages.length > 0) 
                              ? "Select a face above or capture a new one:" 
                              : "No faces found for this person. Capture a face below:"
                            : "Capture your face to use in the video:"}
                        </p>
                      )}
                      
                      {/* Only show FaceCapture if no person is selected OR person has no faces */}
                      {(!selectedPersonId || !(personFaceImages && personFaceImages.length > 0 && selectedFaceImage)) && (
                        <FaceCapture 
                          onCapture={handleFaceCapture}
                          existingImage={selectedFaceImage?.url}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
                
                {form.watch("useVoiceSwap") && (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="font-medium mb-4">Voice Selection</h3>
                      
                      {selectedPersonId && personVoiceRecordings && personVoiceRecordings.length > 0 ? (
                        <div className="mb-4 space-y-4">
                          <label className="text-sm font-medium">Select a voice for this person</label>
                          <Select onValueChange={(value) => {
                            const selectedRecording = personVoiceRecordings.find(rec => rec.id.toString() === value);
                            if (selectedRecording) {
                              setSelectedVoiceRecording({ 
                                blob: new Blob(), // Placeholder, we don't need the actual blob
                                url: selectedRecording.audioUrl,
                                duration: selectedRecording.duration || 0
                              });
                            }
                          }}
                          defaultValue={personVoiceRecordings.find(rec => rec.isDefault)?.id.toString()}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a voice" />
                            </SelectTrigger>
                            <SelectContent>
                              {personVoiceRecordings.map(rec => (
                                <SelectItem key={rec.id} value={rec.id ? rec.id.toString() : "default-value"}>
                                  {rec.name || "Unnamed recording"} {rec.isDefault ? "(Default)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <p className="text-sm text-muted-foreground mt-2">
                            Or record a new voice below:
                          </p>
                        </div>
                      ) : voiceRecordings && voiceRecordings.length > 0 && !selectedPersonId ? (
                        <div className="mb-4 space-y-4">
                          <label className="text-sm font-medium">Select a saved voice</label>
                          <Select onValueChange={(value) => {
                            const selectedRecording = voiceRecordings.find(rec => rec.id.toString() === value);
                            if (selectedRecording) {
                              setSelectedVoiceRecording({ 
                                blob: new Blob(), // Placeholder, we don't need the actual blob
                                url: selectedRecording.audioUrl,
                                duration: selectedRecording.duration || 0
                              });
                            }
                          }}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select a saved voice" />
                            </SelectTrigger>
                            <SelectContent>
                              {voiceRecordings.map(rec => (
                                <SelectItem key={rec.id} value={rec.id ? rec.id.toString() : "default-value"}>
                                  {rec.name || "Unnamed recording"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          <p className="text-sm text-muted-foreground mt-2">
                            Or record a new voice below:
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground mb-4">
                          {selectedPersonId 
                            ? (personVoiceRecordings && personVoiceRecordings.length > 0)
                              ? "Select a voice above or record a new one:" 
                              : "No voice recordings found for this person. Record a voice below:"
                            : "Record your voice to use in the video:"}
                        </p>
                      )}
                      
                      {/* Only show AudioRecorder if no person is selected OR person has no voice recordings */}
                      {(!selectedPersonId || !(personVoiceRecordings && personVoiceRecordings.length > 0 && selectedVoiceRecording)) && (
                        <AudioRecorder 
                          onRecordingComplete={handleVoiceRecording}
                          existingRecording={selectedVoiceRecording?.url}
                        />
                      )}
                    </CardContent>
                  </Card>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createVideoMutation.isPending}
                >
                  {createVideoMutation.isPending ? "Processing..." : "Create My Video"}
                </Button>
              </form>
            </Form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoProcessor;
