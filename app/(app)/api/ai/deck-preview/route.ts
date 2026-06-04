import { NextResponse } from 'next/server'
import { allocateCardSlots, normalizeMixPct } from '@/app/lib/flashcard-mix'

type PreviewDeck = {
  name: string
  cards: Array<{ front: string; back: string }>
}

const MAX_DECK_PREVIEWS_PER_HOUR = 5
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000

// In-memory best-effort limiter (sufficient until we add real auth + durable store).
const generationLogByUserId = new Map<string, number[]>()

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function clampDeck(deck: PreviewDeck, maxCards: number): PreviewDeck {
  const cap = Math.min(50, Math.max(1, Math.floor(maxCards)))
  const name = String(deck.name ?? '').trim().slice(0, 120) || 'Untitled deck'
  const cards = Array.isArray(deck.cards) ? deck.cards : []
  const cleaned = cards
    .map((c) => ({
      front: String(c?.front ?? '').trim(),
      back: String(c?.back ?? '').trim(),
    }))
    .filter((c) => c.front.length > 0 && c.back.length > 0)
    .slice(0, cap)

  return {
    name,
    cards:
      cleaned.length > 0
        ? cleaned
        : [{ front: 'Why does this idea matter?', back: 'State the principle in your own words, then connect it to a concrete example.' }],
  }
}

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || apiKey.trim() === '' || apiKey.trim() === 'sk-...') {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured.' },
      { status: 500 }
    )
  }

  const body = (await req.json().catch(() => null)) as {
    userId?: string
    prompt?: string
    cardCount?: number
    mix?: {
      conceptualPercent?: number
      calculationPercent?: number
      vocabularyPercent?: number
    }
  } | null

  const host = req.headers.get('host') ?? ''
  const isLocalhostWaived = host === 'localhost:3000'

  const userId = String(body?.userId ?? '').trim()
  if (!isLocalhostWaived && !isUuid(userId)) {
    return NextResponse.json({ error: 'Missing or invalid userId.' }, { status: 400 })
  }

  if (!isLocalhostWaived) {
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_WINDOW_MS
    const history = generationLogByUserId.get(userId) ?? []
    const pruned = history.filter((t) => t > windowStart)

    if (pruned.length >= MAX_DECK_PREVIEWS_PER_HOUR) {
      const oldest = pruned[0]!
      const retryAfterSec = Math.max(1, Math.ceil((oldest + RATE_LIMIT_WINDOW_MS - now) / 1000))
      return NextResponse.json(
        { error: `Rate limit exceeded: max ${MAX_DECK_PREVIEWS_PER_HOUR} deck previews per hour.` },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfterSec),
          },
        }
      )
    }

    pruned.push(now)
    generationLogByUserId.set(userId, pruned)
  }

  const prompt = String(body?.prompt ?? '').trim()
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt.' }, { status: 400 })
  }

  let cardCount = Math.round(Number(body?.cardCount ?? 12))
  if (!Number.isFinite(cardCount)) cardCount = 12
  cardCount = Math.min(50, Math.max(1, cardCount))

  const mixRaw = body?.mix ?? {}
  let pc = Math.max(0, Number(mixRaw.conceptualPercent))
  let pk = Math.max(0, Number(mixRaw.calculationPercent))
  let pv = Math.max(0, Number(mixRaw.vocabularyPercent))
  if ([pc, pk, pv].some((x) => !Number.isFinite(x))) {
    pc = 70
    pk = 20
    pv = 10
  }
  if (pc + pk + pv <= 0) {
    pc = 70
    pk = 20
    pv = 10
  }
  const mix = normalizeMixPct(pc, pk, pv)
  const slots = allocateCardSlots(cardCount, {
    conceptual: mix.conceptual,
    calculation: mix.calculation,
    vocabulary: mix.vocabulary,
  })

  const system = [
    'You generate a flashcard deck preview.',
    'Return ONLY valid JSON with this exact shape:',
    '{ "name": string, "cards": [ { "front": string, "back": string } ] }',
    'Deck name: short, descriptive, tied to the topic (avoid generic placeholders).',
    '',
    `Produce exactly ${cardCount} flashcards.`,
    '',
    `Target mix matching these counts (approximately — exact counts preferred): conceptual ≈ ${slots.conceptual}, calculation ≈ ${slots.calculation}, vocabulary ≈ ${slots.vocabulary}.`,
    `(User asked for conceptual ${mix.conceptual}%, calculation ${mix.calculation}%, vocabulary ${mix.vocabulary}%.)`,
    '',
    'Card categories:',
    '- Conceptual: why/how mechanisms, compare/contrast, misconceptions, causal chains, scenarios, boundaries of applicability.',
    '- Calculation: numeric or symbolic problems requiring explicit reasoning; fronts pose the problem (or give quantities); backs show concise steps plus the answer with correct units/significant figures where relevant.',
    '- Vocabulary / memorization / identification: terminology, concise definitions or recognition drills (not trivia like dates unless essential).',
    '',
    'General rules:',
    '- Fronts are concise prompts or stems; backs are clear answers with brief reasoning where appropriate.',
    '- Do NOT prefix card text with category labels.',
    '- Do NOT number cards like "Card 3:" in the strings; start directly with content.',
    '- No markdown, no extra keys, no surrounding text.',
  ].join('\n')

  // GPT-5.4 mini — https://developers.openai.com/api/docs/models/gpt-5.4-mini
  const model = process.env.OPENAI_FLASHCARD_MODEL?.trim() || 'gpt-5.4-mini'

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: system },
        {
          role: 'user',
          content: [`Topic / instructions:\n${prompt}`, `Card count: ${cardCount}`, `Mix: conceptual ${mix.conceptual}%, calculation ${mix.calculation}%, vocabulary ${mix.vocabulary}%`].join('\n\n'),
        },
      ],
      temperature: 0.5,
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    return NextResponse.json(
      { error: `AI request failed (${res.status}). ${errText.slice(0, 300)}` },
      { status: 500 }
    )
  }

  const data = (await res.json()) as unknown as {
    output_text?: string
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>
    }>
  }

  const outputText =
    (data as { output_text?: string }).output_text ??
    data.output?.flatMap((m) => m.content ?? []).find((c) => c.type === 'output_text')?.text ??
    ''

  const parsed = safeJsonParse<PreviewDeck>(outputText)
  if (!parsed) {
    return NextResponse.json(
      { error: 'AI returned an invalid JSON payload.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ deck: clampDeck(parsed, cardCount) })
}

