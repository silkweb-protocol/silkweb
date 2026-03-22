/**
 * SilkWeb Plugin for OpenClaw
 *
 * Tools: silkweb_discover, silkweb_delegate, silkweb_network
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import https from "node:https";
import { URL } from "node:url";

const API_KEY = process.env.SILKWEB_API_KEY || "sw_live_3d883b2c0d433dd49e73fc9e51cab9a75cdfb7634c38df7300218ee7237a7e53";
const BASE_URL = process.env.SILKWEB_BASE_URL || "https://api.silkweb.io";

function silkReq(method: string, path: string, body?: Record<string, unknown>): Promise<any> {
  const url = new URL(path, BASE_URL);
  const opts: https.RequestOptions = {
    method,
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "User-Agent": "@silkweb/openclaw/0.1.0",
      Accept: "application/json",
    },
  };
  if (body) {
    const payload = JSON.stringify(body);
    opts.headers!["Content-Type"] = "application/json";
    opts.headers!["Content-Length"] = Buffer.byteLength(payload).toString();
  }
  return new Promise((resolve, reject) => {
    const req = https.request(opts, (res) => {
      let data = "";
      res.on("data", (c: string) => (data += c));
      res.on("end", () => {
        try {
          const p = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) { reject(new Error(p.detail || `HTTP ${res.statusCode}`)); return; }
          resolve(p);
        } catch { reject(new Error(`Bad response: ${data.slice(0, 100)}`)); }
      });
    });
    req.on("error", (e: Error) => reject(e));
    req.setTimeout(30000, () => { req.destroy(); reject(new Error("Timeout")); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const json = (text: string) => ({
  content: [{ type: "text" as const, text }],
});

const plugin = {
  id: "silkweb",
  name: "SilkWeb",
  description: "Connect your OpenClaw agents to the SilkWeb network. Discover, delegate, and verify tasks across AI agents worldwide.",
  configSchema: {
    type: "object" as const,
    additionalProperties: true,
    properties: {},
  },

  register(api: OpenClawPluginApi) {
    // Tool 1: Discover agents
    api.registerTool({
      name: "silkweb_discover",
      label: "SilkWeb Discover",
      description: "Search the SilkWeb network for AI agents by capability. Use when you need another agent — legal review, data analysis, translation, code review, flight booking, or any skill you don't have.",
      parameters: {
        type: "object",
        properties: {
          capability: { type: "string", description: 'Capability to find, e.g. "legal-review", "data-analysis", "hello-world"' },
        },
        required: ["capability"],
      },
      async execute(_toolCallId: string, params: { capability: string }) {
        const r = await silkReq("POST", "/api/v1/discover", {
          capabilities: [params.capability],
          min_trust: 0.0,
          limit: 5,
        });
        const agents = (r.agents || []).map((a: any) => `- **${a.name}** (${a.silk_id}): ${a.description}`).join("\n");
        if (!agents) return json(`No agents found with "${params.capability}" on SilkWeb.`);
        return json(`Found ${r.total} agent(s) on SilkWeb:\n\n${agents}\n\nUse silkweb_delegate to send work to an agent.`);
      },
    } as any);

    // Tool 2: Delegate task
    api.registerTool({
      name: "silkweb_delegate",
      label: "SilkWeb Delegate",
      description: "Send a task to another AI agent on the SilkWeb network. Use after silkweb_discover.",
      parameters: {
        type: "object",
        properties: {
          to_silk_id: { type: "string", description: "Target agent silk_id from discover results" },
          capability: { type: "string", description: "Capability to invoke" },
          input: { type: "string", description: "Task description or data to process" },
        },
        required: ["to_silk_id", "capability", "input"],
      },
      async execute(_toolCallId: string, params: { to_silk_id: string; capability: string; input: string }) {
        const r = await silkReq("POST", "/api/v1/tasks", {
          to_silk_id: params.to_silk_id,
          capability: params.capability,
          input: { content: params.input },
          timeout_seconds: 300,
        });
        return json(`Task created!\nTask ID: ${r.task_id}\nStatus: ${r.status}`);
      },
    } as any);

    // Tool 3: Network stats
    api.registerTool({
      name: "silkweb_network",
      label: "SilkWeb Network",
      description: "Check SilkWeb network status — agents, capabilities, and tasks on the network.",
      parameters: { type: "object", properties: {} },
      async execute() {
        const r = await silkReq("GET", "/api/v1/stats");
        return json(`SilkWeb Network:\n- Agents: ${r.agents}\n- Capabilities: ${r.capabilities}\n- Tasks: ${r.tasks_completed}\n- Protocol: ${r.protocol_version}\n\nhttps://silkweb.io`);
      },
    } as any);
  },
};

export default plugin;
