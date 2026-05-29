import { Router } from "express";
import { supabaseAdmin } from "../lib/supabase";

const router = Router();

// Fix broken workspace data
router.post("/fix-workspace/:workspaceId", async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // Get current workspace
    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error || !workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }

    const blueprint = workspace.blueprint as any;
    
    // Check if pages is a number (broken data)
    if (typeof blueprint.pages === 'number') {
      // Create proper pages array
      const fixedBlueprint = {
        ...blueprint,
        pages: [
          {
            name: 'FooterPage',
            path: '/',
            components: [
              {
                name: 'Footer',
                type: 'footer',
                library: 'tailwindui',
                props: {},
                children: []
              }
            ]
          }
        ],
        pageCount: blueprint.pages,
        componentCount: blueprint.components || 1
      };

      // Remove broken properties
      delete (fixedBlueprint as any).components;

      // Update workspace
      const { error: updateError } = await supabaseAdmin
        .from('workspaces')
        .update({ blueprint: fixedBlueprint })
        .eq('id', workspaceId);

      if (updateError) {
        return res.status(500).json({ error: "Failed to fix workspace" });
      }

      return res.json({ 
        success: true, 
        message: "Workspace fixed successfully",
        blueprint: fixedBlueprint
      });
    } else {
      return res.json({ 
        success: true, 
        message: "Workspace already has correct structure" 
      });
    }

  } catch (error: any) {
    console.error("Fix error:", error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
