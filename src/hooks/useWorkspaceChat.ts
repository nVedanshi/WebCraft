import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useWorkspaceChat(workspaceId: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  // Load initial messages
  useEffect(() => {
    if (!workspaceId) return;

    const load = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `http://localhost:5000/api/workspaces/${workspaceId}/messages`
        );

        if (!response.ok) {
          setMessages([]);
          return;
        }

        const data = await response.json();
        setMessages(data.messages || []);
      } catch (err) {
        console.error("Chat load failed:", err);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };


    load();
  }, [workspaceId]);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // const sendMessage = async (content: string) => {
  //   if (!workspaceId || !user || !content.trim()) return;

  //   // 1️⃣ Optimistically add user message
  //   const userMessage: ChatMessage = {
  //     id: crypto.randomUUID(),
  //     role: "user",
  //     content,
  //   };

  //   setMessages((prev) => [...prev, userMessage]);
  //   setAiLoading(true);

  //   try {
  //     const response = await fetch(
  //       `http://localhost:5000/api/workspaces/${workspaceId}/chat`,
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           message: content,
  //           userId: user.id,
  //         }),
  //       }
  //     );

  //     const data = await response.json();

  //     if (!response.ok) {
  //       throw new Error(data.error);
  //     }

  //     // 2️⃣ Add assistant response
  //     const assistantMessage: ChatMessage = {
  //       id: crypto.randomUUID(),
  //       role: "assistant",
  //       content: data.reply || "Updated successfully.",
  //     };

  //     setMessages((prev) => [...prev, assistantMessage]);

  //   } catch (err) {
  //     console.error(err);
  //   } finally {
  //     setAiLoading(false);
  //   }
  // };

  const sendMessage = async (content: string) => {
  if (!workspaceId || !user || !content.trim()) return;

  const userMessage = {
    id: crypto.randomUUID(),
    role: "user" as const,
    content,
  };

  setMessages((prev) => [...prev, userMessage]);
  setAiLoading(true);

  try {
    const response = await fetch(
      `http://localhost:5000/api/workspaces/${workspaceId}/chat`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: content,
          userId: user.id,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error);
    }

    const assistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant" as const,
      content: data.reply,
    };

    setMessages((prev) => [...prev, assistantMessage]);

    return data; // 🔥 important
  } finally {
    setAiLoading(false);
  }
};
  

  return {
    messages,
    loading,
    aiLoading,
    sendMessage,
    bottomRef,
  };
}
