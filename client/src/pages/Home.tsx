import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  AlertCircle, 
  User, 
  Video, 
  Mic, 
  BookOpen, 
  Star, 
  Clock, 
  Plus,
  Users,
  AudioWaveform,
  PlayCircle,
  TrendingUp
} from 'lucide-react';

interface PersonProfile {
  id: number;
  name: string;
  relationship: string;
  defaultFaceImageUrl?: string;
  faceImagesCount: number;
  voiceRecordingsCount: number;
  hasVoiceClone: boolean;
}

interface VideoTemplate {
  id: number;
  title: string;
  description: string;
  category: string;
  ageRange: string;
  duration: number;
  thumbnailUrl?: string;
  featured: boolean;
}

interface ProcessedVideo {
  id: number;
  title: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  thumbnailUrl?: string;
}

interface Story {
  id: number;
  title: string;
  category: string;
  ageRange: string;
  duration: number;
}

interface DashboardData {
  people: PersonProfile[];
  featuredTemplates: VideoTemplate[];
  recentVideos: ProcessedVideo[];
  stories: Story[];
  stats: {
    totalPeople: number;
    totalVideos: number;
    totalStories: number;
    voiceQuality: number;
  };
}

const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    // Use the new personalized endpoint with JWT authentication support
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = { 
      'Content-Type': 'application/json'
    };
    
    // Add JWT token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch('/api/personalized', { 
      credentials: 'include',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch personalized data: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      people: data.people || [],
      featuredTemplates: data.featuredTemplates || [],
      recentVideos: data.recentVideos || [],
      stories: data.stories || [],
      stats: data.stats || {
        totalPeople: 0,
        totalVideos: 0,
        totalStories: 0,
        voiceQuality: 0
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return empty data structure instead of throwing
    return {
      people: [],
      featuredTemplates: [],
      recentVideos: [],
      stories: [],
      stats: {
        totalPeople: 0,
        totalVideos: 0,
        totalStories: 0,
        voiceQuality: 0
      }
    };
  }
};

const StatCard = ({ icon: Icon, title, value, description, gradient }: {
  icon: any;
  title: string;
  value: string | number;
  description: string;
  gradient: string;
}) => (
  <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-0 shadow-lg">
    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
    <CardContent className="p-8 relative">
      <div className="space-y-4">
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

const Home = () => {
  const { user, isLoading: authLoading } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    enabled: !!user,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  if (!user && !authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to FamFlix
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Create magical personalized educational videos for your family. Transform learning with familiar faces and voices.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mt-8">
          <Card className="p-6 text-center">
            <User className="h-12 w-12 mx-auto text-indigo-600 mb-4" />
            <h3 className="font-semibold mb-2">Family Profiles</h3>
            <p className="text-sm text-muted-foreground">Upload photos and record voices of your family members</p>
          </Card>
          <Card className="p-6 text-center">
            <Video className="h-12 w-12 mx-auto text-purple-600 mb-4" />
            <h3 className="font-semibold mb-2">Video Templates</h3>
            <p className="text-sm text-muted-foreground">Choose from educational templates and personalize them</p>
          </Card>
          <Card className="p-6 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-pink-600 mb-4" />
            <h3 className="font-semibold mb-2">Voice Stories</h3>
            <p className="text-sm text-muted-foreground">Listen to stories narrated by your family's voices</p>
          </Card>
        </div>

        <Link href="/login">
          <Button size="lg" className="mt-6">
            Get Started
          </Button>
        </Link>
      </div>
    );
  }

  if (authLoading || isLoading) {
    return (
      <div className="space-y-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Card className="p-6">
          <div className="flex items-center space-x-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Unable to load dashboard</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : 'Something went wrong'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-pink-300/20 rounded-full blur-xl"></div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center space-y-8">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              Welcome back,
              <span className="block bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                {user?.displayName || user?.username}!
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto leading-relaxed">
              Create magical personalized videos and stories that bring your family together through the power of AI
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center items-center gap-6 mt-12">
              <Link href="/people/new">
                <Button size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-lg px-8 py-4 text-lg font-semibold">
                  <Plus className="h-6 w-6 mr-3" />
                  Add Family Member
                </Button>
              </Link>
              <Link href="/templates">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-4 text-lg">
                  <Video className="h-6 w-6 mr-3" />
                  Create Video
                </Button>
              </Link>
              {user?.role === 'admin' && (
                <Link href="/dashboard">
                  <Button size="lg" variant="outline" className="border-2 border-yellow-300 text-yellow-300 hover:bg-yellow-300/10">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-16 space-y-16">

        {/* Statistics Cards */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Your FamFlix Journey</h2>
            <p className="text-gray-600 text-lg">Track your family's personalized content creation progress</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={Users}
              title="Family Members"
              value={data.stats.totalPeople}
              description="Profiles created"
              gradient="from-blue-500 to-indigo-600"
            />
            <StatCard
              icon={Video}
              title="Videos Created"
              value={data.stats.totalVideos}
              description="Personalized content"
              gradient="from-purple-500 to-pink-600"
            />
            <StatCard
              icon={BookOpen}
              title="Stories Available"
              value={data.stats.totalStories}
              description="Voice narrations"
              gradient="from-pink-500 to-rose-600"
            />
            <StatCard
              icon={AudioWaveform}
              title="Voice Quality"
              value={`${Math.round(data.stats.voiceQuality)}%`}
              description="Family voices trained"
              gradient="from-green-500 to-emerald-600"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Get Started Today</h2>
            <p className="text-gray-600 text-lg">Choose an action to begin creating magical content for your family</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link href="/people/new">
              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Plus className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Add Family Member</h3>
                    <p className="text-gray-600">Create profiles for your loved ones</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/voice-training">
              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Mic className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Record Voice</h3>
                    <p className="text-gray-600">Train AI with family voices</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/templates">
              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 shadow-lg bg-gradient-to-br from-pink-50 to-rose-50">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Video className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Create Video</h3>
                    <p className="text-gray-600">Personalize educational content</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/stories">
              <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
                <CardContent className="p-8 text-center space-y-4">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    <BookOpen className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Listen to Stories</h3>
                    <p className="text-gray-600">Enjoy personalized narrations</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>

      {/* Family Profiles */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Your Family</h2>
          <Link href="/people">
            <Button variant="ghost">View All</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.people.map((person) => (
            <Card key={person.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>{person.name}</span>
                  </div>
                  {person.hasVoiceClone && (
                    <Badge variant="secondary" className="text-xs">
                      <Waveform className="h-3 w-3 mr-1" />
                      Voice Ready
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center">
                  {person.defaultFaceImageUrl ? (
                    <img 
                      src={person.defaultFaceImageUrl} 
                      alt={`${person.name}'s photo`} 
                      className="w-20 h-20 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Photos:</span>
                    <span>{person.faceImagesCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Voice Recordings:</span>
                    <span>{person.voiceRecordingsCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Relationship:</span>
                    <span className="capitalize">{person.relationship}</span>
                  </div>
                </div>

                <Link href={`/people/${person.id}`}>
                  <Button variant="outline" className="w-full">
                    Edit Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
          
          {data.people.length < 6 && (
            <Card className="border-dashed border-2 hover:border-solid transition-all">
              <CardContent className="flex items-center justify-center h-full min-h-[200px]">
                <Link href="/people/new">
                  <Button variant="ghost" className="flex-col space-y-2">
                    <Plus className="h-8 w-8" />
                    <span>Add Family Member</span>
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Featured Templates */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Popular Templates</h2>
          <Link href="/templates">
            <Button variant="ghost">Browse All</Button>
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.featuredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="truncate">{template.title}</span>
                  {template.featured && (
                    <Badge variant="default" className="ml-2">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center h-24 bg-muted rounded-lg">
                  {template.thumbnailUrl ? (
                    <img 
                      src={template.thumbnailUrl} 
                      alt={template.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Video className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <Badge variant="outline">{template.category}</Badge>
                  <Badge variant="outline">{template.ageRange}</Badge>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{template.duration}s</span>
                  </div>
                </div>

                <Link href={`/templates/${template.id}`}>
                  <Button className="w-full">
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Use Template
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Recent Activity</h2>
        <Card>
          <CardContent className="p-6">
            {data.recentVideos.length > 0 ? (
              <div className="space-y-4">
                {data.recentVideos.map((video) => (
                  <div key={video.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                        <Video className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{video.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge 
                        variant={
                          video.status === 'completed' ? 'default' :
                          video.status === 'processing' ? 'secondary' :
                          video.status === 'failed' ? 'destructive' : 'outline'
                        }
                      >
                        {video.status}
                      </Badge>
                      
                      {video.status === 'completed' && (
                        <Link href={`/videos/${video.id}`}>
                          <Button size="sm" variant="outline">
                            <PlayCircle className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Video className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No videos created yet</p>
                <Link href="/templates">
                  <Button>Create Your First Video</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Home;