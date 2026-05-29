import { motion } from "framer-motion";

/**
 * ⚠️ TEMPORARY / LEGACY
 * This component will be replaced by the dynamic Preview Renderer (Sprint 4).
 * Do NOT extend or build new logic here.
 */

interface Blueprint {
  name: string;
  pages: string[];
  components: string[];
  features: string[];
  databaseModels: Array<{ name: string; fields: string[] }>;
}

interface AppPreviewProps {
  blueprint: Blueprint;
}

export function AppPreview({ blueprint }: AppPreviewProps) {
  const { name, pages, databaseModels } = blueprint;

  const safePages = pages?.length ? pages : ["Dashboard"];
  const dataModels = databaseModels || [];
  const hasAuth = blueprint.features?.some((f) =>
    f.toLowerCase().includes("auth")
  );

  return (
    <div className="space-y-6">
      {/* Preview Notice */}
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-sm text-primary">
          <strong>Preview Environment:</strong> This is a visual mockup of the generated app structure.
        </p>
      </div>

      {/* App Shell */}
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        {/* App Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/50" />
              <div className="w-3 h-3 rounded-full bg-warning/50" />
              <div className="w-3 h-3 rounded-full bg-success/50" />
            </div>
            <span className="text-sm font-medium">{name}</span>
          </div>
          {hasAuth && (
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-primary/20" />
              <span className="text-xs text-muted-foreground">User</span>
            </div>
          )}
        </div>

        {/* App Body */}
        <div className="flex min-h-[400px]">
          {/* Sidebar */}
          <div className="w-48 border-r border-border bg-muted/20 p-4">
            <nav className="space-y-1">
              {safePages.map((page, index) => (
                <motion.div
                  key={page}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`px-3 py-2 rounded-md text-sm ${
                    index === 0
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {page}
                </motion.div>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 p-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-lg font-semibold mb-4">
                {safePages[0] || "Dashboard"}
              </h2>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {["Total Items", "Active", "Completed"].map((stat, i) => (
                  <motion.div
                    key={stat}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="p-4 rounded-lg border border-border bg-muted/20"
                  >
                    <p className="text-xs text-muted-foreground mb-1">{stat}</p>
                    <p className="text-2xl font-bold text-foreground">
                      {Math.floor(Math.random() * 100)}
                    </p>
                  </motion.div>
                ))}
              </div>

              {/* Data Table Preview */}
              {dataModels.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="px-4 py-2 bg-muted/30 border-b border-border">
                    <p className="text-sm font-medium">{dataModels[0].name}</p>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-4 text-xs text-muted-foreground mb-2">
                      {dataModels[0].fields.slice(0, 4).map((field) => (
                        <span key={field} className="font-medium uppercase">
                          {field}
                        </span>
                      ))}
                    </div>
                    {[1, 2, 3].map((row) => (
                      <div
                        key={row}
                        className="grid grid-cols-4 gap-4 py-2 border-t border-border"
                      >
                        {dataModels[0].fields.slice(0, 4).map((field) => (
                          <div key={field} className="h-3 bg-muted rounded w-3/4" />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dataModels.length === 0 && (
                <div className="space-y-4">
                  <div className="h-9 w-32 gradient-primary rounded" />
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-border bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">
            Built with React + Tailwind • Dark theme
          </p>
        </div>
      </div>
    </div>
  );
}
