import { useState, useEffect } from 'react';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Video, Users, Sparkles, Star, Award, CheckCircle2, Menu, X } from 'lucide-react';
import famFlixLogo from "../assets/FamFlix.png";
import { useMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function Landing() {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('how-it-works');
  const isMobile = useMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // If user is logged in and on landing page, redirect to dashboard 
  useEffect(() => {
    if (user && (location === '/' || location === '/landing')) {
      console.log('User is logged in, redirecting to dashboard:', user);
      navigate('/dashboard');
    }
  }, [user, navigate, location]);

  // Don't render landing page content if user is logged in (to prevent flash)
  if (user) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Redirecting to Dashboard...</h2>
      </div>
    </div>;
  }

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-background via-secondary/5 to-primary/5">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl"></div>
      </div>
      
      {/* Navigation */}
      <header className="w-full glass-effect sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between h-20 px-6">
          <div className="flex items-center">
            <div className="flex items-center cursor-pointer group">
              <div className="logo-container">
                <img src={famFlixLogo} alt="FamFlix Logo" className="h-12 w-auto" />
              </div>
              <span className="logo-text ml-3">
                <span className="logo-text-fam">Fam</span>
                <span className="logo-text-flix">Flix</span>
              </span>
            </div>
          </div>
          
          {/* Desktop Navigation */}
          {!isMobile && (
            <div className="flex items-center gap-8">
              <nav className="flex items-center gap-8">
                <Button variant="ghost" className="font-medium text-foreground/70 hover:text-primary transition-colors" onClick={() => {
                  const howItWorksSection = document.getElementById('how-it-works');
                  howItWorksSection?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  How It Works
                </Button>
                <Button variant="ghost" className="font-medium text-foreground/70 hover:text-primary transition-colors" onClick={() => {
                  const pricingSection = document.getElementById('pricing');
                  pricingSection?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Pricing
                </Button>
              </nav>
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate('/auth')} variant="ghost" className="font-medium">
                  Login
                </Button>
                <Button onClick={() => navigate('/auth')} className="modern-button font-medium px-6">
                  Get Started
                </Button>
              </div>
            </div>
          )}
          
          {/* Mobile Menu Button */}
          {isMobile && (
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu size={24} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85%] sm:w-[350px] bg-background p-0">
                <div className="flex flex-col h-full">
                  <div className="bg-primary text-primary-foreground py-4 px-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center">
                        <img src={famFlixLogo} alt="FamFlix Logo" className="h-8 w-auto" />
                        <span className="text-lg font-bold logo-text ml-2">
                          <span className="logo-text-fam">Fam</span>
                          <span className="logo-text-flix">Flix</span>
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)} className="text-primary-foreground hover:bg-primary/80">
                        <X size={20} />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col gap-1 py-4">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start h-12 px-6"
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
                      className="w-full justify-start h-12 px-6"
                      onClick={() => {
                        const pricingSection = document.getElementById('pricing');
                        pricingSection?.scrollIntoView({ behavior: 'smooth' });
                        setIsMenuOpen(false);
                      }}
                    >
                      Pricing
                    </Button>
                    <div className="border-t my-2"></div>
                    <div className="px-6 py-2 space-y-2">
                      <Button 
                        onClick={() => navigate('/auth')} 
                        variant="outline" 
                        className="w-full h-12"
                      >
                        Login
                      </Button>
                      <Button 
                        onClick={() => navigate('/auth')} 
                        className="w-full h-12"
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
      
      {/* Hero Section */}
      <section className="w-full py-16 md:py-32 lg:py-40 container relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <Badge className="w-fit bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border-primary/30 px-4 py-2 text-sm font-medium">
                <Sparkles className="w-3 h-3 mr-1" />
                AI-Powered Learning
              </Badge>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm text-muted-foreground ml-1">5.0</span>
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">
              Make Learning 
              <span className="block gradient-text">Personal</span>
              <span className="block text-4xl md:text-5xl text-muted-foreground font-normal mt-2">
                with your face & voice
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-[600px] leading-relaxed">
              Transform educational videos by replacing actors with familiar faces and voices. 
              Create engaging, personalized learning experiences that children actually love.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <Button 
                onClick={() => navigate('/auth')} 
                size="lg" 
                className="modern-button gap-3 h-14 px-8 text-lg font-semibold"
              >
                Start Creating <ArrowRight className="h-5 w-5" />
              </Button>
              <Button 
                onClick={() => {
                  const howItWorksSection = document.getElementById('how-it-works');
                  howItWorksSection?.scrollIntoView({ behavior: 'smooth' });
                }} 
                variant="outline" 
                size="lg"
                className="h-14 px-8 text-lg font-medium border-2"
              >
                <Video className="h-5 w-5 mr-2" />
                Watch Demo
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mt-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-xs text-white font-semibold border-2 border-background">
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
          
          <div className="lg:block relative">
            <div className="relative aspect-video rounded-2xl overflow-hidden glow-effect bg-gradient-to-br from-card to-muted border-2 border-border/20">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-2xl border border-white/20">
                    <Video className="h-12 w-12 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                </div>
              </div>
              <div className="absolute bottom-6 left-6 right-6">
                <div className="glass-effect rounded-xl p-4">
                  <p className="text-center font-semibold text-sm">Interactive Demo</p>
                  <p className="text-center text-xs text-muted-foreground mt-1">See FamFlix in action</p>
                </div>
              </div>
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-6 -left-6 w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg animate-bounce">
              AI
            </div>
            <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Section */}
      <section id="how-it-works" className="w-full py-20 md:py-32 container relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/20 to-transparent rounded-3xl"></div>
        
        <div className="relative flex flex-col gap-16 items-center text-center">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
              How <span className="gradient-text">FamFlix</span> Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-[700px] leading-relaxed">
              Transform education in three simple steps. Create personalized content that makes learning memorable and engaging.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
            {/* Step 1 */}
            <Card className="floating-card relative overflow-hidden border-2 border-border/20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-purple-600"></div>
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                      <Users className="h-10 w-10 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
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
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary"></div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="floating-card relative overflow-hidden border-2 border-border/20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                      <Sparkles className="h-10 w-10 text-purple-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
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
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                        <span className="text-sm">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="floating-card relative overflow-hidden border-2 border-border/20">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-600 to-red-500"></div>
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-500/20 to-red-500/20 flex items-center justify-center">
                      <Video className="h-10 w-10 text-pink-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-pink-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
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
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-pink-600"></div>
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
            className="modern-button mt-8 px-12 h-14 text-lg font-semibold"
          >
            Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>
      
      {/* Benefits Section */}
      <section className="w-full py-12 md:py-24 bg-secondary/10">
        <div className="container">
          <div className="flex flex-col gap-8 items-center text-center mb-12">
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
                icon: <Star className="h-10 w-10 text-primary" />,
                title: "Increased Engagement",
                description: "Children pay more attention when they see and hear familiar faces and voices in educational content."
              },
              {
                icon: <Award className="h-10 w-10 text-primary" />,
                title: "Better Knowledge Retention",
                description: "Personalized content creates stronger emotional connections, helping children remember what they learn."
              },
              {
                icon: <Users className="h-10 w-10 text-primary" />,
                title: "Strengthened Family Bonds",
                description: "Learning becomes a shared family experience even when parents can't be physically present."
              },
              {
                icon: <CheckCircle2 className="h-10 w-10 text-primary" />,
                title: "Diverse Learning Content",
                description: "Access hundreds of educational videos across multiple subjects and age groups."
              },
              {
                icon: <Sparkles className="h-10 w-10 text-primary" />,
                title: "Customized Learning Journey",
                description: "Tailor educational content to your child's interests and learning style."
              },
              {
                icon: <Video className="h-10 w-10 text-primary" />,
                title: "Accessible Anywhere",
                description: "Watch personalized videos on any device or cast to your TV for a bigger screen experience."
              }
            ].map((benefit, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <div className="mb-2">{benefit.icon}</div>
                  <CardTitle>{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
      
      {/* Pricing Section */}
      <section id="pricing" className="w-full py-12 md:py-24 lg:py-32 container">
        <div className="flex flex-col gap-8 items-center text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
            Simple, Transparent Pricing
          </h2>
          <p className="text-xl text-muted-foreground max-w-[800px]">
            Choose the plan that works best for your family
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <Card className="border-muted">
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
          
          <Card className="border-primary relative">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 rounded-bl-lg rounded-tr-lg text-sm font-medium">
              Most Popular
            </div>
            <CardHeader>
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
              <Button onClick={() => navigate('/auth')} className="w-full">
                Get Premium
              </Button>
            </CardFooter>
          </Card>
          
          <Card className="border-muted">
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
      
      {/* CTA Section */}
      <section className="w-full py-12 md:py-24 bg-primary">
        <div className="container">
          <div className="flex flex-col gap-8 items-center text-center text-primary-foreground">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter">
              Ready to Make Learning Personal?
            </h2>
            <p className="text-xl max-w-[600px]">
              Join thousands of families who are enhancing their children's education with personalized videos.
            </p>
            <Button 
              onClick={() => navigate('/auth')} 
              variant="secondary" 
              size="lg" 
              className="gap-2 text-primary"
            >
              Get Started Today <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="w-full py-12 bg-background">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Video className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">FamFlix</span>
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