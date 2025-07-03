import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  BookOpen, 
  Play, 
  Pause, 
  Square, 
  Moon, 
  Sparkles, 
  GraduationCap, 
  Crown,
  Search,
  Clock,
  Users,
  Volume2,
  Loader2
} from "lucide-react";
import { AnimatedStoryPlayer } from "@/components/AnimatedStoryPlayer";
import { StorySkeleton } from "@/components/ui/skeleton-cards";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { AnimatedStory, UserStorySession, Person } from "@/shared/schema";

export function StoriesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedAgeRange, setSelectedAgeRange] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [playingStory, setPlayingStory] = useState<AnimatedStory | null>(null);
  const [selectedNarrator, setSelectedNarrator] = useState<number | null>(null);
  const { toast } = useToast();

  // Fetch available stories
  const { data: stories, isLoading: storiesLoading } = useQuery({
    queryKey: ['/api/stories'],
  });

  // Fetch user's people for narrator selection
  const { data: people } = useQuery({
    queryKey: ['/api/me/people'],
  });

  // Fetch user's story sessions
  const { data: sessions } = useQuery({
    queryKey: ['/api/story-sessions'],
  });

  // Create story session mutation
  const createSessionMutation = useMutation({
    mutationFn: async (data: { storyId: number; personId?: number }) => {
      return apiRequest("POST", "/api/story-sessions", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/story-sessions'] });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to start story",
        description: error.message || "Please try again.",
      });
    },
  });

  const categories = [
    { value: "all", label: "All Stories", icon: BookOpen },
    { value: "bedtime", label: "Bedtime", icon: Moon },
    { value: "educational", label: "Educational", icon: GraduationCap },
    { value: "fairytale", label: "Fairytale", icon: Crown },
    { value: "voice-only", label: "Voice Only", icon: Volume2 },
  ];

  const ageRanges = [
    { value: "all", label: "All Ages" },
    { value: "2-4", label: "2-4 years" },
    { value: "4-6", label: "4-6 years" },
    { value: "6-8", label: "6-8 years" },
    { value: "8+", label: "8+ years" },
  ];

  const filteredStories = stories?.filter((story: AnimatedStory) => {
    const matchesCategory = selectedCategory === "all" || story.category === selectedCategory;
    const matchesAgeRange = selectedAgeRange === "all" || story.ageRange === selectedAgeRange;
    const matchesSearch = searchTerm === "" || 
      story.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      story.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesAgeRange && matchesSearch && story.isActive;
  }) || [];

  const handlePlayStory = (story: AnimatedStory) => {
    if (!selectedNarrator) {
      toast({
        variant: "destructive",
        title: "Select a narrator",
        description: "Please choose someone to narrate the story.",
      });
      return;
    }

    setPlayingStory(story);
    createSessionMutation.mutate({
      storyId: story.id,
      personId: selectedNarrator,
    });
  };

  const getCategoryIcon = (category: string) => {
    const categoryItem = categories.find(c => c.value === category);
    return categoryItem?.icon || BookOpen;
  };

  if (storiesLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Animated Stories</h1>
          <p className="text-gray-600">
            Personalized animated stories narrated by your family's voices
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <StorySkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Animated Stories</h1>
        <p className="text-gray-600">
          Personalized animated stories narrated by your family's voices
        </p>
      </div>

      {/* Story Player */}
      {playingStory && (
        <div className="mb-8">
          <AnimatedStoryPlayer
            story={playingStory}
            narratorId={selectedNarrator}
            onClose={() => setPlayingStory(null)}
          />
        </div>
      )}

      {/* Narrator Selection */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Volume2 className="h-5 w-5" />
            Choose Your Narrator
          </CardTitle>
          <CardDescription className="text-sm">
            Select a family member to narrate the stories
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <Select value={selectedNarrator?.toString() || ""} onValueChange={(value) => setSelectedNarrator(parseInt(value))}>
            <SelectTrigger className="w-full touch-action-manipulation">
              <SelectValue placeholder="Select a narrator" />
            </SelectTrigger>
            <SelectContent>
              {people?.map((person: Person) => (
                <SelectItem key={person.id} value={person.id.toString()}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search stories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-11 touch-action-manipulation"
              />
            </div>
          </div>
          <Select value={selectedAgeRange} onValueChange={setSelectedAgeRange}>
            <SelectTrigger className="w-full sm:w-40 h-11 touch-action-manipulation">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ageRanges.map((range) => (
                <SelectItem key={range.value} value={range.value}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid w-full grid-cols-5 h-auto">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <TabsTrigger 
                  key={category.value} 
                  value={category.value} 
                  className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 py-2 sm:py-1.5 px-2 sm:px-3 text-xs sm:text-sm"
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm leading-tight">{category.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Stories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-20 sm:pb-6">
        {filteredStories.map((story: AnimatedStory) => {
          const CategoryIcon = getCategoryIcon(story.category);
          const session = sessions?.find((s: UserStorySession) => s.storyId === story.id);
          const isVoiceOnly = story.category === 'voice-only';
          
          return (
            <Card key={story.id} className={`hover:shadow-lg transition-shadow touch-action-manipulation ${isVoiceOnly ? 'border-purple-200 bg-purple-50/30' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryIcon className={`h-4 w-4 flex-shrink-0 ${isVoiceOnly ? 'text-purple-700' : 'text-purple-600'}`} />
                    <Badge variant={isVoiceOnly ? "default" : "secondary"} className={`text-xs ${isVoiceOnly ? 'bg-purple-600 text-white' : ''}`}>
                      {story.category === 'voice-only' ? 'Voice Only' : story.category}
                    </Badge>
                    {isVoiceOnly && (
                      <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 hidden sm:inline-flex">
                        Audio Focus
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs flex-shrink-0">
                    {story.ageRange || story.age_range}
                  </Badge>
                </div>
                <CardTitle className="text-lg sm:text-xl leading-tight">{story.title}</CardTitle>
                <CardDescription className="line-clamp-2 sm:line-clamp-3 text-sm">
                  {story.content.substring(0, 120)}...
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-4 text-xs sm:text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                    {Math.ceil(story.duration / 60)} min
                  </div>
                  {session && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Played {session.playCount} times</span>
                      <span className="sm:hidden">{session.playCount}x</span>
                    </div>
                  )}
                </div>
                <Button 
                  onClick={() => handlePlayStory(story)}
                  disabled={!selectedNarrator || createSessionMutation.isPending}
                  className="w-full h-11 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 touch-action-manipulation"
                >
                  {createSessionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Play Story
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredStories.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No stories found</h3>
          <p className="text-gray-500">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
}