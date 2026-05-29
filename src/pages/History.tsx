import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, Zap, Trash2, ArrowRight, FileCode } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface WorkspaceRecord {
  id: string;
  name: string;
  blueprint: any;
  created_at: string;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchHistory();
  }, [user]);

  const fetchHistory = async () => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/workspaces?userId=${user?.id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load history");
      }

      setWorkspaces(data.workspaces || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/workspaces/${id}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
      toast.success("Workspace deleted");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete");
    }
  };

  const handleView = (workspace: WorkspaceRecord) => {
    navigate(`/workspace/${workspace.id}`);
  };

  return (
    <Layout>
      <section className="relative min-h-[calc(100vh-4rem)] py-16">
        <div className="container relative px-6">
          <div className="mx-auto max-w-4xl">

            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Workspace History
              </h1>
              <p className="text-muted-foreground">
                Manage your generated applications.
              </p>
            </div>

            {loading ? (
              <div>Loading...</div>
            ) : workspaces.length === 0 ? (
              <div className="card-elevated p-12 text-center">
                <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No workspaces yet</h3>
                <Button variant="hero" onClick={() => navigate("/generate")}>
                  <Zap className="h-4 w-4" />
                  Generate App
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {workspaces.map((workspace, index) => (
                  <motion.div
                    key={workspace.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="card-elevated p-6 group hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-foreground mb-2">
                          {workspace.name}
                        </p>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                          <Clock className="h-3 w-3" />
                          {format(
                            new Date(workspace.created_at),
                            "MMM d, yyyy 'at' h:mm a"
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(workspace.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(workspace)}
                        >
                          View
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HistoryPage;
