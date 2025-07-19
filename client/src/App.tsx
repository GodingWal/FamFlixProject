import { useState, lazy, Suspense } from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import Navigation from './components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { AudioWaveform } from 'lucide-react';
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

// Loading component with FamFlix branding
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <Card className="p-8">
      <CardContent className="flex flex-col items-center gap-4">
        <AudioWaveform className="h-8 w-8 text-primary animate-pulse" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span className="text-sm text-muted-foreground">Loading FamFlix...</span>
      </CardContent>
    </Card>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
    },
  },
});

export default function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="famflix-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
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
                      <div className="flex items-center justify-center min-h-screen">
                        <Card className="max-w-md mx-auto">
                          <CardContent className="text-center p-8">
                            <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                            <p className="text-muted-foreground mb-4">
                              The page you're looking for doesn't exist in FamFlix.
                            </p>
                            <button 
                              onClick={() => window.location.href = '/home'}
                              className="text-primary hover:underline"
                            >
                              Return to Home
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