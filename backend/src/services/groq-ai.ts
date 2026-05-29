import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

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

// Helper function to extract JSON from AI response
function extractJsonFromResponse(text: string): string {
  console.log('Raw AI response:', text);
  
  // Remove markdown code blocks if present
  let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  
  // Remove any leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // Remove any explanatory text before or after JSON
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
  }
  
  // Try to find JSON array in the response
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    cleaned = cleaned.substring(arrayStart, arrayEnd + 1);
  }
  
  console.log('Cleaned JSON:', cleaned);
  return cleaned;
}

export async function analyzePromptWithGroq(prompt: string): Promise<{
  features: string[];
  pages: string[];
  components: string[];
  libraries: string[];
}> {
  const systemPrompt = `You are an AI that analyzes website requirements and extracts UI features.

CRITICAL: You must respond with ONLY valid JSON. No explanations, no markdown, no code blocks, no text before or after the JSON.

Your entire response must be a single JSON object like this:
{"features": ["feature1", "feature2"], "pages": ["page1", "page2"], "components": ["button", "card", "table"], "libraries": ["shadcn/ui", "tailwindcss"]}

Features include: authentication, forms, tables, charts, navigation, etc.
Pages include: login, dashboard, settings, profile, landing, etc.
Components include: button, input, card, dialog, table, etc.
Libraries include: shadcn/ui, tailwindui, material-ui, etc.

User Request: ${prompt}

Remember: Respond with ONLY the JSON object. Nothing else.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const text = response.choices[0]?.message?.content || '';
    
    // Clean the response to extract valid JSON
    const cleanJson = extractJsonFromResponse(text);
    
    try {
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Raw AI response:', text);
      console.error('Cleaned JSON:', cleanJson);
      throw new Error(`Groq AI did not return valid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Groq AI error:', error);
    throw new Error(`Failed to analyze prompt with Groq: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function mapToComponentsWithGroq(features: string[], libraries: string[]): Promise<GeneratedComponent[]> {
  const systemPrompt = `You are a UI component mapper. Map features to specific components from the available libraries.

CRITICAL: Respond with ONLY a valid JSON array. No explanations, no markdown, no code blocks, no extra text.

Available libraries and components:
${JSON.stringify(COMPONENT_MAPPINGS, null, 2)}

Example response format:
[{"name": "LoginButton", "type": "button", "library": "shadcn", "props": {"variant": "default"}, "children": []}]

Features to map: ${features.join(', ')}
Libraries to use: ${libraries.join(', ')}

Respond with ONLY the JSON array.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Map these features: ${features.join(', ')}` }
      ],
      temperature: 0.1, // Lower temperature for more consistent output
      max_tokens: 800,
    });

    const text = response.choices[0]?.message?.content || '';
    
    // Clean the response to extract valid JSON
    const cleanJson = extractJsonFromResponse(text);
    
    try {
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Raw AI response:', text);
      console.error('Cleaned JSON:', cleanJson);
      throw new Error(`Groq AI did not return valid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Groq AI error:', error);
    throw new Error(`Failed to map components with Groq: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateProjectStructureWithGroq(
  prompt: string,
  analysis: Awaited<ReturnType<typeof analyzePromptWithGroq>>,
  components: GeneratedComponent[]
): Promise<GeneratedProject> {
  const systemPrompt = `You are a frontend project architect. Generate a complete project structure based on requirements.

CRITICAL: You must respond with ONLY valid JSON object. No explanations, no markdown, no code blocks, no text before or after the JSON.

Your entire response must be a single JSON object like this:
{"name": "Project Name", "description": "Project description", "pages": [{"name": "LoginPage", "path": "/login", "components": [{"name": "LoginForm", "type": "form", "library": "shadcn", "props": {}, "children": []}], "layout": "auth"}], "dependencies": ["@radix-ui/react-slot", "class-variance-authority"], "structure": {"directories": ["src/components", "src/pages", "src/lib"], "files": ["src/App.tsx", "src/main.tsx"]}}

Requirements:
${JSON.stringify(analysis, null, 2)}

Components available:
${JSON.stringify(components, null, 2)}

Generate a modern React + TypeScript project structure.

Remember: Respond with ONLY the JSON object. Nothing else.`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Generate project for: ${prompt}` }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const text = response.choices[0]?.message?.content || '';
    
    // Clean the response to extract valid JSON
    const cleanJson = extractJsonFromResponse(text);
    
    try {
      return JSON.parse(cleanJson);
    } catch (error) {
      console.error('Raw AI response:', text);
      console.error('Cleaned JSON:', cleanJson);
      throw new Error(`Groq AI did not return valid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Groq AI error:', error);
    throw new Error(`Failed to generate project structure with Groq: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
