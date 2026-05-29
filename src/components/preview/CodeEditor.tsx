import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Save, Copy, Download, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface CodeEditorProps {
  files: Record<string, string>;
  activeFile: string;
  onFileChange: (filename: string, content: string) => void;
  onActiveFileChange: (filename: string) => void;
}

export default function CodeEditor({ 
  files, 
  activeFile, 
  onFileChange, 
  onActiveFileChange 
}: CodeEditorProps) {
  const [content, setContent] = useState(files[activeFile] || '');
  const [hasChanges, setHasChanges] = useState(false);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    setHasChanges(newContent !== files[activeFile]);
  };

  const handleSave = () => {
    onFileChange(activeFile, content);
    setHasChanges(false);
    toast.success(`Saved ${activeFile}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Code copied to clipboard');
  };

  const handleReset = () => {
    setContent(files[activeFile] || '');
    setHasChanges(false);
    toast.info(`Reset ${activeFile}`);
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${activeFile}`);
  };

  const getFileLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts':
        return 'TypeScript';
      case 'jsx':
      case 'js':
        return 'JavaScript';
      case 'json':
        return 'JSON';
      case 'css':
        return 'CSS';
      case 'html':
        return 'HTML';
      default:
        return 'Text';
    }
  };

  return (
    <div className="h-full flex">
      {/* File Sidebar */}
      <div className="w-64 border-r bg-background">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Files</h3>
          <p className="text-sm text-muted-foreground">
            {Object.keys(files).length} files
          </p>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)] p-4">
          <div className="space-y-1">
            {Object.entries(files).map(([filename]) => (
              <Button
                key={filename}
                variant={activeFile === filename ? 'secondary' : 'ghost'}
                size="sm"
                className="w-full justify-start text-left font-mono text-xs"
                onClick={() => {
                  onActiveFileChange(filename);
                  setContent(files[filename] || '');
                  setHasChanges(false);
                }}
              >
                {filename}
                {hasChanges && activeFile === filename && (
                  <span className="ml-auto w-2 h-2 bg-orange-500 rounded-full"></span>
                )}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-sm font-semibold">{activeFile}</h3>
              <Badge variant="outline">{getFileLanguage(activeFile)}</Badge>
              {hasChanges && (
                <Badge variant="secondary" className="text-orange-600">
                  Modified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={!hasChanges}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!hasChanges}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
            </div>
          </div>
        </div>

        {/* Code Area */}
        <div className="flex-1 p-4">
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            className="h-full font-mono text-sm resize-none bg-gray-900 text-green-400 border-gray-700 focus:border-gray-600 placeholder-gray-500"
            placeholder="Select a file to edit..."
          />
        </div>
      </div>
    </div>
  );
}
