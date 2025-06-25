import { json } from '@sveltejs/kit';
import { dataManager } from '$lib/server/data-manager.js';

export async function GET() {
  try {
    const stats = dataManager.getStats();
    return json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    console.error('Error getting health status:', error);
    return json({ error: 'Health check failed' }, { status: 500 });
  }
}