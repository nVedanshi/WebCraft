export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  workspace_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}
