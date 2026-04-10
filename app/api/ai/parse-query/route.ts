import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `Eres un extractor de filtros para un buscador de licitaciones públicas en España.
Dado el texto del usuario, extrae los filtros en JSON puro sin explicación, sin markdown, sin backticks.

Schema exacto:
{
  "keywords": string | null,
  "cpv_prefix": string | null,
  "importe_min": number | null,
  "importe_max": number | null,
  "estado": "ABIERTA" | "ADJUDICADA" | null,
  "comunidad": string | null,
  "resumen": string
}

Prefijos CPV: "45" obras, "48" software, "72" TI/consultoría, "90" limpieza, "79" servicios.
Importes: "más de 50k" → 50000, "menos de 200 mil" → 200000.
Responde SOLO el JSON.`

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query?.trim()) return NextResponse.json({ error: 'Query vacía' }, { status: 400 })

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '{}'
    const filters = JSON.parse(text.replace(/```json|```/g, '').trim())
    return NextResponse.json(filters)
  } catch {
    return NextResponse.json({
      keywords: query.slice(0, 100),
      cpv_prefix: null, importe_min: null,
      importe_max: null, estado: null,
      comunidad: null, resumen: query.slice(0, 40),
    })
  }
}