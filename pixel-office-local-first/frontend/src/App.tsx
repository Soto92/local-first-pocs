import { useEffect, useMemo, useRef, useState } from "react";
import {
  CreateMLCEngine,
  prebuiltAppConfig,
  type MLCEngine,
} from "@mlc-ai/web-llm";
import { PixelOfficeEngine } from "./canvas/office";
import { findPath } from "./canvas/pathfinding";
import type { ChatMessage } from "./types";
import type { OfficeAgent, DeskSlot } from "./canvas/types";

const BACKEND_URL = "http://localhost:3001";
const STORAGE_KEY = "pixel-office-local-first";
const MAX_AGENTS = 6;
const MAX_CONVO_LINES = 4;

const COLORS = [
  "#ffb703",
  "#8ecae6",
  "#219ebc",
  "#fb8500",
  "#ef476f",
  "#06d6a0",
];

const COLS = 20;
const ROWS = 14;

const FLOOR_LAYOUT = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 8, 8, 8, 8, 8, 8, 8, 8, 0],
  [0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 8, 8, 8, 8, 8, 8, 8, 8, 0],
  [0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 8, 8, 8, 8, 8, 8, 8, 8, 0],
  [0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 8, 8, 6, 6, 6, 6, 8, 8, 0],
  [0, 7, 7, 7, 6, 6, 6, 7, 7, 7, 0, 8, 8, 6, 6, 6, 6, 8, 8, 0],
  [0, 7, 7, 7, 6, 6, 6, 7, 7, 7, 8, 8, 8, 6, 6, 6, 6, 8, 8, 0],
  [0, 7, 7, 7, 6, 6, 6, 7, 7, 7, 8, 8, 8, 6, 6, 6, 6, 8, 8, 0],
  [0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 8, 8, 8, 8, 8, 8, 8, 8, 0],
  [0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 8, 8, 8, 8, 8, 8, 8, 8, 0],
  [0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 8, 8, 8, 8, 8, 8, 8, 8, 0],
  [0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 8, 8, 8, 8, 8, 8, 8, 8, 0],
  [0, 7, 7, 7, 7, 7, 7, 7, 7, 7, 0, 8, 8, 8, 8, 8, 8, 8, 8, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const DESK_SLOTS: DeskSlot[] = [
  { x: 2, y: 2, chairX: 2, chairY: 3, pcX: 2, pcY: 1, facing: 0 },
  { x: 5, y: 2, chairX: 5, chairY: 3, pcX: 5, pcY: 1, facing: 0 },
  { x: 8, y: 2, chairX: 8, chairY: 3, pcX: 8, pcY: 1, facing: 0 },
  { x: 2, y: 10, chairX: 2, chairY: 9, pcX: 2, pcY: 11, facing: 0 },
  { x: 5, y: 10, chairX: 5, chairY: 9, pcX: 5, pcY: 11, facing: 0 },
  { x: 8, y: 10, chairX: 8, chairY: 9, pcX: 8, pcY: 11, facing: 0 },
];

const WALKABLE: boolean[][] = FLOOR_LAYOUT.map((row) =>
  row.map((tile) => tile !== 0),
);

for (const desk of DESK_SLOTS) {
  WALKABLE[desk.y][desk.x] = false;
  WALKABLE[desk.pcY][desk.pcX] = false;
}

type AgentForm = {
  id: string;
  name: string;
  modelId: string;
};

type DownloadStatus = {
  id: string;
  progress: number;
  label: string;
};

type AgentMeta = {
  id: string;
  name: string;
  modelId: string;
  deskIndex: number;
  color: string;
};

export default function App() {
  const [phase, setPhase] = useState<"setup" | "office">("setup");
  const [agents, setAgents] = useState<AgentMeta[]>([]);
  const [agentForms, setAgentForms] = useState<AgentForm[]>(() => {
    const saved = loadSaved();
    if (saved?.agents?.length) {
      return saved.agents.map((agent: AgentForm) => ({
        id: agent.id ?? crypto.randomUUID(),
        name: agent.name ?? "",
        modelId: agent.modelId ?? "",
      }));
    }
    return [{ id: crypto.randomUUID(), name: "", modelId: "" }];
  });
  const [downloadStatus, setDownloadStatus] = useState<DownloadStatus[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatView, setChatView] = useState<ChatMessage[]>([]);

  const agentsRef = useRef<AgentMeta[]>([]);
  const enginesRef = useRef<Map<string, MLCEngine>>(new Map());
  const chatsRef = useRef<Record<string, ChatMessage[]>>({});
  const clientIdRef = useRef(crypto.randomUUID());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<PixelOfficeEngine | null>(null);
  const rafRef = useRef<number | null>(null);
  const addedAgentsRef = useRef<Set<string>>(new Set());

  const modelOptions = useMemo(() => {
    const list = prebuiltAppConfig?.model_list ?? [];
    return list.map((model) => ({ id: model.model_id, name: model.model_id }));
  }, []);

  useEffect(() => {
    if (selectedAgentId) {
      setChatView(chatsRef.current[selectedAgentId] ?? []);
    }
  }, [selectedAgentId]);

  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  useEffect(() => {
    if (phase !== "office") return;
    const canvas = canvasRef.current;
    if (!canvas || engineRef.current) return;
    const engine = new PixelOfficeEngine(canvas);
    engineRef.current = engine;
    let active = true;
    (async () => {
      await engine.init();
      if (!active) return;
      engine.onClick((agentId, clicks) => {
        if (clicks >= 1) setSelectedAgentId(agentId);
      });
      const loop = () => {
        engine.update();
        engine.render();
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    })();
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "office") return;
    const engine = engineRef.current;
    if (!engine) return;
    for (const agent of agentsRef.current) {
      if (addedAgentsRef.current.has(agent.id)) continue;
      engine.addAgent(
        agent.id,
        agent.name,
        agent.modelId,
        agent.color,
        agent.deskIndex,
      );
      addedAgentsRef.current.add(agent.id);
    }
  }, [phase, agents]);

  useEffect(() => {
    if (phase !== "office") return;
    const eventSource = new EventSource(`${BACKEND_URL}/api/stream`);
    eventSource.addEventListener("agent_move", (event) => {
      const payload = JSON.parse((event as MessageEvent).data);
      if (payload.clientId === clientIdRef.current) return;
      moveAgentTo(payload.agentId, payload.target);
    });
    eventSource.addEventListener("agent_bubble", (event) => {
      const payload = JSON.parse((event as MessageEvent).data);
      if (payload.clientId === clientIdRef.current) return;
      pushBubble(payload.agentId, payload.text);
    });
    return () => eventSource.close();
  }, [phase]);

  const handleAddAgent = () => {
    if (agentForms.length >= MAX_AGENTS) return;
    setAgentForms((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", modelId: "" },
    ]);
  };

  const handleStartOffice = async () => {
    const trimmed = agentForms
      .map((agent) => ({ ...agent, name: agent.name.trim() }))
      .filter((agent) => agent.name.length > 0 && agent.modelId.length > 0);

    if (trimmed.length === 0) return;

    const limited = trimmed.slice(0, MAX_AGENTS);
    const nextAgents: AgentMeta[] = limited.map((agent, index) => {
      return {
        id: agent.id,
        name: agent.name,
        modelId: agent.modelId,
        deskIndex: index,
        color: COLORS[index % COLORS.length],
      };
    });

    setDownloadStatus(
      nextAgents.map((agent) => ({
        id: agent.id,
        progress: 0,
        label: "Preparando",
      })),
    );

    for (const agent of nextAgents) {
      await downloadModel(agent);
    }

    setAgents(nextAgents);
    chatsRef.current = loadSaved()?.chats ?? {};
    setSelectedAgentId(nextAgents[0]?.id ?? null);
    setPhase("office");

    for (const agent of nextAgents) {
      moveAgentToDesk(agent.id, agent.deskIndex);
    }

    await postEvent("snapshot", {
      clientId: clientIdRef.current,
      agents: nextAgents,
    });
    saveState(limited, chatsRef.current);
  };

  const downloadModel = async (agent: AgentMeta) => {
    setDownloadStatus((prev) =>
      prev.map((item) =>
        item.id === agent.id ? { ...item, label: "Baixando" } : item,
      ),
    );
    const engine = await CreateMLCEngine(agent.modelId, {
      initProgressCallback: (info) => {
        const progressValue =
          typeof info === "number" ? info : (info.progress ?? 0);
        const label =
          typeof info === "number"
            ? "Baixando"
            : (info.text ?? info.message ?? "Baixando");
        setDownloadStatus((prev) =>
          prev.map((item) =>
            item.id === agent.id
              ? { ...item, progress: progressValue, label }
              : item,
          ),
        );
      },
    });
    enginesRef.current.set(agent.id, engine);
    setDownloadStatus((prev) =>
      prev.map((item) =>
        item.id === agent.id ? { ...item, progress: 1, label: "Pronto" } : item,
      ),
    );
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    const input = chatInput.trim();
    const directAgent = findDirectAgent(input);
    const agentId = directAgent?.id ?? selectedAgentId;
    if (!agentId) return;
    const cleanInput = directAgent
      ? input.slice(directAgent.name.length).replace(/^[:\s]+/, "")
      : input;
    setChatInput("");

    appendChat(agentId, { role: "user", content: cleanInput });

    const deskMatch = cleanInput.match(/mesa\s+(\d+)/i);
    const convoMatch = cleanInput.match(/conversa\s+com\s+o\s+agente\s+(\d+)/i);
    const convoByNameMatch = cleanInput.match(
      /conversar?\s+com\s+(?:o\s+|a\s+)?([a-z0-9_-]+)/i,
    );
    const askByNameMatch = cleanInput.match(
      /(pergunte|pergunta)\s+a[o]?\s+([a-z0-9_-]+)\s+(.+)/i,
    );
    const moveDir = parseMoveDirection(cleanInput);

    if (deskMatch) {
      const index = Number(deskMatch[1]) - 1;
      const target = getDeskTarget(index);
      if (!target) return;
      moveAgentToDesk(agentId, index);
      const reply = `Indo para a mesa ${index + 1}.`;
      appendChat(agentId, { role: "assistant", content: reply });
      pushBubble(agentId, reply);
      await postEvent("agent_move", {
        clientId: clientIdRef.current,
        agentId,
        target,
      });
      await postEvent("agent_bubble", {
        clientId: clientIdRef.current,
        agentId,
        text: reply,
      });
      return;
    }

    if (convoMatch) {
      const index = Number(convoMatch[1]) - 1;
      const other = agentsRef.current[index];
      if (!other) return;
      const reply = `Certo, vou conversar com ${other.name}.`;
      appendChat(agentId, { role: "assistant", content: reply });
      pushBubble(agentId, reply);
      startConversation(agentId, other.id, MAX_CONVO_LINES);
      return;
    }

    if (convoByNameMatch) {
      const other = findAgentByName(convoByNameMatch[1]);
      if (!other) return;
      const reply = `Certo, vou conversar com ${other.name}.`;
      appendChat(agentId, { role: "assistant", content: reply });
      pushBubble(agentId, reply);
      startConversation(agentId, other.id, MAX_CONVO_LINES);
      return;
    }

    if (askByNameMatch) {
      const targetName = askByNameMatch[2];
      const question = askByNameMatch[3];
      const target = findAgentByName(targetName);
      if (!target) return;
      const reply = `Ok, vou perguntar a ${target.name}.`;
      appendChat(agentId, { role: "assistant", content: reply });
      pushBubble(agentId, reply);
      await askAgentToAsk(agentId, target.id, question);
      return;
    }

    if (moveDir) {
      const dir = moveDir;
      const result = tryMoveDirectional(agentId, dir);
      const reply = result.ok
        ? `Indo para ${dir} ${result.steps} casas.`
        : "Nao da, tem um obstaculo!";
      appendChat(agentId, { role: "assistant", content: reply });
      pushBubble(agentId, reply);
      await postEvent("agent_bubble", {
        clientId: clientIdRef.current,
        agentId,
        text: reply,
      });
      return;
    }

    await chatWithModel(agentId, cleanInput);
  };

  const appendChat = (agentId: string, message: ChatMessage) => {
    const current = chatsRef.current[agentId] ?? [];
    const next = [...current, message];
    chatsRef.current[agentId] = next;
    if (agentId === selectedAgentId) setChatView(next);
    saveState(
      agentsRef.current.map((agent) => ({
        id: agent.id,
        name: agent.name,
        modelId: agent.modelId,
      })),
      chatsRef.current,
    );
  };

  const chatWithModel = async (
    agentId: string,
    input: string,
    silent = false,
  ) => {
    const engine = enginesRef.current.get(agentId);
    if (!engine) return;
    setTyping(agentId, true);

    const history = chatsRef.current[agentId] ?? [];
    const messages = [
      {
        role: "system",
        content: "Responda em português, curto e direto, 1-2 frases.",
      },
      ...history,
    ];

    const response = await engine.chat.completions.create({
      messages,
      temperature: 0.2,
    });

    const text = response.choices?.[0]?.message?.content?.trim() ?? "";
    if (!silent) {
      appendChat(agentId, { role: "assistant", content: text });
      pushBubble(agentId, text);
      await postEvent("agent_bubble", {
        clientId: clientIdRef.current,
        agentId,
        text,
      });
    }
    setTyping(agentId, false);
    return text;
  };

  const startConversation = async (
    agentAId: string,
    agentBId: string,
    maxLines: number,
  ) => {
    const agentA = agentsRef.current.find((agent) => agent.id === agentAId);
    const agentB = agentsRef.current.find((agent) => agent.id === agentBId);
    if (!agentA || !agentB) return;

    moveAgentNear(agentAId, agentBId);

    let lastLine = "Vamos trocar ideias rápidas sobre a tarefa?";
    for (let i = 0; i < maxLines; i += 1) {
      const speaker = i % 2 === 0 ? agentA : agentB;
      const engine = enginesRef.current.get(speaker.id);
      if (!engine) break;
      setTyping(speaker.id, true);
      const response = await engine.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Converse em 1 frase curta, max 12 palavras.",
          },
          { role: "user", content: lastLine },
        ],
        temperature: 0.4,
      });
      const text = response.choices?.[0]?.message?.content?.trim() ?? "...";
      pushBubble(speaker.id, text);
      lastLine = text;
      setTyping(speaker.id, false);
    }
  };

  const askAgentToAsk = async (
    fromId: string,
    toId: string,
    question: string,
  ) => {
    const from = agentsRef.current.find((agent) => agent.id === fromId);
    const to = agentsRef.current.find((agent) => agent.id === toId);
    if (!from || !to) return;
    moveAgentNear(fromId, toId);
    appendChat(toId, {
      role: "user",
      content: `(John) ${question}`.replace("(John)", from.name),
    });
    const answer = await chatWithModel(toId, question, true);
    if (!answer) return;
    appendChat(toId, { role: "assistant", content: answer });
    pushBubble(toId, answer);
    await postEvent("agent_bubble", {
      clientId: clientIdRef.current,
      agentId: toId,
      text: answer,
    });
    const relay = `${to.name} respondeu: ${answer}`;
    appendChat(fromId, { role: "assistant", content: relay });
    pushBubble(fromId, relay);
  };

  const moveAgentNear = (agentId: string, targetId: string) => {
    const agent = getEngineAgent(agentId);
    const target = getEngineAgent(targetId);
    if (!agent || !target) return;
    const start = {
      x: Math.floor(agent.position.x),
      y: Math.floor(agent.position.y),
    };
    const candidates = [
      {
        x: Math.floor(target.position.x) + 1,
        y: Math.floor(target.position.y),
      },
      {
        x: Math.floor(target.position.x) - 1,
        y: Math.floor(target.position.y),
      },
      {
        x: Math.floor(target.position.x),
        y: Math.floor(target.position.y) + 1,
      },
      {
        x: Math.floor(target.position.x),
        y: Math.floor(target.position.y) - 1,
      },
    ];
    for (const pos of candidates) {
      if (pos.x === start.x && pos.y === start.y) return;
      const path = findPath(start, pos, WALKABLE, COLS, ROWS);
      if (path.length > 0) {
        moveAgentTo(agentId, pos);
        return;
      }
    }
  };

  const moveAgentToDesk = (agentId: string, deskIndex: number) => {
    const target = getDeskTarget(deskIndex);
    if (!target) return;
    moveAgentTo(agentId, target);
  };

  const getDeskTarget = (deskIndex: number) => {
    const desk = DESK_SLOTS[deskIndex];
    if (!desk) return null;
    return { x: desk.chairX, y: desk.chairY };
  };

  const moveAgentTo = (agentId: string, target: { x: number; y: number }) => {
    const agent = getEngineAgent(agentId);
    if (!agent) return;
    const start = {
      x: Math.floor(agent.position.x),
      y: Math.floor(agent.position.y),
    };
    const path = findPath(start, target, WALKABLE, COLS, ROWS);
    agent.targetPosition = target;
    agent.path = path;
    agent.state = "walking";
  };

  const tryMoveDirectional = (agentId: string, direction: string) => {
    const agent = getEngineAgent(agentId);
    if (!agent) return { ok: false, steps: 0 };
    const start = {
      x: Math.floor(agent.position.x),
      y: Math.floor(agent.position.y),
    };
    const delta =
      direction === "direita"
        ? { x: 1, y: 0 }
        : direction === "esquerda"
          ? { x: -1, y: 0 }
          : direction === "cima"
            ? { x: 0, y: -1 }
            : { x: 0, y: 1 };
    const steps = 3;
    for (let i = 1; i <= steps; i += 1) {
      const tx = start.x + delta.x * i;
      const ty = start.y + delta.y * i;
      if (!isWalkable(tx, ty)) return { ok: false, steps: i - 1 };
    }
    const target = {
      x: start.x + delta.x * steps,
      y: start.y + delta.y * steps,
    };
    moveAgentTo(agentId, target);
    return { ok: true, steps };
  };

  const pushBubble = (agentId: string, text: string) => {
    const agent = getEngineAgent(agentId);
    if (!agent) return;
    agent.speechBubble = text;
    agent.speechTimer = 180;
  };

  const findDirectAgent = (input: string) => {
    const lower = input.toLowerCase();
    return agentsRef.current.find((agent) => {
      const name = agent.name.toLowerCase();
      return lower.startsWith(`${name} `) || lower.startsWith(`${name}:`);
    });
  };

  const findAgentByName = (name: string) => {
    const lower = name.toLowerCase();
    return agentsRef.current.find(
      (agent) => agent.name.toLowerCase() === lower,
    );
  };

  const parseMoveDirection = (
    input: string,
  ): "direita" | "esquerda" | "cima" | "baixo" | null => {
    const normalized = input
      .toLowerCase()
      .replace(/[.!?,;:]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const hasMoveVerb =
      /(vai|andar|ande|caminhar|caminhe|mover|move|ir|vá)\b/.test(normalized);
    if (!hasMoveVerb) return null;
    if (/\bdireita\b|\bright\b/.test(normalized)) return "direita";
    if (/\besquerda\b|\bleft\b/.test(normalized)) return "esquerda";
    if (/\bcima\b|\bup\b/.test(normalized)) return "cima";
    if (/\bbaixo\b|\bdown\b/.test(normalized)) return "baixo";
    return null;
  };

  const getEngineAgent = (agentId: string): OfficeAgent | null => {
    const engine = engineRef.current as unknown as {
      agents?: Map<string, OfficeAgent>;
    };
    if (!engine?.agents) return null;
    return engine.agents.get(agentId) ?? null;
  };

  const setTyping = (agentId: string, typing: boolean) => {
    engineRef.current?.setAgentTyping(agentId, typing);
  };

  return (
    <div className="app">
      {phase === "setup" ? (
        <div className="setup">
          <div className="setup-card">
            <h1>Pixel Office Local-First</h1>
            <p>Download your agents and watch his interaction.</p>

            {agentForms.map((agent, index) => (
              <div className="agent-form" key={agent.id}>
                <input
                  placeholder={`Agent name ${index + 1}`}
                  value={agent.name}
                  onChange={(event) =>
                    setAgentForms((prev) =>
                      prev.map((item) =>
                        item.id === agent.id
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
                <select
                  value={agent.modelId}
                  onChange={(event) =>
                    setAgentForms((prev) =>
                      prev.map((item) =>
                        item.id === agent.id
                          ? { ...item, modelId: event.target.value }
                          : item,
                      ),
                    )
                  }
                >
                  <option value="">Selecione o modelo</option>
                  {modelOptions.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <button className="secondary" onClick={handleAddAgent}>
              + Agent
            </button>
            <button className="primary" onClick={handleStartOffice}>
              Download models and Join to the office
            </button>

            {downloadStatus.length > 0 && (
              <div className="download-list">
                {downloadStatus.map((status) => (
                  <div className="download-item" key={status.id}>
                    <span>{status.label}</span>
                    <div className="progress-bar">
                      <div
                        style={{
                          width: `${Math.round(status.progress * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="office">
          <div className="office-left">
            <canvas ref={canvasRef} className="office-canvas" />
          </div>
          <div className="office-right">
            <div className="agent-list">
              {agentsRef.current.map((agent, index) => (
                <button
                  key={agent.id}
                  className={agent.id === selectedAgentId ? "active" : ""}
                  onClick={() => setSelectedAgentId(agent.id)}
                >
                  <span className="dot" style={{ background: agent.color }} />
                  {index + 1}. {agent.name}
                </button>
              ))}
            </div>

            <div className="chat-panel">
              <div className="chat-title">Chat</div>
              <div className="chat-messages">
                {chatView.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`chat-line ${message.role}`}
                  >
                    <span>{message.content}</span>
                  </div>
                ))}
              </div>
              <div className="chat-input">
                <input
                  value={chatInput}
                  placeholder="Diga: 'quanto é 2+2' ou 'vá para a mesa 2'..."
                  onChange={(event) => setChatInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSendChat();
                  }}
                />
                <button onClick={handleSendChat}>Enviar</button>
              </div>
              <div className="chat-hint">
                Ex.: "Mark quanto é 2+2", "John vá conversar com o Mark" ou
                "John pergunte a Mark quanto é 3x3".
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function postEvent(event: string, data: Record<string, unknown>) {
  try {
    await fetch(`${BACKEND_URL}/api/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, data }),
    });
  } catch {
    // backend offline, ignore
  }
}

function isWalkable(x: number, y: number) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  return WALKABLE[y][x];
}

function saveState(agents: AgentForm[], chats: Record<string, ChatMessage[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ agents, chats }));
}

function loadSaved(): {
  agents: AgentForm[];
  chats: Record<string, ChatMessage[]>;
} | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
