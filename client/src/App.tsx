import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Route, Switch } from "wouter";
import Landing from "./pages/Landing";
import AuthPage from "./pages/auth-page";
import SystemDashboard from "./pages/SystemDashboard";
import PeopleManagement from "./pages/PeopleManagement";
import "./index.css";

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-primary/5">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/dashboard" component={SystemDashboard} />
          <Route path="/people" component={PeopleManagement} />
          <Route>
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                <p className="text-muted-foreground">The page you're looking for doesn't exist.</p>
              </div>
            </div>
          </Route>
        </Switch>
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}