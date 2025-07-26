import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Input } from "./input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { 
  Search, 
  Filter, 
  Edit, 
  Eye, 
  EyeOff, 
  Trash2, 
  Plus,
  MoreHorizontal,
  Star,
  Clock,
  Users,
  Play,
  Download,
  Upload
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ContentItem {
  id: number;
  title: string;
  type: 'story' | 'video' | 'template';
  category: string;
  status: 'active' | 'inactive' | 'draft';
  playCount: number;
  rating: number;
  duration: number;
  createdAt: string;
  featured: boolean;
  premium: boolean;
}

interface ContentManagerProps {
  contentType: 'stories' | 'videos' | 'all';
  showActions?: boolean;
}

export function ContentManager({ contentType = 'all', showActions = true }: ContentManagerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const { toast } = useToast();

  // Mock data - replace with real API
  const { data: content, isLoading } = useQuery({
    queryKey: ['/api/admin/content', contentType, searchTerm, statusFilter, categoryFilter, sortBy],
    queryFn: () => Promise.resolve([
      {
        id: 1,
        title: "Baby Shark Adventure",
        type: 'story' as const,
        category: 'educational',
        status: 'active' as const,
        playCount: 1234,
        rating: 4.8,
        duration: 180,
        createdAt: '2024-01-15',
        featured: true,
        premium: false,
      },
      {
        id: 2,
        title: "Princess Castle",
        type: 'video' as const,
        category: 'fairytale',
        status: 'active' as const,
        playCount: 987,
        rating: 4.6,
        duration: 240,
        createdAt: '2024-01-10',
        featured: false,
        premium: true,
      },
      {
        id: 3,
        title: "Learning Numbers",
        type: 'story' as const,
        category: 'educational',
        status: 'draft' as const,
        playCount: 0,
        rating: 0,
        duration: 150,
        createdAt: '2024-01-20',
        featured: false,
        premium: false,
      },
    ] as ContentItem[]),
  });

  const updateContentMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContentItem> }) =>
      apiRequest('PATCH', `/api/admin/content/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content'] });
      toast({ title: "Content updated successfully" });
    },
  });

  const deleteContentMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/content/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content'] });
      toast({ title: "Content deleted successfully" });
    },
  });

  const bulkActionMutation = useMutation({
    mutationFn: ({ action, ids }: { action: string; ids: number[] }) =>
      apiRequest('POST', '/api/admin/content/bulk', { action, ids }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/content'] });
      toast({ title: "Bulk action completed successfully" });
      setSelectedItems([]);
    },
  });

  const filteredContent = content?.filter((item: ContentItem) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesType = contentType === 'all' || 
      (contentType === 'stories' && item.type === 'story') ||
      (contentType === 'videos' && (item.type === 'video' || item.type === 'template'));
    
    return matchesSearch && matchesStatus && matchesCategory && matchesType;
  }) || [];

  const handleBulkAction = (action: string) => {
    if (selectedItems.length === 0) {
      toast({ title: "No items selected", variant: "destructive" });
      return;
    }
    bulkActionMutation.mutate({ action, ids: selectedItems });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading content...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-40 h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="educational">Educational</SelectItem>
              <SelectItem value="bedtime">Bedtime</SelectItem>
              <SelectItem value="fairytale">Fairytale</SelectItem>
              <SelectItem value="voice-only">Voice Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {showActions && selectedItems.length > 0 && (
          <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg">
            <span className="text-sm font-medium">
              {selectedItems.length} item(s) selected:
            </span>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')}>
              Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('deactivate')}>
              Deactivate
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('feature')}>
              Feature
            </Button>
            <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredContent.map((item: ContentItem) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {showActions && (
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                      className="rounded"
                    />
                  )}
                  <Badge className={getStatusColor(item.status)}>
                    {item.status}
                  </Badge>
                  {item.featured && (
                    <Badge variant="secondary">
                      <Star className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                  )}
                  {item.premium && (
                    <Badge variant="default">Premium</Badge>
                  )}
                </div>
              </div>
              
              <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
              <CardDescription>
                {item.category} • {item.type}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {Math.ceil(item.duration / 60)}min
                </div>
                <div className="flex items-center gap-1">
                  <Play className="h-3 w-3" />
                  {item.playCount}
                </div>
                {item.rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    {item.rating}
                  </div>
                )}
              </div>
              
              {showActions && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => updateContentMutation.mutate({
                      id: item.id,
                      data: { status: item.status === 'active' ? 'inactive' : 'active' }
                    })}
                  >
                    {item.status === 'active' ? (
                      <>
                        <EyeOff className="h-3 w-3 mr-1" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3 mr-1" />
                        Show
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline" size="sm" className="flex-1">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this content?')) {
                        deleteContentMutation.mutate(item.id);
                      }
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredContent.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">No content found</div>
          <p className="text-sm text-gray-500">
            Try adjusting your filters or search terms
          </p>
        </div>
      )}
    </div>
  );
}