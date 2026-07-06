import { PERSONAS, type PersonaId } from "@/lib/personas";

// Serverless (Edge) — roda como função na Vercel, sem servidor dedicado.
export const runtime = "edge";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// Llama 3.3 70B: ótimo em PT-BR e gratuito no free tier da Groq.
const MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// Pool de chaves da Groq. No Edge runtime as envs precisam ser referenciadas
// por nome (não dá pra enumerar process.env), então listamos explicitamente.
// Configure quantas quiser (1 a 5) — as vazias são ignoradas.
function getKeyPool(): string[] {
  return [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_1,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3,
    process.env.GROQ_API_KEY_4,
    process.env.GROQ_API_KEY_5,
  ].filter((k): k is string => typeof k === "string" && k.trim().length > 0);
}

// Ordem aleatória das chaves: distribui a carga (o 1º tentado é sorteado) e,
// se uma chave estiver no limite (429) ou falhar, cai pra próxima.
function shuffledPool(pool: string[]): string[] {
  const a = [...pool];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clampMeter(n: unknown): number {
  const v = typeof n === "number" ? n : 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export async function POST(req: Request) {
  const keyPool = getKeyPool();
  if (keyPool.length === 0) {
    return Response.json(
      {
        error:
          "Nenhuma GROQ_API_KEY configurada. Pegue chaves grátis em https://console.groq.com e adicione GROQ_API_KEY (ou GROQ_API_KEY_1..5) nas Environment Variables da Vercel (ou no .env.local).",
      },
      { status: 500 }
    );
  }
  const keyOrder = shuffledPool(keyPool);

  let body: { persona?: PersonaId; messages?: ChatMessage[]; meter?: number };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  const persona = body.persona && PERSONAS[body.persona];
  if (!persona) {
    return Response.json({ error: "Persona inválida." }, { status: 400 });
  }

  const meter = clampMeter(body.meter);

  const history = (body.messages || [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && m.content)
    .slice(-12);

  const system = `${persona.systemPrompt}

${persona.gameInstruction}

SEU MEDIDOR ATUAL: ${meter}/100. Quanto mais alto, mais intenso fica seu tom (mais próximo do limite).

FORMATO DE SAÍDA — responda SOMENTE com um JSON válido, sem texto fora dele:
{"reply": "sua resposta em personagem, em português, curta", "delta": <inteiro entre -15 e 25 = quanto a ÚLTIMA mensagem da pessoa move o seu medidor>}`;

  const messages = [{ role: "system", content: system }, ...history];
  const payload = JSON.stringify({
    model: MODEL,
    messages,
    temperature: 0.9,
    max_tokens: 320,
    top_p: 0.95,
    response_format: { type: "json_object" },
  });

  try {
    let resp: Response | null = null;
    let lastStatus = 0;
    let lastDetail = "";

    // Tenta as chaves em ordem aleatória; se uma estourar o limite (429) ou
    // der erro transitório (5xx), cai pra próxima chave do pool.
    for (const apiKey of keyOrder) {
      const r = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: payload,
      });

      if (r.ok) {
        resp = r;
        break;
      }

      lastStatus = r.status;
      lastDetail = await r.text();
      // 429 = rate limit, 5xx = erro transitório -> vale tentar outra chave.
      // Outros erros (ex.: 400) são do request, não adianta trocar chave.
      if (r.status !== 429 && r.status < 500) break;
    }

    if (!resp) {
      return Response.json(
        { error: `Erro da API Groq (${lastStatus})`, detail: lastDetail },
        { status: 502 }
      );
    }

    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content?.trim() || "";

    let reply = "";
    let delta = 0;
    try {
      const parsed = JSON.parse(raw);
      reply = String(parsed.reply || "").trim();
      const d = Number(parsed.delta);
      delta = Number.isFinite(d) ? Math.max(-15, Math.min(25, Math.round(d))) : 0;
    } catch {
      // se o modelo fugir do JSON, usa o texto cru como resposta
      reply = raw;
      delta = 0;
    }

    if (!reply) reply = `(o ${persona.firstName} ficou sem palavras...)`;

    return Response.json({ reply, delta });
  } catch (err) {
    return Response.json(
      { error: "Falha ao chamar a IA.", detail: String(err) },
      { status: 500 }
    );
  }
}
