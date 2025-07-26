import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Activity,
  BarChart3,
  Users,
  Clock,
  TrendingUp,
  Eye,
  PlayCircle,
  Heart,
  Zap,
  Cpu,
  Database,
  RefreshCw,
  Signal,
  Globe
} from "lucide-react";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface LiveMetrics {
  activeUsers: number;
  sessionsToday: number;
  avgEngagement: number;
  voiceCloning: number;
  systemHealth: {
    cpu: number;
    memory: number;
    database: number;
    cache: number;
  };
  realTimeActivity: Array<{
    timestamp: string;
    action: string;
    user: string;
    type: 'story' | 'voice' | 'video' | 'ai';
  }>;
  hourlyStats: Array<{
    hour: number;
    users: number;
    sessions: number;
    aiGenerations: number;
  }>;
}

export function LiveAnalytics() {
  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);

  const { data: liveMetrics, refetch } = useQuery({
    queryKey: ['/api/admin/analytics/live'],
    refetchInterval: isAutoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: true,
  });

  const metrics: LiveMetrics = (liveMetrics as LiveMetrics) || {
    activeUsers: 42,
    sessionsToday: 156,
    avgEngagement: 78,
    voiceCloning: 12,
    systemHealth: {
      cpu: 45,
      memory: 67,
      database: 89,
      cache: 95,
    },
    realTimeActivity: [
      { timestamp: new Date().toISOString(), action: "Generated AI story", user: "Sarah M.", type: "ai" },
      { timestamp: new Date(Date.now() - 30000).toISOString(), action: "Voice training session", user: "Mike R.", type: "voice" },
      { timestamp: new Date(Date.now() - 60000).toISOString(), action: "Story playback", user: "Emma L.", type: "story" },
      { timestamp: new Date(Date.now() - 90000).toISOString(), action: "Video processing", user: "James K.", type: "video" },
    ],
    hourlyStats: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      users: Math.floor(Math.random() * 50) + 10,
      sessions: Math.floor(Math.random() * 100) + 20,
      aiGenerations: Math.floor(Math.random() * 30) + 5,
    })),
  };

  const getHealthColor = (value: number) => {
    if (value >= 90) return "text-green-600 bg-green-100";
    if (value >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'ai': return <Zap className="h-4 w-4 text-purple-600" />;
      case 'voice': return <Signal className="h-4 w-4 text-blue-600" />;
      case 'story': return <PlayCircle className="h-4 w-4 text-green-600" />;
      case 'video': return <Eye className="h-4 w-4 text-orange-600" />;
      default: return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  const activityChartData = {
    labels: metrics.hourlyStats.map(stat => `${stat.hour}:00`),
    datasets: [
      {
        label: 'Active Users',
        data: metrics.hourlyStats.map(stat => stat.users),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
      {
        label: 'AI Generations',
        data: metrics.hourlyStats.map(stat => stat.aiGenerations),
        borderColor: 'rgb(147, 51, 234)',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const systemHealthData = {
    labels: ['CPU', 'Memory', 'Database', 'Cache'],
    datasets: [
      {
        data: [
          metrics.systemHealth.cpu,
          metrics.systemHealth.memory,
          metrics.systemHealth.database,
          metrics.systemHealth.cache,
        ],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
        ],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 pb-20 sm:pb-8">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
            <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
            Live Analytics Dashboard
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Real-time system monitoring and user activity tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <Button
            variant={isAutoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            {isAutoRefresh ? "Auto ON" : "Auto OFF"}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.activeUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sessions Today</p>
                <p className="text-2xl font-bold text-green-600">{metrics.sessionsToday}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Engagement</p>
                <p className="text-2xl font-bold text-purple-600">{metrics.avgEngagement}%</p>
              </div>
              <Heart className="h-8 w-8 text-purple-600 opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Voice Cloning</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.voiceCloning}</p>
              </div>
              <Signal className="h-8 w-8 text-orange-600 opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real-time Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              Live Activity Feed
            </CardTitle>
            <CardDescription>Real-time user actions across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {metrics.realTimeActivity.map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  {getActivityIcon(activity.type)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-gray-500">by {activity.user}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(activity.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-600" />
              System Health
            </CardTitle>
            <CardDescription>Real-time system performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(metrics.systemHealth).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">{key}</span>
                  <Badge className={getHealthColor(value)}>
                    {value}%
                  </Badge>
                </div>
                <Progress value={value} className="h-2" />
              </div>
            ))}
            
            <div className="mt-6">
              <div className="w-full max-w-xs mx-auto">
                <Pie 
                  data={systemHealthData} 
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: { font: { size: 10 } }
                      },
                    },
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600" />
            24-Hour Activity Trends
          </CardTitle>
          <CardDescription>User activity and AI generation patterns over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <Line 
              data={activityChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                },
                scales: {
                  x: {
                    title: {
                      display: true,
                      text: 'Hour of Day'
                    }
                  },
                  y: {
                    title: {
                      display: true,
                      text: 'Count'
                    }
                  }
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Auto-refresh Settings */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-gray-600" />
            Refresh Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[5000, 10000, 30000, 60000].map((interval) => (
              <Button
                key={interval}
                variant={refreshInterval === interval ? "default" : "outline"}
                size="sm"
                onClick={() => setRefreshInterval(interval)}
              >
                {interval / 1000}s
              </Button>
            ))}
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Dashboard will auto-refresh every {refreshInterval / 1000} seconds when enabled
          </p>
        </CardContent>
      </Card>
    </div>
  );
}