import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import axios from 'axios'

const API_BASE = '/api'

const ContractContext = createContext()

export const ContractProvider = ({ children }) => {
  const [contracts, setContracts] = useState([])
  const [recycleBin, setRecycleBin] = useState([])
  const [recycleCount, setRecycleCount] = useState(0)
  const [stats, setStats] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchContracts = useCallback(async (filters = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v) })
      const res = await axios.get(`${API_BASE}/contracts?${params}`)
      setContracts(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchRecycleBin = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/contracts/recycle`)
      setRecycleBin(res.data.data || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchRecycleCount = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/contracts/recycle/count`)
      setRecycleCount(res.data.data?.count || 0)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchStats = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard/stats`)
      setStats(res.data.data)
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/dashboard/alerts`)
      setAlerts(res.data.data || [])
    } catch (err) {
      console.error(err)
    }
  }, [])

  const createContract = async (data) => {
    const res = await axios.post(`${API_BASE}/contracts`, data)
    await fetchContracts()
    return res.data
  }

  const updateContract = async (id, data) => {
    const res = await axios.put(`${API_BASE}/contracts/${id}`, data)
    await fetchContracts()
    return res.data
  }

  const deleteContract = async (id) => {
    const res = await axios.delete(`${API_BASE}/contracts/${id}`)
    await fetchContracts()
    await fetchRecycleCount()
    return res.data
  }

  const restoreContract = async (id) => {
    const res = await axios.post(`${API_BASE}/contracts/recycle/restore/${id}`)
    await fetchRecycleBin()
    await fetchRecycleCount()
    await fetchContracts()
    return res.data
  }

  const permanentDeleteContract = async (id) => {
    const res = await axios.delete(`${API_BASE}/contracts/recycle/permanent/${id}`)
    await fetchRecycleBin()
    await fetchRecycleCount()
    return res.data
  }

  const emptyRecycleBin = async () => {
    const res = await axios.delete(`${API_BASE}/contracts/recycle/empty`)
    await fetchRecycleBin()
    await fetchRecycleCount()
    return res.data
  }

  const importContracts = async (contractsData) => {
    const res = await axios.post(`${API_BASE}/contracts/import`, { contracts: contractsData })
    await fetchContracts()
    return res.data
  }

  useEffect(() => {
    fetchContracts()
    fetchStats()
    fetchAlerts()
    fetchRecycleCount()
  }, [fetchContracts, fetchStats, fetchAlerts, fetchRecycleCount])

  return (
    <ContractContext.Provider value={{
      contracts, recycleBin, recycleCount, stats, alerts, loading,
      fetchContracts, fetchRecycleBin, fetchRecycleCount, fetchStats, fetchAlerts,
      createContract, updateContract, deleteContract,
      restoreContract, permanentDeleteContract, emptyRecycleBin,
      importContracts
    }}>
      {children}
    </ContractContext.Provider>
  )
}

export const useContracts = () => useContext(ContractContext)
