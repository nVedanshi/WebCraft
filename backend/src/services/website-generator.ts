import { analyzePrompt, mapToComponents, generateProjectStructure, GeneratedProject, GeneratedComponent } from "./enhanced-ai";
import { generateProjectFiles } from './code-generator';
import SmartCodeGenerator from './smart-code-generator';

export interface WebsiteGenerationRequest {
  prompt: string;
  userId: string;
  constraints?: string;
}

export interface WebsiteGenerationResponse {
  workspaceId: string;
  project: GeneratedProject;
  files: Record<string, string>;
  previewUrl?: string;
}

export async function generateWebsiteFromPrompt(request: WebsiteGenerationRequest): Promise<WebsiteGenerationResponse> {
  const { prompt, userId, constraints } = request;

  try {
    // Step 1: Analyze the prompt and extract features
    let analysis: { features: string[]; pages: string[]; components: string[]; libraries: string[] };
    try {
      console.log('🔍 Analyzing prompt...');
      analysis = await analyzePrompt(prompt);
      console.log('📊 Analysis:', analysis);
    } catch (e) {
      console.error('⚠️ analyzePrompt failed, using fallback:', e);
      analysis = {
        features: [prompt],
        pages: ['showcase'],
        components: ['hero', 'button'],
        libraries: ['shadcn', 'tailwindcss']
      };
    }

    // Step 2: Map features to specific UI components
    let components: any[];
    try {
      console.log('🗺️ Mapping components...');
      components = await mapToComponents(analysis.features, analysis.libraries);
      console.log('🧩 Components mapped:', components);
    } catch (e) {
      console.error('⚠️ mapToComponents failed, using fallback:', e);
      components = [];
    }

    // Step 3: Generate project structure
    let project: any;
    try {
      console.log('🏗️ Generating project structure...');
      project = await generateProjectStructure(prompt, analysis, components);
      console.log('📁 Project structure:', project);
    } catch (e) {
      console.error('⚠️ generateProjectStructure failed, using fallback:', e);
      project = null; // Will be handled by the fallback logic below
    }

    // Validate project data — handle all edge cases
    if (!project || !project.pages || !Array.isArray(project.pages)) {
      console.log('⚠️ Invalid project structure, building from prompt');
    }

    // Smart component detection from the original prompt
    const promptLower = prompt.toLowerCase();
    const detectedComponents: Array<{ name: string; type: string; library: string; props: Record<string, any> }> = [];
    
    const componentKeywords: Record<string, { name: string; type: string; library: string }> = {
      'button': { name: 'ModernButton', type: 'button', library: 'shadcn' },
      'btn': { name: 'ModernButton', type: 'button', library: 'shadcn' },
      'navbar': { name: 'AppNavbar', type: 'navbar', library: 'tailwindui' },
      'nav': { name: 'AppNavbar', type: 'navbar', library: 'tailwindui' },
      'navigation': { name: 'AppNavigation', type: 'navigation', library: 'shadcn' },
      'footer': { name: 'AppFooter', type: 'footer', library: 'tailwindui' },
      'header': { name: 'AppHeader', type: 'header', library: 'tailwindui' },
      'hero': { name: 'HeroSection', type: 'hero', library: 'tailwindui' },
      'form': { name: 'ContactForm', type: 'form', library: 'shadcn' },
      'card': { name: 'InfoCard', type: 'card', library: 'shadcn' },
      'table': { name: 'DataTable', type: 'table', library: 'shadcn' },
      'input': { name: 'TextInput', type: 'input', library: 'shadcn' },
      'login': { name: 'LoginForm', type: 'form', library: 'shadcn' },
      'landing': { name: 'HeroSection', type: 'hero', library: 'tailwindui' },
      'dashboard': { name: 'HeroSection', type: 'hero', library: 'tailwindui' },
    };

    for (const [keyword, comp] of Object.entries(componentKeywords)) {
      if (promptLower.includes(keyword)) {
        detectedComponents.push({ ...comp, props: {} });
      }
    }

    // If nothing detected from prompt, default to a hero section
    if (detectedComponents.length === 0) {
      detectedComponents.push({ name: 'HeroSection', type: 'hero', library: 'tailwindui', props: {} });
    }

    // Build or fix the pages array
    let projectPages = project?.pages || [];
    
    // Ensure pages is a valid array
    if (!Array.isArray(projectPages)) {
      projectPages = [];
    }

    // If AI returned 0 pages, create a default page using detected components
    if (projectPages.length === 0) {
      console.log('⚠️ No pages found, creating ShowcasePage with detected components:', detectedComponents.map(c => c.type));
      projectPages = [{
        name: 'ShowcasePage',
        path: '/',
        components: detectedComponents,
        layout: 'default'
      }];
    }

    // Ensure every page has at least one component
    projectPages = projectPages.map((page: any) => {
      if (!page.components || !Array.isArray(page.components) || page.components.length === 0) {
        console.log(`⚠️ Page "${page.name}" has no components, adding detected components`);
        return { ...page, components: detectedComponents };
      }
      // Ensure each component has valid type
      page.components = page.components.map((comp: any) => ({
        name: comp.name || 'Component',
        type: (comp.type || 'hero').toLowerCase(),
        library: comp.library || 'tailwindui',
        props: comp.props || {},
      }));
      return page;
    });

    // Ensure project has required fields
    const validatedProject: GeneratedProject = {
      name: project?.name || 'Generated Website',
      description: project?.description || prompt,
      pages: projectPages,
      dependencies: project?.dependencies || [],
      structure: project?.structure || { directories: ['src/components', 'src/pages'], files: ['src/App.tsx', 'src/main.tsx'] }
    };

    // Step 4: Generate actual code files using virtual smart components
    console.log('💻 Generating smart code files...');
    const files = generateProjectFiles(validatedProject);
    console.log('📄 Generated files:', Object.keys(files));

    // Step 5: Create workspace in database
    const workspaceId = crypto.randomUUID();
    
    // This would integrate with your existing Supabase logic
    // For now, return the generated data

    return {
      workspaceId,
      project: validatedProject,
      files,
      previewUrl: `/workspace/${workspaceId}/preview`
    };

  } catch (error) {
    console.error('❌ Website generation failed:', error);
    throw new Error(`Website generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to validate generated code
export function validateGeneratedCode(files: Record<string, string>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required files
  const requiredFiles = ['package.json', 'src/App.tsx', 'src/main.tsx'];
  requiredFiles.forEach(file => {
    if (!files[file]) {
      errors.push(`Missing required file: ${file}`);
    }
  });

  // Check package.json structure
  if (files['package.json']) {
    try {
      const packageJson = JSON.parse(files['package.json']);
      if (!packageJson.dependencies?.react) {
        errors.push('Missing React dependency in package.json');
      }
      if (!packageJson.dependencies?.['react-dom']) {
        warnings.push('Missing react-dom dependency');
      }
    } catch {
      errors.push('Invalid package.json format');
    }
  }

  // Check TypeScript syntax (basic)
  Object.entries(files).forEach(([filename, content]) => {
    if (filename.endsWith('.tsx') || filename.endsWith('.ts')) {
      // Basic syntax checks
      if (!content.includes('import') && filename !== 'src/main.tsx') {
        warnings.push(`File ${filename} may be missing imports`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Helper function to extract component dependencies
export function extractDependencies(files: Record<string, string>): string[] {
  const dependencies = new Set<string>();

  Object.values(files).forEach(content => {
    // Extract import statements
    const importMatches = content.match(/from ["']([^"']+)["']/g);
    if (importMatches) {
      importMatches.forEach(match => {
        const dependency = match.match(/from ["']([^"']+)["']/)?.[1];
        if (dependency && !dependency.startsWith('.') && !dependency.startsWith('/')) {
          dependencies.add(dependency);
        }
      });
    }
  });

  return Array.from(dependencies);
}

// Helper function to generate project summary
export function generateProjectSummary(project: GeneratedProject): string {
  return `
# ${project.name}

${project.description}

## Pages (${project.pages.length})
${project.pages.map(page => `- **${page.name}** (${page.path})`).join('\n')}

## Components Used
${project.pages.flatMap(page => page.components.map(comp => comp.name)).join(', ')}

## Dependencies
${project.dependencies.join(', ')}

## File Structure
${project.structure.directories.join('/\n')}
${project.structure.files.map(file => `- ${file}`).join('\n')}
  `.trim();
}
