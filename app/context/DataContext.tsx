'use client'
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import type { ImportRecord, Klant } from '@/lib/supabase'
import { rebuildAllData, slimRecord, getWeekLabel } from '@/lib/data'

type DataContextType = {
  importHistory: ImportRecord[]
  allData: Klant[]
  loading: boolean
  loadFromServer: () => Promise<void>
  saveImport: (imp: ImportRecord) => Promise<void>
  deleteImport: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

const DataContext = createContext<DataContextType>({
  importHistory: [], allData: [], loading: false,
  loadFromServer: async () => {}, saveImport: async () => {},
  deleteImport: async () => {}, clearAll: async () => {},
})

export function DataProvider({ children }: { children: ReactNode }) {
  const [importHistory, setImportHistory] = useState<ImportRecord[]>([])
  const [allData, setAllData] = useState<Klant[]>([])
  const [loading, setLoading] = useState(false)

  const rebuild = useCallback((imports: ImportRecord[]) => {
    const data = rebuildAllData(imports)
    setAllData(data)
    return data
  }, [])

  const loadFromServer = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/imports')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const rows: ImportRecord[] = await res.json()
      setImportHistory(rows)
      rebuild(rows)
    } catch (e) {
      console.error('Load error:', e)
    } finally {
      setLoading(false)
    }
  }, [rebuild])

  const saveImport = useCallback(async (imp: ImportRecord) => {
    const CHUNK_SIZE = 5000
    const slimData = imp.data.map(slimRecord as any)
    const chunks: any[][] = []
    for (let i = 0; i < slimData.length; i += CHUNK_SIZE) {
      chunks.push(slimData.slice(i, i + CHUNK_SIZE))
    }

    // Stuur chunk voor chunk naar de server
    for (let i = 0; i < chunks.length; i++) {
      const slim = {
        id: i === 0 ? imp.id : `${imp.id}_chunk_${i}`,
        label: imp.label,
        import_date: imp.date || imp.import_date,
        count: i === 0 ? imp.count : chunks[i].length,
        data: chunks[i],
        parent_id: i === 0 ? null : imp.id,
        chunk_index: i,
        chunk_total: chunks.length,
      }
      const res = await fetch('/api/imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slim),
      })
      if (!res.ok) {
        const text = await res.text()
        let msg = text
        try { msg = JSON.parse(text).error } catch {}
        throw new Error(msg || 'Opslaan mislukt')
      }
    }

    const updated = [...importHistory, imp]
    setImportHistory(updated)
    rebuild(updated)
  }, [importHistory, rebuild])

  const deleteImport = useCallback(async (id: string) => {
    const res = await fetch(`/api/imports/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Verwijderen mislukt')
    const updated = importHistory.filter(i => i.id !== id)
    setImportHistory(updated)
    rebuild(updated)
  }, [importHistory, rebuild])

  const clearAll = useCallback(async () => {
    for (const imp of importHistory) {
      await fetch(`/api/imports/${imp.id}`, { method: 'DELETE' })
    }
    setImportHistory([])
    setAllData([])
  }, [importHistory])

  return (
    <DataContext.Provider value={{ importHistory, allData, loading, loadFromServer, saveImport, deleteImport, clearAll }}>
      {children}
    </DataContext.Provider>
  )
}

export const useData = () => useContext(DataContext)
