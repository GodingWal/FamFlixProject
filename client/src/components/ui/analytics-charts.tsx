import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { TrendingUp, TrendingDown, Users, Play, Clock, Star } from "lucide-react";

interface ChartData {
  name: string;
  value: number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
}

interface AnalyticsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ComponentType<any>;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'stable';
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
}

export function AnalyticsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  variant = 'default' 
}: AnalyticsCardProps) {
  const variantStyles = {
    default: 'border-gray-200',
    success: 'border-green-200 bg-green-50/30',
    warning: 'border-yellow-200 bg-yellow-50/30',
    danger: 'border-red-200 bg-red-50/30',
  };

  const iconColors = {
    default: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{description}</span>
          {trend && (
            <div className="flex items-center gap-1">
              {trend.direction === 'up' && (
                <TrendingUp className="h-3 w-3 text-green-600" />
              )}
              {trend.direction === 'down' && (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={
                trend.direction === 'up' ? 'text-green-600' : 
                trend.direction === 'down' ? 'text-red-600' : 'text-gray-600'
              }>
                {trend.value > 0 ? '+' : ''}{trend.value}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SimpleBarChartProps {
  data: ChartData[];
  title: string;
  description?: string;
}

export function SimpleBarChart({ data, title, description }: SimpleBarChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{item.name}</span>
                <span className="text-muted-foreground">{item.value}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(item.value / maxValue) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface ContentPopularityProps {
  stories: Array<{
    id: number;
    title: string;
    category: string;
    playCount: number;
    rating: number;
    duration: number;
  }>;
}

export function ContentPopularityChart({ stories }: ContentPopularityProps) {
  const sortedStories = stories
    .sort((a, b) => b.playCount - a.playCount)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="h-5 w-5 text-yellow-500" />
          Popular Content
        </CardTitle>
        <CardDescription>Most played stories this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedStories.map((story, index) => (
            <div key={story.id} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{story.title}</p>
                <p className="text-xs text-muted-foreground">
                  {story.category} • {Math.ceil(story.duration / 60)}min
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Play className="h-3 w-3 text-green-600" />
                <span>{story.playCount}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface UsageStatsProps {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalSessions: number;
    avgSessionDuration: number;
    peakHours: Array<{ hour: number; sessions: number }>;
  };
}

export function UsageStatsChart({ stats }: UsageStatsProps) {
  const peakHour = stats.peakHours.reduce((prev, current) => 
    prev.sessions > current.sessions ? prev : current
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <AnalyticsCard
        title="Total Users"
        value={stats.totalUsers}
        description="All registered users"
        icon={Users}
        variant="default"
      />
      
      <AnalyticsCard
        title="Active Users"
        value={stats.activeUsers}
        description="Users this month"
        icon={Users}
        variant="success"
        trend={{ value: 12, direction: 'up' }}
      />
      
      <AnalyticsCard
        title="Total Sessions"
        value={stats.totalSessions}
        description="Stories played"
        icon={Play}
        variant="default"
      />
      
      <AnalyticsCard
        title="Avg Session"
        value={`${Math.round(stats.avgSessionDuration / 60)}min`}
        description="Average duration"
        icon={Clock}
        variant="default"
      />
    </div>
  );
}