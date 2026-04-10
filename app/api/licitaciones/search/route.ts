import { NextRequest, NextResponse } from 'next/server'
import { parseStringPromise } from 'xml2js'

const PLACSP_URL = 'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom'

interface Licitacion {
  id: string
  titulo: string
  org: string
  cpv: string
  importe: number | null
  estado: string
  cierre: string
  ccaa: string
}

async function fetchPLACSP(): Promise<Licitacion[]> {
  try {
    const res = await fetch(PLACSP_URL, {
      next: { revalidate: 3600 },
      headers: { 'Accept': 'application/atom+xml, application/xml, text/xml' }
    })
    if (!res.ok) return []
    const xml = await res.text()
    const parsed = await parseStringPromise(xml, { explicitArray: false, mergeAttrs: true })
    const entries = parsed?.feed?.entry ?? []
    const arr = Array.isArray(entries) ? entries : [entries]
    return arr.map((e: Record<string, unknown>, i: number) => {
      const summary = String(e['summary'] ?? '')
      const importeMatch = summary.match(/[\d]{4,}[.,]?\d*/)?.[0]
      const importe = importeMatch ? parseFloat(importeMatch.replace(/\./g, '').replace(',', '.')) : null
      const titulo = typeof e['title'] === 'object'
        ? String((e['title'] as Record<string, unknown>)?._ ?? '')
        : String(e['title'] ?? '')
      const org = typeof e['author'] === 'object'
        ? String((e['author'] as Record<string, unknown>)?.name ?? '')
        : ''
      return {
        id: String(i),
        titulo,
        org,
        cpv: '',
        importe,
        estado: 'ABIERTA',
        cierre: String(e['updated'] ?? '').slice(0, 10),
        ccaa: '',
      }
    })
  } catch (e) {
    console.error('PLACSP error:', e)
    return []
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q          = sp.get('q')?.toLowerCase()
  const estado     = sp.get('estado')
  const importeMin = sp.get('importe_min') ? Number(sp.get('importe_min')) : null
  const importeMax = sp.get('importe_max') ? Number(sp.get('importe_max')) : null

  const todas = await fetchPLACSP()

  const results = todas.filter(l => {
    const texto = (l.titulo + ' ' + l.org).toLowerCase()
    if (q && !q.split(' ').some((w: string) => w.length > 2 && texto.includes(w))) return false
    if (estado && l.estado !== estado) return false
    if (importeMin && (l.importe ?? 0) < importeMin) return false
    if (importeMax && (l.importe ?? 0) > importeMax) return false
    return true
  })

  return NextResponse.json({ licitaciones: results.slice(0, 50), total: results.length })
}