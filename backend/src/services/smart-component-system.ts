import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export interface ComponentInfo {
  name: string;
  exists: boolean;
  installed: boolean;
  availableInShadcn: boolean;
  componentPath?: string;
  dependencies?: string[];
}

export interface SmartComponentResult {
  component: string;
  action: 'reused' | 'installed' | 'created';
  dependencies?: string[];
  message: string;
}

// List of available shadcn/ui components
const SHADCN_COMPONENTS = [
  'accordion', 'alert', 'alert-dialog', 'aspect-ratio', 'avatar', 'badge', 'button',
  'calendar', 'card', 'carousel', 'chart', 'checkbox', 'collapsible', 'combobox',
  'command', 'context-menu', 'data-table', 'date-picker', 'dialog', 'drawer',
  'dropdown-menu', 'form', 'hover-card', 'input', 'label', 'menubar', 'navigation-menu',
  'pagination', 'popover', 'progress', 'radio-group', 'resizable', 'scroll-area',
  'select', 'separator', 'sheet', 'skeleton', 'slider', 'sonner', 'switch', 'table',
  'tabs', 'textarea', 'toast', 'toggle', 'toggle-group', 'tooltip'
];

// Component type to shadcn component mapping
const COMPONENT_MAPPING: Record<string, string> = {
  'navbar': 'navigation-menu',
  'navigation': 'navigation-menu',
  'nav': 'navigation-menu',
  'header': 'navigation-menu',
  'footer': 'navigation-menu',
  'button': 'button',
  'btn': 'button',
  'input': 'input',
  'form': 'form',
  'card': 'card',
  'dialog': 'dialog',
  'modal': 'dialog',
  'dropdown': 'dropdown-menu',
  'select': 'select',
  'checkbox': 'checkbox',
  'radio': 'radio-group',
  'switch': 'switch',
  'tabs': 'tabs',
  'table': 'table',
  'badge': 'badge',
  'avatar': 'avatar',
  'alert': 'alert',
  'toast': 'toast',
  'tooltip': 'tooltip',
  'popover': 'popover',
  'accordion': 'accordion',
  'carousel': 'carousel',
  'pagination': 'pagination',
  'progress': 'progress',
  'slider': 'slider',
  'textarea': 'textarea',
  'label': 'label',
  'separator': 'separator',
  'skeleton': 'skeleton',
  'scroll-area': 'scroll-area',
  'sheet': 'sheet',
  'drawer': 'drawer',
  'date-picker': 'calendar',
  'calendar': 'calendar',
  'chart': 'chart',
  'data-table': 'table',
  'command': 'command',
  'context-menu': 'context-menu',
  'hover-card': 'hover-card',
  'menubar': 'menubar',
  'resizable': 'resizable',
  'toggle': 'toggle',
  'toggle-group': 'toggle-group',
  'sonner': 'sonner',
  'aspect-ratio': 'aspect-ratio'
};

class SmartComponentSystem {
  private projectPath: string;

  constructor(projectPath: string = './generated-project') {
    this.projectPath = projectPath;
  }

  async checkComponent(componentType: string): Promise<ComponentInfo> {
    const mappedComponent = COMPONENT_MAPPING[componentType.toLowerCase()] || componentType.toLowerCase();
    
    // Check if component exists in project
    const componentPath = path.join(this.projectPath, 'src/components', `${mappedComponent}.tsx`);
    const exists = await this.fileExists(componentPath);
    
    // Check if available in shadcn/ui
    const availableInShadcn = SHADCN_COMPONENTS.includes(mappedComponent);
    
    return {
      name: mappedComponent,
      exists,
      installed: exists,
      availableInShadcn,
      componentPath: exists ? componentPath : undefined,
      dependencies: this.getComponentDependencies(mappedComponent)
    };
  }

  async handleComponent(componentType: string, customProps: any = {}): Promise<SmartComponentResult> {
    const componentInfo = await this.checkComponent(componentType);
    
    // If component exists, reuse it
    if (componentInfo.exists) {
      return {
        component: await this.createImportStatement(componentInfo.name),
        action: 'reused',
        message: `Reused existing component: ${componentInfo.name}`
      };
    }

    // If available in shadcn/ui, install it
    if (componentInfo.availableInShadcn) {
      try {
        await this.installShadcnComponent(componentInfo.name);
        return {
          component: await this.createImportStatement(componentInfo.name),
          action: 'installed',
          dependencies: componentInfo.dependencies,
          message: `Installed shadcn/ui component: ${componentInfo.name}`
        };
      } catch (error) {
        console.warn(`Failed to install ${componentInfo.name}, creating custom component instead:`, error);
      }
    }

    // Create custom component
    const customComponent = await this.createCustomComponent(componentType, customProps);
    return {
      component: customComponent,
      action: 'created',
      message: `Created custom component: ${componentType}`
    };
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private getComponentDependencies(componentName: string): string[] {
    const dependencies: Record<string, string[]> = {
      'navigation-menu': ['@radix-ui/react-navigation-menu'],
      'dialog': ['@radix-ui/react-dialog'],
      'dropdown-menu': ['@radix-ui/react-dropdown-menu'],
      'popover': ['@radix-ui/react-popover'],
      'tooltip': ['@radix-ui/react-tooltip'],
      'select': ['@radix-ui/react-select'],
      'checkbox': ['@radix-ui/react-checkbox'],
      'radio-group': ['@radix-ui/react-radio-group'],
      'switch': ['@radix-ui/react-switch'],
      'tabs': ['@radix-ui/react-tabs'],
      'accordion': ['@radix-ui/react-accordion'],
      'carousel': ['embla-carousel-react'],
      'calendar': ['date-fns', 'react-day-picker'],
      'date-picker': ['date-fns', 'react-day-picker'],
      'chart': ['recharts'],
      'command': ['cmdk'],
      'form': ['react-hook-form', '@hookform/resolvers', 'zod'],
      'table': ['@tanstack/react-table'],
      'sonner': ['sonner']
    };
    
    return dependencies[componentName] || [];
  }

  private async installShadcnComponent(componentName: string): Promise<void> {
    try {
      // Install shadcn/ui component
      const { stdout, stderr } = await execAsync(`npx shadcn-ui@latest add ${componentName}`, {
        cwd: this.projectPath,
        timeout: 30000
      });
      
      if (stderr && !stderr.includes('warning')) {
        throw new Error(`Installation failed: ${stderr}`);
      }
      
      console.log(`Installed ${componentName}:`, stdout);
    } catch (error) {
      throw new Error(`Failed to install ${componentName}: ${error}`);
    }
  }

  private async createImportStatement(componentName: string): Promise<string> {
    return `import { ${componentName.charAt(0).toUpperCase() + componentName.slice(1)} } from "@/components/ui/${componentName}";`;
  }

  private async createCustomComponent(componentType: string, props: any): Promise<string> {
    const componentName = this.formatComponentName(componentType);
    
    switch (componentType.toLowerCase()) {
      case 'navbar':
      case 'navigation':
        return this.createNavbarComponent(componentName, props);
      case 'footer':
        return this.createFooterComponent(componentName, props);
      case 'hero':
        return this.createHeroComponent(componentName, props);
      case 'sidebar':
        return this.createSidebarComponent(componentName, props);
      default:
        return this.createGenericComponent(componentName, componentType, props);
    }
  }

  private createNavbarComponent(name: string, props: any): string {
    return `
import React from 'react';
import { Button } from "@/components/ui/button";

export default function ${name}() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="font-bold text-xl">Logo</div>
            <nav className="hidden md:flex items-center space-x-6">
              <a href="/" className="text-sm font-medium transition-colors hover:text-primary">Home</a>
              <a href="/about" className="text-sm font-medium transition-colors hover:text-primary">About</a>
              <a href="/services" className="text-sm font-medium transition-colors hover:text-primary">Services</a>
              <a href="/contact" className="text-sm font-medium transition-colors hover:text-primary">Contact</a>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost">Sign In</Button>
            <Button>Get Started</Button>
          </div>
        </div>
      </div>
    </nav>
  );
}`;
  }

  private createFooterComponent(name: string, props: any): string {
    return `
import React from 'react';

export default function ${name}() {
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
}`;
  }

  private createHeroComponent(name: string, props: any): string {
    return `
import React from 'react';
import { Button } from "@/components/ui/button";

export default function ${name}() {
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
}`;
  }

  private createSidebarComponent(name: string, props: any): string {
    return `
import React from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function ${name}() {
  return (
    <aside className="w-64 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-screen">
      <div className="p-6">
        <div className="font-bold text-xl mb-8">Dashboard</div>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start">
            <span className="mr-2">🏠</span>
            Home
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <span className="mr-2">📊</span>
            Analytics
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <span className="mr-2">👥</span>
            Users
            <Badge variant="secondary" className="ml-auto">12</Badge>
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <span className="mr-2">📝</span>
            Posts
          </Button>
          <Button variant="ghost" className="w-full justify-start">
            <span className="mr-2">⚙️</span>
            Settings
          </Button>
        </nav>
      </div>
    </aside>
  );
}`;
  }

  private createGenericComponent(name: string, type: string, props: any): string {
    return `
import React from 'react';

export default function ${name}() {
  return (
    <div className="component-${type} p-4 border rounded-lg">
      <h3 className="font-semibold text-lg mb-2">${name}</h3>
      <p className="text-muted-foreground">
        This is a custom ${type} component. You can customize this component to fit your needs.
      </p>
    </div>
  );
}`;
  }

  private formatComponentName(componentType: string): string {
    return componentType
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Component';
  }

  async updatePackageJson(dependencies: string[]): Promise<void> {
    if (dependencies.length === 0) return;

    const packageJsonPath = path.join(this.projectPath, 'package.json');
    
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      dependencies.forEach(dep => {
        if (!packageJson.dependencies[dep]) {
          packageJson.dependencies[dep] = 'latest';
        }
      });
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
      console.log('Updated package.json with new dependencies:', dependencies);
    } catch (error) {
      console.warn('Failed to update package.json:', error);
    }
  }
}

export default SmartComponentSystem;
