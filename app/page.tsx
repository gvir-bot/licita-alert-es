'use client'

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

export default function Home() {
  const [query, setQuery]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [filters, setFilters]   = useState<{resumen?: string} | null>(null)
  const [results, setResults]   = useState<Licitacion[]>([])
  const [searched, setSearched] = useState(false)
  const [guardadas, setGuardadas] = useState<Licitacion[]>([])
  const [tab, setTab]           = useState<'buscar' | 'guardadas'>('buscar')

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

  function estaGuardada(id: string) {
    return guardadas.some(g => g.id === id)
  }

  const ejemplos = [
    'consultoría TI Madrid',
    'obras públicas abiertas',
    'software gestión hospitalaria',
    'limpieza centros educativos',
  ]

  async function buscar(q = query) {
    if (!q.trim()) return
    setLoading(true); setSearched(true); setTab('buscar')
    try {
      const res1 = await fetch('/api/ai/parse-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const parsed = await res1.json()
      setFilters(parsed)
      const params = new URLSearchParams()
      if (parsed.keywords)    params.set('q', parsed.keywords)
      if (parsed.importe_min) params.set('importe_min', String(parsed.importe_min))
      if (parsed.importe_max) params.set('importe_max', String(parsed.importe_max))
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

  const CardLicitacion = ({ l, onGuardar }: { l: Licitacion; onGuardar: () => void }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          {l.url
            ? <a href={l.url} target="_blank" rel="noopener noreferrer"
                className="font-medium text-blue-700 hover:underline leading-snug block">
                {l.titulo}
              </a>
            : <div className="font-medium text-gray-900 leading-snug">{l.titulo}</div>
          }
          {l.id_expediente && (
            <div className="text-xs text-gray-400 mt-0.5 font-mono">Exp: {l.id_expediente}</div>
          )}
        </div>
        <div className="shrink-0 text-right">
          <div className="font-mono text-sm font-semibold text-gray-900">{fmt(l.importe)}</div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          {l.org && <><span>{l.org}</span><span>·</span></>}
          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700">{l.estado}</span>
          {l.cierre && <><span>·</span><span>Cierre: {l.cierre}</span></>}
        </div>
        <button onClick={onGuardar}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            estaGuardada(l.id)
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}>
          {estaGuardada(l.id) ? '★ Guardada' : '☆ Guardar'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#1e3a5f] text-white px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center font-bold text-sm">LA</div>
        <div className="flex-1">
          <div className="font-semibold">LicitaAlert España</div>
          <div className="text-blue-300 text-xs">Búsqueda inteligente de licitaciones públicas</div>
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {tab === 'buscar' && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 focus-within:border-gray-400 transition-colors">
              <div className="flex items-center gap-3">
                <svg className="text-gray-400 shrink-0" width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                <input value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && buscar()}
                  placeholder="Describe qué licitaciones buscas..."
                  className="flex-1 bg-transparent text-base outline-none placeholder-gray-400"/>
                {loading
                  ? <div className="flex gap-1">{[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{animationDelay:`${i*0.15}s`}}/>)}</div>
                  : <button onClick={() => buscar()} className="bg-[#1e3a5f] text-white text-sm px-4 py-2 rounded-lg hover:opacity-90">Buscar</button>
                }
              </div>
              {!searched && (
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
              <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 mb-4 text-sm text-gray-600">
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
              <div className="text-center py-12 text-gray-500">Sin resultados. Intenta con otros términos.</div>
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