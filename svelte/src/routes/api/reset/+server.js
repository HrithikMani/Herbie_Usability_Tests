import { json } from '@sveltejs/kit';
import { dataManager } from '$lib/server/data-manager.js';

export async function POST() {
  try {
    const result = dataManager.reset();
    
    if (result.success) {
      return json(result);
    } else {
      return json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error resetting leaderboard:', error);
    return json({ error: 'Failed to reset leaderboard' }, { status: 500 });
  }
}