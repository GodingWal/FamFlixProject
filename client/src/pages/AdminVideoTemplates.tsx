import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { VideoTemplate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Upload, Image, Film, Video, CheckCircle, XCircle, Trash2, Edit, Users, AudioWaveform, BarChart3, Clock, Loader2 } from "lucide-react";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Define form schema
const videoTemplateSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  category: z.string().min(2, { message: "Please select a category" }),
  ageRange: z.string().min(2, { message: "Please select an age range" }),
  duration: z.coerce.number().min(1, { message: "Duration must be at least 1 second" }),
  featured: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  price: z.coerce.number().nullable().optional(),
  voiceOnly: z.boolean().default(false),
  videoFile: z.instanceof(File).optional(),
  thumbnailFile: z.instanceof(File).optional(),
});

type VideoFormValues = z.infer<typeof videoTemplateSchema>;

// Define categories and age ranges
const CATEGORIES = ["songs", "counting", "alphabet", "animals", "colors", "science", "math", "language", "stories"];
const AGE_RANGES = ["0-2", "1-3", "1-5", "2-4", "3-5", "4-6", "5-7", "6-8", "7-10"];

const AdminVideoTemplates = () => {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDiarizingOnUpload, setIsDiarizingOnUpload] = useState(false);
  const [deleteVideoId, setDeleteVideoId] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [speakerAnalysisResults, setSpeakerAnalysisResults] = useState<Record<number, any>>({});
  const [analyzingVideos, setAnalyzingVideos] = useState<Set<number>>(new Set());
  const [selectedVideoForAnalysis, setSelectedVideoForAnalysis] = useState<number | null>(null);
  const [analysisDialogOpen, setAnalysisDialogOpen] = useState(false);
  
  // Setup form with default values
  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoTemplateSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      ageRange: "",
      duration: 0,
      featured: false,
      isPremium: false,
      price: null,
      voiceOnly: false,
    },
  });
  
  // Fetch all video templates
  const { data: videoTemplates, isLoading, refetch } = useQuery<VideoTemplate[]>({
    queryKey: ['/api/admin/videoTemplates'],
  });
  
  // Create mutation for uploading a new video template with automatic speaker diarization
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      const xhr = new XMLHttpRequest();
      
      // Create a promise to track the upload
      const response = await new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 50); // Upload is 50% of total process
            setUploadProgress(progress);
          }
        });
        
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error("Upload failed"));
          }
        });
        
        xhr.addEventListener("error", () => {
          reject(new Error("Network error"));
        });
        
        xhr.open("POST", "/api/admin/videoTemplates/upload", true);
        xhr.send(formData);
      });
      
      // After upload, start speaker diarization
      if (response.id) {
        setUploadProgress(50);
        setIsDiarizingOnUpload(true);
        
        try {
          await apiRequest('POST', `/api/videoTemplates/${response.id}/analyze-speakers`, {});
          setUploadProgress(100);
          
          toast({
            title: "Complete",
            description: "Video uploaded and speaker analysis completed",
            variant: "default",
          });
        } catch (diarizationError) {
          setUploadProgress(75);
          toast({
            title: "Partial Success", 
            description: "Video uploaded but speaker analysis failed. You can run it manually later.",
            variant: "default",
          });
        }
        
        setIsDiarizingOnUpload(false);
      }
      
      setIsUploading(false);
      setUploadProgress(0);
      return response;
    },
    onSuccess: (data) => {
      form.reset();
      setSelectedFile(null);
      setThumbnailFile(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videoTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videoTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videoTemplates/featured'] });
      refetch();
    },
    onError: (error: Error) => {
      toast({ 
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });
  
  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/videoTemplates/${id}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Video template has been deleted successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videoTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videoTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/videoTemplates/featured'] });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Speaker analysis mutation
  const speakerAnalysisMutation = useMutation({
    mutationFn: async (templateId: number) => {
      const response = await apiRequest('POST', '/api/video/analyze-speakers', {
        templateId
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to analyze speakers');
      }

      return await response.json();
    },
    onSuccess: (data, templateId) => {
      setSpeakerAnalysisResults(prev => ({
        ...prev,
        [templateId]: data
      }));
      setAnalyzingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(templateId);
        return newSet;
      });
      toast({
        title: 'Speaker analysis complete',
        description: `Found ${data.analysis.totalSpeakers} speakers in ${data.analysis.totalSegments} segments`
      });
    },
    onError: (error: Error, templateId) => {
      setAnalyzingVideos(prev => {
        const newSet = new Set(prev);
        newSet.delete(templateId);
        return newSet;
      });
      toast({
        title: 'Speaker analysis failed',
        description: error.message,
        variant: 'destructive'
      });
    }
  });
  
  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // If it's a video, try to get its duration to auto-fill the form
      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          form.setValue('duration', Math.round(video.duration));
        };
        video.src = URL.createObjectURL(file);
      }
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setThumbnailFile(e.target.files[0]);
    }
  };
  
  const onSubmit = (data: VideoFormValues) => {
    if (!selectedFile) {
      toast({ 
        title: "Missing Video",
        description: "Please select a video file to upload",
        variant: "destructive",
      });
      return;
    }
    
    if (!thumbnailFile) {
      toast({ 
        title: "Missing Thumbnail",
        description: "Please select a thumbnail image for the video",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('thumbnail', thumbnailFile);
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('category', data.category);
    formData.append('ageRange', data.ageRange);
    formData.append('duration', data.duration.toString());
    formData.append('featured', data.featured.toString());
    formData.append('isPremium', data.isPremium.toString());
    
    if (data.price) {
      formData.append('price', data.price.toString());
    }
    
    formData.append('voiceOnly', data.voiceOnly.toString());
    
    uploadMutation.mutate(formData);
  };
  
  const handleDeleteClick = (id: number) => {
    setDeleteVideoId(id);
    setDeleteDialogOpen(true);
  };

  const handleAnalyzeSpeakers = (templateId: number) => {
    setAnalyzingVideos(prev => new Set(prev).add(templateId));
    speakerAnalysisMutation.mutate(templateId);
  };
  
  const handleConfirmDelete = () => {
    if (deleteVideoId) {
      deleteMutation.mutate(deleteVideoId);
      setDeleteDialogOpen(false);
      setDeleteVideoId(null);
    }
  };
  
  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-6">Video Template Management</h1>
      
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="upload">Upload New Video</TabsTrigger>
          <TabsTrigger value="templates">Video Templates</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload New Video Template</CardTitle>
              <CardDescription>
                Add a new educational video to the library. Speaker analysis will run automatically after upload.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Video and Thumbnail Upload */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Video Upload */}
                    <div>
                      <FormLabel className="block mb-2 font-medium">Video File</FormLabel>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-md">
                        <div className="space-y-1 text-center">
                          <Video className="mx-auto h-12 w-12 text-muted-foreground" />
                          <div className="flex text-sm">
                            <label
                              htmlFor="video-upload"
                              className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                            >
                              <span>Upload a video</span>
                              <input
                                id="video-upload"
                                name="video-upload"
                                type="file"
                                accept="video/*"
                                className="sr-only"
                                onChange={handleVideoChange}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            MP4, WebM, or MOV up to 100MB
                          </p>
                          {selectedFile && (
                            <p className="text-sm truncate max-w-xs mx-auto text-primary">
                              {selectedFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Thumbnail Upload */}
                    <div>
                      <FormLabel className="block mb-2 font-medium">Thumbnail Image</FormLabel>
                      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-border rounded-md">
                        <div className="space-y-1 text-center">
                          <Image className="mx-auto h-12 w-12 text-muted-foreground" />
                          <div className="flex text-sm">
                            <label
                              htmlFor="thumbnail-upload"
                              className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                            >
                              <span>Upload a thumbnail</span>
                              <input
                                id="thumbnail-upload"
                                name="thumbnail-upload"
                                type="file"
                                accept="image/*"
                                className="sr-only"
                                onChange={handleThumbnailChange}
                              />
                            </label>
                            <p className="pl-1">or drag and drop</p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG, or GIF up to 10MB
                          </p>
                          {thumbnailFile && (
                            <p className="text-sm truncate max-w-xs mx-auto text-primary">
                              {thumbnailFile.name}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter video title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Duration */}
                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (seconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="1" 
                              placeholder="Video duration in seconds" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Auto-filled if you upload a video file
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category */}
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CATEGORIES.map((category) => (
                                <SelectItem key={category} value={category}>
                                  {category.charAt(0).toUpperCase() + category.slice(1)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Age Range */}
                    <FormField
                      control={form.control}
                      name="ageRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age Range</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select age range" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {AGE_RANGES.map((range) => (
                                <SelectItem key={range} value={range}>
                                  {range} years
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Description */}
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter video description"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Switch Controls */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Featured */}
                    <FormField
                      control={form.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Featured
                            </FormLabel>
                            <FormDescription>
                              Show in featured section
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {/* Premium */}
                    <FormField
                      control={form.control}
                      name="isPremium"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Premium
                            </FormLabel>
                            <FormDescription>
                              Require subscription
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    {/* Voice Only */}
                    <FormField
                      control={form.control}
                      name="voiceOnly"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Voice Only
                            </FormLabel>
                            <FormDescription>
                              Only replace voice, no face swap
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Conditional price field for premium content */}
                  {form.watch("isPremium") && (
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (in cents)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min="0" 
                              placeholder="Enter price in cents (e.g. 999 for $9.99)" 
                              {...field} 
                              value={field.value === null ? "" : field.value}
                              onChange={(e) => field.onChange(e.target.value === "" ? null : parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Price in cents (e.g. 999 for $9.99)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <Button 
                    type="submit" 
                    disabled={!selectedFile || !thumbnailFile || isUploading || uploadMutation.isPending}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isDiarizingOnUpload ? 'Analyzing Speakers...' : `Uploading... ${uploadProgress}%`}
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Video Template
                      </>
                    )}
                  </Button>
                  
                  {isUploading && (
                    <div className="mt-4">
                      <Progress value={uploadProgress} className="w-full" />
                      <p className="text-sm text-muted-foreground mt-2 text-center">
                        {isDiarizingOnUpload ? (
                          <>
                            <AudioWaveform className="inline mr-2 h-4 w-4" />
                            Running speaker analysis on uploaded video...
                          </>
                        ) : (
                          'Uploading your video template...'
                        )}
                      </p>
                    </div>
                  )}
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Video Templates List Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Existing Video Templates</CardTitle>
              <CardDescription>
                Manage and analyze video templates in your library
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : videoTemplates && videoTemplates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {videoTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{template.category}</Badge>
                        </TableCell>
                        <TableCell>{template.duration}s</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {template.featured && (
                              <Badge variant="default">Featured</Badge>
                            )}
                            {template.isPremium && (
                              <Badge variant="outline">Premium</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedVideoForAnalysis(template.id);
                                setAnalysisDialogOpen(true);
                              }}
                            >
                              <BarChart3 className="h-4 w-4 mr-1" />
                              Analyze
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteClick(template.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No video templates found. Upload your first video template.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Video Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video template? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminVideoTemplates;