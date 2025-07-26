import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AnalyticsCard, 
  SimpleBarChart, 
  ContentPopularityChart, 
  UsageStatsChart 
} from "@/components/ui/analytics-charts";
import { 
  BarChart3, 
  Users, 
  Video, 
  Music, 
  TrendingUp, 
  Download,
  Filter,
  Calendar,
  Sparkles,
  Target,
  Activity
} from "lucide-react";
import { Link } from "wouter";

interface AdminStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalContent: number;
    revenue: number;
    totalSessions: number;
    avgSessionDuration: number;
  };
  categoryBreakdown: any[];
  popularContent: any[];
  contentStats: {
    stories: number;
    videoTemplates: number;
    voiceClones: number;
    activeContent: number;
  };
  peakHours: any[];
  userEngagement: any[];
}

export function AdminDashboard() {
  const [dateRange, setDateRange] = useState("30d");
  const [contentFilter, setContentFilter] = useState("all");

  // Real API call to get analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['/api/admin/analytics', dateRange, contentFilter],
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 sm:py-8 pb-20 sm:pb-8">
        <div className="text-center">Loading analytics...</div>
      </div>
    );
  }

  const stats: AdminStats = (analytics as AdminStats) || {
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      totalContent: 0,
      revenue: 0,
      totalSessions: 0,
      avgSessionDuration: 0
    },
    categoryBreakdown: [],
    popularContent: [],
    contentStats: {
      stories: 0,
      videoTemplates: 0,
      voiceClones: 0,
      activeContent: 0
    },
    peakHours: [],
    userEngagement: []
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 pb-20 sm:pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600 text-sm sm:text-base">Monitor platform performance and user engagement</p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-full sm:w-auto touch-action-manipulation">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>

        <Select value={contentFilter} onValueChange={setContentFilter}>
          <SelectTrigger className="w-full sm:w-auto touch-action-manipulation">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Content</SelectItem>
            <SelectItem value="stories">Stories Only</SelectItem>
            <SelectItem value="videos">Videos Only</SelectItem>
            <SelectItem value="voice">Voice Only</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" className="w-full sm:w-auto touch-action-manipulation">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="content" className="text-xs sm:text-sm">Content</TabsTrigger>
          <TabsTrigger value="users" className="text-xs sm:text-sm">Users</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs sm:text-sm">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <AnalyticsCard
              title="Total Users"
              value={stats.overview?.totalUsers || 0}
              description="All registered users"
              icon={Users}
              trend={{ value: 15, direction: 'up' }}
            />
            
            <AnalyticsCard
              title="Active Users"
              value={stats.overview?.activeUsers || 0}
              description="This month"
              icon={Activity}
              variant="success"
              trend={{ value: 8, direction: 'up' }}
            />
            
            <AnalyticsCard
              title="Total Content"
              value={stats.overview?.totalContent || 0}
              description="Stories & templates"
              icon={Video}
            />
            
            <AnalyticsCard
              title="Revenue"
              value={`$${(stats.overview?.revenue || 0).toLocaleString()}`}
              description="This month"
              icon={TrendingUp}
              variant="success"
              trend={{ value: 23, direction: 'up' }}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleBarChart
              title="Content by Category"
              description="Distribution of content types"
              data={stats.categoryBreakdown || []}
            />
            
            <ContentPopularityChart stories={stats.popularContent || []} />
          </div>
        </TabsContent>

        <TabsContent value="content" className="space-y-6">
          {/* Content Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            <AnalyticsCard
              title="Stories"
              value={stats.contentStats?.stories || 0}
              description="Animated stories"
              icon={Music}
              variant="default"
            />
            
            <AnalyticsCard
              title="Video Templates"
              value={stats.contentStats?.videoTemplates || 0}
              description="Face swap templates"
              icon={Video}
              variant="default"
            />
            
            <AnalyticsCard
              title="Voice Clones"
              value={stats.contentStats?.voiceClones || 0}
              description="User voice profiles"
              icon={Sparkles}
              variant="success"
            />
            
            <AnalyticsCard
              title="Active Content"
              value={stats.contentStats?.activeContent || 0}
              description="Published & visible"
              icon={Target}
              variant="success"
            />
          </div>

          {/* Content Management Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Music className="h-5 w-5 text-purple-600" />
                  Manage Stories
                </CardTitle>
                <CardDescription>Create, edit, and organize animated stories</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/stories">
                  <Button className="w-full touch-action-manipulation">
                    Go to Stories
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Video className="h-5 w-5 text-blue-600" />
                  Video Templates
                </CardTitle>
                <CardDescription>Upload and manage video templates</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/admin/upload">
                  <Button className="w-full touch-action-manipulation">
                    Manage Videos
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Analytics
                </CardTitle>
                <CardDescription>View detailed content performance</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full touch-action-manipulation" variant="outline">
                  View Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsageStatsChart stats={{
            totalUsers: stats.overview?.totalUsers || 0,
            activeUsers: stats.overview?.activeUsers || 0,
            totalSessions: stats.overview?.totalSessions || 0,
            avgSessionDuration: stats.overview?.avgSessionDuration || 0,
            peakHours: stats.peakHours || []
          }} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SimpleBarChart
              title="User Engagement"
              description="Active users by period"
              data={stats.userEngagement || []}
            />
            
            <Card>
              <CardHeader>
                <CardTitle>User Insights</CardTitle>
                <CardDescription>Key user behavior metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average session duration</span>
                  <Badge variant="secondary">
                    {Math.round((stats.overview?.avgSessionDuration || 0) / 60)}min
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sessions per user</span>
                  <Badge variant="secondary">
                    {((stats.overview?.totalSessions || 0) / (stats.overview?.activeUsers || 1)).toFixed(1)}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Retention rate</span>
                  <Badge variant="default">73%</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
                <CardDescription>Server and database metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>CPU Usage</span>
                    <span>23%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '23%' }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>67%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-600 h-2 rounded-full" style={{ width: '67%' }} />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Database Load</span>
                    <span>34%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '34%' }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>Cache hit rates and efficiency</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Cache hit rate</span>
                  <Badge variant="default">94.2%</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Average response time</span>
                  <Badge variant="secondary">45ms</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Database queries saved</span>
                  <Badge variant="default">12,847</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}