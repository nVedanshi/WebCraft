import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Zap,
  Clock,
  FolderOpen,
  ArrowRight,
  Sparkles,
  BarChart3,
  Plus
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// interface Generation {
//   id: string;
//   prompt: string;
//   created_at: string;
//   blueprint: {
//     blueprint?: {
//       name?: string;
//     };
//     meta?: {
//       status?: string;
//     };
//   };
// }

interface Workspace {
  id: string;
  name: string;
  created_at: string;
  blueprint: {
    name?: string;
  };
}


const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // const [generations, setGenerations] = useState<Generation[]>([]);
  const [generations, setGenerations] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchWorkspaces = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/workspaces?userId=${user.id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load workspaces");
        }

        setGenerations(data.workspaces || []);
        

      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkspaces();
  }, [user]);


  const handleOpenGeneration = (generation: Workspace) => {
    navigate(`/workspace/${generation.id}`);
  };


  const getAppName = (workspace: Workspace) => {
    return workspace.name || "Untitled Workspace";
  };


  return (
    <Layout>
      <section className="relative min-h-[calc(100vh-4rem)] py-8">
        {/* Background */}
        <div className="absolute inset-0 grid-pattern opacity-20" />

        <div className="container relative px-6">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
            </h1>
            <p className="text-muted-foreground">
              Your AI-powered software synthesis workspace
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
          >
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{generations.length}</p>
                  <p className="text-xs text-muted-foreground">Total Generations</p>
                </div>
              </div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                  <Clock className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {generations.length > 0
                      ? formatDistanceToNow(new Date(generations[0].created_at), { addSuffix: false })
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Generated</p>
                </div>
              </div>
            </div>
            <div className="card-elevated p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <Sparkles className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">Active</p>
                  <p className="text-xs text-muted-foreground">Workspace Status</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* New Generation CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <div className="card-elevated p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-primary">
                    <Zap className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Start a New Generation</h2>
                    <p className="text-sm text-muted-foreground">
                      Describe your app and let AI create the blueprint
                    </p>
                  </div>
                </div>
                <Button asChild variant="hero" size="lg">
                  <Link to="/generate">
                    <Plus className="h-4 w-4" />
                    New Generation
                  </Link>
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Recent Generations */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Recent Generations</h2>
              <Link
                to="/history"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-elevated p-4 animate-pulse">
                    <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : generations.length === 0 ? (
              <div className="card-elevated p-8 text-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No generations yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Start by describing the app you want to build
                </p>
                <Button asChild variant="outline">
                  <Link to="/generate">
                    Create Your First App
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {generations.map((generation, index) => (
                  <motion.div
                    key={generation.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="card-elevated card-interactive p-4 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{getAppName(generation)}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(generation.created_at), { addSuffix: true })}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                            Complete
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenGeneration(generation)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Open Workspace
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default Dashboard;
