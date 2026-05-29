import { GeneratedComponent, GeneratedPage, GeneratedProject } from "./enhanced-ai";
import SmartComponentSystem from "./smart-component-system";
import { v4 as uuidv4 } from 'uuid';

interface GeneratedFiles {
  [filename: string]: string;
}

interface SmartGenerationResult {
  files: GeneratedFiles;
  dependencies: string[];
  actions: Array<{
    component: string;
    action: 'reused' | 'installed' | 'created';
    message: string;
  }>;
}

export class SmartCodeGenerator {
  private smartSystem: SmartComponentSystem;
  private projectPath: string;

  constructor(projectPath: string = './generated-project') {
    this.smartSystem = new SmartComponentSystem(projectPath);
    this.projectPath = projectPath;
  }

  async generateProjectFiles(project: GeneratedProject): Promise<SmartGenerationResult> {
    const files: GeneratedFiles = {};
    const allDependencies = new Set<string>();
    const actions: SmartGenerationResult['actions'] = [];

    // Generate package.json
    files['package.json'] = this.generatePackageJson(project);

    // Generate main files
    files['src/main.tsx'] = this.generateMainTsX();
    files['src/App.tsx'] = this.generateAppTsX(project);
    files['index.html'] = this.generateIndexHtml(project.name);

    // Generate pages and components using smart system
    for (const page of project.pages) {
      const pageResult = await this.generatePage(page);
      
      // Merge page files
      Object.assign(files, pageResult.files);
      
      // Collect dependencies
      pageResult.dependencies.forEach(dep => allDependencies.add(dep));
      
      // Collect actions
      actions.push(...pageResult.actions);
    }

    // Update package.json with collected dependencies
    const packageJson = JSON.parse(files['package.json']);
    allDependencies.forEach(dep => {
      if (!packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = 'latest';
      }
    });
    files['package.json'] = JSON.stringify(packageJson, null, 2);

    return {
      files,
      dependencies: Array.from(allDependencies),
      actions
    };
  }

  private async generatePage(page: GeneratedPage): Promise<{
    files: GeneratedFiles;
    dependencies: string[];
    actions: SmartGenerationResult['actions'];
  }> {
    const files: GeneratedFiles = {};
    const dependencies: string[] = [];
    const actions: SmartGenerationResult['actions'] = [];

    // Generate components for this page
    const componentImports: string[] = [];
    const componentTags: string[] = [];

    for (const component of page.components) {
      try {
        // Use smart component system
        const result = await this.smartSystem.handleComponent(component.type, component.props);
        
        // Add import statement
        if (result.action === 'reused' || result.action === 'installed') {
          componentImports.push(result.component);
          componentTags.push(`<${component.name} />`);
        } else if (result.action === 'created') {
          // Create custom component file
          files[`src/components/${component.name}.tsx`] = result.component;
          componentImports.push(`import ${component.name} from '../components/${component.name}';`);
          componentTags.push(`<${component.name} />`);
        }

        // Collect dependencies
        if (result.dependencies) {
          dependencies.push(...result.dependencies);
        }

        // Record action
        actions.push({
          component: component.name,
          action: result.action,
          message: result.message
        });

      } catch (error) {
        console.error(`Failed to handle component ${component.name}:`, error);
        // Fallback to basic component
        files[`src/components/${component.name}.tsx`] = this.createFallbackComponent(component);
        componentImports.push(`import ${component.name} from '../components/${component.name}';`);
        componentTags.push(`<${component.name} />`);
        
        actions.push({
          component: component.name,
          action: 'created',
          message: `Created fallback component: ${component.name}`
        });
      }
    }

    // Generate page file
    files[`src/pages/${page.name}.tsx`] = `
import React from 'react';
${componentImports.join('\n')}

export default function ${page.name}() {
  return (
    <div className="page-${page.name.toLowerCase()} min-h-screen">
      <div className="container mx-auto py-8">
        ${componentTags.join('\n        ')}
      </div>
    </div>
  );
}`;

    return { files, dependencies, actions };
  }

  private generatePackageJson(project: GeneratedProject): string {
    const baseDependencies = {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.8.0",
      "typescript": "^5.0.0",
      "@types/react": "^18.0.0",
      "@types/react-dom": "^18.0.0",
      "@vitejs/plugin-react": "^4.0.0",
      "vite": "^4.4.0",
      "tailwindcss": "^3.3.0",
      "autoprefixer": "^10.4.0",
      "postcss": "^8.4.0",
      "class-variance-authority": "^0.7.0",
      "clsx": "^2.0.0",
      "tailwind-merge": "^1.14.0",
      "lucide-react": "^0.263.0"
    };

    // Add project-specific dependencies
    const projectDependencies = project.dependencies || [];
    projectDependencies.forEach(dep => {
      (baseDependencies as any)[dep] = 'latest';
    });

    return JSON.stringify({
      name: project.name.toLowerCase().replace(/\s+/g, '-'),
      version: "0.1.0",
      private: true,
      type: "module",
      scripts: {
        dev: "vite",
        build: "tsc && vite build",
        lint: "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
        preview: "vite preview"
      },
      dependencies: baseDependencies,
      devDependencies: {
        "@types/node": "^20.0.0",
        "@typescript-eslint/eslint-plugin": "^6.0.0",
        "@typescript-eslint/parser": "^6.0.0",
        "eslint": "^8.45.0",
        "eslint-plugin-react-hooks": "^4.6.0",
        "eslint-plugin-react-refresh": "^0.4.0"
      }
    }, null, 2);
  }

  private generateMainTsX(): string {
    return `
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);`;
  }

  private generateAppTsX(project: GeneratedProject): string {
    const pageImports = project.pages?.map(page => 
      `import ${page.name} from './pages/${page.name}';`
    ).join('\n') || '';

    const routes = project.pages?.map(page => 
      `        <Route path="${page.path}" element={<${page.name} />} />`
    ).join('\n') || '';

    return `
import React from 'react';
import { Routes, Route } from 'react-router-dom';
${pageImports}

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
${routes}
      </Routes>
    </div>
  );
};`;
  }

  private generateIndexHtml(projectName: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${projectName}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }

  private createFallbackComponent(component: GeneratedComponent): string {
    return `
import React from 'react';

export default function ${component.name}() {
  return (
    <div className="component-${component.type} p-4 border rounded-lg bg-card">
      <h3 className="font-semibold text-lg mb-2">${component.name}</h3>
      <p className="text-muted-foreground">
        This is a ${component.type} component. You can customize this component to fit your needs.
      </p>
    </div>
  );
}`;
  }

  // Helper method to create a complete project with all files
  async createCompleteProject(project: GeneratedProject): Promise<{
    files: GeneratedFiles;
    summary: {
      totalComponents: number;
      reusedComponents: number;
      installedComponents: number;
      createdComponents: number;
      totalDependencies: number;
    };
  }> {
    const result = await this.generateProjectFiles(project);
    
    // Add configuration files
    result.files['tailwind.config.js'] = `
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`;
    
    result.files['postcss.config.js'] = `
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`;
    
    result.files['tsconfig.json'] = JSON.stringify({
      compilerOptions: {
        target: "ES2020",
        useDefineForClassFields: true,
        lib: ["ES2020", "DOM", "DOM.Iterable"],
        module: "ESNext",
        skipLibCheck: true,
        moduleResolution: "bundler",
        allowImportingTsExtensions: true,
        resolveJsonModule: true,
        isolatedModules: true,
        noEmit: true,
        jsx: "react-jsx",
        strict: true,
        noUnusedLocals: true,
        noUnusedParameters: true,
        noFallthroughCasesInSwitch: true
      },
      include: ["src"],
      references: [{ path: "./tsconfig.node.json" }]
    }, null, 2);
    
    result.files['tsconfig.node.json'] = JSON.stringify({
      compilerOptions: {
        composite: true,
        skipLibCheck: true,
        module: "ESNext",
        moduleResolution: "bundler",
        allowSyntheticDefaultImports: true
      },
      include: ["vite.config.ts"]
    }, null, 2);
    
    result.files['vite.config.ts'] = `
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`;
    
    result.files['src/index.css'] = `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 221.2 83.2% 53.3%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 18.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 18.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 18.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 18.5%;
    --input: 217.2 32.6% 18.5%;
    --ring: 224.3 76.3% 48%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}`;

    // Calculate summary
    const summary = {
      totalComponents: result.actions.length,
      reusedComponents: result.actions.filter(a => a.action === 'reused').length,
      installedComponents: result.actions.filter(a => a.action === 'installed').length,
      createdComponents: result.actions.filter(a => a.action === 'created').length,
      totalDependencies: result.dependencies.length
    };

    return { files: result.files, summary };
  }
}

export default SmartCodeGenerator;
