import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Profile from "@/pages/Profile";
import VideoLibrary from "@/pages/VideoLibrary";
import VideoProcessor from "@/pages/VideoProcessor";
import VideoPlayer from "@/pages/VideoPlayer";
import SavedVideos from "@/pages/SavedVideos";
import PeopleManagement from "@/pages/PeopleManagement";
import Checkout from "@/pages/Checkout";
import AuthPage from "@/pages/auth-page";
import Landing from "@/pages/Landing";
import AdminVideoTemplates from "@/pages/AdminVideoTemplates";
import VideoUploadTest from "@/pages/VideoUploadTest";
import SimpleVideoPlayer from "@/pages/SimpleVideoPlayer";
import VoiceProcessingTest from "@/pages/VoiceProcessingTest";
import CompleteVoiceReplacement from "@/pages/CompleteVoiceReplacement";
import VoiceReplacementWorkflow from "@/pages/VoiceReplacementWorkflow";
import FaceTraining from "@/pages/FaceTraining";
import AudioStitchingTest from "@/pages/AudioStitchingTest";
import { StoriesPage } from "@/pages/StoriesPage";
import { AdminStoriesPage } from "@/pages/AdminStoriesPage";
import { AdminVideoUpload } from "@/pages/AdminVideoUpload";
import { AdminDashboard } from "@/pages/AdminDashboard";
import { AIStoryGenerator } from "@/pages/AIStoryGenerator";
import { SmartVoiceTraining } from "@/pages/SmartVoiceTraining";
import { LiveAnalytics } from "@/pages/LiveAnalytics";
import { SystemDashboard } from "@/pages/SystemDashboard";

import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";
import { OfflineBanner } from "@/components/ui/offline-banner";
import { ErrorBoundary } from "@/components/ui/error-boundary";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <OfflineBanner />
          <ErrorBoundary>
            <Switch>
              {/* Public routes */}
              <Route path="/landing" component={Landing} />
              <Route path="/auth" component={AuthPage} />
              <Route path="/simple-preview" component={SimpleVideoPlayer} />
              
              {/* Protected routes with navbar */}
              <Route path="/" nest>
                <Navbar />
                <main className="flex-grow pt-14 md:pt-16 mobile-scroll">
                  <Switch>
                    <ProtectedRoute path="/" component={Home} />
                    <ProtectedRoute path="/profile" component={Profile} />
                    <ProtectedRoute path="/library" component={VideoLibrary} />
                    <ProtectedRoute path="/process/:templateId" component={VideoProcessor} />
                    <ProtectedRoute path="/player/:videoId" component={VideoPlayer} />
                    <ProtectedRoute path="/preview/:templateId" component={VideoPlayer} />
                    <ProtectedRoute path="/saved" component={SavedVideos} />
                    <ProtectedRoute path="/people" component={PeopleManagement} />
                    <ProtectedRoute path="/stories" component={StoriesPage} />
                    <ProtectedRoute path="/ai-stories" component={AIStoryGenerator} />
                    <ProtectedRoute path="/smart-voice" component={SmartVoiceTraining} />
                    <ProtectedRoute path="/checkout/:templateId" component={Checkout} />
                    <ProtectedRoute path="/upload-test" component={VideoUploadTest} />
                    <ProtectedRoute path="/voice-test" component={VoiceProcessingTest} />
                    <ProtectedRoute path="/voice-replace" component={CompleteVoiceReplacement} />
                    <ProtectedRoute path="/voice-workflow" component={VoiceReplacementWorkflow} />
                    <ProtectedRoute path="/face-training/:personId" component={FaceTraining} />
                    <ProtectedRoute path="/audio-stitch" component={AudioStitchingTest} />

                    {/* Admin routes */}
                    <AdminRoute path="/admin" component={AdminDashboard} />
                    <AdminRoute path="/admin/live" component={LiveAnalytics} />
                    <AdminRoute path="/admin/system" component={SystemDashboard} />
                    <AdminRoute path="/admin/stories" component={AdminStoriesPage} />
                    <AdminRoute path="/admin/upload" component={AdminVideoUpload} />
                    
                    <Route component={NotFound} />
                  </Switch>
                </main>
              </Route>
            </Switch>
          </ErrorBoundary>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;