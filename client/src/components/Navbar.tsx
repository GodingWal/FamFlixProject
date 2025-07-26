import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Video, Save, Menu, X, LogOut, Users, ShieldAlert, Music, Sparkles, Brain, ChevronRight, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMobile } from "@/hooks/use-mobile";
import famFlixLogo from "../assets/FamFlix.png";

const Navbar = () => {
  const [location, setLocation] = useLocation();
  const { user, isAdmin, logoutMutation } = useAuth();
  const isMobile = useMobile();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  const getUserInitials = () => {
    if (!user?.username) return "?";
    return user.username.substring(0, 2).toUpperCase();
  };
  
  const navItems = [
    { path: "/", icon: <Home size={20} />, label: "Home", shortLabel: "Home" },
    { path: "/library", icon: <Video size={20} />, label: "Library", shortLabel: "Videos" },
    { path: "/saved", icon: <Save size={20} />, label: "My Videos", shortLabel: "Saved" },
    { path: "/people", icon: <Users size={20} />, label: "People", shortLabel: "Family" },
    { path: "/stories", icon: <Music size={20} />, label: "Stories", shortLabel: "Stories" },
    { path: "/ai-stories", icon: <Sparkles size={20} />, label: "AI Creator", shortLabel: "AI" },
    { path: "/smart-voice", icon: <Brain size={20} />, label: "Voice Coach", shortLabel: "Coach" }
  ];

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border/50 safe-area-pb shadow-2xl">
        <div className="flex justify-around items-center py-2">
          {navItems.slice(0, 5).map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 min-w-[64px] ${
                location === item.path 
                  ? 'text-primary bg-primary/10 shadow-md scale-105' 
                  : 'text-muted-foreground hover:text-primary hover:bg-secondary/50'
              }`}
            >
              <div className={`transition-transform duration-300 ${location === item.path ? 'scale-110' : ''}`}>
                {item.icon}
              </div>
              <span className="text-xs font-medium">{item.shortLabel}</span>
            </Link>
          ))}
          
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1 p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-secondary/50 transition-all duration-300 min-w-[64px]">
                <Menu size={20} />
                <span className="text-xs font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-0 shadow-2xl bg-background/95 backdrop-blur-lg">
              <div className="w-12 h-1 bg-border rounded-full mx-auto mb-6"></div>
              <div className="space-y-6 pt-2 overflow-y-auto">
                <div className="flex items-center justify-between px-4">
                  <div className="flex items-center gap-3">
                    <div className="logo-container group">
                      <img src={famFlixLogo} alt="FamFlix" className="h-10 transition-transform group-hover:scale-105" />
                    </div>
                    <span className="logo-text text-xl">
                      <span className="logo-text-fam">Fam</span>
                      <span className="logo-text-flix">Flix</span>
                    </span>
                  </div>
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="space-y-2 px-4">
                  <p className="text-sm text-muted-foreground">Explore More</p>
                  {navItems.slice(5).map((item) => (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`flex items-center justify-between p-3 rounded-xl transition-all duration-300 group ${
                        location === item.path 
                          ? 'text-primary bg-primary/10' 
                          : 'text-foreground hover:text-primary hover:bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`transition-transform duration-300 ${location === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {item.icon}
                        </div>
                        <span className="font-medium">{item.label}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
                
                {isAdmin && (
                  <div className="border-t pt-4 px-4">
                    <p className="text-sm text-muted-foreground mb-2">Administration</p>
                    <Link 
                      href="/admin"
                      className="flex items-center justify-between p-3 rounded-xl text-foreground hover:text-primary hover:bg-secondary/50 transition-all duration-300 group"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert size={20} className="group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Admin Dashboard</span>
                      </div>
                      <Badge className="bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
                        Admin
                      </Badge>
                    </Link>
                  </div>
                )}
                
                <div className="border-t pt-4 px-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-between p-3 rounded-xl text-destructive hover:bg-destructive/10 w-full transition-all duration-300 group"
                  >
                    <div className="flex items-center gap-3">
                      <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                      <span className="font-medium">Sign Out</span>
                    </div>
                    <ChevronRight className="h-4 w-4 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-b border-border/50 z-50 shadow-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden hover:bg-secondary/50">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 border-r-0 shadow-2xl bg-background/95 backdrop-blur-lg overflow-y-auto">
                <div className="flex flex-col h-full">
                  <div className="border-b pb-6 mb-6">
                    <div className="flex items-center gap-3 mb-6">
                      <img src={famFlixLogo} alt="FamFlix" className="h-10" />
                      <span className="logo-text text-xl">
                        <span className="logo-text-fam">Fam</span>
                        <span className="logo-text-flix">Flix</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{user?.username}</div>
                        <div className="text-sm text-muted-foreground">{user?.email}</div>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="flex-1 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                      <Link 
                        key={item.path} 
                        href={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 group ${
                          location === item.path 
                            ? 'text-primary bg-primary/10 shadow-sm' 
                            : 'text-foreground hover:text-primary hover:bg-secondary/50'
                        }`}
                      >
                        <div className={`transition-transform duration-300 ${location === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>
                          {item.icon}
                        </div>
                        <span className="font-medium">{item.label}</span>
                        {location === item.path && (
                          <div className="ml-auto w-1 h-5 bg-primary rounded-full"></div>
                        )}
                      </Link>
                    ))}
                    
                    {isAdmin && (
                      <div className="border-t pt-4 mt-4">
                        <p className="text-sm font-semibold text-muted-foreground mb-2 px-3">Administration</p>
                        <Link 
                          href="/admin"
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-foreground hover:text-primary hover:bg-secondary/50 transition-all duration-300 group"
                        >
                          <ShieldAlert size={20} className="group-hover:scale-110 transition-transform" />
                          <span className="font-medium">Admin Dashboard</span>
                          <Badge className="ml-auto bg-gradient-to-r from-red-500 to-orange-500 text-white border-0">
                            Admin
                          </Badge>
                        </Link>
                      </div>
                    )}
                  </nav>
                  
                  <div className="border-t pt-4 mt-4">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-destructive hover:bg-destructive/10 w-full transition-all duration-300 group"
                    >
                      <LogOut size={20} className="group-hover:scale-110 transition-transform" />
                      <span className="font-medium">Sign Out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <Link href="/" className="flex items-center gap-3 group">
              <div className="logo-container">
                <img src={famFlixLogo} alt="FamFlix" className="h-9 transition-transform group-hover:scale-105" />
              </div>
              <span className="logo-text hidden sm:block">
                <span className="logo-text-fam">Fam</span>
                <span className="logo-text-flix">Flix</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              className="relative hover:bg-secondary/50"
              onClick={() => setIsSearchOpen(!isSearchOpen)}
            >
              <Search className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="relative hover:bg-secondary/50">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-secondary/50">
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white">
                      {getUserInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline font-medium">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-lg border-border/50 shadow-xl">
                <DropdownMenuLabel className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user?.username}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile Settings
                  </Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4" />
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <nav className="hidden lg:block px-6 py-3 bg-secondary/30 border-t border-border/50 overflow-x-auto">
          <div className="flex space-x-1 min-w-max">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 whitespace-nowrap group ${
                  location === item.path 
                    ? 'text-primary bg-primary/10 shadow-sm' 
                    : 'text-muted-foreground hover:text-primary hover:bg-secondary/50'
                }`}
              >
                <div className={`transition-transform duration-300 ${location === item.path ? 'scale-110' : 'group-hover:scale-110'}`}>
                  {item.icon}
                </div>
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      
      {/* Spacer for fixed header */}
      <div className="h-[76px] lg:h-[128px]" />
    </>
  );
};

export default Navbar;