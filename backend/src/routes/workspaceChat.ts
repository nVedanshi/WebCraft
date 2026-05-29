import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";
import { generateBlueprintFromAI } from "../services/ai";

const router = Router();

router.post("/:id/chat", async (req, res) => {
  try {
    const { id } = req.params;
    const { message, userId } = req.body;

    if (!id || !message || !userId) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1️⃣ Get workspace
    const { data: workspace, error: workspaceError } =
      await supabaseAdmin
        .from("workspaces")
        .select("*")
        .eq("id", id)
        .single();

    if (workspaceError || !workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // 2️⃣ Save user message
    await supabaseAdmin.from("workspace_messages").insert({
      workspace_id: id,
      user_id: userId,
      role: "user",
      content: message,
    });

    // 3️⃣ Create refinement prompt
    const refinementPrompt = `
You are modifying an existing web app blueprint.

Current Blueprint:
${JSON.stringify(workspace.blueprint, null, 2)}

User Instruction:
${message}

Return ONLY updated valid JSON blueprint.
`;

    // 4️⃣ Generate updated blueprint
    const updatedBlueprint = await generateBlueprintFromAI(refinementPrompt);

    // 5️⃣ Update workspace blueprint
    await supabaseAdmin
      .from("workspaces")
      .update({ blueprint: updatedBlueprint })
      .eq("id", id);

    // 6️⃣ Save AI message
    await supabaseAdmin.from("workspace_messages").insert({
      workspace_id: id,
      user_id: userId,
      role: "assistant",
      content: "Blueprint updated successfully.",
    });

    return res.json({
      blueprint: updatedBlueprint,
    });

  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

export default router;