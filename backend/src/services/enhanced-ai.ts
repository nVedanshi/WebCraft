import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Component library mappings
const COMPONENT_MAPPINGS = {
  // shadcn/ui components
  shadcn: {
    'button': 'Button',
    'input': 'Input',
    'card': 'Card',
    'dialog': 'Dialog',
    'dropdown': 'DropdownMenu',
    'form': 'Form',
    'table': 'Table',
    'badge': 'Badge',
    'avatar': 'Avatar',
    'navigation': 'NavigationMenu',
    'sidebar': 'Sidebar',
    'sheet': 'Sheet',
    'tabs': 'Tabs',
    'tooltip': 'Tooltip',
    'select': 'Select',
    'checkbox': 'Checkbox',
    'radio': 'RadioGroup',
    'switch': 'Switch',
    'textarea': 'Textarea',
    'label': 'Label',
    'separator': 'Separator',
    'skeleton': 'Skeleton',
    'progress': 'Progress',
    'alert': 'Alert',
    'toast': 'Toast'
  },
  // Tailwind UI patterns
  tailwindui: {
    'hero': 'HeroSection',
    'features': 'FeaturesGrid',
    'testimonials': 'Testimonials',
    'pricing': 'PricingTable',
    'faq': 'FAQ',
    'footer': 'Footer',
    'header': 'Header',
    'stats': 'StatsSection',
    'team': 'TeamSection',
    'blog': 'BlogGrid',
    'contact': 'ContactForm'
  }
};

// Page type detection patterns
const PAGE_PATTERNS = {
  'login': ['login', 'signin', 'sign in', 'authentication', 'auth'],
  'dashboard': ['dashboard', 'analytics', 'overview', 'stats', 'metrics'],
  'landing': ['landing', 'homepage', 'home', 'main', 'index'],
  'settings': ['settings', 'preferences', 'config', 'options'],
  'profile': ['profile', 'account', 'user'],
  'admin': ['admin', 'management', 'admin panel'],
  'blog': ['blog', 'posts', 'articles'],
  'ecommerce': ['shop', 'store', 'products', 'cart', 'checkout'],
  'portfolio': ['portfolio', 'projects', 'work', 'showcase']
};

export interface GeneratedComponent {
  name: string;
  type: string;
  library: string;
  props: Record<string, any>;
  children?: GeneratedComponent[];
}

export interface GeneratedPage {
  name: string;
  path: string;
  components: GeneratedComponent[];
  layout?: string;
}

export interface GeneratedProject {
  name: string;
  description: string;
  pages: GeneratedPage[];
  dependencies: string[];
  structure: {
    directories: string[];
    files: string[];
  };
}

export async function analyzePrompt(prompt: string): Promise<{
  features: string[];
  pages: string[];
  components: string[];
  libraries: string[];
}> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const systemPrompt = `
You are an AI that analyzes website requirements and extracts UI features.

CRITICAL: You must respond with ONLY valid JSON. No explanations, no markdown, no code blocks, no text before or after the JSON.

Your entire response must be a single JSON object like this:
{"features": ["feature1", "feature2"], "pages": ["page1", "page2"], "components": ["button", "card", "table"], "libraries": ["shadcn/ui", "tailwindcss"]}

Features include: authentication, forms, tables, charts, navigation, etc.
Pages include: login, dashboard, settings, profile, landing, etc.
Components include: button, input, card, dialog, table, etc.
Libraries include: shadcn/ui, tailwindui, material-ui, etc.

User Request: ${prompt}

Remember: Respond with ONLY the JSON object. Nothing else.
`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt }
        ],
      },
    ],
  });

  const text = result.response.text();
  
  // Clean the response to extract valid JSON
  const cleanJson = extractJsonFromResponse(text);
  
  try {
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Raw AI response:', text);
    console.error('Cleaned JSON:', cleanJson);
    throw new Error(`AI did not return valid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Helper function to extract JSON from AI response — robust against all edge cases
function extractJsonFromResponse(text: string): string {
  // Step 1: Remove markdown code blocks
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
  cleaned = cleaned.trim();

  // Step 2: Try direct parse first
  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {}

  // Step 3: Find JSON using balanced braces
  const jsonStr = extractBalancedJson(cleaned);
  if (jsonStr) {
    // Try to fix common JSON issues
    const fixed = fixJsonIssues(jsonStr);
    try {
      JSON.parse(fixed);
      return fixed;
    } catch {}
    // Return as-is if fixing didn't help
    return jsonStr;
  }

  // Step 4: Try to find JSON array
  const arrayStr = extractBalancedJsonArray(cleaned);
  if (arrayStr) {
    const fixed = fixJsonIssues(arrayStr);
    try {
      JSON.parse(fixed);
      return fixed;
    } catch {}
    return arrayStr;
  }

  return cleaned;
}

// Extract JSON object using balanced brace matching
function extractBalancedJson(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return text.substring(start, i + 1);
      }
    }
  }
  return null;
}

// Extract JSON array using balanced bracket matching
function extractBalancedJsonArray(text: string): string | null {
  const start = text.indexOf('[');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return text.substring(start, i + 1);
    }
  }
  return null;
}

// Fix common JSON issues from AI responses
function fixJsonIssues(json: string): string {
  let fixed = json;
  // Remove trailing commas before } or ]
  fixed = fixed.replace(/,\s*([}\]])/g, '$1');
  // Remove single-line comments
  fixed = fixed.replace(/\/\/[^\n]*/g, '');
  // Remove multi-line comments
  fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
  return fixed;
}

export async function mapToComponents(features: string[], libraries: string[]): Promise<GeneratedComponent[]> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const systemPrompt = `
You are a UI component mapper. Map features to specific components from the available libraries.

CRITICAL: You must respond with ONLY valid JSON array. No explanations, no markdown, no code blocks, no text before or after the JSON.

Available libraries and components:
${JSON.stringify(COMPONENT_MAPPINGS, null, 2)}

Your entire response must be a single JSON array like this:
[{"name": "LoginButton", "type": "button", "library": "shadcn", "props": {"variant": "default", "size": "lg"}, "children": []}]

Map these features: ${features.join(', ')}
Use these libraries: ${libraries.join(', ')}

Remember: Respond with ONLY the JSON array. Nothing else.
`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt }
        ],
      },
    ],
  });

  const text = result.response.text();
  
  // Clean the response to extract valid JSON
  const cleanJson = extractJsonFromResponse(text);
  
  try {
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Raw AI response:', text);
    console.error('Cleaned JSON:', cleanJson);
    throw new Error(`AI did not return valid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateProjectStructure(
  prompt: string,
  analysis: Awaited<ReturnType<typeof analyzePrompt>>,
  components: GeneratedComponent[]
): Promise<GeneratedProject> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const systemPrompt = `
You are a frontend project architect. Generate a complete project structure based on requirements.

CRITICAL RULES:
1. You must respond with ONLY valid JSON object. No explanations, no markdown, no code blocks, no text before or after the JSON.
2. You MUST ALWAYS generate AT LEAST ONE page. Even if the user asks for a single component (like a button), create a "ShowcasePage" that contains that component.
3. Every page MUST have at least one component in its components array.
4. Each component must have: name (PascalCase), type (lowercase like "button", "navbar", "footer", "hero", "card", "form", "table", "header", "input"), library (use "shadcn" or "tailwindui"), and props (object).

Your entire response must be a single JSON object like this:
{"name": "Project Name", "description": "Project description", "pages": [{"name": "HomePage", "path": "/", "components": [{"name": "HeroSection", "type": "hero", "library": "tailwindui", "props": {}, "children": []}, {"name": "MainButton", "type": "button", "library": "shadcn", "props": {"variant": "default"}, "children": []}], "layout": "default"}], "dependencies": ["@radix-ui/react-slot", "class-variance-authority"], "structure": {"directories": ["src/components", "src/pages", "src/lib"], "files": ["src/App.tsx", "src/main.tsx"]}}

IMPORTANT: If user asks for a single element (like "build a button" or "create a footer"), you MUST still create a page to showcase it. Example for "build a modern button":
{"name": "ModernButtonProject", "description": "A modern button showcase", "pages": [{"name": "ShowcasePage", "path": "/", "components": [{"name": "ModernButton", "type": "button", "library": "shadcn", "props": {"variant": "default", "size": "lg"}, "children": []}], "layout": "default"}], "dependencies": [], "structure": {"directories": ["src/components", "src/pages"], "files": ["src/App.tsx", "src/main.tsx"]}}

Requirements:
${JSON.stringify(analysis, null, 2)}

Components available:
${JSON.stringify(components, null, 2)}

Generate a modern React + TypeScript project structure. ALWAYS include at least one page.

Remember: Respond with ONLY the JSON object. Nothing else.
`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt }
        ],
      },
    ],
  });

  const text = result.response.text();
  
  // Clean the response to extract valid JSON
  const cleanJson = extractJsonFromResponse(text);
  
  try {
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Raw AI response:', text);
    console.error('Cleaned JSON:', cleanJson);
    throw new Error(`AI did not return valid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
