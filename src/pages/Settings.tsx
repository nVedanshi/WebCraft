import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Github, Database, CheckCircle2, XCircle, Loader2, ExternalLink, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface IntegrationStatus {
  connected: boolean;
  loading: boolean;
}

const SettingsPage = () => {
  const { user, session, signInWithProvider } = useAuth();
  const [supabase, setSupabase] = useState<IntegrationStatus>({ connected: false, loading: false });
  const [githubLoading, setGithubLoading] = useState(false);
  
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseKey, setSupabaseKey] = useState("");

  const isGithubConnected = user?.app_metadata?.provider === 'github' || session?.provider_token != null;

  const handleGithubConnect = async () => {
    setGithubLoading(true);
    const { error } = await signInWithProvider("github");
    setGithubLoading(false);
    
    if (error) {
      toast.error("Failed to connect GitHub: " + error.message);
    }
  };

  const handleSupabaseValidate = async () => {
    if (!supabaseUrl.trim() || !supabaseKey.trim()) {
      toast.error("Missing fields", {
        description: "Please enter both Supabase URL and anon key.",
      });
      return;
    }

    setSupabase({ ...supabase, loading: true });
    
    // Simulate validation
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Mock validation - in production, actually test the connection
    const isValid = supabaseUrl.includes("supabase.co") && supabaseKey.length > 20;
    
    if (isValid) {
      setSupabase({ connected: true, loading: false });
      toast.success("Connection validated", {
        description: "Supabase credentials appear valid. Ready for schema provisioning.",
      });
    } else {
      setSupabase({ connected: false, loading: false });
      toast.error("Validation failed", {
        description: "Please check your Supabase URL and anon key.",
      });
    }
  };

  const handleProvisionSchema = () => {
    if (!supabase.connected) {
      toast.error("Not connected", {
        description: "Please validate your Supabase connection first.",
      });
      return;
    }
    
    toast.info("Schema provisioning", {
      description: "This is a placeholder. In production, this would preview and apply database schema.",
    });
  };

  return (
    <Layout>
      <section className="relative min-h-[calc(100vh-4rem)] py-16">
        {/* Background */}
        <div className="absolute inset-0 grid-pattern opacity-20" />

        <div className="container relative px-6">
          <div className="mx-auto max-w-3xl">
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-3xl font-bold tracking-tight mb-2">Settings & Integrations</h1>
              <p className="text-muted-foreground">
                Connect external services to enable code export and database provisioning.
              </p>
            </div>

            <div className="space-y-8">
              {/* GitHub Integration */}
              <div className="card-elevated p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Github className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold">GitHub Integration</h2>
                      {isGithubConnected ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-red-500">
                          <XCircle className="h-3 w-3" />
                          Not connected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Connect your GitHub account to publish generated projects directly to a repository.
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant={isGithubConnected ? "outline" : "hero"}
                        className={!isGithubConnected ? "bg-[#00ACFF] hover:bg-[#0096E0] text-white border-none" : ""}
                        onClick={handleGithubConnect}
                        disabled={githubLoading}
                      >
                        {githubLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isGithubConnected ? "Reconnect" : "Connect GitHub"}
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>

                    <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        OAuth tokens are not stored on our servers. Authentication is handled securely via GitHub's OAuth flow.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supabase Integration */}
              <div className="card-elevated p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <Database className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-lg font-semibold">Supabase Integration</h2>
                      {supabase.connected ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success">
                          <CheckCircle2 className="h-3 w-3" />
                          Validated
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <XCircle className="h-3 w-3" />
                          Not configured
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Provide your Supabase project credentials to enable database schema provisioning.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="supabase-url" className="text-sm font-medium">
                          Supabase URL
                        </label>
                        <Input
                          id="supabase-url"
                          type="url"
                          placeholder="https://your-project.supabase.co"
                          value={supabaseUrl}
                          onChange={(e) => setSupabaseUrl(e.target.value)}
                          className="font-mono text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label htmlFor="supabase-key" className="text-sm font-medium">
                          Anon Key (Public)
                        </label>
                        <Input
                          id="supabase-key"
                          type="password"
                          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                          value={supabaseKey}
                          onChange={(e) => setSupabaseKey(e.target.value)}
                          className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                          This is your public anon key. Never share your service role key.
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-3 pt-2">
                        <Button
                          variant="default"
                          onClick={handleSupabaseValidate}
                          disabled={supabase.loading}
                        >
                          {supabase.loading && <Loader2 className="h-4 w-4 animate-spin" />}
                          Validate Connection
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleProvisionSchema}
                          disabled={!supabase.connected}
                        >
                          Provision Schema (Preview Only)
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                      <Shield className="h-3 w-3 mt-0.5 shrink-0" />
                      <span>
                        Credentials are used only for validation and are not persisted. For production, use environment variables.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Environment Variables Notice */}
              <div className="card-elevated p-6 border-dashed">
                <h3 className="font-semibold mb-2">Environment Variables</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  For production deployments, configure these environment variables in your hosting platform:
                </p>
                <div className="code-block p-4 font-mono text-xs">
                  <code className="text-muted-foreground">
                    {`# .env.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret`}
                  </code>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  <strong>Note:</strong> Never commit secrets to version control. This file serves as a reference.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default SettingsPage;
