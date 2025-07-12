import { useState } from "react";
import { Redirect, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, User, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");
  
  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });
  
  // Registration form state
  const [registerForm, setRegisterForm] = useState({
    username: "",
    email: "",
    password: "",
    displayName: "",
    confirmPassword: "",
  });
  
  // Handle login form change
  const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLoginForm({
      ...loginForm,
      [e.target.name]: e.target.value,
    });
  };
  
  // Handle registration form change
  const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRegisterForm({
      ...registerForm,
      [e.target.name]: e.target.value,
    });
  };
  
  // Handle login submission
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log("Login form submitted:", { username: loginForm.username, hasPassword: !!loginForm.password });
    console.log("loginMutation:", loginMutation);
    
    // Simple validation
    if (!loginForm.username || !loginForm.password) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    if (loginMutation?.mutate) {
      loginMutation.mutate(loginForm);
    } else {
      console.error("loginMutation.mutate is not available", loginMutation);
      toast({
        title: "Error",
        description: "Authentication system not ready. Please refresh the page.",
        variant: "destructive",
      });
    }
  };
  
  // Handle registration submission
  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple validation
    if (!registerForm.username || !registerForm.email || !registerForm.password || !registerForm.displayName || !registerForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Validation Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    if (registerMutation?.mutate) {
      registerMutation.mutate(registerForm);
    } else {
      console.error("registerMutation.mutate is not available", registerMutation);
      toast({
        title: "Error",
        description: "Registration system not ready. Please refresh the page.",
        variant: "destructive",
      });
    }
  };
  
  // Redirect to home if already logged in
  if (user && !isLoading) {
    return <Redirect to="/home" />;
  }
  
  return (
    <div className="flex min-h-screen bg-gradient-to-b from-primary/10 to-background">
      <div className="absolute top-4 left-4 md:top-6 md:left-6 z-10">
        <Link href="/">
          <Button variant="ghost" className="gap-2 h-10 px-3 md:h-auto md:px-4">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 md:p-6">
        <Tabs 
          defaultValue="login" 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full max-w-[400px] space-y-4"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>
          
          {/* Login Form */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Login to FamFlix</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLoginSubmit}>
                <CardContent className="space-y-5 p-4 md:p-6">
                  <div className="space-y-2">
                    <Label htmlFor="username" className="text-sm font-medium">Username</Label>
                    <Input
                      id="username"
                      name="username"
                      placeholder="johndoe"
                      value={loginForm.username}
                      onChange={handleLoginChange}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      className="h-11 text-base"
                    />
                  </div>
                </CardContent>
                <CardFooter className="p-4 md:p-6">
                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base font-medium" 
                    disabled={loginMutation?.isPending}
                    onClick={(e) => {
                      console.log("Login button clicked");
                      if (!loginForm.username || !loginForm.password) {
                        e.preventDefault();
                        toast({
                          title: "Validation Error",
                          description: "Please fill in all fields",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {loginMutation?.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Logging in...
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
          
          {/* Registration Form */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>Create an Account</CardTitle>
                <CardDescription>
                  Sign up for FamFlix to create personalized content
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegisterSubmit}>
                <CardContent className="space-y-4 p-4 md:p-6">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="text-sm font-medium">Display Name</Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      placeholder="John Doe"
                      value={registerForm.displayName}
                      onChange={handleRegisterChange}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-username" className="text-sm font-medium">Username</Label>
                    <Input
                      id="reg-username"
                      name="username"
                      placeholder="johndoe"
                      value={registerForm.username}
                      onChange={handleRegisterChange}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      value={registerForm.email}
                      onChange={handleRegisterChange}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-sm font-medium">Password</Label>
                    <Input
                      id="reg-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={handleRegisterChange}
                      className="h-11 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={handleRegisterChange}
                      className="h-11 text-base"
                    />
                  </div>
                </CardContent>
                <CardFooter className="p-4 md:p-6">
                  <Button 
                    type="submit" 
                    className="w-full h-11 text-base font-medium" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Hero side */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-primary text-primary-foreground hidden lg:flex">
        <div className="max-w-md">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary-foreground mb-6">
            <User className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">Welcome to FamFlix</h1>
          <p className="text-xl mb-6">
            Transform educational videos with your face and voice
          </p>
          <ul className="space-y-3">
            <li className="flex items-start">
              <div className="mr-2">✓</div>
              <span>Add your face to educational content</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2">✓</div>
              <span>Replace voices with your recordings</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2">✓</div>
              <span>Cast personalized videos to your TV</span>
            </li>
            <li className="flex items-start">
              <div className="mr-2">✓</div>
              <span>Make learning fun and engaging for kids</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}