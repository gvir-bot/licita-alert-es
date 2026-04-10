import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q          = sp.get('q')?.toLowerCase()
  const importeMin = sp.get('importe_min') ? Number(sp.get('importe_min')) : null
  const importeMax = sp.get('importe_max') ? Number(sp.get('importe_max')) : null

  try {
    const res = await fetch(
      'https://contrataciondelestado.es/sindicacion/sindicacion_643/licitacionesPerfilesContratanteCompleto3.atom',
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) throw new Error('PLACSP no disponible')
    const xml = await res.text()

    const entries: {
      titulo: string; org: string; importe: number | null
      fecha: string; url: string; id_expediente: string
    }[] = []

    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g
    let match
    while ((match = entryRegex.exec(xml)) !== null) {
      const entry = match[1]
      const titulo = (/<title[^>]*>([\s\S]*?)<\/title>/.exec(entry)?.[1] ?? '')
        .replace(/<!\[CDATA\[|\]\]>/g, '').trim()
      const org = (/<name>([\s\S]*?)<\/name>/.exec(entry)?.[1] ?? '').trim()
      const updated = (/<updated>([\s\S]*?)<\/updated>/.exec(entry)?.[1] ?? '').slice(0, 10)
      const summary = (/<summary[^>]*>([\s\S]*?)<\/summary>/.exec(entry)?.[1] ?? '')
      const importeMatch = summary.match(/(\d{4,})[.,]?\d*/)
      const importe = importeMatch ? parseFloat(importeMatch[1]) : null
      const idEvl = /<cbc:ContractFolderID>([\s\S]*?)<\/cbc:ContractFolderID>/.exec(entry)?.[1]?.trim() ?? ''
      
      // URL de búsqueda por número de expediente en PLACSP
      const url = idEvl
        ? `https://contrataciondelestado.es/wps/portal/plataforma/inicio/busqueda/?numExpediente=${encodeURIComponent(idEvl)}`
        : ''

      if (titulo) entries.push({ titulo, org, importe, fecha: updated, url, id_expediente: idEvl })
    }

    const results = entries.filter(l => {
      const texto = (l.titulo + ' ' + l.org).toLowerCase()
      if (q && !q.split(' ').some(w => w.length > 2 && texto.includes(w))) return false
      if (importeMin && (l.importe ?? 0) < importeMin) return false
      if (importeMax && (l.importe ?? 0) > importeMax) return false
      return true
    })

    const licitaciones = results.slice(0, 50).map((l, i) => ({
      id: String(i),
      titulo: l.titulo,
      org: l.org,
      cpv: '',
      importe: l.importe,
      estado: 'ABIERTA',
      cierre: l.fecha,
      ccaa: '',
      url: l.url,
      id_expediente: l.id_expediente,
    }))

    return NextResponse.json({ licitaciones, total: results.length })
  } catch {
    return NextResponse.json({ licitaciones: [], total: 0 })
  }
}