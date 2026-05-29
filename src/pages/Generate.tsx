import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GenerationOverlay } from "@/components/ui/generation-overlay";
import { useAuth } from "@/contexts/AuthContext";
import { Zap, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

const GeneratePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [description, setDescription] = useState("");
  const [constraints, setConstraints] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!description.trim() || !user) return;

    setIsGenerating(true);

    try {
      const response = await fetch("http://localhost:5000/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: description,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      const workspaceId = data.workspaceId;

      setIsGenerating(false);
      navigate(`/workspace/${workspaceId}`);

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Generation failed");
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setDescription("");
    setConstraints("");
  };

  return (
    <Layout>
      <GenerationOverlay isVisible={isGenerating} />

      <section className="relative min-h-[calc(100vh-4rem)] py-16">
        <div className="container relative px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-3xl space-y-6"
          >
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-4">
                <Sparkles className="h-3 w-3" />
                App Generator
              </div>
              <h1 className="text-3xl font-bold mb-2">
                Describe Your Application
              </h1>
              <p className="text-muted-foreground">
                AI will generate a structured blueprint and create a workspace.
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="A task management dashboard with login..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
              />

              <Textarea
                placeholder="Optional constraints..."
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                className="resize-none"
              />

              <div className="flex gap-3">
                <Button
                  variant="hero"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!description.trim() || isGenerating}
                >
                  <Zap className="h-4 w-4" />
                  Generate Blueprint
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleReset}
                  disabled={isGenerating}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </Layout>
  );
};

export default GeneratePage;
