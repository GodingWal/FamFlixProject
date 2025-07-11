import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  Users, 
  Mic, 
  Video, 
  Settings, 
  BookOpen,
  LogOut,
  User
} from "lucide-react";
import famFlixLogo from "../assets/FamFlix.png";

export default function AppNavigation() {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) return null;

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/people", label: "People", icon: Users },
    { path: "/voice-training", label: "Voice Training", icon: Mic },
    { path: "/stories", label: "Stories", icon: BookOpen },
    { path: "/templates", label: "Video Library", icon: Video },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <img src={famFlixLogo} alt="FamFlix" className="h-8 w-auto" />
          <span className="ml-2 text-xl font-bold">
            <span className="text-primary">Fam</span>
            <span className="text-secondary">Flix</span>
          </span>
        </div>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center space-x-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant={isActive ? "default" : "ghost"}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="text-sm font-medium">{user.displayName || user.username}</span>
            {user.role === 'admin' && (
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  );
}