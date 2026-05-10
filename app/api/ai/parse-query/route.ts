import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { query } = await req.json()
  if (!query?.trim()) {
    return NextResponse.json({ keywords: '', resumen: '' })
  }

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [
        {
          role: 'user',
          content: `Analiza esta búsqueda de licitaciones públicas españolas y extrae parámetros estructurados.
Responde SOLO con JSON válido, sin texto adicional.

Búsqueda: "${query}"

Responde con este formato exacto:
{
  "keywords": "palabras clave relevantes separadas por espacio (solo términos del objeto del contrato, sin palabras vacías)",
  "importe_min": null o número entero (si se menciona importe mínimo),
  "resumen": "descripción breve en español de lo que busca el usuario (máx 80 caracteres)"
}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parsed = JSON.parse(text.trim())
    return NextResponse.json(parsed)
  } catch {
    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w: string) => w.length > 2)
      .join(' ')
    return NextResponse.json({ keywords, resumen: query })
  }
}
