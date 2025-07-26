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
  Sparkles,
  ArrowRight,
  Zap,
  Trophy
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

  const { data: people = [] } = useQuery({
    queryKey: [`/api/users/${user?.id}/people`],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${user?.id}/people`, {
          credentials: 'include',
        });
        if (!response.ok) {
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch people:', error);
        return [];
      }
    },
  });

  const { data: processedVideos = [] } = useQuery({
    queryKey: [`/api/users/${user?.id}/processedVideos`],
    enabled: !!user?.id,
    queryFn: async () => {
      try {
        const response = await fetch(`/api/users/${user?.id}/processedVideos`, {
          credentials: 'include',
        });
        if (!response.ok) {
          return [];
        }
        return await response.json();
      } catch (error) {
        console.error('Failed to fetch processed videos:', error);
        return [];
      }
    },
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
      href: '/library',
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

      <div className="container mx-auto px-6 py-8">
        {/* Welcome Section - Enhanced */}
        <div className="mb-8 animate-slide-up">
          <div className="relative bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-white overflow-hidden shadow-2xl">
            {/* Animated background elements */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-24 translate-x-24 animate-float"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-16 -translate-x-16 animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
            
            <div className="relative">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Premium Member
                </Badge>
                <Badge className="bg-green-500/20 backdrop-blur-md text-green-100 border-green-300/30">
                  <Trophy className="h-3 w-3 mr-1" />
                  Level 5
                </Badge>
              </div>
              
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-3 animate-fade-in">
                Welcome back, <span className="gradient-text-animated">{user?.displayName || user?.username}!</span>
              </h2>
              <p className="text-white/90 text-lg md:text-xl mb-8 max-w-2xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
                Transform your family's voices into personalized educational content and stories
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <Link href="/people">
                  <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto button-gradient group">
                    <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                    Get Started
                    <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/stories">
                  <Button size="lg" variant="outline" className="gap-2 bg-white/10 border-white/30 text-white hover:bg-white/20 backdrop-blur-md w-full sm:w-auto group">
                    <Play className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    Listen to Stories
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview - Enhanced with animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { title: 'Family Members', value: stats.totalPeople, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', trend: '+2 this week' },
            { title: 'Videos Created', value: stats.totalVideos, icon: Video, color: 'text-purple-500', bg: 'bg-purple-500/10', trend: '+5 this month' },
            { title: 'Stories Available', value: stats.totalStories, icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-500/10', trend: 'New weekly' },
            { title: 'Voice Quality', value: '95%', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10', trend: 'Excellent' }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="card-hover border-0 shadow-lg animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {stat.trend}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions - Enhanced design */}
        <div className="mb-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold">Quick Actions</h3>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} href={action.href}>
                  <Card className="h-full card-hover cursor-pointer group border-0 shadow-lg overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <CardContent className="relative p-6">
                      <div className={`w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg`}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>
                      <h4 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors">{action.title}</h4>
                      <p className="text-sm text-muted-foreground">{action.description}</p>
                      <div className="mt-4 flex items-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-sm font-medium">Get started</span>
                        <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Featured Content - Enhanced layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Featured Templates - 2 columns */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold">Featured Templates</h3>
                <Badge className="badge-glow bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                  <Zap className="h-3 w-3 mr-1" />
                  Hot
                </Badge>
              </div>
              <Link href="/library">
                <Button variant="outline" size="sm" className="group">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredTemplates.map((template, index) => (
                <Link key={template.id} href="/library">
                  <Card className="card-hover cursor-pointer group overflow-hidden border-0 shadow-lg">
                    <CardContent className="p-0">
                      {/* Image placeholder with gradient overlay */}
                      <div className="relative h-48 bg-gradient-to-br from-primary/20 to-purple-500/20 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Video className="h-12 w-12 text-primary/30" />
                        </div>
                        <div className="absolute top-3 left-3">
                          <Badge className="bg-background/90 backdrop-blur-md">
                            {template.category}
                          </Badge>
                        </div>
                        <div className="absolute bottom-3 right-3">
                          <Badge variant="secondary" className="bg-background/90 backdrop-blur-md">
                            {template.duration}
                          </Badge>
                        </div>
                        <Button 
                          size="icon" 
                          variant="secondary"
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
                        >
                          <Play className="h-5 w-5" />
                        </Button>
                      </div>
                      
                      <div className="p-4">
                        <h4 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors">
                          {template.title}
                        </h4>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {template.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            Ages {template.ageRange}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar - Recent Activity & Progress */}
          <div className="space-y-6">
            {/* Recent Activity - Enhanced */}
            <Card className="border-0 shadow-lg card-gradient">
              <CardHeader className="relative">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {stats.recentActivity.map((activity, index) => {
                    const getIcon = (type: string) => {
                      switch (type) {
                        case 'video': return Video;
                        case 'story': return BookOpen;
                        case 'person': return Users;
                        default: return Sparkles;
                      }
                    };
                    
                    const Icon = getIcon(activity.type);
                    const colors = {
                      video: 'bg-purple-500/10 text-purple-500',
                      story: 'bg-orange-500/10 text-orange-500',
                      person: 'bg-blue-500/10 text-blue-500'
                    };
                    
                    return (
                      <div key={activity.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[activity.type as keyof typeof colors]}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
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

            {/* Progress Section - Enhanced */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent"></div>
              <CardHeader className="relative">
                <CardTitle className="text-lg flex items-center gap-2">
                  Your Progress
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                    Level 5
                  </Badge>
                </CardTitle>
                <CardDescription>Complete your family setup</CardDescription>
              </CardHeader>
              <CardContent className="relative space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Family Members Added</span>
                    <span className="text-primary font-bold">{stats.totalPeople}/5</span>
                  </div>
                  <Progress value={(stats.totalPeople / 5) * 100} className="h-3 bg-secondary" />
                </div>
                
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">Videos Created</span>
                    <span className="text-primary font-bold">{stats.totalVideos}/10</span>
                  </div>
                  <Progress value={(stats.totalVideos / 10) * 100} className="h-3 bg-secondary" />
                </div>
                
                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Next Reward</p>
                      <p className="text-xs text-muted-foreground">Premium template unlock</p>
                    </div>
                    <Trophy className="h-8 w-8 text-yellow-500" />
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