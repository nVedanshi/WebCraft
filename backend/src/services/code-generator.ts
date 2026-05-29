import { GeneratedComponent, GeneratedPage, GeneratedProject } from "./enhanced-ai";
import VirtualSmartComponents from "./virtual-smart-components";

// Component code templates
const COMPONENT_TEMPLATES = {
  shadcn: {
    button: (props: any, children: string = '') => `
import { Button } from "@/components/ui/button";

export default function ButtonComponent() {
  return (
    <Button ${generateProps(props)}>
      ${children || 'Click me'}
    </Button>
  );
}`,
    
    card: (props: any, children: string = '') => `
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function CardComponent() {
  return (
    <Card ${generateProps(props)}>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card Description</CardDescription>
      </CardHeader>
      <CardContent>
        ${children || 'Card content goes here'}
      </CardContent>
      <CardFooter>
        <Button>Action</Button>
      </CardFooter>
    </Card>
  );
}`,

    input: (props: any) => `
import { Input } from "@/components/ui/input";

export default function InputComponent() {
  return (
    <Input ${generateProps(props)} placeholder="Enter text..." />
  );
}`,

    form: (props: any, children: string = '') => `
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";

export default function FormComponent() {
  const form = useForm();

  function onSubmit(values: any) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        ${children || ''}
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}`,

    table: (props: any) => `
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function TableComponent() {
  return (
    <Table ${generateProps(props)}>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>Sample Data</TableCell>
          <TableCell>Active</TableCell>
          <TableCell>
            <Button variant="outline" size="sm">Edit</Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}`,

    navigation: (props: any) => `
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";

export default function NavigationComponent() {
  return (
    <NavigationMenu ${generateProps(props)}>
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Home</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/">Home</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger>Products</NavigationMenuTrigger>
          <NavigationMenuContent>
            <NavigationMenuLink href="/products">Products</NavigationMenuLink>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="/about">About</NavigationMenuLink>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuLink href="/contact">Contact</NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}`,

    navbar: (props: any) => `
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";

export default function NavbarComponent() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="font-bold text-xl">Logo</div>
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink href="/" className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary">
                    Home
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink href="/products" className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary">
                    Products
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink href="/about" className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary">
                    About
                  </NavigationMenuLink>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuLink href="/contact" className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary">
                    Contact
                  </NavigationMenuLink>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost">Sign In</Button>
            <Button>Get Started</Button>
          </div>
        </div>
      </div>
    </nav>
  );
}`,

    header: (props: any) => `
export default function HeaderComponent() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="font-bold text-xl">Header</div>
          <nav className="flex items-center space-x-4">
            <a href="/" className="text-sm font-medium transition-colors hover:text-primary">Home</a>
            <a href="/about" className="text-sm font-medium transition-colors hover:text-primary">About</a>
            <a href="/contact" className="text-sm font-medium transition-colors hover:text-primary">Contact</a>
          </nav>
        </div>
      </div>
    </header>
  );
}`,

    dialog: (props: any, children: string = '') => `
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function DialogComponent() {
  return (
    <Dialog ${generateProps(props)}>
      <DialogTrigger asChild>
        <Button>Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>
            Dialog description goes here
          </DialogDescription>
        </DialogHeader>
        ${children || ''}
      </DialogContent>
    </Dialog>
  );
}`
  },

  tailwindui: {
    hero: (props: any) => `
export default function HeroSection() {
  return (
    <div className="relative bg-gray-900">
      <div className="max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Welcome to Your App
          </h1>
          <p className="mt-6 text-xl text-gray-300 max-w-3xl mx-auto">
            Build amazing applications with AI-powered components
          </p>
          <div className="mt-10 flex justify-center">
            <div className="rounded-md shadow">
              <Button size="lg">Get Started</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}`,

    features: (props: any) => `
export default function FeaturesGrid() {
  const features = [
    {
      name: "AI-Powered",
      description: "Intelligent code generation using advanced AI",
      icon: "🤖"
    },
    {
      name: "Modern UI",
      description: "Beautiful components with Tailwind CSS",
      icon: "🎨"
    },
    {
      name: "TypeScript",
      description: "Type-safe development with full TypeScript support",
      icon: "📘"
    }
  ];

  return (
    <div className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900">Features</h2>
          <p className="mt-4 text-xl text-gray-600">
            Everything you need to build amazing applications
          </p>
        </div>
        <div className="mt-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.name} className="pt-6">
                <div className="flow-root rounded-lg bg-gray-50 px-6 pb-8">
                  <div className="-mt-6">
                    <div>
                      <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                        <span className="text-2xl">{feature.icon}</span>
                      </span>
                    </div>
                    <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                      {feature.name}
                    </h3>
                    <p className="mt-5 text-base text-gray-500">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}`
  }
};

function generateProps(props: Record<string, any>): string {
  return Object.entries(props)
    .map(([key, value]) => {
      if (typeof value === 'string') {
        return `${key}="${value}"`;
      } else if (typeof value === 'boolean' && value) {
        return key;
      } else if (typeof value === 'object') {
        return `${key}={${JSON.stringify(value)}}`;
      }
      return `${key}={${value}}`;
    })
    .join(' ');
}

// Shared instance so component tracking works across calls
const smartComponentsInstance = new VirtualSmartComponents();

function generateComponentCode(component: GeneratedComponent): string {
  // Reset on each project generation to avoid stale state
  const result = smartComponentsInstance.getOrCreateComponent(component.type, component.name);
  
  // Return the component code
  return result.code;
}

export function generatePageCode(page: GeneratedPage): { page: string; components: string } {
  const componentsCode = page.components?.map(comp => generateComponentCode(comp)).join('\n\n') || '';
  
  const pageCode = `
import React from 'react';
${page.components?.map(comp => `import ${comp.name} from '../components/${comp.name}';`).join('\n') || ''}

export default function ${page.name}() {
  return (
    <div className="page-${page.name.toLowerCase()}">
      <div className="container mx-auto py-8">
        ${page.components?.map(comp => `<${comp.name} />`).join('\n        ') || ''}
      </div>
    </div>
  );
}`;

  return {
    page: pageCode,
    components: componentsCode
  };
}

export function generateProjectFiles(project: GeneratedProject): Record<string, string> {
  const files: Record<string, string> = {};

  // Reset component tracking for new project
  smartComponentsInstance.reset();
  // Generate package.json
  files['package.json'] = JSON.stringify({
    name: project.name.toLowerCase().replace(/\s+/g, '-'),
    version: "0.1.0",
    private: true,
    dependencies: {
      "react": "^18.2.0",
      "react-dom": "^18.2.0",
      "react-router-dom": "^6.8.0",
      "react-hook-form": "^7.43.0",
      "@radix-ui/react-slot": "^1.0.2",
      "class-variance-authority": "^0.7.0",
      "clsx": "^1.2.1",
      "tailwind-merge": "^1.10.0",
      "lucide-react": "^0.263.1",
      ...project.dependencies.reduce((acc, dep) => ({ ...acc, [dep]: "latest" }), {})
    },
    devDependencies: {
      "@types/react": "^18.0.27",
      "@types/react-dom": "^18.0.10",
      "@vitejs/plugin-react": "^3.1.0",
      "autoprefixer": "^10.4.13",
      "postcss": "^8.4.21",
      "tailwindcss": "^3.2.7",
      "typescript": "^4.9.4",
      "vite": "^4.1.0"
    },
    scripts: {
      "dev": "vite",
      "build": "tsc && vite build",
      "preview": "vite preview"
    }
  }, null, 2);

  // Generate main.tsx
  files['src/main.tsx'] = `
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)`;

  // Generate App.tsx
  files['src/App.tsx'] = `
import React from 'react';
import { Routes, Route } from 'react-router-dom';
${project.pages?.map(page => `import ${page.name} from './pages/${page.name}';`).join('\n') || ''}

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        ${project.pages?.map(page => `<Route path="${page.path}" element={<${page.name} />} />`).join('\n        ') || ''}
      </Routes>
    </div>
  );
}`;

  // Generate pages and components
  if (project.pages) {
    project.pages.forEach(page => {
    const { page: pageCode, components: componentsCode } = generatePageCode(page);
    
    files[`src/pages/${page.name}.tsx`] = pageCode;
    
    // Generate individual component files
    page.components.forEach(component => {
      files[`src/components/${component.name}.tsx`] = generateComponentCode(component);
    });
  });
  }

  // Generate CSS files
  files['src/index.css'] = `
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }
}

@layer components {
  .container {
    @apply max-w-7xl mx-auto px-4 sm:px-6 lg:px-8;
  }
}`;

  // Generate Tailwind config
  files['tailwind.config.js'] = `
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

  return files;
}
