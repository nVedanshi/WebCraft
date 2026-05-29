import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Zap, Settings, History, Home, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "./UserMenu";
import { Button } from "@/components/ui/button";

const authenticatedNav = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Generate", href: "/generate", icon: Sparkles },
  { name: "History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Header() {
  const location = useLocation();
  const { user, loading } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to={user ? "/dashboard" : "/"} className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 gradient-primary opacity-50 blur-lg rounded-lg" />
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg gradient-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
            </div>
            <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
              WebCraft AI
            </span>
          </Link>

          {/* Navigation - Only show when logged in */}
          {user && (
            <nav className="flex items-center gap-1">
              {authenticatedNav.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Auth */}
          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <UserMenu />
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button variant="hero" size="sm" asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
