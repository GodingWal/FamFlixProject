import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Sparkles, 
  Wand2, 
  BookOpen, 
  Users, 
  Clock, 
  Target,
  Play,
  Download,
  Lightbulb,
  Heart,
  Star
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StoryRequest {
  theme: string;
  ageGroup: string;
  duration: number;
  characters: string[];
  moralLesson?: string;
  setting?: string;
}

interface GeneratedStory {
  title: string;
  description: string;
  script: Array<{
    character: string;
    dialogue: string;
    emotion: string;
    timing: number;
  }>;
  duration: number;
  category: string;
  ageRange: string;
}

export function AIStoryGenerator() {
  const [storyRequest, setStoryRequest] = useState<StoryRequest>({
    theme: '',
    ageGroup: '4-6',
    duration: 180,
    characters: ['Narrator'],
    moralLesson: '',
    setting: ''
  });
  const [generatedStory, setGeneratedStory] = useState<GeneratedStory | null>(null);
  const [newCharacter, setNewCharacter] = useState('');
  const { toast } = useToast();

  const generateStoryMutation = useMutation({
    mutationFn: (request: StoryRequest) =>
      apiRequest('POST', '/api/ai/generate-story', request),
          onSuccess: async (response) => {
        const story = await response.json();
        setGeneratedStory(story);
      toast({ title: "Story generated successfully!" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Generation failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const saveStoryMutation = useMutation({
    mutationFn: (story: GeneratedStory) =>
      apiRequest('POST', '/api/admin/stories', {
        title: story.title,
        description: story.description,
        content: story.script.map(s => s.dialogue).join(' '),
        category: story.category,
        ageRange: story.ageRange,
        duration: story.duration,
        script: story.script,
        isAIGenerated: true,
      }),
    onSuccess: () => {
      toast({ title: "Story saved to library!" });
    },
  });

  const addCharacter = () => {
    if (newCharacter.trim() && !storyRequest.characters.includes(newCharacter.trim())) {
      setStoryRequest(prev => ({
        ...prev,
        characters: [...prev.characters, newCharacter.trim()]
      }));
      setNewCharacter('');
    }
  };

  const removeCharacter = (character: string) => {
    if (storyRequest.characters.length > 1) {
      setStoryRequest(prev => ({
        ...prev,
        characters: prev.characters.filter(c => c !== character)
      }));
    }
  };

  const handleGenerate = () => {
    if (!storyRequest.theme.trim()) {
      toast({ title: "Please enter a story theme", variant: "destructive" });
      return;
    }
    generateStoryMutation.mutate(storyRequest);
  };

  const themeExamples = [
    "Ocean adventure with friendly sea creatures",
    "Learning about colors in a magical garden",
    "Helping others in the neighborhood",
    "Space exploration with alien friends",
    "Forest animals working together"
  ];

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 pb-20 sm:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
          <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
          AI Story Generator
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Create personalized children's stories with AI assistance
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Story Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-blue-600" />
              Story Settings
            </CardTitle>
            <CardDescription>
              Configure your story parameters for AI generation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Story Theme *</Label>
              <Textarea
                id="theme"
                placeholder="Enter your story theme or idea..."
                value={storyRequest.theme}
                onChange={(e) => setStoryRequest(prev => ({ ...prev, theme: e.target.value }))}
                rows={3}
              />
              <div className="text-xs text-gray-500">
                Examples: {themeExamples.slice(0, 2).join(', ')}...
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age Group</Label>
                <Select 
                  value={storyRequest.ageGroup} 
                  onValueChange={(value) => setStoryRequest(prev => ({ ...prev, ageGroup: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2-4">2-4 years</SelectItem>
                    <SelectItem value="4-6">4-6 years</SelectItem>
                    <SelectItem value="6-8">6-8 years</SelectItem>
                    <SelectItem value="8+">8+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration</Label>
                <Select 
                  value={storyRequest.duration.toString()} 
                  onValueChange={(value) => setStoryRequest(prev => ({ ...prev, duration: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="120">2 minutes</SelectItem>
                    <SelectItem value="180">3 minutes</SelectItem>
                    <SelectItem value="240">4 minutes</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Characters</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="Add character name..."
                  value={newCharacter}
                  onChange={(e) => setNewCharacter(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCharacter()}
                />
                <Button onClick={addCharacter} size="sm">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {storyRequest.characters.map((character, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => removeCharacter(character)}
                  >
                    {character} ×
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="moral">Moral Lesson (Optional)</Label>
              <Input
                id="moral"
                placeholder="e.g., Sharing, kindness, perseverance..."
                value={storyRequest.moralLesson}
                onChange={(e) => setStoryRequest(prev => ({ ...prev, moralLesson: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="setting">Setting (Optional)</Label>
              <Input
                id="setting"
                placeholder="e.g., Enchanted forest, underwater city..."
                value={storyRequest.setting}
                onChange={(e) => setStoryRequest(prev => ({ ...prev, setting: e.target.value }))}
              />
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={generateStoryMutation.isPending || !storyRequest.theme.trim()}
              className="w-full"
            >
              {generateStoryMutation.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Generating Story...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Story
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Generated Story Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-600" />
              Generated Story
            </CardTitle>
            <CardDescription>
              Preview and customize your AI-generated story
            </CardDescription>
          </CardHeader>
          <CardContent>
            {generateStoryMutation.isPending && (
              <div className="space-y-4">
                <div className="text-center text-gray-500">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                  Creating your magical story...
                </div>
                <Progress value={Math.random() * 100} className="w-full" />
              </div>
            )}

            {generatedStory ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{generatedStory.title}</h3>
                  <p className="text-gray-600 text-sm mb-3">{generatedStory.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge variant="outline">
                      <Clock className="h-3 w-3 mr-1" />
                      {Math.ceil(generatedStory.duration / 60)}min
                    </Badge>
                    <Badge variant="outline">
                      <Users className="h-3 w-3 mr-1" />
                      {generatedStory.script.length} scenes
                    </Badge>
                    <Badge variant="outline">
                      <Target className="h-3 w-3 mr-1" />
                      {generatedStory.ageRange}
                    </Badge>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-2">
                  {generatedStory.script.map((scene, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge>{scene.character}</Badge>
                        <Badge variant="secondary">{scene.emotion}</Badge>
                        <span className="text-xs text-gray-500">{scene.timing}s</span>
                      </div>
                      <p className="text-sm">{scene.dialogue}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => saveStoryMutation.mutate(generatedStory)}
                    disabled={saveStoryMutation.isPending}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Save to Library
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Play className="h-4 w-4 mr-2" />
                    Preview Audio
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your generated story will appear here</p>
                <p className="text-sm">Fill in the story details and click generate</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Ideas */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            Story Ideas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {themeExamples.map((example, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setStoryRequest(prev => ({ ...prev, theme: example }))}
                className="text-left justify-start h-auto p-3"
              >
                <Star className="h-3 w-3 mr-2 flex-shrink-0" />
                <span className="text-xs">{example}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AIStoryGenerator;