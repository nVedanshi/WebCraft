-- Workspaces table (required for generate + workspace routes)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID NOT NULL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Untitled',
  blueprint JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspaces"
  ON public.workspaces FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workspaces"
  ON public.workspaces FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workspaces"
  ON public.workspaces FOR DELETE
  USING (auth.uid() = user_id);

-- workspace_messages table (required for chat)
CREATE TABLE IF NOT EXISTS public.workspace_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of own workspaces"
  ON public.workspace_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_messages.workspace_id AND w.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages in own workspaces"
  ON public.workspace_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_messages.workspace_id AND w.user_id = auth.uid()
    )
  );

-- Add workspace_id to generation_history if missing (backend expects it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'generation_history'
      AND column_name = 'workspace_id'
  ) THEN
    ALTER TABLE public.generation_history
    ADD COLUMN workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    NULL; -- generation_history may not exist yet; run the first migration first
END $$;
