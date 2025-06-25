import { json } from '@sveltejs/kit';
import { dataManager } from '$lib/server/data-manager.js';

export async function GET() {
  try {
    const state = dataManager.getState();
    return json(state);
  } catch (error) {
    console.error('Error getting leaderboard data:', error);
    return json({ error: 'Failed to get leaderboard data' }, { status: 500 });
  }
}