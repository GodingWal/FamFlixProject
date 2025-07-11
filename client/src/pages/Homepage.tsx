import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Video, 
  Users, 
  Mic, 
  BookOpen, 
  Star, 
  Play, 
  Plus,
  Settings,
  BarChart3,
  TrendingUp,
  Clock,
  Heart,
  Sparkles
} from 'lucide-react';
import famFlixLogo from "../assets/FamFlix.png";

interface DashboardStats {
  totalPeople: number;
  totalVideos: number;
  totalStories: number;
  recentActivity: Array<{
    id: string;
    type: 'video' | 'story' | 'person';
    title: string;
    timestamp: string;
  }>;
}

export default function Homepage() {
  const { user, logoutMutation } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');

  const { data: people } = useQuery({
    queryKey: [`/api/users/${user?.id}/people`],
    enabled: !!user?.id,
  });

  const { data: processedVideos } = useQuery({
    queryKey: [`/api/users/${user?.id}/processedVideos`],
    enabled: !!user?.id,
  });

  const stats: DashboardStats = {
    totalPeople: people?.length || 0,
    totalVideos: processedVideos?.length || 0,
    totalStories: 12, // From the stories library
    recentActivity: [
      { id: '1', type: 'video', title: 'Baby Shark Dance - Family Version', timestamp: '2 hours ago' },
      { id: '2', type: 'person', title: 'Added Emma\'s voice recording', timestamp: '1 day ago' },
      { id: '3', type: 'story', title: 'The Three Little Pigs - Bedtime Story', timestamp: '3 days ago' },
    ]
  };

  const quickActions = [
    {
      title: 'Create Family Member',
      description: 'Add a new person and train their voice',
      icon: Users,
      href: '/people',
      color: 'bg-blue-500',
      disabled: false
    },
    {
      title: 'Record Voice',
      description: 'Train voices for better cloning',
      icon: Mic,
      href: '/voice-training',
      color: 'bg-green-500',
      disabled: false
    },
    {
      title: 'Create Video',
      description: 'Make personalized family videos',
      icon: Video,
      href: '/templates',
      color: 'bg-purple-500',
      disabled: false
    },
    {
      title: 'Listen to Stories',
      description: 'Enjoy narrated children\'s stories',
      icon: BookOpen,
      href: '/stories',
      color: 'bg-orange-500',
      disabled: false
    }
  ];

  const featuredTemplates = [
    {
      id: 1,
      title: 'Baby Shark Dance',
      description: 'The classic children\'s song with your family',
      thumbnail: '/thumbnails/babyshark.jpg',
      category: 'Music',
      ageRange: '2-6',
      duration: '2:30'
    },
    {
      id: 2,
      title: 'Learning Numbers',
      description: 'Educational counting with family voices',
      thumbnail: '/thumbnails/numbers.jpg',
      category: 'Educational',
      ageRange: '3-7',
      duration: '3:15'
    },
    {
      id: 3,
      title: 'Animal Sounds',
      description: 'Learn about animals with personalized narration',
      thumbnail: '/thumbnails/animals.jpg',
      category: 'Educational',
      ageRange: '2-5',
      duration: '4:00'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src={famFlixLogo} alt="FamFlix" className="h-10 w-auto" />
              <div>
                <h1 className="text-2xl font-bold">
                  <span className="text-primary">Fam</span>
                  <span className="text-secondary-foreground">Flix</span>
                </h1>
                <p className="text-sm text-muted-foreground">Welcome back, {user?.displayName || user?.username}!</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              {user?.role === 'admin' && (
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Admin Dashboard
                  </Button>
                </Link>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => logoutMutation.mutate()}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="relative bg-gradient-to-r from-primary to-primary/80 rounded-2xl p-8 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-8 translate-x-8"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-6 -translate-x-6"></div>
            
            <div className="relative">
              <h2 className="text-3xl font-bold mb-2">Create Magical Family Moments</h2>
              <p className="text-white/90 mb-6">Transform your family's voices into personalized educational content and stories</p>
              
              <div className="flex gap-4">
                <Link href="/people">
                  <Button variant="secondary" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Get Started
                  </Button>
                </Link>
                <Link href="/stories">
                  <Button variant="outline" className="gap-2 bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <Play className="h-4 w-4" />
                    Listen to Stories
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Family Members</p>
                  <p className="text-2xl font-bold">{stats.totalPeople}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Videos Created</p>
                  <p className="text-2xl font-bold">{stats.totalVideos}</p>
                </div>
                <Video className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Stories Available</p>
                  <p className="text-2xl font-bold">{stats.totalStories}</p>
                </div>
                <BookOpen className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Voice Quality</p>
                  <p className="text-2xl font-bold">95%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} href={action.href}>
                  <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
                    <CardContent className="p-6">
                      <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="font-semibold mb-2">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Featured Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Featured Templates */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Featured Templates</h3>
              <Link href="/templates">
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
            
            <div className="space-y-4">
              {featuredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center">
                        <Video className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">{template.title}</h4>
                          <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Ages {template.ageRange}</span>
                          <span>{template.duration}</span>
                        </div>
                      </div>
                      <Button size="sm" variant="outline">
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
            
            <Card>
              <CardContent className="p-4">
                <div className="space-y-4">
                  {stats.recentActivity.map((activity) => {
                    const getIcon = (type: string) => {
                      switch (type) {
                        case 'video': return Video;
                        case 'story': return BookOpen;
                        case 'person': return Users;
                        default: return Sparkles;
                      }
                    };
                    
                    const Icon = getIcon(activity.type);
                    
                    return (
                      <div key={activity.id} className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{activity.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {activity.timestamp}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Progress Section */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Your Progress</CardTitle>
                <CardDescription>Complete your family setup</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Family Members Added</span>
                      <span>{stats.totalPeople}/5</span>
                    </div>
                    <Progress value={(stats.totalPeople / 5) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Videos Created</span>
                      <span>{stats.totalVideos}/10</span>
                    </div>
                    <Progress value={(stats.totalVideos / 10) * 100} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}