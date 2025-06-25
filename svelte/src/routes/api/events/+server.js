import { dataManager } from '$lib/server/data-manager.js';

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Set up SSE response interface
      const response = {
        write: (data) => {
          controller.enqueue(new TextEncoder().encode(data));
        },
        on: (event, handler) => {
          // Mock event handling for client disconnect
          if (event === 'close') {
            response._closeHandler = handler;
          }
        }
      };

      // Add client to data manager
      dataManager.addSSEClient(response);

      // Handle stream close
      return () => {
        if (response._closeHandler) {
          response._closeHandler();
        }
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}