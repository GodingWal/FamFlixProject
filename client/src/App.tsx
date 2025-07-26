import { useState, lazy, Suspense } from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import Navigation from './components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { AudioWaveform, Loader2 } from 'lucide-react';
import './index.css';

// Lazy load pages for better performance
const LandingPage = lazy(() => import('./pages/Landing'));
const AuthPage = lazy(() => import('./pages/auth-page'));
const Home = lazy(() => import('./pages/Home'));
const SystemDashboard = lazy(() => import('./pages/SystemDashboard'));
const PeopleManagement = lazy(() => import('./pages/PeopleManagement'));

const StoriesPage = lazy(() => import('./pages/StoriesPage'));
const VideoLibrary = lazy(() => import('./pages/VideoLibrary'));
const SmartVoiceTraining = lazy(() => import('./pages/SmartVoiceTraining'));
const AIStoryGenerator = lazy(() => import('./pages/AIStoryGenerator'));
const SavedVideos = lazy(() => import('./pages/SavedVideos'));
const AdminVideoTemplates = lazy(() => import('./pages/AdminVideoTemplates'));
const AdminStoriesPage = lazy(() => import('./pages/AdminStoriesPage'));

// Loading component with FamFlix branding - Enhanced
const LoadingSpinner = () => (
  <div className="flex justify-center items-center min-h-[60vh]">
    <div className="relative">
      <Card className="p-8 border-0 shadow-2xl bg-background/80 backdrop-blur-lg">
        <CardContent className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-purple-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
            <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
              <AudioWaveform className="h-8 w-8 text-white animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <div className="text-center">
            <span className="text-sm text-muted-foreground block">Loading FamFlix...</span>
            <span className="text-xs text-muted-foreground/70">Creating magic for your family</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="famflix-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-secondary/10">
            <Router>
              <div className="flex flex-col min-h-screen">
                <Navigation />
                <main className="flex-1">
                <Suspense fallback={<LoadingSpinner />}>
                  <Switch>
                    <Route path="/" component={LandingPage} />
                    <Route path="/auth" component={AuthPage} />
                    <Route path="/home" component={Home} />
                    <Route path="/dashboard" component={SystemDashboard} />
                    <Route path="/people" component={PeopleManagement} />

                    <Route path="/stories" component={StoriesPage} />
                    <Route path="/templates" component={VideoLibrary} />
                    <Route path="/library" component={VideoLibrary} />
                    <Route path="/voice-training" component={SmartVoiceTraining} />
                    <Route path="/ai-stories" component={AIStoryGenerator} />
                    <Route path="/smart-voice" component={SmartVoiceTraining} />
                    <Route path="/saved" component={SavedVideos} />
                    <Route path="/admin/templates" component={AdminVideoTemplates} />
                    <Route path="/admin/stories" component={AdminStoriesPage} />
                    <Route>
                      <div className="flex items-center justify-center min-h-[60vh]">
                        <Card className="max-w-md mx-auto border-0 shadow-xl animate-fade-in">
                          <CardContent className="text-center p-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                              <span className="text-4xl text-white">404</span>
                            </div>
                            <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                            <p className="text-muted-foreground mb-6">
                              The page you're looking for doesn't exist in FamFlix.
                            </p>
                            <button 
                              onClick={() => window.location.href = '/home'}
                              className="text-primary hover:underline font-medium hover:scale-105 transition-transform"
                            >
                              Return to Home →
                            </button>
                          </CardContent>
                        </Card>
                      </div>
                    </Route>
                  </Switch>
                </Suspense>
              </main>
            </div>
          </Router>
          </div>
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}