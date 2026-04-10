import { NextRequest, NextResponse } from 'next/server'

const MOCK_DATA = [
  {id:'1',titulo:'Servicios de desarrollo software plataforma ciudadana',org:'Ayuntamiento de Madrid',cpv:'72200000',importe:285000,estado:'ABIERTA',cierre:'2025-05-12',ccaa:'Madrid'},
  {id:'2',titulo:'Consultoría estratégica transformación digital',org:'Ministerio de Hacienda',cpv:'72221000',importe:480000,estado:'ABIERTA',cierre:'2025-04-28',ccaa:'Madrid'},
  {id:'3',titulo:'Suministro equipos informáticos servidores blade',org:'Generalitat de Catalunya',cpv:'30200000',importe:1240000,estado:'ABIERTA',cierre:'2025-05-03',ccaa:'Cataluña'},
  {id:'4',titulo:'Mantenimiento sistemas de información tributarios',org:'Agencia Tributaria',cpv:'72250000',importe:620000,estado:'ADJUDICADA',cierre:'2025-03-15',ccaa:'Madrid'},
  {id:'5',titulo:'Obras rehabilitación edificio sede ministerial',org:'Ministerio de Cultura',cpv:'45000000',importe:3800000,estado:'ABIERTA',cierre:'2025-06-01',ccaa:'Madrid'},
  {id:'6',titulo:'Servicio limpieza centros educativos públicos',org:'Gobierno Vasco Educación',cpv:'90910000',importe:890000,estado:'ABIERTA',cierre:'2025-04-30',ccaa:'País Vasco'},
  {id:'7',titulo:'Plataforma inteligencia artificial gestión documental',org:'Junta de Andalucía',cpv:'72212900',importe:340000,estado:'ABIERTA',cierre:'2025-05-20',ccaa:'Andalucía'},
  {id:'8',titulo:'Desarrollo sistema gestión hospitalaria',org:'Servicio Murciano de Salud',cpv:'48180000',importe:760000,estado:'ABIERTA',cierre:'2025-05-15',ccaa:'Murcia'},
]

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const q         = sp.get('q')?.toLowerCase()
  const cpv       = sp.get('cpv')
  const estado    = sp.get('estado')
  const comunidad = sp.get('comunidad')?.toLowerCase()
  const importeMin = sp.get('importe_min') ? Number(sp.get('importe_min')) : null
  const importeMax = sp.get('importe_max') ? Number(sp.get('importe_max')) : null

  let results = MOCK_DATA.filter(l => {
    const texto = (l.titulo + ' ' + l.org).toLowerCase()
    if (q && !q.split(' ').some(w => w.length > 2 && texto.includes(w))) return false
    if (cpv && !l.cpv.startsWith(cpv)) return false
    if (estado && l.estado !== estado) return false
    if (comunidad && !l.ccaa.toLowerCase().includes(comunidad)) return false
    if (importeMin && l.importe < importeMin) return false
    if (importeMax && l.importe > importeMax) return false
    return true
  })

  return NextResponse.json({ licitaciones: results, total: results.length })
}