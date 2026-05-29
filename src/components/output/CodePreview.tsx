import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, ChevronDown, FileCode, Folder, FolderOpen, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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


interface CodePreviewProps {
  blueprint: Blueprint;
}

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  content?: string;
}

function generateFileTree(blueprint: Blueprint): FileNode[] {
  const { name, pages, features } = blueprint;
  const hasAuth = features?.some((f) =>
    f.toLowerCase().includes("auth")
  );

  const safePages = pages?.length ? pages : ["Dashboard"];

  return [
    {
      name: name.toLowerCase().replace(/\s+/g, "-"),
      type: "folder",
      children: [
        {
          name: "src",
          type: "folder",
          children: [
            {
              name: "pages",
              type: "folder",
              children: safePages.map((page): FileNode => ({
                name: `${page}.tsx`,
                type: "file",
                content: generatePageCode(page),
              })),
            },
            {
              name: "App.tsx",
              type: "file",
              content: generateAppCode(safePages, hasAuth),
            },
          ],
        },
        {
          name: "package.json",
          type: "file",
          content: generatePackageJson(name),
        },
      ],
    },
  ];
}


function generateLayoutCode(name: string) {
  return `import { ReactNode } from "react";
import { Header } from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header title="${name}" />
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}`;
}

function generateHeaderCode(hasAuth?: boolean) {
  return `export function Header({ title }: { title: string }) {
  return (
    <header className="border-b border-border bg-card">
      <div className="container mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="font-semibold text-lg">{title}</h1>
        ${hasAuth ? `<button className="text-sm text-muted-foreground hover:text-foreground">
          Sign Out
        </button>` : ""}
      </div>
    </header>
  );
}`;
}

function generateAuthGuardCode() {
  return `import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
}`;
}

function generatePageCode(page: string) {
  return `export default function ${page}Page() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">${page}</h2>
      <p className="text-muted-foreground">
        Welcome to the ${page} page.
      </p>
    </div>
  );
}`;
}

function generateAppCode(pages: string[], hasAuth?: boolean) {
  const routes = pages.map((p) => `        <Route path="/${p.toLowerCase()}" element={<${p}Page />} />`).join("\n");
  return `import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
${pages.map((p) => `import ${p}Page from "./pages/${p}";`).join("\n")}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
${routes}
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}`;
}

function generateMainCode() {
  return `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
}

function generatePackageJson(name: string) {
  return `{
  "name": "${name.toLowerCase().replace(/\s+/g, "-")}",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0"
  }
}`;
}

function generateTailwindConfig() {
  return `/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {},
  },
  plugins: [],
}`;
}

function FileTreeNode({ node, depth = 0 }: { node: FileNode; depth?: number }) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const [showContent, setShowContent] = useState(false);

  const isFolder = node.type === "folder";
  const Icon = isFolder ? (isOpen ? FolderOpen : Folder) : FileCode;

  return (
    <div>
      <button
        onClick={() => {
          if (isFolder) setIsOpen(!isOpen);
          else setShowContent(!showContent);
        }}
        className="flex items-center gap-1 w-full px-2 py-1 text-sm hover:bg-muted/50 rounded transition-colors text-left"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {isFolder && (
          <span className="text-muted-foreground">
            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </span>
        )}
        <Icon className={`h-4 w-4 ${isFolder ? "text-primary" : "text-muted-foreground"}`} />
        <span className={isFolder ? "font-medium" : ""}>{node.name}</span>
      </button>

      {/* File Content */}
      {showContent && node.content && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mx-2 my-1 rounded-lg border border-border overflow-hidden"
          style={{ marginLeft: `${depth * 16 + 24}px` }}
        >
          <div className="flex items-center justify-between px-3 py-1.5 bg-muted/30 border-b border-border">
            <span className="text-xs text-muted-foreground">{node.name}</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2"
              onClick={() => {
                navigator.clipboard.writeText(node.content || "");
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
          <pre className="p-3 text-xs overflow-x-auto bg-muted/10 max-h-64 overflow-y-auto">
            <code className="text-muted-foreground">{node.content}</code>
          </pre>
        </motion.div>
      )}

      {/* Children */}
      {isFolder && isOpen && node.children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {node.children.map((child, i) => (
            <FileTreeNode key={i} node={child} depth={depth + 1} />
          ))}
        </motion.div>
      )}
    </div>
  );
}

export function CodePreview({ blueprint }: CodePreviewProps) {
  const fileTree = generateFileTree(blueprint);

  return (
    <div className="space-y-4">
      {/* Notice */}
      <div className="p-3 rounded-lg bg-muted/30 border border-border">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Read-only preview:</strong> Click on files to view generated code.
          This is a sample structure—actual output may vary.
        </p>
      </div>

      {/* File Tree */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-muted/30">
          <p className="text-sm font-medium">Project Structure</p>
        </div>
        <div className="p-2 max-h-[500px] overflow-y-auto">
          {fileTree.map((node, i) => (
            <FileTreeNode key={i} node={node} />
          ))}
        </div>
      </div>
    </div>
  );
}
