#!/usr/bin/env node
/**
 * Gmail MCP Server dla avatar.mieszek@gmail.com
 * Używa istniejących tokenów z .gmail-tokens.json
 *
 * Narzędzia:
 *  - gmail_search    : szuka wiadomości
 *  - gmail_read      : czyta treść wiadomości
 *  - gmail_list      : lista ostatnich wiadomości
 *  - gmail_get_profile: informacje o koncie
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const TOKENS_PATH = join(ROOT, ".gmail-tokens.json");
const ENV_PATH = join(ROOT, ".env.gmail");

// --- MCP Protocol helpers ---
function send(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

function error(id, code, message) {
  send({ jsonrpc: "2.0", id, error: { code, message } });
}

// --- Token management ---
function loadEnv() {
  if (!existsSync(ENV_PATH)) throw new Error("Brak .env.gmail");
  return Object.fromEntries(
    readFileSync(ENV_PATH, "utf-8")
      .split("\n")
      .filter(l => l.includes("=") && !l.startsWith("#"))
      .map(l => l.split("=").map(s => s.trim()))
  );
}

function loadTokens() {
  if (!existsSync(TOKENS_PATH)) throw new Error("Brak .gmail-tokens.json — uruchom setup-oauth.mjs");
  return JSON.parse(readFileSync(TOKENS_PATH, "utf-8"));
}

async function getAccessToken() {
  const tokens = loadTokens();
  if (Date.now() < tokens.expiry_date - 60000) return tokens.access_token;

  // Refresh
  const env = loadEnv();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GMAIL_CLIENT_ID,
      client_secret: env.GMAIL_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  tokens.access_token = data.access_token;
  tokens.expiry_date = Date.now() + data.expires_in * 1000;
  writeFileSync(TOKENS_PATH, JSON.stringify(tokens, null, 2));
  return tokens.access_token;
}

async function gmailApi(endpoint, params = {}) {
  const token = await getAccessToken();
  const query = new URLSearchParams(params).toString();
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/${endpoint}${query ? "?" + query : ""}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

function decodeBase64(str) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
}

function extractBody(payload) {
  if (payload?.body?.data) return decodeBase64(payload.body.data);
  if (payload?.parts) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) return decodeBase64(part.body.data);
    }
    for (const part of payload.parts) {
      const b = extractBody(part);
      if (b) return b;
    }
  }
  return "";
}

async function getMessage(id) {
  const msg = await gmailApi(`messages/${id}`, { format: "full" });
  const headers = Object.fromEntries((msg.payload?.headers || []).map(h => [h.name.toLowerCase(), h.value]));
  const body = extractBody(msg.payload);
  return {
    id: msg.id,
    date: headers.date || "",
    from: headers.from || "",
    to: headers.to || "",
    subject: headers.subject || "(brak tematu)",
    snippet: msg.snippet || "",
    body: body.slice(0, 2000),
    unread: (msg.labelIds || []).includes("UNREAD"),
    labels: msg.labelIds || [],
  };
}

// --- Tool handlers ---
const TOOLS = {
  gmail_list: {
    description: "Lista ostatnich wiadomości z Gmaila avatar.mieszek@gmail.com",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Liczba wiadomości (domyślnie 10)" },
        unread_only: { type: "boolean", description: "Tylko nieprzeczytane" },
      },
    },
    async handler({ limit = 10, unread_only = false }) {
      const q = unread_only ? "is:unread" : "";
      const list = await gmailApi("messages", { maxResults: limit, ...(q ? { q } : {}) });
      const messages = list.messages || [];
      const results = await Promise.all(messages.map(m => getMessage(m.id)));
      return results.map(m => ({
        id: m.id, date: m.date, from: m.from, subject: m.subject,
        snippet: m.snippet.slice(0, 100), unread: m.unread,
      }));
    },
  },

  gmail_search: {
    description: "Szuka wiadomości w Gmailu avatar.mieszek@gmail.com",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Zapytanie Gmail (np. 'from:noreply@stripe.com subject:faktura')" },
        limit: { type: "number", description: "Liczba wyników (domyślnie 10)" },
      },
      required: ["query"],
    },
    async handler({ query, limit = 10 }) {
      const list = await gmailApi("messages", { q: query, maxResults: limit });
      const messages = list.messages || [];
      if (!messages.length) return { found: 0, messages: [] };
      const results = await Promise.all(messages.map(m => getMessage(m.id)));
      return {
        found: list.resultSizeEstimate || messages.length,
        messages: results.map(m => ({
          id: m.id, date: m.date, from: m.from, subject: m.subject,
          snippet: m.snippet.slice(0, 150), unread: m.unread,
        })),
      };
    },
  },

  gmail_read: {
    description: "Czyta pełną treść wiadomości z Gmaila",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "ID wiadomości (z gmail_list lub gmail_search)" },
      },
      required: ["id"],
    },
    async handler({ id }) {
      return getMessage(id);
    },
  },

  gmail_get_profile: {
    description: "Informacje o koncie Gmail avatar.mieszek@gmail.com",
    inputSchema: { type: "object", properties: {} },
    async handler() {
      const profile = await gmailApi("profile");
      return profile;
    },
  },
};

// --- MCP Protocol ---
const CAPS = {
  jsonrpc: "2.0",
  result: {
    protocolVersion: "2024-11-05",
    capabilities: { tools: {} },
    serverInfo: { name: "avatar-gmail", version: "1.0.0" },
  },
};

async function handleRequest(req) {
  const { id, method, params } = req;

  if (method === "initialize") return send({ ...CAPS, id });
  if (method === "notifications/initialized") return;
  if (method === "ping") return send({ jsonrpc: "2.0", id, result: {} });

  if (method === "tools/list") {
    return send({
      jsonrpc: "2.0", id,
      result: {
        tools: Object.entries(TOOLS).map(([name, t]) => ({
          name, description: t.description, inputSchema: t.inputSchema,
        })),
      },
    });
  }

  if (method === "tools/call") {
    const { name, arguments: args } = params;
    const tool = TOOLS[name];
    if (!tool) return error(id, -32601, `Unknown tool: ${name}`);
    try {
      const result = await tool.handler(args || {});
      return send({
        jsonrpc: "2.0", id,
        result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] },
      });
    } catch (e) {
      return error(id, -32000, e.message);
    }
  }

  error(id, -32601, `Method not found: ${method}`);
}

// --- Stdin loop ---
let buf = "";
process.stdin.setEncoding("utf-8");
process.stdin.on("data", async chunk => {
  buf += chunk;
  const lines = buf.split("\n");
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const req = JSON.parse(line);
      await handleRequest(req);
    } catch (e) {
      send({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } });
    }
  }
});

process.stdin.on("end", () => process.exit(0));
process.stderr.write("[avatar-gmail MCP] started\n");
