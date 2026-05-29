import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut, User, History, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export function UserMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/login");
  };

  const initials = user?.email?.slice(0, 2).toUpperCase() || "U";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary text-sm font-medium">
          {initials}
        </div>
        <span className="hidden sm:inline text-sm text-muted-foreground max-w-32 truncate">
          {user?.email}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-56 z-50 rounded-lg border border-border bg-card shadow-xl"
            >
              <div className="p-2 border-b border-border">
                <p className="text-xs text-muted-foreground px-2">Signed in as</p>
                <p className="text-sm font-medium px-2 truncate">{user?.email}</p>
              </div>
              
              <div className="p-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/history");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  <History className="h-4 w-4" />
                  Generation History
                </button>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
                >
                  <User className="h-4 w-4" />
                  Settings
                </button>
              </div>

              <div className="p-1 border-t border-border">
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm rounded-md text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
