import { supabase } from "@/lib/supabase";
import { ChatMessage } from "@/types/chat";

export async function loadWorkspaceMessages(workspaceId: string) {
  const { data, error } = await supabase
    .from("workspace_messages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as ChatMessage[];
}

export async function insertWorkspaceMessage(
  workspaceId: string,
  role: ChatMessage["role"],
  content: string
) {
  const { data, error } = await supabase
    .from("workspace_messages")
    .insert({
      workspace_id: workspaceId,
      role,
      content,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ChatMessage;
}
