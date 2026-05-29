-- Add generated_code column to workspaces table
ALTER TABLE public.workspaces 
ADD COLUMN generated_code JSONB;

-- Add index for better performance
CREATE INDEX idx_workspaces_generated_code ON public.workspaces USING GIN (generated_code);

-- Add updated_at column if it doesn't exist (for tracking regeneration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.workspaces
    ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL;
END $$;

-- Create trigger to update updated_at on workspace changes
CREATE OR REPLACE FUNCTION public.update_workspace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_workspace_updated_at();
