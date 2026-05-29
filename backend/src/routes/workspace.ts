import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const router = Router();

/**
 * GET /api/workspaces?userId=xxx
 * Returns all workspaces for a user
 */
router.get("/", async (req, res) => {
  try {
    const userId = req.query.userId as string;

    if (!userId) {
      return res.status(400).json({ error: "userId query param required" });
    }

    const { data, error } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Workspace list error:", error);
      return res.status(500).json({ error: "Failed to fetch workspaces" });
    }

    return res.json({ workspaces: data });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/workspaces/:id
 * Returns single workspace with blueprint
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Workspace fetch error:", error);
      return res.status(500).json({ error: "Failed to fetch workspace" });
    }

    if (!data) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    return res.json({ workspace: data });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});


/**
 * DELETE /api/workspaces/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabaseAdmin
      .from("workspaces")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Delete error:", error);
      return res.status(500).json({ error: "Failed to delete workspace" });
    }

    return res.json({ success: true });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/workspaces/:id/messages
 * Returns chat messages for workspace
 */
// router.get("/:id/messages", async (req, res) => {
//   try {
//     const { id } = req.params;

//     const { data, error } = await supabaseAdmin
//       .from("workspace_messages")
//       .select("*")
//       .eq("workspace_id", id)
//       .order("created_at", { ascending: true });

//     if (error) {
//       console.error("Messages fetch error:", error);
//       return res.status(500).json({ error: "Failed to fetch messages" });
//     }

//     return res.json({ messages: data });

//   } catch (err: any) {
//     console.error(err);
//     return res.status(500).json({ error: err.message });
//   }
// });

router.get("/:id/messages", async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from("workspace_messages")
    .select("*")
    .eq("workspace_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error(error);
    return res.status(500).json({ error: "Failed to load messages" });
  }

  res.json({ messages: data });
});

// router.post("/:id/chat", async (req, res) => {
//   const { id } = req.params;
//   const { message } = req.body;

//   // Save user message
//   await supabaseAdmin.from("workspace_messages").insert([
//     {
//       workspace_id: id,
//       role: "user",
//       content: message,
//     },
//   ]);

//   // Fake AI reply for now
//   const aiReply = "Updated successfully.";

//   // Save assistant message
//   await supabaseAdmin.from("workspace_messages").insert([
//     {
//       workspace_id: id,
//       role: "assistant",
//       content: aiReply,
//     },
//   ]);

//   res.json({ reply: aiReply });
// });

router.post("/:id/chat", async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;

    if (!id || !message) {
      return res.status(400).json({ error: "Missing data" });
    }

    // 1️⃣ Load workspace
    const { data: workspace, error } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // 2️⃣ Save user message
    await supabaseAdmin.from("workspace_messages").insert({
      workspace_id: id,
      role: "user",
      content: message,
    });

    // 3️⃣ Build AI prompt
    const systemPrompt = `
You are an AI Web App Generator.

You will receive:
1. Current blueprint JSON
2. User modification request

You MUST return:
- Only valid JSON
- Full updated blueprint
- No explanation
- No markdown
- No extra text
`;

    const userPrompt = `
CURRENT BLUEPRINT:
${JSON.stringify(workspace.blueprint, null, 2)}

USER REQUEST:
${message}

Return FULL updated blueprint JSON only.
`;

    // 4️⃣ Call Gemini
    const result = await model.generateContent([
      systemPrompt,
      userPrompt,
    ]);

    const rawText = result.response.text();

    // 5️⃣ Clean JSON
    // const cleaned = rawText
    //   .replace(/```json/g, "")
    //   .replace(/```/g, "")
    //   .trim();

    // const updatedBlueprint = JSON.parse(cleaned);

    let updatedBlueprint;

    try {
      const cleaned = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      updatedBlueprint = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("❌ JSON PARSE FAILED");
      console.error("AI RAW RESPONSE:\n", rawText);

      return res.status(500).json({
        error: "AI returned invalid JSON format",
      });
    }

    // 6️⃣ Save updated blueprint
    await supabaseAdmin
      .from("workspaces")
      .update({
        blueprint: updatedBlueprint,
        updated_at: new Date(),
      })
      .eq("id", id);

    // 7️⃣ Save assistant message
    await supabaseAdmin.from("workspace_messages").insert({
      workspace_id: id,
      role: "assistant",
      content: "Blueprint updated successfully.",
    });

    // 8️⃣ Return response
    res.json({
      reply: "Blueprint updated successfully.",
      blueprint: updatedBlueprint,
    });

  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "AI failed to process request" });
  }
});


export default router;
