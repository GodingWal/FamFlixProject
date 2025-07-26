import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { VideoTemplate } from "@shared/schema";
import VideoCard from "@/components/VideoCard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Sparkles, Crown, X, Film, TrendingUp } from "lucide-react";

const VideoLibrary = () => {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all-categories");
  const [ageFilter, setAgeFilter] = useState<string>("all-ages");
  
  // Fetch all video templates
  const { data: videoTemplates, isLoading } = useQuery<VideoTemplate[]>({
    queryKey: ['/api/videoTemplates'],
  });
  
  // Get user for subscription status
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  
  // Filter templates based on search, filters, and premium status
  const filteredTemplates = videoTemplates?.filter(template => {
    const matchesSearch = searchQuery.trim() === "" || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = categoryFilter === "all-categories" || template.category === categoryFilter;
    const matchesAge = ageFilter === "all-ages" || template.ageRange === ageFilter;
    
    // Filter by tab selection (premium status)
    const matchesPremiumFilter = 
      activeTab === "all" || 
      (activeTab === "premium" && template.isPremium) ||
      (activeTab === "free" && !template.isPremium);
    
    return matchesSearch && matchesCategory && matchesAge && matchesPremiumFilter;
  });
  
  // Extract unique categories and age ranges for filters
  const categories = videoTemplates ? 
    videoTemplates
      .map(t => t.category)
      .filter((category, index, self) => self.indexOf(category) === index) : 
    [];
  
  const ageRanges = videoTemplates ? 
    videoTemplates
      .map(t => t.ageRange)
      .filter((ageRange, index, self) => self.indexOf(ageRange) === index) : 
    [];
  
  // Handle template selection
  const handleSelectTemplate = (templateId: number) => {
    navigate(`/process/${templateId}`);
  };
  
  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-4xl font-bold gradient-text">Video Library</h1>
          <Badge className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-0 shadow-md">
            <TrendingUp className="h-3 w-3 mr-1" />
            {videoTemplates?.length || 0} Videos
          </Badge>
        </div>
        <p className="text-muted-foreground text-lg">
          Choose from our collection of educational templates to create personalized family videos
        </p>
      </div>
      
      {/* Content type tabs - Enhanced */}
      <Tabs defaultValue="all" className="mb-8" onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full max-w-md mx-auto glass-morphism border-0 p-1">
          <TabsTrigger value="all" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            All Content
          </TabsTrigger>
          <TabsTrigger value="free" className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            Free
          </TabsTrigger>
          <TabsTrigger value="premium" className="flex items-center gap-1 flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
            <Crown size={14} className="text-yellow-500" />
            Premium
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="animate-fade-in">
          {/* Search and filters - Enhanced */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="relative w-full max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search videos by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-12 text-base input-modern rounded-full shadow-lg"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px] h-10 shadow-md hover:shadow-lg transition-shadow">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all-categories" value="all-categories">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-[180px] h-10 shadow-md hover:shadow-lg transition-shadow">
                  <SelectValue placeholder="Age Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all-ages" value="all-ages">All Ages</SelectItem>
                  {ageRanges.map(age => (
                    <SelectItem key={age} value={age}>
                      {age} years
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(categoryFilter !== "all-categories" || ageFilter !== "all-ages" || searchQuery) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all-categories");
                    setAgeFilter("all-ages");
                  }}
                  className="h-10 px-4 hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
          
          {/* Video grid - Enhanced */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Card key={i} className="overflow-hidden border-0 shadow-lg">
                  <div className="w-full aspect-video bg-gradient-to-br from-secondary to-muted animate-pulse" />
                  <CardContent className="pt-4">
                    <div className="h-6 w-3/4 bg-secondary animate-pulse rounded-md mb-3" />
                    <div className="h-4 bg-secondary animate-pulse rounded-md mb-2" />
                    <div className="h-4 w-4/5 bg-secondary animate-pulse rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template, index) => (
                <div key={template.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <VideoCard 
                    video={template} 
                    type="template"
                    onSelect={handleSelectTemplate}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-xl card-gradient">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-secondary to-muted rounded-full flex items-center justify-center mx-auto mb-6">
                  <Film className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No videos found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search or filters to find videos. We're constantly adding new content!
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all-categories");
                    setAgeFilter("all-ages");
                  }}
                  className="mt-6"
                >
                  Reset Filters
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="free" className="animate-fade-in">
          {/* Free content section - Enhanced */}
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-200/50">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/20">
                <Sparkles size={24} className="text-green-600" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-bold text-lg">Free Content Library</h3>
                <p className="text-sm text-muted-foreground">
                  Get started with our selection of free templates. Perfect for trying out FamFlix!
                </p>
              </div>
            </div>
          </div>
          
          {/* Search and filters for free content */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="relative w-full max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search free videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-12 text-base input-modern rounded-full shadow-lg"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:flex-1 sm:min-w-[140px] h-11">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all-categories" value="all-categories">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-full sm:flex-1 sm:min-w-[140px] h-11">
                  <SelectValue placeholder="Age Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all-ages" value="all-ages">All Ages</SelectItem>
                  {ageRanges.map(age => (
                    <SelectItem key={age} value={age}>
                      {age} years
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(categoryFilter !== "all-categories" || ageFilter !== "all-ages" || searchQuery) && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all-categories");
                    setAgeFilter("all-ages");
                  }}
                  className="w-full sm:w-auto sm:ml-auto h-11"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
          
          {/* Video grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden border-0 shadow-lg">
                  <div className="w-full aspect-video bg-gradient-to-br from-secondary to-muted animate-pulse" />
                  <CardContent className="pt-4">
                    <div className="h-6 w-3/4 bg-secondary animate-pulse rounded-md mb-3" />
                    <div className="h-4 bg-secondary animate-pulse rounded-md mb-2" />
                    <div className="h-4 w-4/5 bg-secondary animate-pulse rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template, index) => (
                <div key={template.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <VideoCard 
                    video={template} 
                    type="template"
                    onSelect={handleSelectTemplate}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-xl">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Film className="h-10 w-10 text-green-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No free videos found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Try adjusting your search or filters to find free videos.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="premium" className="animate-fade-in">
          {/* Premium content information - Enhanced */}
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-200/50 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg">
                <Crown size={28} className="text-white" />
              </div>
              <div className="text-center sm:text-left flex-1">
                <h3 className="font-bold text-xl mb-1">Premium Content</h3>
                <p className="text-muted-foreground">
                  Unlock advanced templates with professional features and effects for the ultimate personalized experience.
                </p>
              </div>
              <Button className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg">
                Upgrade to Premium
              </Button>
            </div>
          </div>
          
          {/* Search and filters for premium content */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="relative w-full max-w-2xl mx-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
              <Input
                type="text"
                placeholder="Search premium videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-12 text-base input-modern rounded-full shadow-lg border-yellow-200"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-full"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full sm:flex-1 sm:min-w-[140px] h-11">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all-categories" value="all-categories">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={ageFilter} onValueChange={setAgeFilter}>
                <SelectTrigger className="w-full sm:flex-1 sm:min-w-[140px] h-11">
                  <SelectValue placeholder="Age Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem key="all-ages" value="all-ages">All Ages</SelectItem>
                  {ageRanges.map(age => (
                    <SelectItem key={age} value={age}>
                      {age} years
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(categoryFilter !== "all-categories" || ageFilter !== "all-ages" || searchQuery) && (
                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchQuery("");
                    setCategoryFilter("all-categories");
                    setAgeFilter("all-ages");
                  }}
                  className="w-full sm:w-auto sm:ml-auto h-11"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
          
          {/* Video grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="overflow-hidden border-0 shadow-lg">
                  <div className="w-full aspect-video bg-gradient-to-br from-yellow-500/20 to-amber-500/20 animate-pulse" />
                  <CardContent className="pt-4">
                    <div className="h-6 w-3/4 bg-secondary animate-pulse rounded-md mb-3" />
                    <div className="h-4 bg-secondary animate-pulse rounded-md mb-2" />
                    <div className="h-4 w-4/5 bg-secondary animate-pulse rounded-md" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template, index) => (
                <div key={template.id} className="animate-slide-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <VideoCard 
                    video={template} 
                    type="template"
                    onSelect={handleSelectTemplate}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-xl bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Crown className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3">No premium videos found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Check back soon! We're adding new premium content regularly.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default VideoLibrary;
