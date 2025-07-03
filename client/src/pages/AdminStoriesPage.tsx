import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  Play, 
  Pause,
  Save,
  X,
  BookOpen, 
  Moon, 
  GraduationCap, 
  Crown,
  Volume2,
  Video,
  FileText,
  Settings,
  Eye,
  EyeOff
} from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const storySchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  category: z.enum(["bedtime", "educational", "fairytale", "voice-only"]),
  ageRange: z.string().min(1, "Age range is required"),
  duration: z.number().min(30, "Duration must be at least 30 seconds"),
  animationType: z.enum(["scene", "character", "abstract"]),
});

type StoryFormData = z.infer<typeof storySchema>;

interface Story {
  id: number;
  title: string;
  content: string;
  category: string;
  age_range: string;
  duration: number;
  animation_type: string;
  animation_data: any;
  audio_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function AdminStoriesPage() {
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();

  // Fetch all stories (including inactive ones for admin)
  const { data: stories, isLoading: storiesLoading } = useQuery({
    queryKey: ['/api/admin/stories'],
    queryFn: async () => {
      const response = await fetch('/api/admin/stories');
      if (!response.ok) throw new Error('Failed to fetch stories');
      return response.json();
    }
  });

  const createStoryMutation = useMutation({
    mutationFn: async (data: StoryFormData) => {
      return apiRequest("POST", "/api/admin/stories", {
        ...data,
        animationData: { type: data.animationType, category: data.category }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Story created",
        description: "New story has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to create story",
        description: error.message || "Please try again.",
      });
    },
  });

  const updateStoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<StoryFormData> }) => {
      return apiRequest("PATCH", `/api/admin/stories/${id}`, {
        ...data,
        animationData: data.animationType ? { type: data.animationType, category: data.category } : undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
      setIsEditDialogOpen(false);
      setSelectedStory(null);
      toast({
        title: "Story updated",
        description: "Story has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update story",
        description: error.message || "Please try again.",
      });
    },
  });

  const toggleStoryMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return apiRequest("PATCH", `/api/admin/stories/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
      toast({
        title: "Story status updated",
        description: "Story visibility has been changed.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update story",
        description: error.message || "Please try again.",
      });
    },
  });

  const deleteStoryMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/admin/stories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stories'] });
      toast({
        title: "Story deleted",
        description: "Story has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete story",
        description: error.message || "Please try again.",
      });
    },
  });

  const createForm = useForm<StoryFormData>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      title: "",
      content: "",
      category: "bedtime",
      ageRange: "2-4",
      duration: 120,
      animationType: "scene",
    },
  });

  const editForm = useForm<StoryFormData>({
    resolver: zodResolver(storySchema),
    defaultValues: {
      title: "",
      content: "",
      category: "bedtime",
      ageRange: "2-4",
      duration: 120,
      animationType: "scene",
    },
  });

  const categories = [
    { value: "all", label: "All Categories", icon: BookOpen },
    { value: "bedtime", label: "Bedtime", icon: Moon },
    { value: "educational", label: "Educational", icon: GraduationCap },
    { value: "fairytale", label: "Fairytale", icon: Crown },
    { value: "voice-only", label: "Voice Only", icon: Volume2 },
  ];

  const ageRanges = ["2-4", "3-5", "4-6", "4-7", "6-8", "8+"];
  const animationTypes = [
    { value: "scene", label: "Scene-based" },
    { value: "character", label: "Character-focused" },
    { value: "abstract", label: "Abstract/Conceptual" },
  ];

  const filteredStories = stories?.filter((story: Story) => {
    return selectedCategory === "all" || story.category === selectedCategory;
  }) || [];

  const handleEditStory = (story: Story) => {
    setSelectedStory(story);
    editForm.reset({
      title: story.title,
      content: story.content,
      category: story.category as any,
      ageRange: story.age_range,
      duration: story.duration,
      animationType: story.animation_type as any,
    });
    setIsEditDialogOpen(true);
  };

  const onCreateSubmit = (data: StoryFormData) => {
    createStoryMutation.mutate(data);
  };

  const onEditSubmit = (data: StoryFormData) => {
    if (!selectedStory) return;
    updateStoryMutation.mutate({ id: selectedStory.id, data });
  };

  const getCategoryIcon = (category: string) => {
    const categoryItem = categories.find(c => c.value === category);
    return categoryItem?.icon || BookOpen;
  };

  const getCategoryStats = () => {
    if (!stories) return {};
    return stories.reduce((acc: any, story: Story) => {
      acc[story.category] = (acc[story.category] || 0) + 1;
      return acc;
    }, {});
  };

  const categoryStats = getCategoryStats();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Stories Management</h1>
            <p className="text-gray-600">
              Manage animated stories, categories, and content for the platform
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Story
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Story</DialogTitle>
                <DialogDescription>
                  Add a new animated story to the library
                </DialogDescription>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Story title" {...field} />
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
                              {categories.slice(1).map((category) => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
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
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Story Content</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Write the story content here..." 
                            className="min-h-[120px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={createForm.control}
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
                          <FormLabel>Duration (seconds)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="120"
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
                      name="animationType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Animation Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select animation type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {animationTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createStoryMutation.isPending}>
                      {createStoryMutation.isPending ? "Creating..." : "Create Story"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Category Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {categories.slice(1).map((category) => {
            const Icon = category.icon;
            const count = categoryStats[category.value] || 0;
            return (
              <Card key={category.value} className="text-center">
                <CardContent className="p-4">
                  <Icon className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-sm text-gray-600">{category.label}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Category Filter */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="mb-6">
        <TabsList className="grid w-full grid-cols-5">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.value} value={category.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{category.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStories.map((story: Story) => {
          const CategoryIcon = getCategoryIcon(story.category);
          
          return (
            <Card key={story.id} className={`${!story.is_active ? 'opacity-60 border-gray-300' : ''}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-5 w-5 text-purple-600" />
                    <Badge variant="secondary" className="text-xs">
                      {story.category}
                    </Badge>
                    {!story.is_active && (
                      <Badge variant="destructive" className="text-xs">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {story.age_range}
                  </Badge>
                </div>
                <CardTitle className="text-lg leading-tight">{story.title}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {story.content.substring(0, 100)}...
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-gray-500">
                    Duration: {Math.ceil(story.duration / 60)} min
                  </div>
                  <div className="text-sm text-gray-500">
                    {story.animation_type}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditStory(story)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStoryMutation.mutate({ id: story.id, isActive: !story.is_active })}
                  >
                    {story.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${story.title}"?`)) {
                        deleteStoryMutation.mutate(story.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Story</DialogTitle>
            <DialogDescription>
              Update the story details and content
            </DialogDescription>
          </DialogHeader>
          {selectedStory && (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Story title" {...field} />
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
                            {categories.slice(1).map((category) => (
                              <SelectItem key={category.value} value={category.value}>
                                {category.label}
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
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Story Content</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Write the story content here..." 
                          className="min-h-[120px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={editForm.control}
                    name="ageRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Age Range</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select age range" />
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
                        <FormLabel>Duration (seconds)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="120"
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
                    name="animationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Animation Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select animation type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {animationTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateStoryMutation.isPending}>
                    {updateStoryMutation.isPending ? "Updating..." : "Update Story"}
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