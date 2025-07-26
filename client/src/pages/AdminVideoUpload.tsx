import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Upload, 
  Video, 
  Image, 
  FileText, 
  Play, 
  Pause,
  Save,
  X,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Download,
  ExternalLink
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const videoTemplateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  ageRange: z.string().min(1, "Age range is required"),
  duration: z.number().min(1, "Duration must be at least 1 second"),
  featured: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  voiceOnly: z.boolean().default(false),
  price: z.number().optional(),
});

type VideoTemplateFormData = z.infer<typeof videoTemplateSchema>;

interface VideoTemplate {
  id: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  duration: number;
  category: string;
  ageRange: string;
  featured: boolean;
  isPremium: boolean;
  voiceOnly: boolean;
  price?: number;
}

export function AdminVideoUpload() {
  const [selectedTemplate, setSelectedTemplate] = useState<VideoTemplate | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const { toast } = useToast();

  // Fetch all video templates
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['/api/admin/videoTemplates'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/admin/videoTemplates', {
          credentials: 'include',
        });
        if (!response.ok) {
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch video templates:', error);
        return [];
      }
    }
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (data: VideoTemplateFormData & { videoFile?: File; thumbnailFile?: File }) => {
      const formData = new FormData();
      
      // Append form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'videoFile' && key !== 'thumbnailFile' && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      // Append files if they exist
      if (data.videoFile) {
        formData.append('video', data.videoFile);
      }
      if (data.thumbnailFile) {
        formData.append('thumbnail', data.thumbnailFile);
      }

      const response = await fetch("/api/admin/videoTemplates", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Failed to create template: ${response.statusText}`);
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videoTemplates'] });
      setIsCreateDialogOpen(false);
      setVideoFile(null);
      setThumbnailFile(null);
      createForm.reset();
      toast({
        title: "Video template created",
        description: "New video template has been uploaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create template",
        description: error.message || "Please try again.",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<VideoTemplateFormData> }) => {
      return apiRequest("PATCH", `/api/admin/videoTemplates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videoTemplates'] });
      setIsEditDialogOpen(false);
      setSelectedTemplate(null);
      toast({
        title: "Template updated",
        description: "Video template has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update template",
        description: error.message || "Please try again.",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/videoTemplates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/videoTemplates'] });
      toast({
        title: "Template deleted",
        description: "Video template has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete template",
        description: error.message || "Please try again.",
      });
    },
  });

  const createForm = useForm<VideoTemplateFormData>({
    resolver: zodResolver(videoTemplateSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "educational",
      ageRange: "3-5",
      duration: 180,
      featured: false,
      isPremium: false,
      voiceOnly: false,
    },
  });

  const editForm = useForm<VideoTemplateFormData>({
    resolver: zodResolver(videoTemplateSchema),
  });

  const categories = [
    "educational", "entertainment", "counting", "alphabet", "colors", 
    "shapes", "animals", "music", "stories", "songs"
  ];

  const ageRanges = ["0-2", "2-4", "3-5", "4-6", "5-7", "6-8", "8+"];

  const handleVideoUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      
      // Auto-calculate duration if possible
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        createForm.setValue('duration', Math.floor(video.duration));
        URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    }
  }, [createForm]);

  const handleThumbnailUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setThumbnailFile(file);
    }
  }, []);

  const handleEditTemplate = (template: VideoTemplate) => {
    setSelectedTemplate(template);
    editForm.reset({
      title: template.title,
      description: template.description,
      category: template.category,
      ageRange: template.ageRange,
      duration: template.duration,
      featured: template.featured,
      isPremium: template.isPremium,
      voiceOnly: template.voiceOnly,
      price: template.price,
    });
    setIsEditDialogOpen(true);
  };

  const onCreateSubmit = (data: VideoTemplateFormData) => {
    if (!videoFile) {
      toast({
        variant: "destructive",
        title: "Video required",
        description: "Please upload a video file.",
      });
      return;
    }

    const mutationData: any = {
      ...data,
      videoFile,
    };
    
    if (thumbnailFile) {
      mutationData.thumbnailFile = thumbnailFile;
    }
    
    createTemplateMutation.mutate(mutationData);
  };

  const onEditSubmit = (data: VideoTemplateFormData) => {
    if (!selectedTemplate) return;
    updateTemplateMutation.mutate({ id: selectedTemplate.id, data });
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Video Templates</h1>
            <p className="text-gray-600">
              Upload and manage video templates for the platform
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Upload New Video Template</DialogTitle>
                <DialogDescription>
                  Upload a video file and provide template information
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-6">
                  {/* File Upload Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="video-upload">Video File *</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        {videoFile ? (
                          <div className="space-y-2">
                            <Video className="h-8 w-8 mx-auto text-blue-600" />
                            <p className="text-sm font-medium">{videoFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(videoFile.size)}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setVideoFile(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Upload className="h-8 w-8 mx-auto text-gray-400" />
                            <p className="text-sm">Choose video file</p>
                            <input
                              id="video-upload"
                              type="file"
                              accept="video/*"
                              onChange={handleVideoUpload}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('video-upload')?.click()}
                            >
                              Browse Files
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="thumbnail-upload">Thumbnail (Optional)</Label>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        {thumbnailFile ? (
                          <div className="space-y-2">
                            <Image className="h-8 w-8 mx-auto text-green-600" />
                            <p className="text-sm font-medium">{thumbnailFile.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(thumbnailFile.size)}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setThumbnailFile(null)}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <Image className="h-8 w-8 mx-auto text-gray-400" />
                            <p className="text-sm">Choose thumbnail</p>
                            <input
                              id="thumbnail-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleThumbnailUpload}
                              className="hidden"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => document.getElementById('thumbnail-upload')?.click()}
                            >
                              Browse Images
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Template Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Video template title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.map((category) => (
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
                  </div>

                  <FormField
                    control={createForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe what this video template is about..." 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={createForm.control}
                      name="ageRange"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Age Range</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select age" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {ageRanges.map((range) => (
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
                    <FormField
                      control={createForm.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duration (sec)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="180"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (cents)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Settings */}
                  <div className="space-y-3">
                    <Label>Template Settings</Label>
                    <div className="flex flex-wrap gap-4">
                      <FormField
                        control={createForm.control}
                        name="featured"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Featured template
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="isPremium"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Premium template
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={createForm.control}
                        name="voiceOnly"
                        render={({ field }) => (
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="rounded"
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              Voice-only template
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTemplateMutation.isPending}>
                      {createTemplateMutation.isPending ? "Uploading..." : "Upload Template"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Templates Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{templates?.length || 0}</div>
              <div className="text-sm text-gray-600">Total Templates</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{templates?.filter((t: VideoTemplate) => t.featured).length || 0}</div>
              <div className="text-sm text-gray-600">Featured</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{templates?.filter((t: VideoTemplate) => t.isPremium).length || 0}</div>
              <div className="text-sm text-gray-600">Premium</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{templates?.filter((t: VideoTemplate) => t.voiceOnly).length || 0}</div>
              <div className="text-sm text-gray-600">Voice Only</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Templates Grid - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {templates?.map((template: VideoTemplate) => (
          <Card key={template.id} className="overflow-hidden">
            <div className="aspect-video bg-gray-100 relative">
              {template.thumbnailUrl ? (
                <img 
                  src={template.thumbnailUrl} 
                  alt={template.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Video className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <div className="absolute top-2 left-2 flex gap-1">
                {template.featured && (
                  <Badge className="bg-yellow-500 text-white">Featured</Badge>
                )}
                {template.isPremium && (
                  <Badge className="bg-purple-600 text-white">Premium</Badge>
                )}
                {template.voiceOnly && (
                  <Badge className="bg-blue-600 text-white">Voice Only</Badge>
                )}
              </div>
              <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                {formatDuration(template.duration)}
              </div>
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg leading-tight">{template.title}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {template.description}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Badge variant="outline">{template.category}</Badge>
                <Badge variant="outline">{template.ageRange}</Badge>
                {template.price && template.price > 0 && (
                  <Badge variant="outline">${(template.price / 100).toFixed(2)}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditTemplate(template)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(template.videoUrl, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${template.title}"?`)) {
                      deleteTemplateMutation.mutate(template.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Video Template</DialogTitle>
            <DialogDescription>
              Update the template information and settings
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Video template title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((category) => (
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
                </div>

                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe what this video template is about..." 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <FormField
                    control={editForm.control}
                    name="ageRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Range</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select age" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {ageRanges.map((range) => (
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
                  <FormField
                    control={editForm.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (sec)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="180"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price (cents)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Template Settings</Label>
                  <div className="flex flex-wrap gap-4">
                    <FormField
                      control={editForm.control}
                      name="featured"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Featured template
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="isPremium"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Premium template
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="voiceOnly"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="rounded"
                            />
                          </FormControl>
                          <FormLabel className="text-sm font-normal">
                            Voice-only template
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateTemplateMutation.isPending}>
                    {updateTemplateMutation.isPending ? "Updating..." : "Update Template"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}