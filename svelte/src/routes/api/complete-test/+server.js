import { json } from '@sveltejs/kit';
import { dataManager } from '$lib/server/data-manager.js';

export async function POST({ request }) {
  try {
    const data = await request.json();
    
    // Validate input
    if (!data.testerName || !data.taskId || !data.taskName || 
        data.time === undefined || data.steps === undefined || data.errors === undefined) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }

    const result = dataManager.completeTest(data);
    
    if (result.success) {
      return json(result);
    } else {
      return json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Error completing test:', error);
    return json({ error: 'Failed to complete test' }, { status: 500 });
  }
}