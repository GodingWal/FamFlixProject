import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, BarChart4, LineChart, PieChart, TrendingUp, Users, Video, ShoppingCart, Activity, ArrowUp, ArrowDown, Eye, Zap } from "lucide-react";

// Types for analytics data
interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalVideos: number;
  processedVideos: number;
  totalRevenue: number;
  conversionRate: number;
}

interface TopContent {
  id: number;
  title: string;
  views: number;
  purchases: number;
  conversionRate: number;
}

interface UserActivity {
  date: string;
  newUsers: number;
  activeUsers: number;
  processedVideos: number;
}

interface RevenueStat {
  date: string;
  amount: number;
}

// Mock data (replace with actual API calls)
const mockAnalyticsOverview: AnalyticsOverview = {
  totalUsers: 1458,
  activeUsers: 725,
  totalVideos: 124,
  processedVideos: 1875,
  totalRevenue: 12850.75,
  conversionRate: 8.5
};

const mockTopContent: TopContent[] = [
  { id: 1, title: "ABC Song", views: 345, purchases: 52, conversionRate: 15.1 },
  { id: 2, title: "Counting Numbers", views: 280, purchases: 38, conversionRate: 13.5 },
  { id: 3, title: "Colors of the Rainbow", views: 265, purchases: 31, conversionRate: 11.7 },
  { id: 4, title: "Animal Sounds", views: 210, purchases: 27, conversionRate: 12.9 },
  { id: 5, title: "Shapes and Patterns", views: 195, purchases: 22, conversionRate: 11.3 }
];

const mockUserActivity: UserActivity[] = [
  { date: "2023-04-01", newUsers: 45, activeUsers: 320, processedVideos: 75 },
  { date: "2023-04-02", newUsers: 38, activeUsers: 315, processedVideos: 62 },
  { date: "2023-04-03", newUsers: 42, activeUsers: 328, processedVideos: 85 },
  { date: "2023-04-04", newUsers: 50, activeUsers: 345, processedVideos: 92 },
  { date: "2023-04-05", newUsers: 35, activeUsers: 310, processedVideos: 68 },
  { date: "2023-04-06", newUsers: 48, activeUsers: 336, processedVideos: 78 },
  { date: "2023-04-07", newUsers: 52, activeUsers: 359, processedVideos: 105 }
];

const mockRevenueStats: RevenueStat[] = [
  { date: "2023-04-01", amount: 425.50 },
  { date: "2023-04-02", amount: 385.25 },
  { date: "2023-04-03", amount: 475.00 },
  { date: "2023-04-04", amount: 520.75 },
  { date: "2023-04-05", amount: 390.50 },
  { date: "2023-04-06", amount: 455.25 },
  { date: "2023-04-07", amount: 586.00 }
];

const AnalyticsDashboard = () => {
  const [dateRange, setDateRange] = useState<{from: Date, to: Date}>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    to: new Date()
  });
  const [timeFrame, setTimeFrame] = useState<string>("week");
  
  // State for analytics data (replace with API calls in a real application)
  const [analyticsOverview] = useState<AnalyticsOverview>(mockAnalyticsOverview);
  const [topContent] = useState<TopContent[]>(mockTopContent);
  const [userActivity] = useState<UserActivity[]>(mockUserActivity);
  const [revenueStats] = useState<RevenueStat[]>(mockRevenueStats);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex items-center gap-4">
          <Select defaultValue={timeFrame} onValueChange={setTimeFrame}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Time frame" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-1">
                <CalendarIcon className="h-4 w-4" />
                {format(dateRange.from, "MMM d, yyyy")} - {format(dateRange.to, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => range && range.from && range.to && setDateRange({from: range.from, to: range.to})}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsOverview.totalUsers.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-500 mt-1">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>12% from last {timeFrame}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsOverview.activeUsers.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-500 mt-1">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>8% from last {timeFrame}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processed Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsOverview.processedVideos.toLocaleString()}</div>
            <div className="flex items-center text-xs text-green-500 mt-1">
              <ArrowUp className="h-3 w-3 mr-1" />
              <span>15% from last {timeFrame}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analyticsOverview.totalRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs text-red-500 mt-1">
              <ArrowDown className="h-3 w-3 mr-1" />
              <span>3% from last {timeFrame}</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for different analytics views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart4 size={16} />
            Overview
          </TabsTrigger>
          <TabsTrigger value="content" className="flex items-center gap-2">
            <PieChart size={16} />
            Content Performance
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users size={16} />
            User Activity
          </TabsTrigger>
          <TabsTrigger value="revenue" className="flex items-center gap-2">
            <TrendingUp size={16} />
            Revenue
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="h-[300px] col-span-2">
              <CardHeader>
                <CardTitle>Activity Overview</CardTitle>
                <CardDescription>
                  User activity and engagement metrics over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border-dashed border-2 rounded-md">
                  <LineChart className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground ml-2">Activity chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Content Categories</CardTitle>
                <CardDescription>
                  Most popular content categories by views
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border-dashed border-2 rounded-md">
                  <PieChart className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground ml-2">Categories chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>User Demographics</CardTitle>
                <CardDescription>
                  User age groups and demographics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] flex items-center justify-center border-dashed border-2 rounded-md">
                  <PieChart className="h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground ml-2">Demographics chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* Content Performance Tab */}
        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>
                Content with the highest views and conversions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Most Viewed Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px] flex items-center justify-center border-dashed border-2 rounded-md">
                        <BarChart4 className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground ml-2">Views chart will be displayed here</p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Purchase Conversion Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px] flex items-center justify-center border-dashed border-2 rounded-md">
                        <BarChart4 className="h-12 w-12 text-muted-foreground" />
                        <p className="text-muted-foreground ml-2">Conversion chart will be displayed here</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-3">Top 5 Content Items</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Title</th>
                          <th className="text-right py-3 px-2">
                            <div className="flex items-center justify-end">
                              <Eye size={14} className="mr-1" />
                              Views
                            </div>
                          </th>
                          <th className="text-right py-3 px-2">
                            <div className="flex items-center justify-end">
                              <ShoppingCart size={14} className="mr-1" />
                              Purchases
                            </div>
                          </th>
                          <th className="text-right py-3 px-2">
                            <div className="flex items-center justify-end">
                              <Zap size={14} className="mr-1" />
                              Conversion
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {topContent.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-2 font-medium">{item.title}</td>
                            <td className="py-2 px-2 text-right">{item.views.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right">{item.purchases.toLocaleString()}</td>
                            <td className="py-2 px-2 text-right">{item.conversionRate.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* User Activity Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Activity Metrics</CardTitle>
              <CardDescription>
                New users, active users, and engagement over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="h-[300px] flex items-center justify-center border-dashed border-2 rounded-md">
                <LineChart className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground ml-2">User activity chart will be displayed here</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Session Duration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">5m 42s</div>
                    <div className="flex items-center text-xs text-green-500 mt-1">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      <span>8% from last {timeFrame}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Sessions Per User
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">3.8</div>
                    <div className="flex items-center text-xs text-green-500 mt-1">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      <span>5% from last {timeFrame}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      User Retention Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">78%</div>
                    <div className="flex items-center text-xs text-green-500 mt-1">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      <span>2% from last {timeFrame}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Daily User Activity</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-right py-3 px-4">New Users</th>
                        <th className="text-right py-3 px-4">Active Users</th>
                        <th className="text-right py-3 px-4">Videos Processed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userActivity.map((day) => (
                        <tr key={day.date} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{new Date(day.date).toLocaleDateString()}</td>
                          <td className="py-2 px-4 text-right">{day.newUsers}</td>
                          <td className="py-2 px-4 text-right">{day.activeUsers}</td>
                          <td className="py-2 px-4 text-right">{day.processedVideos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Analytics</CardTitle>
              <CardDescription>
                Revenue and payment analytics over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="h-[300px] flex items-center justify-center border-dashed border-2 rounded-md">
                <TrendingUp className="h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground ml-2">Revenue chart will be displayed here</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Order Value
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$12.85</div>
                    <div className="flex items-center text-xs text-green-500 mt-1">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      <span>5% from last {timeFrame}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Conversion Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analyticsOverview.conversionRate}%</div>
                    <div className="flex items-center text-xs text-green-500 mt-1">
                      <ArrowUp className="h-3 w-3 mr-1" />
                      <span>1.2% from last {timeFrame}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Revenue Per User
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">$8.75</div>
                    <div className="flex items-center text-xs text-red-500 mt-1">
                      <ArrowDown className="h-3 w-3 mr-1" />
                      <span>2% from last {timeFrame}</span>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Refund Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">1.2%</div>
                    <div className="flex items-center text-xs text-green-500 mt-1">
                      <ArrowDown className="h-3 w-3 mr-1" />
                      <span>0.3% from last {timeFrame}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3">Daily Revenue</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">Date</th>
                        <th className="text-right py-3 px-4">Revenue</th>
                        <th className="text-right py-3 px-4">Transactions</th>
                        <th className="text-right py-3 px-4">Avg. Order Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueStats.map((day) => (
                        <tr key={day.date} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{new Date(day.date).toLocaleDateString()}</td>
                          <td className="py-2 px-4 text-right">${day.amount.toFixed(2)}</td>
                          <td className="py-2 px-4 text-right">{Math.floor(Math.random() * 30) + 15}</td>
                          <td className="py-2 px-4 text-right">${(day.amount / (Math.floor(Math.random() * 30) + 15)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;