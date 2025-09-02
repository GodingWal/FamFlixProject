import { useState, useRef, useEffect } from "react";
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
  Star,
  Volume2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Person {
  id: number;
  name: string;
  elevenlabsVoiceId?: string;
}

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
    voiceId?: string;
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
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const { toast } = useToast();
  const { user } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const base64ToUrl = (b64: string, mime: string = 'audio/mpeg') => {
    try {
      const bin = atob(b64);
      const len = bin.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
      return URL.createObjectURL(new Blob([bytes], { type: mime }));
    } catch {
      return null;
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try { audioRef.current.pause(); } catch {}
        audioRef.current.onended = null;
        audioRef.current.onpause = null;
        audioRef.current.onplay = null;
        // @ts-ignore
        audioRef.current.src = '';
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
        objectUrlRef.current = null;
      }
    };
  }, []);

  // Query people with voice recordings for voice selection
  const { data: people } = useQuery<Person[]>({
    queryKey: ['/api/users/people'],
    queryFn: async () => {
      if (!user) return [];
      const res = await apiRequest('GET', `/api/users/${user.id}/people`);
      return await res.json();
    },
    enabled: !!user
  });

  const generateStoryMutation = useMutation({
    mutationFn: async (request: StoryRequest) => {
      try {
        // Try to use the voice agents crew system for AI story generation
        const response = await fetch('/api/voice/generate-story', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            theme: request.theme,
            ageGroup: request.ageGroup,
            duration: request.duration,
            characters: request.characters,
            moralLesson: request.moralLesson,
            setting: request.setting,
            voiceId: selectedVoiceId
          })
        });

        if (response.ok) {
          return response;
        }
        
        // Fallback to enhanced client-side generation
        console.log('Using fallback story generation');
        throw new Error('AI service unavailable');
      } catch (error) {
        // Enhanced client-side story generation as fallback
        const storyTemplates = {
          adventure: {
            openings: [
              `In the ${request.setting || 'enchanted kingdom'}, ${request.characters[0] || 'our brave hero'} discovered something magical about ${request.theme}.`,
              `Once upon a time, when ${request.characters[0] || 'a curious child'} was exploring ${request.setting || 'a mysterious place'}, they learned about ${request.theme}.`
            ],
            conflicts: [
              `But then, a challenge appeared that tested everything they knew about ${request.moralLesson || 'courage'}.`,
              `Suddenly, ${request.characters[1] || 'a friend'} needed help, and only by understanding ${request.moralLesson || 'friendship'} could they succeed.`
            ],
            resolutions: [
              `Through ${request.moralLesson || 'determination'} and working together, they overcame every obstacle.`,
              `In the end, they discovered that ${request.moralLesson || 'kindness'} was the most powerful magic of all.`
            ]
          }
        };

        const template = storyTemplates.adventure;
        const story = {
          title: `The ${request.theme.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Adventure`,
          description: `An enchanting tale about ${request.theme} that teaches children about ${request.moralLesson || 'important values'}.`,
          script: [
            {
              character: request.characters[0] || 'Narrator',
              dialogue: template.openings[Math.floor(Math.random() * template.openings.length)],
              emotion: 'cheerful',
              timing: 0,
              voiceId: selectedVoiceId || undefined
            },
            {
              character: request.characters[1] || 'Character',
              dialogue: template.conflicts[Math.floor(Math.random() * template.conflicts.length)],
              emotion: 'concerned',
              timing: Math.floor(request.duration * 0.25)
            },
            {
              character: request.characters[0] || 'Narrator',
              dialogue: `${request.characters[0] || 'Our hero'} thought carefully about what to do. They remembered that ${request.moralLesson || 'being kind'} was always the right choice.`,
              emotion: 'thoughtful',
              timing: Math.floor(request.duration * 0.5)
            },
            {
              character: request.characters[1] || 'Character',
              dialogue: template.resolutions[Math.floor(Math.random() * template.resolutions.length)],
              emotion: 'joyful',
              timing: Math.floor(request.duration * 0.75)
            },
            {
              character: request.characters[0] || 'Narrator',
              dialogue: `And so, ${request.characters.join(' and ')} learned that ${request.moralLesson || 'friendship and kindness'} can overcome any challenge. The end.`,
              emotion: 'warm',
              timing: Math.floor(request.duration * 0.9)
            }
          ],
          duration: request.duration,
          category: 'adventure',
          ageRange: request.ageGroup
        };
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1500));
        return { json: () => Promise.resolve(story) };
      }
    },
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

            <div className="space-y-2">
              <Label>Voice Selection</Label>
              <Select value={selectedVoiceId} onValueChange={setSelectedVoiceId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a voice for narration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Default Voice</SelectItem>
                  {people?.filter(person => person.elevenlabsVoiceId).map(person => (
                    <SelectItem key={person.id} value={person.elevenlabsVoiceId!}>
                      <div className="flex items-center gap-2">
                        <Volume2 className="h-4 w-4" />
                        {person.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-gray-500">
                Select a cloned voice from your family members
              </div>
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
                  {generatedStory.script.map((scene, index) => {
                    const assignedPerson = people?.find(p => p.elevenlabsVoiceId === scene.voiceId);
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge>{scene.character}</Badge>
                          <Badge variant="secondary">{scene.emotion}</Badge>
                          {assignedPerson && (
                            <Badge variant="outline" className="text-xs">
                              <Volume2 className="h-3 w-3 mr-1" />
                              {assignedPerson.name}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">{scene.timing}s</span>
                        </div>
                        <p className="text-sm">{scene.dialogue}</p>
                      </div>
                    );
                  })}
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
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={async () => {
                      try {
                        toast({ title: "Generating multi-voice audio...", description: "Creating personalized narration with family voices" });
                        
                        // Prepare voice assignments for characters
                        const voiceAssignments = [];
                        if (selectedVoiceId) {
                          // Assign selected voice to the main narrator
                          const narratorCharacter = generatedStory.script.find(s => s.character.toLowerCase().includes('narrator'));
                          if (narratorCharacter) {
                            voiceAssignments.push({
                              character: narratorCharacter.character,
                              voice_id: selectedVoiceId
                            });
                          }
                        }
                        
                        // Try multi-voice generation first
                        const multiVoiceResponse = await fetch('/api/voice/generate-story-audio', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            story_script: generatedStory.script,
                            voice_assignments: voiceAssignments,
                            default_voice_id: selectedVoiceId || undefined
                          })
                        });
                        
                        if (multiVoiceResponse.ok) {
                          const audioData = await multiVoiceResponse.json();
                          
                          if (audioData.segments && audioData.segments.length > 0) {
                            // Play the first segment as a preview
                            const firstSegment = audioData.segments[0];
                            if (audioRef.current) {
                              try { audioRef.current.pause(); } catch {}
                              // @ts-ignore
                              audioRef.current.src = '';
                              audioRef.current = null;
                            }
                            if (objectUrlRef.current) {
                              try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
                              objectUrlRef.current = null;
                            }
                            const url = base64ToUrl(firstSegment.audio_base64);
                            if (!url) throw new Error('Invalid audio data');
                            objectUrlRef.current = url;
                            const audio = new Audio(url);
                            audioRef.current = audio;
                            audio.play().then(() => {
                              toast({ 
                                title: "Playing story preview", 
                                description: `Generated ${audioData.segments.length} voice segments (${Math.round(audioData.total_duration)}s total)`
                              });
                            }).catch(err => {
                              console.error("Audio playback error:", err);
                              toast({ 
                                title: "Playback failed", 
                                description: "Multi-voice audio generated but couldn't play",
                                variant: "destructive" 
                              });
                            });
                            return;
                          }
                        }
                        
                        // Fallback to single voice generation
                        const fullScript = generatedStory.script.map(s => s.dialogue).join(' ');
                        
                        const response = await fetch('/api/voice/preview', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            text: fullScript,
                            mode: 'narration',
                            voiceId: selectedVoiceId || undefined
                          })
                        });
                        
                        if (!response.ok) {
                          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        
                        const data = await response.json();
                        
                        if (data.audio_base64) {
                          if (audioRef.current) {
                            try { audioRef.current.pause(); } catch {}
                            // @ts-ignore
                            audioRef.current.src = '';
                            audioRef.current = null;
                          }
                          if (objectUrlRef.current) {
                            try { URL.revokeObjectURL(objectUrlRef.current); } catch {}
                            objectUrlRef.current = null;
                          }
                          const url = base64ToUrl(data.audio_base64);
                          if (!url) throw new Error('Invalid audio data');
                          objectUrlRef.current = url;
                          const audio = new Audio(url);
                          audioRef.current = audio;
                          audio.play().then(() => {
                            toast({ title: "Playing story audio", description: "Enjoy your personalized story!" });
                          }).catch(err => {
                            console.error("Audio playback error:", err);
                            toast({ 
                              title: "Playback failed", 
                              description: "Audio was generated but couldn't play. Check your browser settings.",
                              variant: "destructive" 
                            });
                          });
                        } else {
                          throw new Error("No audio data received");
                        }
                      } catch (err) {
                        console.error("TTS generation error:", err);
                        toast({ 
                          title: "Audio generation failed", 
                          description: err instanceof Error ? err.message : "Could not generate audio for the story",
                          variant: "destructive" 
                        });
                      }
                    }}
                  >
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