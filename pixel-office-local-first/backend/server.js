import http from "http";
import { randomUUID } from "crypto";

const PORT = process.env.PORT || 3001;

const clients = new Set();
const agents = new Map();

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(event, data) {
  for (const res of clients) {
    sendEvent(res, event, data);
  }
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  if (method === "GET" && url === "/api/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    res.write("\n");
    clients.add(res);

    const snapshot = Array.from(agents.values());
    sendEvent(res, "snapshot", snapshot);

    req.on("close", () => {
      clients.delete(res);
    });
    return;
  }

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  if (method === "POST" && url === "/api/agents/init") {
    const body = await readJson(req);
    agents.clear();
    for (const agent of body.agents || []) {
      agents.set(agent.id, agent);
    }
    broadcast("snapshot", Array.from(agents.values()));
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (method === "POST" && url === "/api/agents") {
    const body = await readJson(req);
    const id = randomUUID();
    const agent = { id, ...body };
    agents.set(id, agent);
    broadcast("agent_created", agent);
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify(agent));
    return;
  }

  if (method === "POST" && url === "/api/event") {
    const body = await readJson(req);
    broadcast(body.event, body.data ?? {});
    res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`SSE backend running on http://localhost:${PORT}`);
});

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
