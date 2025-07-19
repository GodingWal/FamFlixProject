import { useState, ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Person, InsertPerson, InsertFaceImage, InsertVoiceRecording } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import FaceCapture from "@/components/FaceCapture";
import FaceVideoUpload from "@/components/FaceVideoUpload";
import AudioRecorder from "@/components/AudioRecorder";
import { VoiceRecordingManager } from "@/components/VoiceRecordingManager";
import FaceTrainingGuide from "@/components/FaceTrainingGuide";
import VoiceTrainingGuide from "@/components/VoiceTrainingGuide";
import VoicePreview from "@/components/VoicePreview";

// UI Components
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

// Icons
import {
  User,
  Users,
  Plus,
  Trash2,
  Edit,
  Camera,
  Video,
  Mic,
  Star,
  StarOff,
  MoreHorizontal,
  ChevronRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";

// Form schema
const personFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  relationship: z.string().min(2, "Relationship must be at least 2 characters"),
});

type PersonFormValues = z.infer<typeof personFormSchema>;

const PeopleManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isAddPersonDialogOpen, setIsAddPersonDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddFaceDialogOpen, setIsAddFaceDialogOpen] = useState(false);
  const [isAddVoiceDialogOpen, setIsAddVoiceDialogOpen] = useState(false);
  const [capturedFaceBlob, setCapturedFaceBlob] = useState<Blob | null>(null);
  const [capturedFaceUrl, setCapturedFaceUrl] = useState<string>("");
  const [faceName, setFaceName] = useState<string>("");
  const [recordedVoiceBlob, setRecordedVoiceBlob] = useState<Blob | null>(null);
  const [recordedVoiceUrl, setRecordedVoiceUrl] = useState<string>("");
  const [voiceDuration, setVoiceDuration] = useState<number>(0);
  const [voiceName, setVoiceName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("faces");
  const [customComponent, setCustomComponent] = useState<ReactNode>(null);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  
  // Query all people for the user
  const { 
    data: people, 
    isLoading, 
    error 
  } = useQuery<Person[]>({
    queryKey: [`/api/users/${user?.id}/people`],
    queryFn: async () => {
      const res = await fetch(`/api/users/${user?.id}/people`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch people: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!user,
    retry: 1,
    retryDelay: 1000,
  });

  // Debug logging
  console.log('People query state:', { people, isLoading, error: error?.message, userId: user?.id });

  // Query face images for selected person
  const {
    data: faceImages = [],
    isLoading: isLoadingFaces,
  } = useQuery<any[]>({
    queryKey: [`/api/people/${selectedPerson?.id}/faceImages`],
    queryFn: async () => {
      const res = await fetch(`/api/people/${selectedPerson?.id}/faceImages`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch face images: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!selectedPerson,
  });

  // Query voice recordings for selected person
  const {
    data: voiceRecordings = [],
    isLoading: isLoadingVoices,
  } = useQuery<any[]>({
    queryKey: [`/api/people/${selectedPerson?.id}/voiceRecordings`],
    queryFn: async () => {
      const res = await fetch(`/api/people/${selectedPerson?.id}/voiceRecordings`, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch voice recordings: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!selectedPerson,
  });

  // Create person mutation
  const createPersonMutation = useMutation({
    mutationFn: async (personData: InsertPerson) => {
      const res = await apiRequest("POST", "/api/people", personData);
      return await res.json();
    },
    onSuccess: () => {
      setIsAddPersonDialogOpen(false);
      addPersonForm.reset(); // Reset the form
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/people`] });
      queryClient.invalidateQueries({ queryKey: ["/api/personalized"] }); // Also refresh homepage data
      toast({
        title: "Success",
        description: "Person added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete person mutation
  const deletePersonMutation = useMutation({
    mutationFn: async (personId: number) => {
      await apiRequest("DELETE", `/api/people/${personId}`);
    },
    onSuccess: () => {
      setIsDeleteDialogOpen(false);
      setSelectedPerson(null);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/people`] });
      toast({
        title: "Success",
        description: "Person deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit person mutation
  const editPersonMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPerson> }) => {
      const res = await apiRequest("PATCH", `/api/people/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/people`] });
      if (selectedPerson) {
        queryClient.invalidateQueries({ queryKey: [`/api/people/${selectedPerson.id}`] });
      }
      toast({
        title: "Success",
        description: "Person updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set default face image mutation
  const setDefaultFaceMutation = useMutation({
    mutationFn: async (faceImageId: number) => {
      const res = await apiRequest("PATCH", `/api/faceImages/${faceImageId}/setDefault`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/people/${selectedPerson?.id}/faceImages`] 
      });
      toast({
        title: "Success",
        description: "Default face image updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set default voice recording mutation
  const setDefaultVoiceMutation = useMutation({
    mutationFn: async (voiceRecordingId: number) => {
      const res = await apiRequest("PATCH", `/api/voiceRecordings/${voiceRecordingId}/setDefault`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/people/${selectedPerson?.id}/voiceRecordings`] 
      });
      toast({
        title: "Success",
        description: "Default voice recording updated",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create face image mutation
  const createFaceImageMutation = useMutation({
    mutationFn: async (faceData: { imageData: string, name: string, personId: number, userId: number, isDefault: boolean }) => {
      const res = await apiRequest("POST", "/api/faceImages", {
        imageData: faceData.imageData,
        name: faceData.name,
        personId: faceData.personId,
        userId: faceData.userId,
        isDefault: faceData.isDefault
      });
      return await res.json();
    },
    onSuccess: () => {
      setIsAddFaceDialogOpen(false);
      setCapturedFaceBlob(null);
      setCapturedFaceUrl("");
      setFaceName("");
      queryClient.invalidateQueries({ queryKey: [`/api/people/${selectedPerson?.id}/faceImages`] });
      toast({
        title: "Success",
        description: "Face image added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Create voice recording mutation
  const createVoiceRecordingMutation = useMutation({
    mutationFn: async (voiceData: { audioData: string, name: string, personId: number, userId: number, duration: number, isDefault: boolean }) => {
      const res = await apiRequest("POST", "/api/voiceRecordings", {
        audioData: voiceData.audioData,
        name: voiceData.name,
        personId: voiceData.personId,
        userId: voiceData.userId,
        duration: voiceData.duration,
        isDefault: voiceData.isDefault
      });
      return await res.json();
    },
    onSuccess: () => {
      setIsAddVoiceDialogOpen(false);
      setRecordedVoiceBlob(null);
      setRecordedVoiceUrl("");
      setVoiceName("");
      setVoiceDuration(0);
      queryClient.invalidateQueries({ queryKey: [`/api/people/${selectedPerson?.id}/voiceRecordings`] });
      toast({
        title: "Success",
        description: "Voice recording added successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete face image mutation
  const deleteFaceImageMutation = useMutation({
    mutationFn: async (faceImageId: number) => {
      await apiRequest("DELETE", `/api/faceImages/${faceImageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/people/${selectedPerson?.id}/faceImages`] });
      toast({
        title: "Success",
        description: "Face image deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Delete voice recording mutation
  const deleteVoiceRecordingMutation = useMutation({
    mutationFn: async (voiceRecordingId: number) => {
      await apiRequest("DELETE", `/api/voiceRecordings/${voiceRecordingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/people/${selectedPerson?.id}/voiceRecordings`] });
      toast({
        title: "Success",
        description: "Voice recording deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for adding a new person
  const addPersonForm = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      name: "",
      relationship: "",
    },
  });

  // Form for editing a person
  const editPersonForm = useForm<PersonFormValues>({
    resolver: zodResolver(personFormSchema),
    defaultValues: {
      name: selectedPerson?.name || "",
      relationship: selectedPerson?.relationship || "",
    },
  });

  // Handle adding a new person
  const onAddPersonSubmit = (data: PersonFormValues) => {
    if (!user) return;
    
    createPersonMutation.mutate({
      userId: user.id,
      name: data.name,
      relationship: data.relationship,
    });
  };

  // Handle editing a person
  const onEditPersonSubmit = (data: PersonFormValues) => {
    if (!selectedPerson) return;
    
    editPersonMutation.mutate({
      id: selectedPerson.id,
      data: {
        name: data.name,
        relationship: data.relationship,
      },
    });
  };

  // Handle deleting a person
  const handleDeletePerson = () => {
    if (!selectedPerson) return;
    deletePersonMutation.mutate(selectedPerson.id);
  };

  // Open the edit dialog
  const openEditDialog = (person: Person) => {
    setSelectedPerson(person);
    editPersonForm.reset({
      name: person.name,
      relationship: person.relationship || "",
    });
    setIsEditDialogOpen(true);
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  // Render relationship badge
  const renderRelationshipBadge = (relationship: string | null) => {
    if (!relationship) return null;
    
    return (
      <Badge variant="outline" className="ml-2">
        {relationship}
      </Badge>
    );
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">People Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage different people's faces and voices for your videos
          </p>
        </div>
        <Button onClick={() => setIsAddPersonDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Person
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* People List */}
        <Card className="col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">People</CardTitle>
            <CardDescription>
              Select a person to manage their faces and voices
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 py-2">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[150px]" />
                      <Skeleton className="h-4 w-[100px]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-4 text-destructive">
                Error loading people
              </div>
            ) : people && people.length > 0 ? (
              <ScrollArea className="h-[calc(100vh-300px)]">
                <div className="space-y-1">
                  {people.map((person) => (
                    <div
                      key={person.id}
                      className={`flex items-center p-2 rounded-md cursor-pointer hover:bg-accent ${
                        selectedPerson?.id === person.id ? "bg-accent" : ""
                      }`}
                      onClick={() => setSelectedPerson(person)}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={person.avatarUrl || undefined} />
                        <AvatarFallback>
                          {getInitials(person.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center">
                          <div className="font-medium">{person.name}</div>
                          {renderRelationshipBadge(person.relationship)}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center">
                          <span className="flex items-center mr-3">
                            <Camera className="w-3 h-3 mr-1" /> 
                            {selectedPerson?.id === person.id ? (faceImages?.length || 0) : '—'}
                          </span>
                          <span className="flex items-center">
                            <Mic className="w-3 h-3 mr-1" /> 
                            {selectedPerson?.id === person.id ? (voiceRecordings?.length || 0) : '—'}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditDialog(person);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPerson(person);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <h3 className="font-medium text-lg mb-1">No people added yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Add a person to start capturing faces and voices
                </p>
                <Button onClick={() => setIsAddPersonDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Person
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Panel */}
        <Card className="col-span-1 md:col-span-2">
          {selectedPerson ? (
            <Tabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value)}>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={selectedPerson.avatarUrl || undefined} />
                      <AvatarFallback>
                        {getInitials(selectedPerson.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle>{selectedPerson.name}</CardTitle>
                        {renderRelationshipBadge(selectedPerson.relationship)}
                        {/* Voice training status badge */}
                        {voiceRecordings && voiceRecordings.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Mic className="h-3 w-3 mr-1" />
                            Voice Trained
                          </Badge>
                        )}
                        {/* Face images status badge */}
                        {faceImages && faceImages.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Camera className="h-3 w-3 mr-1" />
                            Face Trained
                          </Badge>
                        )}
                      </div>
                      <CardDescription>
                        Added on {new Date(selectedPerson.createdAt).toLocaleDateString()}
                        {voiceRecordings && voiceRecordings.length > 0 && (
                          <span className="ml-2">• {voiceRecordings.length} voice recording{voiceRecordings.length !== 1 ? 's' : ''}</span>
                        )}
                        {faceImages && faceImages.length > 0 && (
                          <span className="ml-2">• {faceImages.length} face image{faceImages.length !== 1 ? 's' : ''}</span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openEditDialog(selectedPerson)}
                    >
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                  </div>
                </div>

                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="faces">
                    <Camera className="h-4 w-4 mr-2" /> Face Images
                    {faceImages && faceImages.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {faceImages.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="voices">
                    <Mic className="h-4 w-4 mr-2" /> Voice Recordings
                    {voiceRecordings && voiceRecordings.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {voiceRecordings.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              <CardContent className="pt-6">
                <TabsContent value="faces">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium">Face Images</h3>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        if (!selectedPerson || !user) return;
                        
                        // Open interactive face training in a dialog
                        const faceTrainingComponent = (
                          <div className="py-4">
                            <FaceTrainingGuide
                              userId={user.id}
                              personId={selectedPerson.id}
                              personName={selectedPerson.name}
                              onComplete={() => {
                                setIsCustomDialogOpen(false);
                                setActiveTab('faces');
                                // Refresh face images
                                queryClient.invalidateQueries({ 
                                  queryKey: [`/api/people/${selectedPerson.id}/faceImages`] 
                                });
                              }}
                              onCancel={() => {
                                setIsCustomDialogOpen(false);
                                setActiveTab('faces');
                              }}
                            />
                          </div>
                        );
                        
                        setCustomComponent(faceTrainingComponent);
                        setIsCustomDialogOpen(true);
                      }}
                    >
                      <Camera className="h-4 w-4 mr-2" /> Start Face Training
                    </Button>
                  </div>
                  
                  {isLoadingFaces ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <Card key={i}>
                          <CardContent className="p-0">
                            <div className="aspect-square">
                              <Skeleton className="h-full w-full rounded-t-lg" />
                            </div>
                            <div className="p-3">
                              <Skeleton className="h-5 w-[120px] mb-2" />
                              <Skeleton className="h-4 w-[180px]" />
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : !faceImages || faceImages.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/30">
                      <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                      <h3 className="font-medium text-lg mb-1">No face data</h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        Start face training to capture high-quality face images
                      </p>
                      <Button 
                        onClick={() => {
                          if (!selectedPerson || !user) return;
                          
                          // Open interactive face training in a dialog
                          const faceTrainingComponent = (
                            <div className="py-4">
                              <FaceTrainingGuide
                                userId={user.id}
                                personId={selectedPerson.id}
                                personName={selectedPerson.name}
                                onComplete={() => {
                                  setIsCustomDialogOpen(false);
                                  setActiveTab('faces');
                                  // Refresh face images
                                  queryClient.invalidateQueries({ 
                                    queryKey: [`/api/people/${selectedPerson.id}/faceImages`] 
                                  });
                                }}
                                onCancel={() => {
                                  setIsCustomDialogOpen(false);
                                  setActiveTab('faces');
                                }}
                              />
                            </div>
                          );
                          
                          setCustomComponent(faceTrainingComponent);
                          setIsCustomDialogOpen(true);
                        }}
                      >
                        <Camera className="w-4 h-4 mr-2" /> Start Face Training
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {faceImages.map((face) => (
                        <Card key={face.id}>
                          <CardContent className="p-0">
                            <div className="aspect-square relative overflow-hidden rounded-t-lg">
                              <img
                                src={face.imageUrl}
                                alt={face.name}
                                className="w-full h-full object-cover"
                              />
                              {face.isDefault && (
                                <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-md text-xs">
                                  Default
                                </div>
                              )}
                            </div>
                            <div className="p-3 flex justify-between items-center">
                              <div>
                                <h4 className="font-medium">{face.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  Added {new Date(face.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex">
                                {!face.isDefault && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDefaultFaceMutation.mutate(face.id)}
                                    title="Set as default"
                                  >
                                    <Star className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => deleteFaceImageMutation.mutate(face.id)}
                                  title="Delete face image"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="voices" className="space-y-6">
                  {selectedPerson && user && (
                    <>
                      <VoiceRecordingManager 
                        userId={user.id}
                        personId={selectedPerson.id}
                        personName={selectedPerson.name}
                        onOpenTrainingDialog={(component) => {
                          setCustomComponent(component);
                          setIsCustomDialogOpen(true);
                        }}
                      />
                      
                      <VoicePreview 
                        personId={selectedPerson.id}
                        personName={selectedPerson.name}
                        voiceRecordingCount={voiceRecordings?.length || 0}
                      />
                    </>
                  )}
                </TabsContent>
              </CardContent>
              <CardFooter className="flex justify-center border-t pt-6">
                <Button
                  variant="outline"
                  className="text-destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete {selectedPerson.name}
                </Button>
              </CardFooter>
            </Tabs>
          ) : (
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Users className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-medium mb-2">Select a Person</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Choose a person from the list to manage their faces and voices, or create a new one.
              </p>
              <Button onClick={() => setIsAddPersonDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Person
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Add Person Dialog */}
      <Dialog open={isAddPersonDialogOpen} onOpenChange={setIsAddPersonDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Person</DialogTitle>
            <DialogDescription>
              Add a person to manage their faces and voices
            </DialogDescription>
          </DialogHeader>
          <Form {...addPersonForm}>
            <form onSubmit={addPersonForm.handleSubmit(onAddPersonSubmit)} className="space-y-6">
              <FormField
                control={addPersonForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name of the person (e.g., "Dad", "Mom", "Grandma")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addPersonForm.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter relationship" {...field} />
                    </FormControl>
                    <FormDescription>
                      Relationship to the child (e.g., "Parent", "Grandparent", "Sibling")
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={createPersonMutation.isPending}>
                  {createPersonMutation.isPending ? "Adding..." : "Add Person"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Person Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Person</DialogTitle>
            <DialogDescription>
              Update person information
            </DialogDescription>
          </DialogHeader>
          <Form {...editPersonForm}>
            <form onSubmit={editPersonForm.handleSubmit(onEditPersonSubmit)} className="space-y-6">
              <FormField
                control={editPersonForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editPersonForm.control}
                name="relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter relationship" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit" disabled={editPersonMutation.isPending}>
                  {editPersonMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Person Alert */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedPerson?.name} and all associated faces and voice recordings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePerson}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deletePersonMutation.isPending}
            >
              {deletePersonMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Custom Component Dialog */}
      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="sr-only">Training Session</DialogTitle>
            <DialogDescription className="sr-only">
              Interactive training session for face or voice capture
            </DialogDescription>
          </DialogHeader>
          {customComponent}
        </DialogContent>
      </Dialog>
      
      {/* Add Face Video Dialog */}
      <Dialog open={isAddFaceDialogOpen} onOpenChange={setIsAddFaceDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add Face Video</DialogTitle>
            <DialogDescription>
              Record or upload a 10-30 second video of {selectedPerson?.name}'s face
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="faceName">Video Name</Label>
              <Input 
                id="faceName" 
                placeholder="E.g., Front view, Multiple expressions"
                value={faceName}
                onChange={(e) => setFaceName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Give your face video a descriptive name to identify it later
              </p>
            </div>
            
            <div>
              {selectedPerson && user && (
                <FaceVideoUpload
                  personId={selectedPerson.id}
                  userId={user.id}
                  onSuccess={(videoUrl, videoData) => {
                    // Once video is uploaded, we can close the dialog as processing happens in the background
                    setIsAddFaceDialogOpen(false);
                    setFaceName("");
                    toast({
                      title: "Video uploaded successfully",
                      description: "Your video is being processed to extract face images",
                    });
                    
                    // Manually trigger a refetch after some time to see new processed faces
                    setTimeout(() => {
                      queryClient.invalidateQueries({ 
                        queryKey: [`/api/people/${selectedPerson?.id}/faceImages`] 
                      });
                    }, 5000);
                  }}
                  buttonText="Upload Face Video"
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddFaceDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Add Voice Dialog */}
      <Dialog open={isAddVoiceDialogOpen} onOpenChange={setIsAddVoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Voice Recording</DialogTitle>
            <DialogDescription>
              Record a voice sample for {selectedPerson?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="voiceName">Recording Name</Label>
              <Input 
                id="voiceName" 
                placeholder="E.g., Reading, Casual conversation"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Give your voice recording a descriptive name
              </p>
            </div>
            
            <div>
              <AudioRecorder
                onRecordingComplete={(audioBlob, audioUrl, duration) => {
                  setRecordedVoiceBlob(audioBlob);
                  setRecordedVoiceUrl(audioUrl);
                  setVoiceDuration(duration);
                }}
                existingRecording={recordedVoiceUrl}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="submit"
              onClick={() => {
                if (!selectedPerson || !user || !recordedVoiceBlob || !voiceName) return;
                
                // Convert audio to base64
                const reader = new FileReader();
                reader.readAsDataURL(recordedVoiceBlob);
                reader.onloadend = () => {
                  const base64data = reader.result as string;
                  
                  // Check if this is the first voice recording for the person
                  const isFirst = voiceRecordings.length === 0;
                  
                  createVoiceRecordingMutation.mutate({
                    audioData: base64data,
                    name: voiceName,
                    personId: selectedPerson.id,
                    userId: user.id,
                    duration: voiceDuration,
                    isDefault: isFirst
                  });
                };
              }}
              disabled={!recordedVoiceBlob || !voiceName || createVoiceRecordingMutation.isPending}
            >
              {createVoiceRecordingMutation.isPending ? "Adding..." : "Add Voice Recording"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
    </div>
  );
};

export default PeopleManagement;