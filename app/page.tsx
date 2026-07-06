"use client";

import { useEffect, useRef, useState } from "react";
import { PERSONA_LIST, PERSONAS, type PersonaId } from "@/lib/personas";

interface Msg {
  role: "user" | "assistant";
  content: string;
  error?: boolean;
}

export default function Home() {
  const [persona, setPersona] = useState<PersonaId | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [meter, setMeter] = useState(0);
  const [lastDelta, setLastDelta] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const p = persona ? PERSONAS[persona] : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages, loading]);

  function choose(id: PersonaId) {
    setPersona(id);
    setMessages([{ role: "assistant", content: PERSONAS[id].greeting }]);
    setMeter(0);
    setLastDelta(null);
    setWon(false);
  }

  function reset() {
    setPersona(null);
    setMessages([]);
    setInput("");
    setMeter(0);
    setLastDelta(null);
    setWon(false);
  }

  function playAgain() {
    if (persona) choose(persona);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || !persona || won) return;

    const userMsg: Msg = { role: "user", content: text };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona,
          meter,
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.error || "Deu ruim.", error: true },
        ]);
      } else {
        setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        const delta: number = Number(data.delta) || 0;
        setLastDelta(delta);
        setMeter((cur) => {
          const next = Math.max(0, Math.min(100, cur + delta));
          if (next >= 100) setWon(true);
          return next;
        });
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Falha de conexão.", error: true },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Persona picker ----------
  if (!p) {
    return (
      <div className="wrap">
        <div className="hero">
          <h1>Grupo de São Paulo Simulator 🃏</h1>
          <p>Escolha com quem você quer discutir.</p>
          <p className="sub">
            Você entra no papel do OUTRO. Encha o medidor até 100% pra vencer o argumento.
          </p>
        </div>
        <div className="cards">
          {PERSONA_LIST.map((persona) => (
            <button
              key={persona.id}
              className={`card ${persona.id}`}
              onClick={() => choose(persona.id)}
            >
              <div className="emoji">{persona.emoji}</div>
              <div className="role">{persona.role}</div>
              <h2>{persona.name}</h2>
              <div className="tag">{persona.cardTagline}</div>
              <div className="youplay">
                Você joga como: <b>{persona.userPlaysName}</b> {persona.userPlaysEmoji}
              </div>
              <div className="metertag" style={{ color: persona.meter.color }}>
                Medidor: {persona.meter.emoji} {persona.meter.label}
              </div>
            </button>
          ))}
        </div>
        <div className="foot">
          Feito de brincadeira. Nenhuma reclamação foi resolvida na produção deste site.
        </div>
      </div>
    );
  }

  const deltaLabel =
    lastDelta === null ? "" : lastDelta >= 0 ? `+${lastDelta}` : `${lastDelta}`;

  // ---------- Chat ----------
  return (
    <div className="wrap">
      <div className="chat">
        <div className="topbar">
          <div className="avatar" style={{ background: p.color }}>
            {p.emoji}
          </div>
          <div className="meta">
            <div className="name">{p.name}</div>
            <div className="role">{p.role}</div>
          </div>
          <button className="back" onClick={reset}>
            ← Trocar
          </button>
        </div>

        <div className="rolebanner" style={{ borderColor: p.color }}>
          {p.roleBanner}
        </div>

        <div className="meterbox">
          <div className="meterhead">
            <span>
              {p.meter.emoji} {p.meter.label}
            </span>
            <span className="meterval">
              {meter}%
              {lastDelta !== null && (
                <span
                  className={`delta ${lastDelta >= 0 ? "up" : "down"}`}
                  key={messages.length}
                >
                  {" "}
                  {deltaLabel}
                </span>
              )}
            </span>
          </div>
          <div className="metertrack">
            <div
              className="meterfill"
              style={{ width: `${meter}%`, background: p.meter.color }}
            />
          </div>
        </div>

        <div className="messages" ref={scrollRef}>
          {messages.map((m, i) => (
            <div
              key={i}
              className={`bubble ${
                m.error ? "error" : m.role === "user" ? "user" : "bot"
              }`}
            >
              {m.content}
            </div>
          ))}
          {loading && (
            <div className="typing">{p.firstName} está digitando…</div>
          )}

          {won && (
            <div className="winbox" style={{ borderColor: p.meter.color }}>
              <div className="wintitle">{p.meter.winTitle}</div>
              <div className="winsub">{p.meter.winSubtitle}</div>
              <div className="winbtns">
                <button style={{ background: p.color }} onClick={playAgain}>
                  Jogar de novo
                </button>
                <button className="back" onClick={reset}>
                  Trocar personagem
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="composer">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder={
              won
                ? "argumento vencido! 🏆"
                : persona === "ricardo"
                ? "responda como o Pedro (defenda a LSS)…"
                : "responda como o Ricardo (cobre a LSS)…"
            }
            disabled={loading || won}
          />
          <button
            onClick={send}
            disabled={loading || won || !input.trim()}
            style={{ background: p.color }}
          >
            Enviar
          </button>
        </div>
        <div className="foot">
          Respostas geradas por IA imitando o tom real. Não é o Ricardo nem o Pedro de verdade 😄
        </div>
      </div>
    </div>
  );
}
