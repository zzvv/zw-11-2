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
  const [toast, setToast] = useState(null)
  const [actionLoading, setActionLoading] = useState({})

  const showToast = useCallback((message, type = 'success') => {
    const id = Date.now()
    setToast({ id, message, type })
    setTimeout(() => {
      setToast(prev => (prev?.id === id ? null : prev))
    }, 3000)
  }, [])

  const setActionLoadingState = useCallback((key, isLoading) => {
    setActionLoading(prev => ({ ...prev, [key]: isLoading }))
  }, [])

  const fetchContracts = useCallback(async (filters = {}) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v) })
      const res = await axios.get(`${API_BASE}/contracts?${params}`)
      setContracts(res.data.data || [])
    } catch (err) {
      console.error(err)
      showToast('加载合同列表失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  const fetchRecycleBin = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/contracts/recycle`)
      setRecycleBin(res.data.data || [])
    } catch (err) {
      console.error(err)
      showToast('加载回收站数据失败', 'error')
    }
  }, [showToast])

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
    try {
      const res = await axios.post(`${API_BASE}/contracts`, data)
      await fetchContracts()
      await fetchStats()
      showToast('合同创建成功', 'success')
      return res.data
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || '合同创建失败', 'error')
      throw err
    }
  }

  const updateContract = async (id, data) => {
    try {
      const res = await axios.put(`${API_BASE}/contracts/${id}`, data)
      await fetchContracts()
      await fetchStats()
      showToast('合同更新成功', 'success')
      return res.data
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || '合同更新失败', 'error')
      throw err
    }
  }

  const deleteContract = async (id) => {
    try {
      setActionLoadingState(`delete-${id}`, true)
      const res = await axios.delete(`${API_BASE}/contracts/${id}`)
      await fetchContracts()
      await fetchRecycleCount()
      await fetchStats()
      await fetchAlerts()
      showToast(res.data.message || '合同已移入回收站', 'success')
      return res.data
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || '合同删除失败', 'error')
      throw err
    } finally {
      setActionLoadingState(`delete-${id}`, false)
    }
  }

  const restoreContract = async (id) => {
    try {
      setActionLoadingState(`restore-${id}`, true)
      const res = await axios.post(`${API_BASE}/contracts/recycle/restore/${id}`)
      await fetchRecycleBin()
      await fetchRecycleCount()
      await fetchContracts()
      await fetchStats()
      await fetchAlerts()
      showToast(res.data.message || '合同及关联数据已恢复', 'success')
      return res.data
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || '合同恢复失败', 'error')
      throw err
    } finally {
      setActionLoadingState(`restore-${id}`, false)
    }
  }

  const permanentDeleteContract = async (id) => {
    try {
      setActionLoadingState(`permanent-${id}`, true)
      const res = await axios.delete(`${API_BASE}/contracts/recycle/permanent/${id}`)
      await fetchRecycleBin()
      await fetchRecycleCount()
      showToast(res.data.message || '合同已彻底删除', 'success')
      return res.data
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || '彻底删除失败', 'error')
      throw err
    } finally {
      setActionLoadingState(`permanent-${id}`, false)
    }
  }

  const emptyRecycleBin = async () => {
    try {
      setActionLoadingState('empty', true)
      const res = await axios.delete(`${API_BASE}/contracts/recycle/empty`)
      await fetchRecycleBin()
      await fetchRecycleCount()
      showToast(res.data.message || '回收站已清空', 'success')
      return res.data
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || '清空回收站失败', 'error')
      throw err
    } finally {
      setActionLoadingState('empty', false)
    }
  }

  const importContracts = async (contractsData) => {
    try {
      const res = await axios.post(`${API_BASE}/contracts/import`, { contracts: contractsData })
      await fetchContracts()
      await fetchStats()
      showToast(`成功导入 ${res.data.data?.length || 0} 个合同`, 'success')
      return res.data
    } catch (err) {
      console.error(err)
      showToast(err.response?.data?.message || '合同导入失败', 'error')
      throw err
    }
  }

  useEffect(() => {
    fetchContracts()
    fetchStats()
    fetchAlerts()
    fetchRecycleCount()
  }, [fetchContracts, fetchStats, fetchAlerts, fetchRecycleCount])

  return (
    <ContractContext.Provider value={{
      contracts, recycleBin, recycleCount, stats, alerts, loading, toast, actionLoading,
      fetchContracts, fetchRecycleBin, fetchRecycleCount, fetchStats, fetchAlerts,
      createContract, updateContract, deleteContract,
      restoreContract, permanentDeleteContract, emptyRecycleBin,
      importContracts, showToast
    }}>
      {children}
    </ContractContext.Provider>
  )
}

export const useContracts = () => useContext(ContractContext)
