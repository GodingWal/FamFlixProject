import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Home, User, Video, Save, Menu, X, LogOut, Users, ShieldAlert, Music, Sparkles, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useMobile } from "@/hooks/use-mobile";
import famFlixLogo from "../assets/FamFlix.png";

const Navbar = () => {
  const [location, setLocation] = useLocation();
  const { user, isAdmin, logoutMutation } = useAuth();
  const isMobile = useMobile();

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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 safe-area-pb">
        <div className="flex justify-around items-center py-2">
          {navItems.slice(0, 5).map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[60px] ${
                location === item.path 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              {item.icon}
              <span className="text-xs font-medium">{item.shortLabel}</span>
            </Link>
          ))}
          
          <Sheet>
            <SheetTrigger asChild>
              <button className="flex flex-col items-center gap-1 p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-gray-50 min-w-[60px]">
                <Menu size={20} />
                <span className="text-xs font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <img src={famFlixLogo} alt="FamFlix" className="h-8" />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{user?.username}</span>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {navItems.slice(5).map((item) => (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                        location === item.path 
                          ? 'text-blue-600 bg-blue-50' 
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  ))}
                </div>
                
                {isAdmin && (
                  <div className="border-t pt-4">
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">Admin</h3>
                    <div className="space-y-2">
                      <Link 
                        href="/admin"
                        className="flex items-center gap-3 p-3 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                      >
                        <ShieldAlert size={20} />
                        <span>Dashboard</span>
                      </Link>
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 p-3 rounded-lg text-red-600 hover:bg-red-50 w-full"
                  >
                    <LogOut size={20} />
                    <span>Sign Out</span>
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
      <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 overflow-y-auto">
                <div className="flex flex-col h-full">
                  <div className="border-b pb-4 mb-4">
                    <img src={famFlixLogo} alt="FamFlix" className="h-8 mb-4" />
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
                        <AvatarFallback>{getUserInitials()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user?.username}</div>
                        <div className="text-sm text-gray-500">{user?.email}</div>
                      </div>
                    </div>
                  </div>
                  
                  <nav className="flex-1 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                      <Link 
                        key={item.path} 
                        href={item.path}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                          location === item.path 
                            ? 'text-blue-600 bg-blue-50' 
                            : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    ))}
                    
                    {isAdmin && (
                      <div className="border-t pt-4 mt-4">
                        <h3 className="text-sm font-semibold text-gray-500 mb-2 px-3">Admin</h3>
                        <Link 
                          href="/admin"
                          className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:text-blue-600 hover:bg-gray-50"
                        >
                          <ShieldAlert size={20} />
                          <span>Admin Dashboard</span>
                        </Link>
                      </div>
                    )}
                  </nav>
                  
                  <div className="border-t pt-4 mt-4">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 w-full"
                    >
                      <LogOut size={20} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            
            <img src={famFlixLogo} alt="FamFlix" className="h-8" />
          </div>

          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
                    <AvatarFallback>{getUserInitials()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline font-medium">{user?.username}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profile
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
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <nav className="hidden lg:block px-4 py-2 bg-gray-50 border-b border-gray-200 overflow-x-auto">
          <div className="flex space-x-1 min-w-max">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  location === item.path 
                    ? 'text-blue-600 bg-white shadow-sm' 
                    : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      
      {/* Spacer for fixed header */}
      <div className="h-[120px] lg:h-[140px]" />
    </>
  );
};

export default Navbar;