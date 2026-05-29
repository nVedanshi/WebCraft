import { Router } from "express";
import { generateWebsiteFromPrompt } from "../services/website-generator";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { prompt, userId, constraints } = req.body;

    if (!prompt || !userId) {
      return res.status(400).json({ error: "Missing prompt or userId" });
    }

    console.log('🚀 Starting website generation for user:', userId);

    // 1️⃣ Generate complete website with enhanced AI
    const generation = await generateWebsiteFromPrompt({
      prompt,
      userId,
      constraints: constraints || ""
    });

    const { workspaceId, project, files } = generation;

    // 2️⃣ Create workspace with enhanced blueprint
    const { error: workspaceError } = await supabaseAdmin
      .from("workspaces")
      .insert({
        id: workspaceId,
        user_id: userId,
        name: project.name,
        blueprint: {
          ...project,
          generatedFiles: Object.keys(files),
          fileCount: Object.keys(files).length,
          pageCount: project.pages.length,
          componentCount: project.pages.flatMap(p => p.components).length
        },
        generated_code: files // Store the actual generated code
      });

    if (workspaceError) {
      console.error("Workspace error:", workspaceError);
      return res.status(500).json({ error: "Failed to create workspace" });
    }

    // 3️⃣ Store generation history
    const { error: historyError } = await supabaseAdmin
      .from("generation_history")
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        workspace_id: workspaceId,
        prompt,
        constraints,
        blueprint: project
      });

    if (historyError) {
      console.error("History error:", historyError);
      return res.status(500).json({ error: "Failed to store generation history" });
    }

    console.log('✅ Website generation completed:', {
      workspaceId,
      pages: project.pages.length,
      files: Object.keys(files).length
    });

    // 4️⃣ Return workspace data with generation info
    return res.json({
      workspaceId,
      project,
      fileCount: Object.keys(files).length,
      pages: project.pages.length,
      previewUrl: generation.previewUrl
    });

  } catch (err: any) {
    console.error("❌ Generation error:", err);
    return res.status(500).json({ 
      error: err.message || "Website generation failed" 
    });
  }
});

// New endpoint to get generated code for a workspace
router.get("/:workspaceId/code", async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const { data: workspace, error } = await supabaseAdmin
      .from("workspaces")
      .select("generated_code, blueprint")
      .eq("id", workspaceId)
      .single();

    if (error || !workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    return res.json({
      files: workspace.generated_code || {},
      project: workspace.blueprint
    });

  } catch (err: any) {
    console.error("❌ Code fetch error:", err);
    return res.status(500).json({ 
      error: err.message || "Failed to fetch code" 
    });
  }
});

// New endpoint to regenerate/update specific parts
router.post("/:workspaceId/regenerate", async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { prompt, modifications } = req.body;

    // Get existing workspace
    const { data: workspace, error } = await supabaseAdmin
      .from("workspaces")
      .select("*")
      .eq("id", workspaceId)
      .single();

    if (error || !workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    // Regenerate with modifications
    const generation = await generateWebsiteFromPrompt({
      prompt: `${workspace.blueprint.description}\n\nModifications: ${modifications}`,
      userId: workspace.user_id,
      constraints: ""
    });

    // Update workspace with new code
    const { error: updateError } = await supabaseAdmin
      .from("workspaces")
      .update({
        blueprint: generation.project,
        generated_code: generation.files,
        updated_at: new Date().toISOString()
      })
      .eq("id", workspaceId);

    if (updateError) {
      return res.status(500).json({ error: "Failed to update workspace" });
    }

    return res.json({
      workspaceId,
      project: generation.project,
      files: generation.files,
      regenerated: true
    });

  } catch (err: any) {
    console.error("❌ Regeneration error:", err);
    return res.status(500).json({ 
      error: err.message || "Regeneration failed" 
    });
  }
});

export default router;
