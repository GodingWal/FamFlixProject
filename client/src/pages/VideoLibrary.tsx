import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { VideoTemplate } from "@shared/schema";
import VideoCard from "@/components/VideoCard";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Search, Filter, Sparkles } from "lucide-react";

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
      <h1 className="text-3xl font-bold mb-6">Video Library</h1>
      
      {/* Content type tabs */}
      <Tabs defaultValue="all" className="mb-8" onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full justify-center">
          <TabsTrigger value="all" className="flex-1">All Content</TabsTrigger>
          <TabsTrigger value="free" className="flex-1">Free</TabsTrigger>
          <TabsTrigger value="premium" className="flex items-center gap-1 flex-1">
            <Sparkles size={14} className="text-yellow-500" />
            Premium
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {/* Search and filters */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="flex-1 min-w-[140px]">
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
                <SelectTrigger className="flex-1 min-w-[140px]">
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
                  className="ml-auto"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
          
          {/* Video grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="w-full aspect-video bg-muted animate-pulse" />
                  <CardContent className="pt-4">
                    <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-3" />
                    <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-4 w-4/5 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template) => (
                <VideoCard 
                  key={template.id} 
                  video={template} 
                  type="template"
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-medium mb-2">No videos found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters to find videos.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="free">
          {/* Search and filters for free content */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search free videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full h-11"
              />
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
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="w-full aspect-video bg-muted animate-pulse" />
                  <CardContent className="pt-4">
                    <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-3" />
                    <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-4 w-4/5 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template) => (
                <VideoCard 
                  key={template.id} 
                  video={template} 
                  type="template"
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-medium mb-2">No free videos found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters to find videos.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="premium">
          {/* Premium content information */}
          <div className="mb-6 p-4 border rounded-lg bg-yellow-50 border-yellow-200 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-3 rounded-full bg-yellow-100 mb-2 sm:mb-0">
              <Sparkles size={24} className="text-yellow-600" />
            </div>
            <div className="text-center sm:text-left">
              <h3 className="font-semibold text-lg">Premium Content</h3>
              <p className="text-sm text-muted-foreground">
                Purchase premium templates to create personalized videos with advanced features.
              </p>
            </div>
          </div>
          
          {/* Search and filters for premium content */}
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search premium videos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full h-11"
              />
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
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="w-full aspect-video bg-muted animate-pulse" />
                  <CardContent className="pt-4">
                    <div className="h-6 w-3/4 bg-muted animate-pulse rounded mb-3" />
                    <div className="h-4 bg-muted animate-pulse rounded mb-2" />
                    <div className="h-4 w-4/5 bg-muted animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTemplates?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredTemplates.map((template) => (
                <VideoCard 
                  key={template.id} 
                  video={template} 
                  type="template"
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Filter className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-xl font-medium mb-2">No premium videos found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters to find videos.
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
