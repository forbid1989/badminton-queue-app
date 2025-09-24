import { NextRequest, NextResponse } from "next/server";

// In-memory store for session data (in production, consider Redis or a database)
const sessionStore = new Map<string, any>();
const sessionConnections = new Map<
  string,
  Set<ReadableStreamDefaultController>
>();

// Helper function to broadcast to all viewers in a session
function broadcastToSession(sessionId: string, data: any) {
  const controllers = sessionConnections.get(sessionId);
  if (controllers && controllers.size > 0) {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(message);

    // Send to all connected viewers
    controllers.forEach((controller) => {
      try {
        controller.enqueue(encodedMessage);
      } catch (error) {
        // Remove dead connections
        controllers.delete(controller);
        console.log("Removed dead SSE connection");
      }
    });
  }
}

// GET handler - Sets up SSE connection for viewers
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> } // Updated for Next.js 15
) {
  const { sessionId } = await context.params; // Await the params in Next.js 15

  console.log(`📡 SSE connection request for session: ${sessionId}`);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to the session
      if (!sessionConnections.has(sessionId)) {
        sessionConnections.set(sessionId, new Set());
      }
      sessionConnections.get(sessionId)!.add(controller);

      const viewerCount = sessionConnections.get(sessionId)!.size;
      console.log(
        `👁️ New viewer joined session ${sessionId}. Total viewers: ${viewerCount}`
      );

      // Send initial data if available
      const sessionData = sessionStore.get(sessionId);
      if (sessionData) {
        const initialMessage = JSON.stringify({
          type: "state_update",
          state: sessionData,
          timestamp: Date.now(),
        });

        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`data: ${initialMessage}\n\n`));
      }

      // Send viewer count update
      broadcastToSession(sessionId, {
        type: "viewer_count_update",
        viewerCount,
        timestamp: Date.now(),
      });

      // Set up heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          const heartbeatMessage = JSON.stringify({
            type: "heartbeat",
            timestamp: Date.now(),
          });

          const encoder = new TextEncoder();
          controller.enqueue(encoder.encode(`data: ${heartbeatMessage}\n\n`));
        } catch (error) {
          clearInterval(heartbeat);
        }
      }, 30000); // Every 30 seconds

      // Handle connection cleanup
      request.signal.addEventListener("abort", () => {
        console.log(`🔌 Viewer disconnected from session ${sessionId}`);
        clearInterval(heartbeat);

        const connections = sessionConnections.get(sessionId);
        if (connections) {
          connections.delete(controller);

          if (connections.size === 0) {
            console.log(
              `🗑️ No more viewers in session ${sessionId}, cleaning up`
            );
            sessionConnections.delete(sessionId);

            // Clean up session data after 60 seconds of no viewers
            setTimeout(() => {
              sessionStore.delete(sessionId);
              console.log(`🗑️ Session data cleaned up for ${sessionId}`);
            }, 60000);
          } else {
            // Update viewer count
            broadcastToSession(sessionId, {
              type: "viewer_count_update",
              viewerCount: connections.size,
              timestamp: Date.now(),
            });
          }
        }

        try {
          controller.close();
        } catch (error) {
          // Connection might already be closed
        }
      });
    },
  });

  // Return SSE response with proper headers
  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}

// POST handler - Receives state updates from host
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ sessionId: string }> } // Updated for Next.js 15
) {
  const { sessionId } = await context.params; // Await the params in Next.js 15

  try {
    const body = await request.json();
    const { state, type = "state_update" } = body;

    console.log(`📤 Received ${type} for session ${sessionId}`);

    // Store the latest state
    sessionStore.set(sessionId, state);

    // Broadcast to all viewers
    broadcastToSession(sessionId, {
      type,
      state,
      timestamp: Date.now(),
    });

    const viewerCount = sessionConnections.get(sessionId)?.size || 0;
    console.log(`📡 Broadcasted to ${viewerCount} viewers`);

    return NextResponse.json({
      success: true,
      viewerCount,
      message: `Broadcasted to ${viewerCount} viewers`,
    });
  } catch (error) {
    console.error("❌ Error processing POST request:", error);
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
