# SilkWeb MCP Server

Model Context Protocol server that exposes all 9 SilkWeb agents as tools for Claude Desktop, OpenClaw, and any MCP-compatible client.

## Agents & Tools

| # | Agent | Tools | Port |
|---|-------|-------|------|
| 1 | **AEGIS** — Cybersecurity | `silkweb_aegis_scan_url` `silkweb_aegis_scan_ssl` `silkweb_aegis_scan_domain` `silkweb_aegis_report` | 3003 |
| 2 | **NAVIGATOR** — Logistics | `silkweb_navigator_route` `silkweb_navigator_customs` `silkweb_navigator_carbon` | 3004 |
| 3 | **SENTINEL** — IT Ops | `silkweb_sentinel_health` `silkweb_sentinel_dns` `silkweb_sentinel_ssl_expiry` `silkweb_sentinel_logs` `silkweb_sentinel_incident` | 3005 |
| 4 | **ORACLE** — Finance | `silkweb_oracle_company` `silkweb_oracle_risk` `silkweb_oracle_fraud` `silkweb_oracle_compliance` | 3006 |
| 5 | **ATLAS** — Geospatial | `silkweb_atlas_distance` `silkweb_atlas_geofence` `silkweb_atlas_sun` `silkweb_atlas_route` | 3007 |
| 6 | **DESIGN** — Images | `silkweb_design_social` `silkweb_design_code` `silkweb_design_hero` | 3002 |
| 7 | **JUSTICE** — Contract Law | `silkweb_justice_contract` `silkweb_justice_nda` `silkweb_justice_clause` | 3008 |
| 8 | **SHIELD** — Personal Injury | `silkweb_shield_evaluate` `silkweb_shield_damages` `silkweb_shield_statute` | 3009 |
| 9 | **FORTRESS** — Criminal Defense | `silkweb_fortress_charge` `silkweb_fortress_rights` `silkweb_fortress_evidence` | 3010 |

Plus `silkweb_list_agents` — lists all agents and their capabilities.

**Total: 31 tools**

## Install

```bash
cd mcp-server
npm install
```

## Add to Claude Desktop

Edit your Claude Desktop config file:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### Local development (agents running on localhost)

```json
{
  "mcpServers": {
    "silkweb": {
      "command": "node",
      "args": ["/path/to/SilkWeb/mcp-server/src/index.js"]
    }
  }
}
```

### Production (agents at api.silkweb.io)

```json
{
  "mcpServers": {
    "silkweb": {
      "command": "node",
      "args": ["/path/to/SilkWeb/mcp-server/src/index.js"],
      "env": {
        "SILKWEB_BASE_URL": "https://api.silkweb.io"
      }
    }
  }
}
```

## Add to OpenClaw

In OpenClaw settings, add a new MCP server:

- **Name**: SilkWeb
- **Command**: `node`
- **Arguments**: `/path/to/SilkWeb/mcp-server/src/index.js`
- **Environment** (optional): `SILKWEB_BASE_URL=https://api.silkweb.io`

## Add to Claude Code

```bash
claude mcp add silkweb node /path/to/SilkWeb/mcp-server/src/index.js
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `SILKWEB_BASE_URL` | `http://localhost` | Base URL for agent endpoints. Set to `https://api.silkweb.io` for production. |
| `SILKWEB_TIMEOUT_MS` | `30000` | Request timeout in milliseconds |

## Test

Make sure at least one agent is running, then:

```bash
# Start an agent (e.g., AEGIS on port 3003)
cd ../agents/aegis-security && npm start &

# Run the MCP server directly (it uses stdio, so pipe JSON-RPC)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node src/index.js
```

Or use the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector node src/index.js
```

## Architecture

```
mcp-server/
  package.json          — Dependencies (@modelcontextprotocol/sdk)
  src/
    index.js            — MCP server entry point (stdio transport)
    tools.js            — 31 tool definitions with JSON Schema inputs
    proxy.js            — Routes tool calls to agent HTTP endpoints
```

The server communicates with MCP clients via **stdio** (JSON-RPC over stdin/stdout). When a tool is called, the proxy layer makes an HTTP request to the appropriate SilkWeb agent and returns the result.

## License

Apache-2.0
