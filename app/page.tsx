// @ts-nocheck'use client'

import { useState, useEffect } from 'react'

interface Licitacion {
  id: string
  titulo: string
  org: string
  cpv: string
  importe: number | null
  estado: string
  cierre: string
  ccaa: string
  url?: string
  id_expediente?: string
}

const TIPOS = ['Todos', 'Obras', 'Servicios', 'Suministros']
const CCAA = ['Todas', 'Madrid', 'Cataluña', 'Andalucía', 'Valencia', 'País Vasco', 'Galicia', 'Aragón', 'Murcia']

export default function Home() {
  const [query, setQuery]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [filters, setFilters]         = useState<{resumen?: string} | null>(null)
  const [results, setResults]         = useState<Licitacion[]>([])
  const [searched, setSearched]       = useState(false)
  const [guardadas, setGuardadas]     = useState<Licitacion[]>([])
  const [tab, setTab]                 = useState<'buscar' | 'guardadas'>('buscar')
  const [tipo, setTipo]               = useState('Todos')
  const [ccaa, setCcaa]               = useState('Todas')
  const [importeMin, setImporteMin]   = useState('')
  const [showFiltros, setShowFiltros] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('licitaciones_guardadas')
    if (saved) setGuardadas(JSON.parse(saved))
  }, [])

  function guardar(l: Licitacion) {
    const nuevas = [...guardadas.filter(g => g.id !== l.id), l]
    setGuardadas(nuevas)
    localStorage.setItem('licitaciones_guardadas', JSON.stringify(nuevas))
  }

  function quitar(id: string) {
    const nuevas = guardadas.filter(g => g.id !== id)
    setGuardadas(nuevas)
    localStorage.setItem('licitaciones_guardadas', JSON.stringify(nuevas))
  }

  function estaGuardada(id: string) { return guardadas.some(g => g.id === id) }

  const ejemplos = ['consultoría TI Madrid', 'obras públicas abiertas', 'limpieza centros educativos', 'software hospitalario']

  async function buscar(q = query) {
    const sinTexto = !q.trim()
    const sinFiltros = tipo === 'Todos' && ccaa === 'Todas' && !importeMin
    if (sinTexto && sinFiltros) return
    setLoading(true)
    setSearched(true)
    setTab('buscar')
    try {
      const params = new URLSearchParams()
      if (q.trim()) {
        const res1 = await fetch('/api/ai/parse-query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q }),
        })
        const parsed = await res1.json()
        setFilters(parsed)
        if (parsed.keywords) params.set('q', parsed.keywords)
        if (parsed.importe_min && !importeMin) params.set('importe_min', String(parsed.importe_min))
      } else {
        setFilters(null)
      }
      if (importeMin) params.set('importe_min', importeMin)
      if (tipo !== 'Todos') params.set('tipo', tipo.toLowerCase())
      if (ccaa !== 'Todas') params.set('comunidad', ccaa)
      const res2 = await fetch(`/api/licitaciones/search?${params}`)
      const data = await res2.json()
      setResults(data.licitaciones ?? [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  function fmt(n: number | null) {
    if (!n) return '—'
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
  }

  function daysLeft(fecha: string) {
    return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000)
  }

  const CardLicitacion = ({ l, onGuardar }: { l: Licitacion; onGuardar: () => void }) => {
    const days = daysLeft(l.cierre)
    const urgente = days >= 0 && days <= 7
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-medium text-gray-900 leading-snug">{l.titulo}</div>
            {l.id_expediente && (
              <div className="text-xs text-gray-400 mt-0.5 font-mono">Exp: {l.id_expediente}</div>
            )}
          </div>
          <div className="shrink-0 text-right">
            <div className="font-mono text-sm font-semibold text-gray-900">{fmt(l.importe)}</div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            {l.org && <span className="truncate max-w-xs">{l.org}</span>}
            <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 shrink-0">{l.estado}</span>
            {l.cierre && (
              <span className={`shrink-0 ${urgente ? 'text-red-600 font-medium' : ''}`}>
                Cierre: {l.cierre}{urgente && days >= 0 ? ` (${days}d)` : ''}
              </span>
            )}
            {l.ccaa && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 shrink-0">{l.ccaa}</span>}
          </div>
          <div className="flex items-center gap-2">
            {l.id_expediente && (
              <a href={`https://www.google.com/search?q=${encodeURIComponent(l.id_expediente + ' ' + l.titulo.slice(0, 40) + ' licitacion pliego')}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors">
                Buscar expediente
              </a>
            )}
            <button onClick={onGuardar}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                estaGuardada(l.id) ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}>
              {estaGuardada(l.id) ? '★ Guardada' : '☆ Guardar'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center font-bold text-sm">LA</div>
        <div className="flex-1">
          <div className="font-semibold">LicitaAlert España</div>
          <div className="text-blue-300 text-xs">Búsqueda inteligente · Datos PLACSP en tiempo real</div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setTab('buscar')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'buscar' ? 'bg-white text-[#1e3a5f]' : 'text-blue-200 hover:text-white'}`}>
            Buscar
          </button>
          <button onClick={() => setTab('guardadas')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${tab === 'guardadas' ? 'bg-white text-[#1e3a5f]' : 'text-blue-200 hover:text-white'}`}>
            Guardadas {guardadas.length > 0 && `(${guardadas.length})`}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {tab === 'buscar' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-3 focus-within:border-gray-400 transition-colors">
              <div className="flex items-center gap-3">
                <svg className="text-gray-400 shrink-0" width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscar()}
                  placeholder="Describe qué licitaciones buscas... (o usa solo filtros)"
                  className="flex-1 bg-transparent text-base outline-none placeholder-gray-400"/>
                <button onClick={() => setShowFiltros(!showFiltros)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${showFiltros ? 'bg-gray-100 border-gray-300 text-gray-700' : 'border-gray-200 text-gray-500'}`}>
                  Filtros {showFiltros ? '▲' : '▼'}
                </button>
                {loading
                  ? <div className="flex gap-1 shrink-0">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
                  : <button onClick={() => buscar()} className="bg-[#1e3a5f] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90 shrink-0">Buscar</button>
                }
              </div>
              {showFiltros && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-3">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Tipo de contrato</div>
                    <select value={tipo} onChange={e => setTipo(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                      {TIPOS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Comunidad autónoma</div>
                    <select value={ccaa} onChange={e => setCcaa(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white">
                      {CCAA.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Importe mínimo (€)</div>
                    <input value={importeMin} onChange={e => setImporteMin(e.target.value)}
                      placeholder="ej: 50000"
                      className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 outline-none"/>
                  </div>
                </div>
              )}
              {!searched && !showFiltros && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {ejemplos.map(ej => (
                    <button key={ej} onClick={() => { setQuery(ej); buscar(ej) }}
                      className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-full px-3 py-1 hover:border-gray-300">
                      {ej}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {filters?.resumen && (
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 mb-3 text-sm text-gray-600">
                IA interpretó: <span className="font-medium text-gray-900">"{filters.resumen}"</span>
              </div>
            )}
            {results.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-3">{results.length} licitaciones encontradas</div>
                <div className="space-y-2">
                  {results.map(l => (
                    <CardLicitacion key={l.id} l={l} onGuardar={() => estaGuardada(l.id) ? quitar(l.id) : guardar(l)} />
                  ))}
                </div>
              </div>
            )}
            {searched && !loading && results.length === 0 && (
              <div className="text-center py-12 text-gray-500">Sin resultados. Prueba con otros términos o filtros.</div>
            )}
          </>
        )}
        {tab === 'guardadas' && (
          <div>
            <div className="text-sm text-gray-500 mb-3">
              {guardadas.length === 0 ? 'No tienes licitaciones guardadas todavía.' : `${guardadas.length} licitaciones guardadas`}
            </div>
            <div className="space-y-2">
              {guardadas.map(l => (
                <CardLicitacion key={l.id} l={l} onGuardar={() => quitar(l.id)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}