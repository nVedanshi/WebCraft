import { AppState } from "./app-state";
import { ChatMessage } from "./chat";

export interface Workspace {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;

  chatHistory: ChatMessage[];
  appState: AppState | null;
}
