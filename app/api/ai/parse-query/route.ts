import { NextRequest, NextResponse } from 'next/server'

// Feeds por comunidad autónoma
const FEEDS: Record<string, string> = {
  default:    'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
  Madrid:     'https://contratos-publicos.comunidad.madrid/feed/licitaciones2',
  Andalucía:  'https://contrataciondelestado.es/sindicacion/sindicacion_1025/licitacionesPerfilesContratanteCompleto3.atom',
  Cataluña:   'https://contrataciondelestado.es/sindicacion/sindicacion_1029/licitacionesPerfilesContratanteCompleto3.atom',
  Valencia:   'https://contrataciondelestado.es/sindicacion/sindicacion_1030/licitacionesPerfilesContratanteCompleto3.atom',
}

const TIPO_MAP: Record<string, string> = {
  '1': 'Obras', '2': 'Servicios', '3': 'Suministros',
  'works': 'Obras', 'services': 'Servicios', 'supplies': 'Suministros',
  'obras': 'Obras', 'servicios': 'Servicios', 'suministros': 'Suministros',
}

function parseEntries(xml: string, ccaa: string) {
  const entries: {
    titulo: string; org: string; importe: number | null; fecha: string
    url: string; id_expediente: string; ccaa: string
    tipo_contrato: string; cpv: string; estado: string
  }[] = []

  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
  let match
  while ((match = entryRegex.exec(xml)) !== null) {
    const e = match[1]

    const titulo = (/<title[^>]*>([\s\S]*?)<\/title>/.exec(e)?.[1] ?? '')
      .replace(/<!\[CDATA\[|\]\]>/g, '').trim()
    const org = (/<name>([\s\S]*?)<\/name>/.exec(e)?.[1] ?? '').trim()
    const updated = (/<updated>([\s\S]*?)<\/updated>/.exec(e)?.[1] ?? '').slice(0, 10)
    const summary = (/<summary[^>]*>([\s\S]*?)<\/summary>/.exec(e)?.[1] ?? '')
    const importeMatch = summary.match(/(\d{4,})[.,]?\d*/)
    const importe = importeMatch ? parseFloat(importeMatch[1]) : null
    const idEvl = /<cbc:ContractFolderID>([\s\S]*?)<\/cbc:ContractFolderID>/.exec(e)?.[1]?.trim() ?? ''

    // Extraer CPV
    const cpv = /<cbc:ItemClassificationCode[^>]*>([\s\S]*?)<\/cbc:ItemClassificationCode>/.exec(e)?.[1]?.trim()
      ?? /<cbc:ID schemeID="CPV"[^>]*>([\s\S]*?)<\/cbc:ID>/.exec(e)?.[1]?.trim()
      ?? ''

    // Extraer tipo de contrato
    const tipoRaw = /<cbc:ContractTypeCode[^>]*>([\s\S]*?)<\/cbc:ContractTypeCode>/.exec(e)?.[1]?.trim() ?? ''
    const tipo_contrato = TIPO_MAP[tipoRaw.toLowerCase()] ?? tipoRaw

    // Extraer estado
    const estadoRaw = /<cbc-place2:ContractFolderStatusCode[^>]*>([\s\S]*?)<\/cbc-place2:ContractFolderStatusCode>/.exec(e)?.[1]?.trim()
      ?? /<cbc:ContractFolderStatusCode[^>]*>([\s\S]*?)<\/cbc:ContractFolderStatusCode>/.exec(e)?.[1]?.trim()
      ?? 'PUB'
    const ESTADO_MAP: Record<string, string> = {
      'PUB': 'ABIERTA', 'EV': 'EN EVALUACIÓN', 'ADJ': 'ADJUDICADA',
      'RES': 'RESUELTA', 'ANU': 'ANULADA', 'PRE': 'ANUNCIO PREVIO'
    }
    const estado = ESTADO_MAP[estadoRaw] ?? 'ABIERTA'

    const url = idEvl
      ? `https://www.google.com/search?q=${encodeURIComponent(idEvl + ' ' + titulo.slice(0, 40) + ' licitacion pliego')}`
      : ''

    if (titulo) entries.push({ titulo, org, importe, fecha: updated, url, id_expediente: idEvl, ccaa, tipo_contrato, cpv, estado })
  }
  return entries
}

export async function GET(req: NextRequest) {
  const sp          = req.nextUrl.searchParams
  const q           = sp.get('q')?.toLowerCase()
  const importeMin  = sp.get('importe_min') ? Number(sp.get('importe_min')) : null
  const importeMax  = sp.get('importe_max') ? Number(sp.get('importe_max')) : null
  const comunidad   = sp.get('comunidad') ?? 'Todas'

  try {
    const feedUrl = FEEDS[comunidad] ?? FEEDS.default
    const res = await fetch(feedUrl, { next: { revalidate: 3600 } })
    if (!res.ok) throw new Error('Feed no disponible')
    const xml = await res.text()
    const entries = parseEntries(xml, comunidad === 'Todas' ? '' : comunidad)

    const results = entries.filter(l => {
      const texto = (l.titulo + ' ' + l.org + ' ' + l.cpv).toLowerCase()
      if (q && !q.split(' ').some(w => w.length > 2 && texto.includes(w))) return false
      if (importeMin && (l.importe ?? 0) < importeMin) return false
      if (importeMax && (l.importe ?? 0) > importeMax) return false
      return true
    })

    const licitaciones = results.slice(0, 50).map((l, i) => ({
      id: String(i),
      titulo: l.titulo,
      org: l.org,
      cpv: l.cpv,
      tipo_contrato: l.tipo_contrato,
      importe: l.importe,
      estado: l.estado,
      cierre: l.fecha,
      ccaa: l.ccaa,
      url: l.url,
      id_expediente: l.id_expediente,
    }))

    return NextResponse.json({ licitaciones, total: results.length })
  } catch {
    return NextResponse.json({ licitaciones: [], total: 0 })
  }
}