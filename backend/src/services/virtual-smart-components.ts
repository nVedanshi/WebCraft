import { GeneratedComponent } from "./enhanced-ai";

// Virtual component templates - no actual installation needed
const VIRTUAL_COMPONENTS = {
  // Navigation components
  navbar: `
import React from 'react';

export default function NavbarComponent() {
  return (
    <nav className="border-b bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="font-bold text-xl text-white">Logo</div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">Home</a>
              <a href="/about" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">About</a>
              <a href="/services" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">Services</a>
              <a href="/contact" className="text-sm font-medium text-gray-300 transition-colors hover:text-white">Contact</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button className="px-4 py-2 text-sm font-medium text-gray-300 bg-transparent border border-gray-600 rounded-md hover:bg-gray-800 hover:text-white transition-colors">
              Sign In
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
              Get Started
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}`,

  navigation: `
import React from 'react';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger } from "@/components/ui/navigation-menu";

export default function NavigationComponent() {
  return (
    <NavigationMenu>
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

  // Form components
  button: `
import React from 'react';

export default function ButtonComponent() {
  return (
    <button className="px-6 py-3 text-base font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900">
      Click Me
    </button>
  );
}`,

  input: `
import React from 'react';

export default function InputComponent() {
  return (
    <input 
      type="text" 
      placeholder="Enter text here..."
      className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
    />
  );
}`,

  form: `
import React from 'react';

export default function FormComponent() {
  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-gray-200">Email</label>
        <input 
          id="email" 
          type="email" 
          placeholder="Enter your email"
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-gray-200">Password</label>
        <input 
          id="password" 
          type="password" 
          placeholder="Enter your password"
          className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-md text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <button 
        type="submit" 
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
      >
        Submit
      </button>
    </form>
  );
}`,

  // Layout components
  header: `
import React from 'react';

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

  footer: `
import React from 'react';

export default function FooterComponent() {
  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              <li><a href="/about" className="text-sm text-muted-foreground hover:text-primary">About Us</a></li>
              <li><a href="/careers" className="text-sm text-muted-foreground hover:text-primary">Careers</a></li>
              <li><a href="/press" className="text-sm text-muted-foreground hover:text-primary">Press</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-4">Product</h3>
            <ul className="space-y-2">
              <li><a href="/features" className="text-sm text-muted-foreground hover:text-primary">Features</a></li>
              <li><a href="/pricing" className="text-sm text-muted-foreground hover:text-primary">Pricing</a></li>
              <li><a href="/docs" className="text-sm text-muted-foreground hover:text-primary">Documentation</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-4">Resources</h3>
            <ul className="space-y-2">
              <li><a href="/blog" className="text-sm text-muted-foreground hover:text-primary">Blog</a></li>
              <li><a href="/tutorials" className="text-sm text-muted-foreground hover:text-primary">Tutorials</a></li>
              <li><a href="/support" className="text-sm text-muted-foreground hover:text-primary">Support</a></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="/privacy" className="text-sm text-muted-foreground hover:text-primary">Privacy Policy</a></li>
              <li><a href="/terms" className="text-sm text-muted-foreground hover:text-primary">Terms of Service</a></li>
              <li><a href="/cookies" className="text-sm text-muted-foreground hover:text-primary">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; 2024 Your Company. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}`,

  // Hero section
  hero: `
import React from 'react';
import { Button } from "@/components/ui/button";

export default function HeroComponent() {
  return (
    <section className="relative bg-gradient-to-br from-primary/10 to-secondary/10 py-24 lg:py-32">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            Welcome to Your <span className="text-primary">Amazing App</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Build beautiful, functional applications with modern React and TypeScript. 
            Experience the power of intelligent component generation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              Get Started
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8">
              View Demo
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}`,

  // Card component
  card: `
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CardComponent() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>
          This is a card description that provides additional context.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This is the main content area of the card where you can put any information you want.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Learn More</Button>
            <Button size="sm">Get Started</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}`,

  // Table component
  table: `
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export default function TableComponent() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell>John Doe</TableCell>
          <TableCell>john@example.com</TableCell>
          <TableCell>
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800">
              Active
            </span>
          </TableCell>
          <TableCell>
            <Button variant="outline" size="sm">Edit</Button>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Jane Smith</TableCell>
          <TableCell>jane@example.com</TableCell>
          <TableCell>
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
              Pending
            </span>
          </TableCell>
          <TableCell>
            <Button variant="outline" size="sm">Edit</Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}`
};

// Component type mapping
const COMPONENT_MAPPING: Record<string, string> = {
  'navbar': 'navbar',
  'navigation': 'navigation',
  'nav': 'navbar',
  'header': 'header',
  'footer': 'footer',
  'button': 'button',
  'btn': 'button',
  'input': 'input',
  'form': 'form',
  'card': 'card',
  'table': 'table',
  'hero': 'hero',
  'hero-section': 'hero'
};

export class VirtualSmartComponents {
  private existingComponents = new Set<string>();

  // Check if component exists (in our virtual environment)
  componentExists(componentType: string): boolean {
    return this.existingComponents.has(componentType);
  }

  // Mark component as existing
  markComponentExists(componentType: string): void {
    this.existingComponents.add(componentType);
  }

  // Get or create component — always returns full component code
  getOrCreateComponent(componentType: string, componentName: string): {
    code: string;
    action: 'reused' | 'created';
    message: string;
  } {
    const mappedType = COMPONENT_MAPPING[componentType.toLowerCase()] || componentType.toLowerCase();
    const wasExisting = this.componentExists(mappedType);
    
    // Get virtual component template
    const template = VIRTUAL_COMPONENTS[mappedType as keyof typeof VIRTUAL_COMPONENTS];
    
    if (template) {
      // Mark component as existing for future use
      this.markComponentExists(mappedType);
      
      return {
        code: template,
        action: wasExisting ? 'reused' : 'created',
        message: wasExisting 
          ? `Reused existing component: ${componentName} (${mappedType})`
          : `Created virtual component: ${componentName} (${mappedType})`
      };
    }

    // Fallback to generic component
    const fallbackCode = this.createGenericComponent(componentName, componentType);
    this.markComponentExists(mappedType);
    
    return {
      code: fallbackCode,
      action: 'created',
      message: `Created generic component: ${componentName}`
    };
  }

  private createGenericComponent(name: string, type: string): string {
    return `
import React from 'react';

export default function ${name}() {
  return (
    <div className="component-${type} p-4 border rounded-lg bg-card">
      <h3 className="font-semibold text-lg mb-2">${name}</h3>
      <p className="text-muted-foreground">
        This is a ${type} component. You can customize this component to fit your needs.
      </p>
    </div>
  );
}`;
  }

  // Get required dependencies for a component
  getComponentDependencies(componentType: string): string[] {
    const dependencies: Record<string, string[]> = {
      'navbar': ['@radix-ui/react-navigation-menu'],
      'navigation': ['@radix-ui/react-navigation-menu'],
      'form': ['react-hook-form', '@hookform/resolvers', 'zod'],
      'table': ['@tanstack/react-table']
    };
    
    const mappedType = COMPONENT_MAPPING[componentType.toLowerCase()] || componentType.toLowerCase();
    return dependencies[mappedType] || [];
  }

  // Reset component tracking (for new projects)
  reset(): void {
    this.existingComponents.clear();
  }
}

export default VirtualSmartComponents;
