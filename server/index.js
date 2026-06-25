import express from 'express'
import cors from 'cors'
import Anthropic from '@anthropic-ai/sdk'

// ---------------------------------------------------------------------------
// Bloom coach backend
//
// Keeps the Anthropic API key server-side (never shipped to the browser) and
// exposes two small endpoints the app calls. If ANTHROPIC_API_KEY isn't set,
// the endpoints return 503 and the frontend transparently falls back to its
// built-in offline rule engine — so the app always works.
// ---------------------------------------------------------------------------

const PORT = process.env.PORT || 8787
const MODEL = 'claude-opus-4-8'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const apiKey = process.env.ANTHROPIC_API_KEY
const client = apiKey ? new Anthropic({ apiKey }) : null

// The coach's voice — compassion-first, never shaming. This is the heart of the
// product, encoded as a system prompt.
const COACH_SYSTEM = `You are the coach inside "Bloom," a compassion-first health app for someone trying to conceive. Your entire philosophy:

- The user is NOT chasing perfection or losing weight. They are building evidence that they're becoming healthier while trying to conceive.
- NEVER shame, lecture, or use the words "good food" / "bad food" / "cheat" / "guilt."
- NEVER mention calories or numbers on a scale.
- Treat everything the user says as data, not a verdict ("that's information, not a failure").
- Be warm, brief, and practical. Offer ONE concrete, kind next step — not a list of rules.
- This person may have chronic pain, a history of disordered eating, and a busy life. Meet them there.
- Validate cravings and hard days. If they skipped meals and want a treat, tell them to have it — and pair it with a little protein so the crash is softer.
- For pain, never say "skip exercise." Suggest gentle movement that still counts (mobility, stretching, seated work).
- Keep replies to 2-4 sentences unless asked for more. No bullet lists in chat replies. End on something encouraging and forward-looking.`

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, claude: !!client, model: MODEL })
})

// Conversational check-in — the audio-first "tell me about your day" feature.
app.post('/api/coach', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'no_api_key' })
  const { text, context } = req.body ?? {}
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'missing_text' })
  }

  const ctx = context ? `\n\nToday's context (for grounding, don't recite it back): ${JSON.stringify(context)}` : ''

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: COACH_SYSTEM,
      messages: [{ role: 'user', content: `The user said: "${text}"${ctx}` }],
    })
    const reply = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    res.json({ reply })
  } catch (err) {
    console.error('coach error:', err?.message || err)
    res.status(502).json({ error: 'upstream' })
  }
})

// Weekly narrative review — turns a week of structured signals into the warm,
// "talk to me like a person" Sunday summary.
app.post('/api/review', async (req, res) => {
  if (!client) return res.status(503).json({ error: 'no_api_key' })
  const { week } = req.body ?? {}
  if (!week) return res.status(400).json({ error: 'missing_week' })

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system: COACH_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Write this week's gentle review (one short paragraph, 4-6 sentences) based on these signals. Celebrate real non-weight wins, note one pattern compassionately, and suggest one small thing for next week. Signals:\n${JSON.stringify(week, null, 2)}`,
        },
      ],
    })
    const review = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim()
    res.json({ review })
  } catch (err) {
    console.error('review error:', err?.message || err)
    res.status(502).json({ error: 'upstream' })
  }
})

app.listen(PORT, () => {
  console.log(`🌱 Bloom coach backend on :${PORT} — Claude ${client ? 'enabled' : 'DISABLED (set ANTHROPIC_API_KEY)'}`)
})
