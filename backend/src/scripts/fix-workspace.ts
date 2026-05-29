import { supabaseAdmin } from '../lib/supabase';

async function fixWorkspace(workspaceId: string) {
  try {
    // Get the current workspace
    const { data: workspace, error } = await supabaseAdmin
      .from('workspaces')
      .select('*')
      .eq('id', workspaceId)
      .single();

    if (error || !workspace) {
      console.error('Workspace not found:', error);
      return;
    }

    console.log('Current blueprint:', workspace.blueprint);

    // Check if pages is a number (broken) and fix it
    const blueprint = workspace.blueprint as any;
    if (typeof blueprint.pages === 'number') {
      // Create a proper pages array
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

      // Remove the broken pages property
      delete (fixedBlueprint as any).components;

      console.log('Fixed blueprint:', fixedBlueprint);

      // Update the workspace
      const { error: updateError } = await supabaseAdmin
        .from('workspaces')
        .update({ blueprint: fixedBlueprint })
        .eq('id', workspaceId);

      if (updateError) {
        console.error('Failed to update workspace:', updateError);
      } else {
        console.log('✅ Workspace fixed successfully!');
      }
    } else {
      console.log('Workspace already has correct structure');
    }

  } catch (error) {
    console.error('Error fixing workspace:', error);
  }
}

// Fix the specific workspace
fixWorkspace('73dabb07-f251-466a-a414-d73ac0ec71a8');
