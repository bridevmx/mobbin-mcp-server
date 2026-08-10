require("dotenv").config();
const express = require("express");
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const { z } = require("zod");

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "mobbin-mcp-server" });
});

// Helper function to create an MCP server instance per connection
function createMcpServer(apiKey) {
  const server = new McpServer({
    name: "mobbin-mcp-server",
    version: "1.0.0",
  });

  server.tool(
    "mobbin_search_screens",
    "Search Mobbin for UI screens using natural language. Returns matching screens with preview images and links.",
    {
      query: z.string().describe("Describe one screen in plain language (e.g., 'login screen with biometric authentication')."),
      platform: z.enum(["ios", "web"]).describe("Platform to search (ios, web)."),
      mode: z.enum(["deep", "standard", "fast"]).optional().default("deep").describe("Search mode."),
      limit: z.number().optional().default(10).describe("Maximum number of screens to return."),
      image_quality: z.enum(["optimized", "high"]).optional().default("optimized").describe("Image quality.")
    },
    async ({ query, platform, mode, limit, image_quality }) => {
      try {
        if (!apiKey) {
          return {
            content: [
              {
                type: "text",
                text: "Error: MOBBIN_API_KEY is missing. Pass it via environment variable or Bearer token header."
              }
            ],
            isError: true
          };
        }

        const res = await fetch("https://api.mobbin.com/v1/screens/search", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query,
            platform,
            mode: mode || "deep",
            limit: limit || 10,
            image_quality: image_quality || "optimized"
          })
        });

        if (!res.ok) {
          const errText = await res.text();
          return {
            content: [
              {
                type: "text",
                text: `Error from Mobbin API (${res.status}): ${errText}`
              }
            ],
            isError: true
          };
        }

        const data = await res.json();
        const screens = data.screens || [];

        if (screens.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No screens found for query "${query}" on platform "${platform}".`
              }
            ]
          };
        }

        let textOutput = `Found ${screens.length} screens for query "${query}" on ${platform}:\n\n`;

        for (const screen of screens) {
          const imgUrl = screen.image?.url || screen.image_url;
          textOutput += `### App: ${screen.app_name} (${screen.platform})\n`;
          textOutput += `- **ID**: ${screen.id}\n`;
          textOutput += `- **Mobbin URL**: [View on Mobbin](${screen.mobbin_url})\n`;
          if (imgUrl) {
            textOutput += `- **Preview**: ![${screen.app_name} Screen](${imgUrl})\n`;
          }
          textOutput += `\n---\n\n`;
        }

        return {
          content: [
            {
              type: "text",
              text: textOutput
            }
          ]
        };
      } catch (err) {
        return {
          content: [
            {
              type: "text",
              text: `Error executing search: ${err.message}`
            }
          ],
          isError: true
        };
      }
    }
  );

  return server;
}

// Active transports map
const transports = new Map();

function getApiKey(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return process.env.MOBBIN_API_KEY || "";
}

// SSE Endpoint
app.get("/sse", async (req, res) => {
  const apiKey = getApiKey(req);
  const mcpServer = createMcpServer(apiKey);
  const transport = new SSEServerTransport("/messages", res);

  transports.set(transport.sessionId, { transport, mcpServer });

  req.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await mcpServer.connect(transport);
});

// Messages Endpoint
app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const session = transports.get(sessionId);

  if (!session) {
    return res.status(404).send("Session not found");
  }

  await session.transport.handlePostMessage(req, res, req.body);
});

app.listen(PORT, () => {
  console.log(`Mobbin MCP Remote Server listening on port ${PORT}`);
  console.log(`SSE Endpoint: http://localhost:${PORT}/sse`);
});
