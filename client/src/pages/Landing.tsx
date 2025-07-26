import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Video, Users, Sparkles, Star, Award, CheckCircle2, Menu, X, Play, Zap, Shield, Globe, Heart } from 'lucide-react';
import famFlixLogo from "../assets/FamFlix.png";
import { useMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Landing() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('how-it-works');
  const isMobile = useMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // If user is logged in, redirect to homepage using useEffect to avoid state updates during render
  useEffect(() => {
    if (user) {
      console.log('User is logged in, redirecting to homepage:', user);
      navigate('/home');
    }
  }, [user, navigate]);

  // Handle scroll effect for navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Navigation - Enhanced */}
      <header className={`w-full sticky top-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass-morphism shadow-lg' : 'bg-transparent'
      }`}>
        <div className="container mx-auto flex items-center justify-between h-20 px-6">
          <div className="flex items-center">
            <div className="flex items-center cursor-pointer group animate-fade-in">
              <div className="logo-container">
                <img src={famFlixLogo} alt="FamFlix Logo" className="h-12 w-auto transition-transform group-hover:scale-110" />
              </div>
              <span className="logo-text ml-3">
                <span className="logo-text-fam">Fam</span>
                <span className="logo-text-flix">Flix</span>
              </span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="flex items-center gap-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <nav className="flex items-center gap-8">
                <Button variant="ghost" className="font-medium text-foreground/70 hover:text-primary transition-all duration-300 hover:scale-105" onClick={() => {
                  const howItWorksSection = document.getElementById('how-it-works');
                  howItWorksSection?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  How It Works
                </Button>
                <Button variant="ghost" className="font-medium text-foreground/70 hover:text-primary transition-all duration-300 hover:scale-105" onClick={() => {
                  const pricingSection = document.getElementById('pricing');
                  pricingSection?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Pricing
                </Button>
              </nav>
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate('/auth')} variant="ghost" className="font-medium hover:scale-105 transition-transform">
                  Login
                </Button>
                <Button onClick={() => navigate('/auth')} className="button-gradient font-medium px-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                  Get Started
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Mobile Menu Button */}
          {isMobile && (
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="animate-fade-in">
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85%] sm:w-[350px] bg-background p-0 border-0">
                <div className="flex flex-col h-full">
                  <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-6 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <img src={famFlixLogo} alt="FamFlix Logo" className="h-8 w-auto" />
                        <span className="text-lg font-bold logo-text ml-2">
                          <span className="text-white">FamFlix</span>
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)} className="text-primary-foreground hover:bg-primary/80">
                        <X size={20} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-2 py-6">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-12 px-6 hover:bg-secondary/50"
                      onClick={() => {
                        const howItWorksSection = document.getElementById('how-it-works');
                        howItWorksSection?.scrollIntoView({ behavior: 'smooth' });
                        setIsMenuOpen(false);
                      }}
                    >
                      How It Works
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-12 px-6 hover:bg-secondary/50"
                      onClick={() => {
                        const pricingSection = document.getElementById('pricing');
                        pricingSection?.scrollIntoView({ behavior: 'smooth' });
                        setIsMenuOpen(false);
                      }}
                    >
                      Pricing
                    </Button>
                    <div className="border-t my-4"></div>
                    <div className="px-6 py-2 space-y-3">
                      <Button 
                        onClick={() => navigate('/auth')} 
                        variant="outline" 
                        className="w-full h-12"
                      >
                        Login
                      </Button>
                      <Button 
                        onClick={() => navigate('/auth')} 
                        className="w-full h-12 button-gradient"
                      >
                        Sign Up
                      </Button>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </header>
      
      {/* Hero Section - Enhanced */}
      <section className="w-full py-16 md:py-32 lg:py-40 container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3 animate-slide-up">
              <Badge className="w-fit bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border-primary/30 px-4 py-2 text-sm font-medium shadow-lg">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered Learning
              </Badge>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="text-sm text-muted-foreground ml-1">5.0</span>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Make Learning 
              <span className="block gradient-text-animated">Personal</span>
              <span className="block text-4xl md:text-5xl text-muted-foreground font-normal mt-2">
                with your face & voice
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-[600px] leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
              Transform educational videos by replacing actors with familiar faces and voices. 
              Create engaging, personalized learning experiences that children actually love.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <Button 
                onClick={() => navigate('/auth')} 
                size="lg" 
                className="button-gradient gap-3 h-14 px-8 text-lg font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all group"
              >
                Start Creating 
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                onClick={() => {
                  const howItWorksSection = document.getElementById('how-it-works');
                  howItWorksSection?.scrollIntoView({ behavior: 'smooth' });
                }} 
                variant="outline" 
                size="lg"
                className="h-14 px-8 text-lg font-medium border-2 hover:bg-secondary/50 hover:scale-105 transition-all"
              >
                <Video className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-border/50 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs text-white font-semibold border-2 border-background shadow-md">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <div className="text-sm">
                  <div className="font-semibold text-foreground">2,000+ families</div>
                  <div className="text-muted-foreground">joined this month</div>
                </div>
              </div>
              
              <div className="h-8 w-px bg-border/50"></div>
              
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">No setup required</span>
              </div>
            </div>
          </div>
          
          <div className="lg:block relative animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <div className="relative aspect-video rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-card to-muted border-2 border-border/20 group">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-purple-500/10 group-hover:opacity-70 transition-opacity"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl border border-white/20 group-hover:scale-110 transition-transform">
                    <Video className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="glass-morphism rounded-xl p-4">
                  <p className="text-center font-semibold text-sm">Interactive Demo</p>
                  <p className="text-center text-xs text-muted-foreground mt-1">See FamFlix in action</p>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg animate-float">
              AI
            </div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg animate-float" style={{ animationDelay: '2s' }}>
              <Users className="w-6 h-6" />
            </div>
            <div className="absolute top-1/2 -left-12 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white shadow-lg animate-float" style={{ animationDelay: '4s' }}>
              <Zap className="w-5 h-5" />
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section - Enhanced */}
      <section id="how-it-works" className="w-full py-20 md:py-32 container relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent rounded-3xl"></div>
        
        <div className="relative flex flex-col gap-16 items-center text-center">
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              How <span className="gradient-text-animated">FamFlix</span> Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-[700px] leading-relaxed">
              Transform education in three simple steps. Create personalized content that makes learning memorable and engaging.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
            {/* Step 1 */}
            <Card className="card-hover relative overflow-hidden border-0 shadow-xl animate-slide-up">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600"></div>
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Users className="h-10 w-10 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                      1
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Create Profiles</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Add family members with photos and voice recordings. Our AI learns their unique characteristics.
                    </p>
                  </div>
                  
                  <div className="space-y-3 w-full text-left">
                    {[
                      'Upload 3-5 clear photos',
                      'Record 30 seconds of speech',
                      'Add multiple family members'
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <div className="w-2 h-2 rounded-full bg-primary group-hover:scale-150 transition-transform"></div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="card-hover relative overflow-hidden border-0 shadow-xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Sparkles className="h-10 w-10 text-purple-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                      2
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Customize Videos</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Choose educational content and select which family members appear in each role.
                    </p>
                  </div>
                  
                  <div className="space-y-3 w-full text-left">
                    {[
                      'Browse educational library',
                      'Filter by age and subject',
                      'Assign family member roles'
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <div className="w-2 h-2 rounded-full bg-purple-600 group-hover:scale-150 transition-transform"></div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="card-hover relative overflow-hidden border-0 shadow-xl animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-600 to-red-500"></div>
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500/20 to-red-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Video className="h-10 w-10 text-pink-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-pink-600 to-pink-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg">
                      3
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">Watch & Learn</h3>
                    <p className="text-muted-foreground leading-relaxed">
                      Enjoy personalized videos on any device. Cast to TV for the ultimate family experience.
                    </p>
                  </div>
                  
                  <div className="space-y-3 w-full text-left">
                    {[
                      'Stream to any device',
                      'Cast to smart TV',
                      'Download for offline viewing'
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 group">
                        <div className="w-2 h-2 rounded-full bg-pink-600 group-hover:scale-150 transition-transform"></div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Button 
            onClick={() => navigate('/auth')} 
            size="lg" 
            className="button-gradient mt-8 px-12 h-14 text-lg font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all group"
          >
            Start Your Journey 
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>
      
      {/* Benefits Section - Enhanced */}
      <section className="w-full py-12 md:py-24 bg-secondary/10">
        <div className="container">
          <div className="flex flex-col gap-8 items-center text-center mb-12 animate-fade-in">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
              Benefits of Personalized Learning
            </h2>
            <p className="text-xl text-muted-foreground max-w-[800px]">
              Why families choose FamFlix for their children's education
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Star className="h-10 w-10" />,
                title: "Increased Engagement",
                description: "Children pay more attention when they see and hear familiar faces and voices in educational content.",
                gradient: "from-yellow-500 to-orange-500"
              },
              {
                icon: <Award className="h-10 w-10" />,
                title: "Better Knowledge Retention",
                description: "Personalized content creates stronger emotional connections, helping children remember what they learn.",
                gradient: "from-blue-500 to-cyan-500"
              },
              {
                icon: <Heart className="h-10 w-10" />,
                title: "Strengthened Family Bonds",
                description: "Learning becomes a shared family experience even when parents can't be physically present.",
                gradient: "from-pink-500 to-rose-500"
              },
              {
                icon: <Shield className="h-10 w-10" />,
                title: "Safe & Secure",
                description: "Your family's data is protected with enterprise-grade security and never shared with third parties.",
                gradient: "from-green-500 to-emerald-500"
              },
              {
                icon: <Globe className="h-10 w-10" />,
                title: "Multilingual Support",
                description: "Create content in multiple languages to support diverse learning needs and heritage preservation.",
                gradient: "from-purple-500 to-violet-500"
              },
              {
                icon: <Zap className="h-10 w-10" />,
                title: "Instant Creation",
                description: "Advanced AI processing creates personalized videos in minutes, not hours or days.",
                gradient: "from-red-500 to-pink-500"
              }
            ].map((benefit, index) => (
              <Card key={index} className="h-full card-hover border-0 shadow-lg overflow-hidden group animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardHeader>
                  <div className={`w-14 h-14 bg-gradient-to-br ${benefit.gradient} rounded-2xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                    {benefit.icon}
                  </div>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Pricing Section - Enhanced */}
      <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 container">
        <div className="flex flex-col gap-8 items-center text-center mb-12 animate-fade-in">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-[800px]">
            Choose the plan that works best for your family
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="border-0 shadow-lg card-hover animate-slide-up">
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <div className="text-4xl font-bold mt-4">$0</div>
              <CardDescription className="mt-2">Perfect for trying FamFlix</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[
                  'Create 1 family profile',
                  'Access to 5 free video templates',
                  'Standard quality processing',
                  'Create up to 3 videos per month',
                  'Basic support'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/auth')} className="w-full" variant="outline">
                Sign Up for Free
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="border-0 shadow-xl card-hover relative animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-2 rounded-full text-sm font-medium shadow-lg">
              Most Popular
            </div>
            <CardHeader className="pt-8">
              <CardTitle>Premium</CardTitle>
              <div className="text-4xl font-bold mt-4">$9.99<span className="text-lg text-muted-foreground"> /month</span></div>
              <CardDescription className="mt-2">Best for families</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[
                  'Create up to 5 family profiles',
                  'Access to all video templates',
                  'High quality processing',
                  'Unlimited videos per month',
                  'Priority support',
                  'Download videos for offline viewing',
                  'Advanced voice customization'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/auth')} className="w-full button-gradient shadow-lg hover:shadow-xl">
                Get Premium
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="border-0 shadow-lg card-hover animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle>Family Pack</CardTitle>
              <div className="text-4xl font-bold mt-4">$19.99<span className="text-lg text-muted-foreground"> /month</span></div>
              <CardDescription className="mt-2">For extended families</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[
                  'Create up to 10 family profiles',
                  'Access to all video templates',
                  'Highest quality processing',
                  'Unlimited videos per month',
                  'Priority support',
                  'Download videos for offline viewing',
                  'Advanced voice customization',
                  'Family account sharing (up to 3 households)',
                  'Early access to new features'
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button onClick={() => navigate('/auth')} className="w-full" variant="outline">
                Get Family Pack
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>
      
      {/* CTA Section - Enhanced */}
      <section className="w-full py-16 md:py-24 bg-gradient-to-r from-primary to-primary/80 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full translate-y-24 -translate-x-24"></div>
        </div>
        
        <div className="container relative">
          <div className="flex flex-col gap-8 items-center text-center text-primary-foreground animate-fade-in">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tighter">
              Ready to Make Learning Personal?
            </h2>
            <p className="text-xl max-w-[600px] text-white/90">
              Join thousands of families who are enhancing their children's education with personalized videos.
            </p>
            <Button 
              onClick={() => navigate('/auth')} 
              variant="secondary" 
              size="lg" 
              className="gap-2 text-primary h-14 px-8 text-lg font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all group"
            >
              Get Started Today 
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer - Enhanced */}
      <footer className="w-full py-12 bg-secondary/10 border-t">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src={famFlixLogo} alt="FamFlix" className="h-8" />
              <span className="logo-text text-xl">
                <span className="logo-text-fam">Fam</span>
                <span className="logo-text-flix">Flix</span>
              </span>
            </div>
            <div className="flex gap-8">
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</a>
              <a href="#" className="text-muted-foreground hover:text-primary transition-colors">About</a>
            </div>
            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} FamFlix. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}