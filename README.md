# Grupo de São Paulo Simulator 🃏

Simulador de brincadeira do grupo de **Flesh and Blood** de São Paulo. Você escolhe com quem discutir — e entra automaticamente no papel do outro:

- **Discutir com o 🗣️ Ricardo Albuquerque** → você vira o **Pedro** e tem que **defender a LSS**. Encha a barra de **RAGE** dele até 100% pra vencer.
- **Discutir com o 🛡️ Pedro Mathies** → você vira o **Ricardo** e tem que **cobrar a LSS**. Encha a barra **"Manda e-mail pra LSS"** até 100% pra vencer.

Os dois tons foram extraídos de conversas reais de um grupo de WhatsApp da comunidade. Tudo em português, respostas geradas por IA imitando o jeito de cada um.

## Stack

- **Next.js 14** (App Router) — UI de chatbot + função serverless.
- **Groq API** com **Llama 3.1 8B Instant** — LLM **gratuito**, rápido e com limite diário alto (500k tokens/dia). Troque via `GROQ_MODEL`.
- Deploy **serverless** na **Vercel** com 1 clique.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # e cole sua chave da Groq
npm run dev                  # http://localhost:3000
```

### Pegando a chave grátis da Groq

1. Crie conta em <https://console.groq.com>
2. Vá em **API Keys** → **Create API Key**
3. Cole em `.env.local` como `GROQ_API_KEY=...`

> O free tier da Groq é generoso e não pede cartão. Perfeito pra um projeto de zoeira.

### Várias chaves (rotação anti-rate-limit)

Pra aguentar mais gente sem estourar o limite gratuito, configure de 1 a 6 chaves:

```
GROQ_API_KEY=gsk_...
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=gsk_...
GROQ_API_KEY_3=gsk_...
GROQ_API_KEY_4=gsk_...
GROQ_API_KEY_5=gsk_...
```

A cada requisição o app **sorteia uma chave aleatoriamente** e, se ela estiver
no limite (`429`) ou der erro transitório, **cai automaticamente pra próxima**.
Chaves não configuradas são simplesmente ignoradas.

> ⚠️ **Importante:** os limites da Groq são **por organização (conta)**, não por
> chave. Várias chaves da MESMA conta compartilham o mesmo limite diário — a
> rotação só multiplica a capacidade se as chaves forem de **contas diferentes**.
> Pra um projeto de zoeira, o limite diário do `llama-3.1-8b-instant` (500k
> tokens/dia) já costuma sobrar.

## Deploy na Vercel

1. Suba este repositório no GitHub.
2. Em <https://vercel.com/new>, importe o repo.
3. Em **Environment Variables**, adicione `GROQ_API_KEY` com sua chave.
4. **Deploy**. Pronto.

Ou via CLI:

```bash
npm i -g vercel
vercel            # segue o wizard
vercel env add GROQ_API_KEY
vercel --prod
```

## Como funciona

- `lib/personas.ts` — o coração: system prompt + bordões reais de cada personagem.
- `app/api/chat/route.ts` — função serverless (Edge) que chama a Groq.
- `app/page.tsx` — seletor de persona + UI de chat.

Quer ajustar o tom? É só editar os `systemPrompt` em `lib/personas.ts`.

---

Feito de brincadeira. Nenhuma reclamação foi resolvida na produção deste site. 😄
