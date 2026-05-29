import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import LivePreview from "@/components/preview/LivePreview";
import CodeEditor from "@/components/preview/CodeEditor";
import FixWorkspace from "@/components/FixWorkspace";
import JSZip from 'jszip';
import {
  Download,
  Github,
  ArrowLeft,
  Eye,
  FileCode,
  Braces,
  CheckCircle2,
  Zap,
  MessageSquare,
  Bot,
  User,
  Loader2,
  Send,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceChat } from "@/hooks/useWorkspaceChat";

interface GeneratedProject {
  name: string;
  description: string;
  pages: Array<{
    name: string;
    path: string;
    components: Array<{
      name: string;
      type: string;
      library: string;
    }>;
  }>;
  dependencies: string[];
  structure: {
    directories: string[];
    files: string[];
  };
  generatedFiles?: string[];
  fileCount?: number;
  components?: number;
}

const Workspace = () => {
  const navigate = useNavigate();
  const { workspaceId } = useParams();
  const { session, signInWithProvider } = useAuth();
  
  const [project, setProject] = useState<GeneratedProject | null>(null);
  const [files, setFiles] = useState<Record<string, string>>({});
  const [activeFile, setActiveFile] = useState<string>('');
  const [input, setInput] = useState("");
  const [loadingWorkspace, setLoadingWorkspace] = useState(true);
  const [loadingCode, setLoadingCode] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const workspace_id = workspaceId!;
  const {
    messages,
    loading: chatLoading,
    aiLoading,
    sendMessage,
    bottomRef,
  } = useWorkspaceChat(workspace_id);

  useEffect(() => {
    if (!workspaceId) {
      navigate("/dashboard");
      return;
    }

    const fetchWorkspace = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/workspaces/${workspaceId}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load workspace");
        }

        console.log('Workspace data:', data.workspace);
        setProject(data.workspace.blueprint);
        setLoadingWorkspace(false);

        // Fetch generated code
        await fetchGeneratedCode();

      } catch (error) {
        console.error(error);
        setLoadingWorkspace(false);
        navigate("/dashboard");
      }
    };

    fetchWorkspace();
  }, [workspaceId, navigate]);

  const fetchGeneratedCode = async () => {
    try {
      setLoadingCode(true);
      const response = await fetch(
        `http://localhost:5000/api/generate/${workspaceId}/code`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch code");
      }

      setFiles(data.files || {});
      
      // Set first file as active
      const fileKeys = Object.keys(data.files || {});
      if (fileKeys.length > 0) {
        setActiveFile(fileKeys[0]);
      }

    } catch (error) {
      console.error("Failed to fetch generated code:", error);
      toast.error("Failed to load generated code");
    } finally {
      setLoadingCode(false);
    }
  };

  const handleRegenerate = async (modifications: string) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/generate/${workspaceId}/regenerate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prompt: project?.description || "",
            modifications,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to regenerate");
      }

      setProject(data.project);
      setFiles(data.files);
      toast.success("Project regenerated successfully!");

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Regeneration failed");
    }
  };

  const handleFileChange = (filename: string, content: string) => {
    setFiles(prev => ({
      ...prev,
      [filename]: content
    }));
  };

  const handleDownload = () => {
    // Create a zip file with all the generated files
    const zip = new JSZip();
    Object.entries(files).forEach(([filename, content]) => {
      zip.file(filename, content);
    });
    
    zip.generateAsync({ type: 'blob' }).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name?.toLowerCase().replace(/\s+/g, '-') || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Project downloaded successfully!');
    });
  };

  const handleGithubPublish = async () => {
    if (!session?.provider_token && session?.user?.app_metadata?.provider !== 'github') {
      toast.error("Please sign in with GitHub to publish", {
        action: {
          label: "Sign in",
          onClick: () => signInWithProvider('github')
        }
      });
      return;
    }

    // Sometimes provider_token is not in the session object directly but available via Supabase
    const githubToken = session?.provider_token;
    
    if (!githubToken) {
      toast.error("GitHub access token not found. Please try signing in with GitHub again.");
      return;
    }

    setPublishing(true);
    const toastId = toast.loading("Publishing to GitHub...");

    try {
      const response = await fetch("http://localhost:5000/api/github/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          githubToken,
          projectName: project?.name || "WebCraft Project",
          files,
          description: project?.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to publish to GitHub");
      }

      toast.success("Successfully published to GitHub!", {
        id: toastId,
        description: `Project available at ${data.repoName}`,
        action: {
          label: "View Repo",
          onClick: () => window.open(data.url, "_blank")
        }
      });
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to publish", { id: toastId });
    } finally {
      setPublishing(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const message = input;
    setInput("");

    const result = await sendMessage(message);

    // If the AI response contains modification instructions, regenerate
    if (result?.content?.toLowerCase().includes('modify') || 
        result?.content?.toLowerCase().includes('change') ||
        result?.content?.toLowerCase().includes('update')) {
      await handleRegenerate(result.content);
    }

    if (result?.blueprint) {
      setProject(result.blueprint);
    }
  };

  if (loadingWorkspace || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl shrink-0">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Dashboard
              </Link>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded gradient-primary">
                  <Zap className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="font-medium text-sm">
                  {project.name}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  Generated
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FixWorkspace workspaceId={workspaceId!} onFixed={() => {}} />
              <Button variant="outline" size="sm" onClick={handleGithubPublish}>
                <Github className="h-4 w-4" />
                Publish
              </Button>
              <Button variant="hero" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel — Chat */}
        <div className="w-80 border-r border-border bg-muted/30 flex flex-col shrink-0">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-medium text-sm">AI Assistant</h2>
          </div>

          <ScrollArea className="flex-1 p-4 space-y-4">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m) => (
                <div key={m.id} className="flex gap-3">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full ${m.role === "user"
                      ? "bg-primary/10 text-primary"
                      : "bg-accent/10 text-accent"
                      }`}
                  >
                    {m.role === "user" ? (
                      <User className="h-3.5 w-3.5" />
                    ) : (
                      <Bot className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {m.content}
                  </p>
                </div>
              ))}

              {aiLoading && (
                <div className="text-sm text-muted-foreground italic">
                  AI is thinking...
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t border-border flex gap-2">
            <input
              className="flex-1 rounded-md bg-background border border-border px-3 text-sm"
              placeholder="Ask AI to modify your project..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button size="icon" onClick={handleSend} disabled={aiLoading}>
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel — Tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <Tabs defaultValue="preview" className="flex-1 flex flex-col">
            <div className="border-b border-border px-4 py-2 bg-background">
              <TabsList className="h-9 bg-muted/50">
                <TabsTrigger value="preview">
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  Live Preview
                </TabsTrigger>
                <TabsTrigger value="code">
                  <FileCode className="h-3.5 w-3.5 mr-1" />
                  Code Editor
                </TabsTrigger>
                <TabsTrigger value="blueprint">
                  <Braces className="h-3.5 w-3.5 mr-1" />
                  Blueprint
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="preview" className="flex-1 p-0 m-0">
              <LivePreview 
                workspaceId={workspaceId!} 
                files={files} 
                project={project} 
              />
            </TabsContent>

            <TabsContent value="code" className="flex-1 p-0 m-0">
              <CodeEditor 
                files={files}
                activeFile={activeFile}
                onFileChange={handleFileChange}
                onActiveFileChange={setActiveFile}
              />
            </TabsContent>

            <TabsContent value="blueprint" className="flex-1 p-4">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
                  <p className="text-muted-foreground">{project.description}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Pages</h4>
                    <p className="text-2xl font-bold">{Array.isArray(project.pages) ? project.pages.length : 0}</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Components</h4>
                    <p className="text-2xl font-bold">
                      {Array.isArray(project.pages) ? project.pages.flatMap(p => p.components || []).length : 0}
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Files</h4>
                    <p className="text-2xl font-bold">{Object.keys(files).length}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Pages Structure</h4>
                  <div className="space-y-2">
                    {Array.isArray(project.pages) ? project.pages.map((page) => (
                      <div key={page.name} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{page.name}</span>
                          <span className="text-sm text-muted-foreground">{page.path}</span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {Array.isArray(page.components) ? page.components.map((comp) => (
                            <span
                              key={comp.name}
                              className="px-2 py-1 bg-muted text-xs rounded"
                            >
                              {comp.name}
                            </span>
                          )) : null}
                        </div>
                      </div>
                    )) : <p className="text-muted-foreground">No pages available</p>}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Dependencies</h4>
                  <div className="flex flex-wrap gap-2">
                    {project.dependencies?.map((dep) => (
                      <span
                        key={dep}
                        className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                      >
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Raw Blueprint</h4>
                  <pre className="text-xs text-muted-foreground bg-muted p-4 rounded-lg overflow-auto max-h-96">
                    {JSON.stringify(project, null, 2)}
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Workspace;
