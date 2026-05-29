import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface FixWorkspaceProps {
  workspaceId: string;
  onFixed: () => void;
}

export default function FixWorkspace({ workspaceId, onFixed }: FixWorkspaceProps) {
  const handleFix = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/fix-workspace/${workspaceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fix workspace');
      }

      toast.success('Workspace fixed successfully!');
      onFixed();
      window.location.reload();
    } catch (error) {
      console.error('Fix error:', error);
      toast.error('Failed to fix workspace');
    }
  };

  return (
    <Button onClick={handleFix} variant="outline" size="sm">
      Fix Workspace Data
    </Button>
  );
}
