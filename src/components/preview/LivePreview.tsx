import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, RefreshCw, Download, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';

interface LivePreviewProps {
  workspaceId: string;
  files: Record<string, string>;
  project: any;
}

/**
 * Extract the JSX block from the return statement using balanced parentheses.
 */
function extractReturnBlock(code: string): string {
  const returnIndex = code.lastIndexOf('return');
  if (returnIndex === -1) return '';

  // Find the opening '(' after 'return'
  const afterReturn = code.substring(returnIndex + 6);
  const parenStart = afterReturn.indexOf('(');
  if (parenStart === -1) return '';

  // Walk through to find the matching closing ')'
  let depth = 0;
  let startIdx = returnIndex + 6 + parenStart;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === '(') depth++;
    else if (code[i] === ')') {
      depth--;
      if (depth === 0) {
        // Extract content between the outermost parens
        return code.substring(startIdx + 1, i).trim();
      }
    }
  }
  return '';
}

/**
 * Convert React component tags (PascalCase) to plain HTML divs,
 * and convert JSX attributes to HTML.
 */
function jsxToHtml(jsx: string): string {
  let html = jsx;

  // Replace className= with class=
  html = html.replace(/className=/g, 'class=');

  // Replace htmlFor= with for=
  html = html.replace(/htmlFor=/g, 'for=');

  // Convert PascalCase component tags to divs with data attributes
  // e.g., <Button variant="outline" size="sm">text</Button>  ->  <button class="...">text</button>
  // Handle specific known component mappings
  const componentMappings: Record<string, { tag: string; addClass: string }> = {
    'Button': { tag: 'button', addClass: 'px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors' },
    'Card': { tag: 'div', addClass: 'rounded-lg border bg-white shadow-sm' },
    'CardHeader': { tag: 'div', addClass: 'p-6 pb-2' },
    'CardTitle': { tag: 'h3', addClass: 'text-2xl font-semibold leading-none tracking-tight' },
    'CardDescription': { tag: 'p', addClass: 'text-sm text-gray-500' },
    'CardContent': { tag: 'div', addClass: 'p-6 pt-0' },
    'CardFooter': { tag: 'div', addClass: 'flex items-center p-6 pt-0' },
    'Table': { tag: 'table', addClass: 'w-full caption-bottom text-sm' },
    'TableHeader': { tag: 'thead', addClass: '' },
    'TableBody': { tag: 'tbody', addClass: '' },
    'TableRow': { tag: 'tr', addClass: 'border-b' },
    'TableHead': { tag: 'th', addClass: 'h-12 px-4 text-left font-medium text-gray-500' },
    'TableCell': { tag: 'td', addClass: 'p-4' },
    'NavigationMenu': { tag: 'nav', addClass: '' },
    'NavigationMenuList': { tag: 'ul', addClass: 'flex space-x-4 list-none' },
    'NavigationMenuItem': { tag: 'li', addClass: '' },
    'NavigationMenuLink': { tag: 'a', addClass: 'text-sm font-medium text-gray-300 hover:text-white' },
    'NavigationMenuTrigger': { tag: 'span', addClass: 'text-sm font-medium cursor-pointer' },
    'NavigationMenuContent': { tag: 'div', addClass: '' },
    'Input': { tag: 'input', addClass: 'w-full px-3 py-2 border rounded-md' },
    'Badge': { tag: 'span', addClass: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800' },
  };

  // Replace opening tags: <ComponentName ...> or <ComponentName ... />
  for (const [comp, mapping] of Object.entries(componentMappings)) {
    // Self-closing: <Component ... />
    const selfCloseRegex = new RegExp(`<${comp}(\\s[^>]*)?\\s*/>`, 'g');
    html = html.replace(selfCloseRegex, (_, attrs) => {
      const processedAttrs = processAttrs(attrs || '', mapping.addClass);
      return `<${mapping.tag}${processedAttrs}></${mapping.tag}>`;
    });

    // Opening tag: <Component ...>
    const openRegex = new RegExp(`<${comp}(\\s[^>]*)?>`, 'g');
    html = html.replace(openRegex, (_, attrs) => {
      const processedAttrs = processAttrs(attrs || '', mapping.addClass);
      return `<${mapping.tag}${processedAttrs}>`;
    });

    // Closing tag: </Component>
    const closeRegex = new RegExp(`</${comp}>`, 'g');
    html = html.replace(closeRegex, `</${mapping.tag}>`);
  }

  // Handle any remaining PascalCase components as divs
  html = html.replace(/<([A-Z][a-zA-Z0-9]*)([\s][^>]*)?\s*\/>/g, (_, tag, attrs) => {
    const processedAttrs = processAttrs(attrs || '', '');
    return `<div${processedAttrs}></div>`;
  });
  html = html.replace(/<([A-Z][a-zA-Z0-9]*)([\s][^>]*)?>/g, (_, tag, attrs) => {
    const processedAttrs = processAttrs(attrs || '', '');
    return `<div${processedAttrs}>`;
  });
  html = html.replace(/<\/[A-Z][a-zA-Z0-9]*>/g, '</div>');

  // Remove JSX expressions: {something}
  // Keep text content, remove complex expressions
  html = html.replace(/\{["']([^"']+)["']\}/g, '$1');
  html = html.replace(/\{`([^`]+)`\}/g, '$1');
  // Remove map/complex expressions
  html = html.replace(/\{[^{}]*\.map\s*\([^)]*\)\s*=>\s*\([\s\S]*?\)\)\s*\}/g, '');
  html = html.replace(/\{[^{}]*\}/g, '');

  // Remove spread operators
  html = html.replace(/\.\.\.[a-zA-Z_]+/g, '');

  return html;
}

/**
 * Process JSX attributes: keep class/href/id/type/placeholder,
 * convert variant/size to classes, remove React-specific attrs
 */
function processAttrs(attrs: string, extraClass: string): string {
  if (!attrs.trim() && !extraClass) return '';

  // Extract existing class
  const classMatch = attrs.match(/class="([^"]*)"/);
  const existingClass = classMatch ? classMatch[1] : '';
  const combinedClass = [existingClass, extraClass].filter(Boolean).join(' ');

  // Keep only HTML-valid attributes
  const keepAttrs: string[] = [];
  const attrRegex = /(\w+)="([^"]*)"/g;
  let match;
  const validHtmlAttrs = ['id', 'href', 'type', 'placeholder', 'for', 'src', 'alt', 'target', 'rel', 'style', 'name', 'value', 'action', 'method'];

  while ((match = attrRegex.exec(attrs)) !== null) {
    const [, name, value] = match;
    if (name === 'class' || name === 'className') continue; // handled separately
    if (validHtmlAttrs.includes(name)) {
      keepAttrs.push(`${name}="${value}"`);
    }
  }

  let result = '';
  if (combinedClass) {
    result += ` class="${combinedClass}"`;
  }
  if (keepAttrs.length > 0) {
    result += ' ' + keepAttrs.join(' ');
  }

  return result;
}

/**
 * Extracts CSS, removing Tailwind directives
 */
function extractCustomCss(cssContent: string): string {
  let css = cssContent.replace(/@tailwind\s+[^;]+;/g, '');
  css = css.replace(/@layer\s+\w+\s*\{[\s\S]*?\}/g, '');
  css = css.replace(/@apply\s+[^;]+;/g, '');
  return css.trim();
}

export default function LivePreview({ workspaceId, files, project }: LivePreviewProps) {
  const [activeFile, setActiveFile] = useState<string>('');
  const [previewMode, setPreviewMode] = useState<'preview' | 'code'>('preview');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fileKeys = Object.keys(files);
    if (fileKeys.length > 0) {
      setActiveFile(fileKeys[0]);
    }
  }, [files]);

  // Build a full HTML preview from all generated React/JSX files
  const previewHtml = useMemo(() => {
    if (!files || Object.keys(files).length === 0) return '';

    // First pass: extract all component HTML
    const componentHtmlMap: Record<string, string> = {};
    let customCss = '';

    Object.entries(files).forEach(([filename, content]) => {
      const lower = filename.toLowerCase();

      if (lower.endsWith('.css')) {
        customCss += extractCustomCss(content) + '\n';
      } else if ((lower.endsWith('.tsx') || lower.endsWith('.jsx')) && !lower.includes('main.tsx') && !lower.includes('app.tsx')) {
        const jsxBlock = extractReturnBlock(content);
        if (jsxBlock) {
          const html = jsxToHtml(jsxBlock);
          // Extract component name from filename
          const baseName = filename.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') || '';
          componentHtmlMap[baseName] = html;
        }
      }
    });

    // Second pass: process page files and inline their component references
    const pageHtmlParts: string[] = [];

    Object.entries(files).forEach(([filename, content]) => {
      const lower = filename.toLowerCase();
      if (lower.includes('/pages/') && (lower.endsWith('.tsx') || lower.endsWith('.jsx'))) {
        let jsxBlock = extractReturnBlock(content);
        if (jsxBlock) {
          // Replace component references like <Footer /> with actual component HTML
          for (const [compName, compHtml] of Object.entries(componentHtmlMap)) {
            // Handle self-closing <CompName />
            const selfClosePattern = new RegExp(`<${compName}\\s*/>`, 'g');
            jsxBlock = jsxBlock.replace(selfClosePattern, compHtml);
            // Handle <CompName>...</CompName>
            const openClosePattern = new RegExp(`<${compName}[^>]*>[\\s\\S]*?</${compName}>`, 'g');
            jsxBlock = jsxBlock.replace(openClosePattern, compHtml);
          }
          const html = jsxToHtml(jsxBlock);
          if (html.trim()) {
            pageHtmlParts.push(html);
          }
        }
      }
    });

    // If no pages found, just combine all components
    if (pageHtmlParts.length === 0) {
      const allComponents = Object.values(componentHtmlMap).filter(h => h.trim());
      if (allComponents.length > 0) {
        pageHtmlParts.push(...allComponents);
      } else {
        // Last fallback: try to extract from App.tsx
        const appFile = Object.entries(files).find(([name]) =>
          name.toLowerCase().endsWith('app.tsx') || name.toLowerCase().endsWith('app.jsx')
        );
        if (appFile) {
          const jsxBlock = extractReturnBlock(appFile[1]);
          if (jsxBlock) {
            const html = jsxToHtml(jsxBlock);
            if (html.trim()) pageHtmlParts.push(html);
          }
        }
      }
    }

    const bodyContent = pageHtmlParts.join('\n\n');

    if (!bodyContent.trim()) {
      return '';
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project?.name || 'Preview'}</title>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', sans-serif; min-height: 100vh; }
    ${customCss}
  </style>
</head>
<body class="min-h-screen bg-gray-50">
  ${bodyContent}
</body>
</html>`;
  }, [files, project, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    toast.success('Preview refreshed!');
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([previewHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name?.toLowerCase().replace(/\s+/g, '-') || 'project'}-preview.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Preview HTML downloaded!');
    } catch {
      toast.error('Failed to download preview');
    }
  };

  const getFileLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx': case 'ts': return 'typescript';
      case 'jsx': case 'js': return 'javascript';
      case 'json': return 'json';
      case 'css': return 'css';
      case 'html': return 'html';
      default: return 'plaintext';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">{project.name}</h3>
            <p className="text-sm text-muted-foreground">
              {project.pages?.length || 0} pages • {Object.keys(files).length} files
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {project.pages?.length || 0} pages
            </Badge>
            <Badge variant="outline">
              {Object.keys(files).length} files
            </Badge>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Button size="sm" onClick={handleRefresh}>
              <Play className="h-4 w-4" />
              Preview
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as 'preview' | 'code')} className="h-full">
          <TabsList className="grid w-full grid-cols-2 m-4">
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="code" className="flex items-center gap-2">
              <Code className="h-4 w-4" />
              Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="h-full mt-0">
            <div className="h-full p-4">
              {previewHtml ? (
                <div className="h-full rounded-lg border overflow-hidden">
                  <iframe
                    key={refreshKey}
                    srcDoc={previewHtml}
                    className="w-full h-full bg-white"
                    title="Website Preview"
                    sandbox="allow-scripts"
                    style={{ minHeight: '500px' }}
                  />
                </div>
              ) : (
                <Card className="h-full flex items-center justify-center">
                  <CardContent className="text-center">
                    <Play className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">No Preview Available</h3>
                    <p className="text-muted-foreground mb-4">
                      Generate some code first, then the preview will appear here automatically.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="code" className="h-full mt-0">
            <div className="h-full flex">
              <div className="w-64 border-r p-4">
                <h4 className="font-semibold mb-4">Files</h4>
                <ScrollArea className="h-[calc(100vh-200px)]">
                  <div className="space-y-1">
                    {Object.entries(files).map(([filename]) => (
                      <Button
                        key={filename}
                        variant={activeFile === filename ? 'secondary' : 'ghost'}
                        size="sm"
                        className="w-full justify-start text-left font-mono text-xs"
                        onClick={() => setActiveFile(filename)}
                      >
                        {filename}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <div className="flex-1 p-4">
                {activeFile && files[activeFile] ? (
                  <div className="h-full">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-sm font-semibold">{activeFile}</span>
                      <Badge variant="outline">{getFileLanguage(activeFile)}</Badge>
                    </div>
                    <div className="h-[calc(100vh-250px)] rounded-lg border border-border overflow-hidden">
                      <pre className="h-full overflow-auto p-4 text-sm bg-[#0d1117] text-gray-300 font-mono leading-relaxed">
                        <code>{files[activeFile]}</code>
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <p className="text-muted-foreground">Select a file to view its code</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
