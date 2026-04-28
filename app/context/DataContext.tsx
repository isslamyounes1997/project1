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
    const slim = {
      id: imp.id,
      label: imp.label,
      import_date: imp.import_date,
      count: imp.count,
      data: imp.data.map(slimRecord as any),
    }
    const res = await fetch('/api/imports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slim),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Opslaan mislukt')
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
