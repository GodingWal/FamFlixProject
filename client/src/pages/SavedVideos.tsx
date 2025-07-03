import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ProcessedVideo } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import VideoCard from "@/components/VideoCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Search, Trash2, AlertTriangle } from "lucide-react";

const SavedVideos = () => {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [videoToDelete, setVideoToDelete] = useState<number | null>(null);
  const [sortOption, setSortOption] = useState<string>("newest");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Fetch processed videos
  const { data: processedVideos, isLoading } = useQuery<ProcessedVideo[]>({
    queryKey: [`/api/users/${user?.id}/processedVideos`],
    enabled: !!user,
  });
  
  // Sort and filter videos
  const filteredAndSortedVideos = useMemo(() => {
    // First, filter based on search
    const filtered = processedVideos?.filter(video => {
      // If search is empty, return all videos
      if (searchQuery.trim() === "") {
        return true;
      }
      
      // Otherwise, we need to get the template data for filtering
      // Since we don't have template data here, we can only filter by ID or status for now
      return video.id.toString().includes(searchQuery) || 
             video.status.toLowerCase().includes(searchQuery.toLowerCase());
    }) || [];

    // Then, sort based on selected option
    return [...filtered].sort((a, b) => {
      switch (sortOption) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [processedVideos, searchQuery, sortOption]);
  
  // Delete video mutation
  const deleteVideoMutation = useMutation({
    mutationFn: async (videoId: number) => {
      await apiRequest("DELETE", `/api/processedVideos/${videoId}`, undefined);
    },
    onSuccess: () => {
      toast({
        title: "Video deleted",
        description: "The video has been successfully deleted."
      });
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/processedVideos`] });
    },
    onError: (error) => {
      toast({
        title: "Error deleting video",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    },
  });
  
  // Confirm deletion
  const confirmDelete = () => {
    if (videoToDelete !== null) {
      deleteVideoMutation.mutate(videoToDelete);
      setVideoToDelete(null);
    }
  };
  
  // View video details
  const handleViewVideo = (videoId: number) => {
    navigate(`/player/${videoId}`);
  };
  
  return (
    <div className="page-container">
      <h1 className="text-3xl font-bold mb-6">My Saved Videos</h1>
      
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            type="text"
            placeholder="Search your videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex shrink-0 gap-2">
          <select
            className="px-3 py-2 border rounded-md bg-background text-foreground border-input min-w-[150px] h-10 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="status">By Status</option>
          </select>
        </div>
      </div>
      
      {/* Videos grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
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
      ) : filteredAndSortedVideos.length ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedVideos.map((video: ProcessedVideo) => (
            <div key={video.id} className="relative group">
              <VideoCard 
                video={video} 
                type="processed"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setVideoToDelete(video.id)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <h3 className="text-xl font-medium mb-4">No videos found</h3>
            {searchQuery ? (
              <p className="text-muted-foreground mb-6">
                No videos match your search. Try different keywords or clear your search.
              </p>
            ) : (
              <>
                <p className="text-muted-foreground mb-6">
                  You haven't created any personalized videos yet.
                </p>
                <Button onClick={() => navigate("/library")}>
                  Browse Video Templates
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Delete confirmation dialog */}
      <AlertDialog open={videoToDelete !== null} onOpenChange={(open) => !open && setVideoToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Video
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this video? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SavedVideos;
