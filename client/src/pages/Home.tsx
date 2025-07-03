import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { checkBrowserSupport } from "@/lib/ml-utils";
import { useQuery } from "@tanstack/react-query";
import VideoCard from "@/components/VideoCard";
import { VideoTemplate } from "@shared/schema";
import { Play, Camera, Mic, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import famFlixLogo from "../assets/FamFlix.png";

const Home = () => {
  const [, navigate] = useLocation();
  const [browserSupport, setBrowserSupport] = useState<{
    supported: boolean;
    features: {
      webgl: boolean;
      webAssembly: boolean;
      mediaDevices: boolean;
      sharedArrayBuffer: boolean;
    };
  } | null>(null);
  
  // Check browser support on component mount
  useEffect(() => {
    const support = checkBrowserSupport();
    setBrowserSupport(support);
  }, []);
  
  // Fetch featured video templates
  const { data: featuredTemplates, isLoading } = useQuery<VideoTemplate[]>({
    queryKey: ['/api/videoTemplates/featured'],
  });
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 md:px-6 py-8 md:py-12 pb-16 md:pb-20 relative z-10">
        {/* Hero section */}
        <section className="py-8 md:py-16 text-center">
          <div className="flex flex-col items-center mb-8 md:mb-12">
            <div className="relative mb-6 md:mb-8">
              <div className="logo-container glow-effect">
                <img src={famFlixLogo} alt="FamFlix Logo" className="h-20 md:h-32 w-auto" />
              </div>
              <div className="absolute -top-2 -right-2 md:-top-4 md:-right-4 w-6 h-6 md:w-8 md:h-8 bg-green-500 rounded-full border-2 md:border-4 border-background animate-pulse"></div>
            </div>
            
            <div className="space-y-4 md:space-y-6 max-w-4xl px-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-bold tracking-tight">
                Welcome to <span className="gradient-text">FamFlix</span>
              </h1>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-medium text-muted-foreground">
                Educational Videos Starring You
              </p>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
                Transform learning into a personal journey. Replace actors with familiar faces and create engaging educational experiences your children will love.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 mt-8 md:mt-10 px-4 w-full max-w-md sm:max-w-none">
              <Button 
                size="lg" 
                className="modern-button gap-2 md:gap-3 h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-semibold w-full sm:w-auto"
                onClick={() => navigate("/library")}
              >
                <Play size={20} className="md:hidden" />
                <Play size={24} className="hidden md:block" />
                Start Creating
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="h-12 md:h-14 px-6 md:px-8 text-base md:text-lg font-medium border-2 w-full sm:w-auto"
                onClick={() => navigate("/people")}
              >
                <Camera size={18} className="mr-2 md:hidden" />
                <Camera size={20} className="mr-2 hidden md:block" />
                Manage Profiles
              </Button>
            </div>
          </div>
        </section>
      
      {/* Browser compatibility check */}
      {browserSupport && !browserSupport.supported && (
        <Alert variant="destructive" className="mb-8 max-w-2xl mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Compatibility Issue</AlertTitle>
          <AlertDescription>
            <p>Your browser doesn't support all the features needed for the best experience.</p>
            <ul className="list-disc pl-5 mt-2 text-sm">
              {!browserSupport.features.webgl && <li>WebGL is not available</li>}
              {!browserSupport.features.webAssembly && <li>WebAssembly is not supported</li>}
              {!browserSupport.features.mediaDevices && <li>Camera/Microphone access is not available</li>}
            </ul>
            <p className="mt-2 text-sm">Try using a modern browser like Chrome, Firefox, or Edge.</p>
          </AlertDescription>
        </Alert>
      )}
      
      {/* How it works section */}
      <section className="py-12 md:py-20">
        <div className="text-center mb-12 md:mb-16 px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-3 md:mb-4">
            Get Started in <span className="gradient-text">3 Steps</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
            Create personalized educational content in minutes
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-5xl mx-auto px-4">
          <Card className="floating-card relative overflow-hidden border-2 border-border/20">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600"></div>
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                    <Camera className="h-8 w-8 md:h-10 md:w-10 text-primary" />
                  </div>
                  <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
                    1
                  </div>
                </div>
                <div className="space-y-2 md:space-y-3">
                  <h3 className="text-xl md:text-2xl font-bold">Create Profiles</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Upload photos and record your voice. Our AI learns your unique characteristics.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="floating-card relative overflow-hidden border-2 border-border/20">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                    <Play className="h-8 w-8 md:h-10 md:w-10 text-purple-600" />
                  </div>
                  <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
                    2
                  </div>
                </div>
                <div className="space-y-2 md:space-y-3">
                  <h3 className="text-xl md:text-2xl font-bold">Choose Content</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Browse our educational library and select videos perfect for your child's age.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="floating-card relative overflow-hidden border-2 border-border/20">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-600 to-red-500"></div>
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col items-center text-center space-y-4 md:space-y-6">
                <div className="relative">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-red-500/20 flex items-center justify-center">
                    <Mic className="h-8 w-8 md:h-10 md:w-10 text-pink-600" />
                  </div>
                  <div className="absolute -top-1 -right-1 md:-top-2 md:-right-2 w-6 h-6 md:w-8 md:h-8 bg-pink-600 text-white rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
                    3
                  </div>
                </div>
                <div className="space-y-2 md:space-y-3">
                  <h3 className="text-xl md:text-2xl font-bold">Watch & Enjoy</h3>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                    Stream personalized videos to any device or cast to your TV for family viewing.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      
      {/* Featured videos section */}
      <section className="py-8 md:py-12">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 md:mb-6 gap-3 sm:gap-0">
          <h2 className="text-xl md:text-2xl font-bold">Featured Videos</h2>
          <Link href="/library">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">View All</Button>
          </Link>
        </div>
        
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
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
        ) : featuredTemplates?.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTemplates.map((template) => (
              <VideoCard 
                key={template.id} 
                video={template} 
                type="template"
                onSelect={(id) => navigate(`/process/${id}`)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No featured videos available.</p>
            </CardContent>
          </Card>
        )}
      </section>
      </div>
    </div>
  );
};

export default Home;
