import { useAuth } from '@/hooks/use-auth';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Home, 
  Users, 
  Mic, 
  Video, 
  BookOpen,
  BarChart3,
  LogOut,
  User,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import famFlixLogo from "../assets/FamFlix.png";
import { useMobile } from "@/hooks/use-mobile";

export default function Navigation() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useMobile();

  // Don't show navigation on landing or auth pages
  if (!user || location === '/' || location === '/auth') {
    return null;
  }

  const navItems = [
    { path: "/home", label: "Home", icon: Home },
    { path: "/people", label: "Family", icon: Users },
    { path: "/voice-training", label: "Voice Training", icon: Mic },
    { path: "/templates", label: "Videos", icon: Video },
    { path: "/stories", label: "Stories", icon: BookOpen },
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
    setIsMenuOpen(false);
  };

  const NavContent = () => (
    <>
      {/* Logo */}
      <Link href="/home">
        <div className="flex items-center gap-3 cursor-pointer">
          <img src={famFlixLogo} alt="FamFlix" className="h-8 w-auto" />
          <span className="text-xl font-bold">
            <span className="text-primary">Fam</span>
            <span className="text-secondary-foreground">Flix</span>
          </span>
        </div>
      </Link>

      {/* Navigation Links - Desktop */}
      {!isMobile && (
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="flex items-center gap-2 h-9"
                  size="sm"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>
      )}

      {/* User Menu */}
      <div className="flex items-center gap-3">
        {/* Admin Dashboard Link */}
        {user.role === 'admin' && !isMobile && (
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        )}

        {/* User Info */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-primary" />
          </div>
          {!isMobile && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{user.displayName || user.username}</span>
              {user.role === 'admin' && (
                <Badge variant="secondary" className="text-xs">Admin</Badge>
              )}
            </div>
          )}
        </div>

        {/* Logout Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          {!isMobile && "Logout"}
        </Button>
      </div>
    </>
  );

  const MobileNavContent = () => (
    <div className="flex flex-col space-y-4 p-6">
      {/* User Info */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="font-medium">{user.displayName || user.username}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.role === 'admin' && (
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant={isActive ? "default" : "ghost"}
                className="w-full justify-start gap-3 h-12"
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </div>

      {/* Admin Dashboard */}
      {user.role === 'admin' && (
        <div className="pt-4 border-t">
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => setIsMenuOpen(false)}
            >
              <BarChart3 className="h-5 w-5" />
              Admin Dashboard
            </Button>
          </Link>
        </div>
      )}

      {/* Logout */}
      <div className="pt-4 border-t">
        <Button
          variant="outline"
          className="w-full justify-start gap-3 h-12"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-5 w-5" />
          Logout
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <nav className="bg-white/95 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/home">
              <div className="flex items-center gap-2">
                <img src={famFlixLogo} alt="FamFlix" className="h-7 w-auto" />
                <span className="text-lg font-bold">
                  <span className="text-primary">Fam</span>
                  <span className="text-secondary-foreground">Flix</span>
                </span>
              </div>
            </Link>

            {/* Mobile Menu */}
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <MobileNavContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white/95 backdrop-blur-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <NavContent />
        </div>
      </div>
    </nav>
  );
}