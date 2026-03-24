#!/usr/bin/env node
// ─────────────────────────────────────────────
// SilkWeb MCP Server
// Exposes all 9 SilkWeb agents as MCP tools for
// Claude Desktop, OpenClaw, and MCP-compatible clients
// ─────────────────────────────────────────────

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');

const { tools } = require('./tools');
const { executeToolCall } = require('./proxy');

// ─── Create MCP Server ─────────────────────

const server = new Server(
  {
    name: 'silkweb',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ─── List Tools Handler ─────────────────────
// Returns all registered tool definitions with their schemas

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  };
});

// ─── Call Tool Handler ──────────────────────
// Routes incoming tool calls to the appropriate agent via proxy

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Find the tool definition
  const toolDef = tools.find((t) => t.name === name);
  if (!toolDef) {
    return {
      content: [
        {
          type: 'text',
          text: `Unknown tool: "${name}". Use silkweb_list_agents to see available tools.`,
        },
      ],
      isError: true,
    };
  }

  // Execute the tool call via the proxy layer
  return executeToolCall(name, args, toolDef);
});

// ─── Error Handling ─────────────────────────

server.onerror = (error) => {
  console.error('[SilkWeb MCP] Server error:', error);
};

process.on('SIGINT', async () => {
  await server.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.close();
  process.exit(0);
});

// ─── Start Server ───────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[SilkWeb MCP] Server started \u2014 9 agents, ' + tools.length + ' tools registered');
  console.error('[SilkWeb MCP] Base URL: ' + (process.env.SILKWEB_BASE_URL || 'http://localhost'));
}

main().catch((err) => {
  console.error('[SilkWeb MCP] Fatal error:', err);
  process.exit(1);
});
