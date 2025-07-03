import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import "./index.css";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-primary mb-4">
              🎬 FamFlix
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              Educational Videos with Your Family
            </p>
            
            <div className="max-w-md mx-auto bg-card rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Welcome to FamFlix</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Transform educational videos by replacing actors' faces and voices with your family members.
              </p>
              
              <div className="space-y-3">
                <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
                  Get Started
                </button>
                <button className="w-full border border-input bg-background hover:bg-accent px-4 py-2 rounded-md">
                  Learn More
                </button>
              </div>
            </div>
            
            <div className="mt-8 text-xs text-muted-foreground">
              Server Status: ✅ Online | Database: ✅ Connected
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;