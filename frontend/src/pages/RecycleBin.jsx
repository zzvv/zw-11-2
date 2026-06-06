import { useEffect } from 'react'
import { Trash2, RotateCcw, Trash, RefreshCw, Clock, AlertTriangle, Loader2 } from 'lucide-react'
import { useContracts } from '../context/ContractContext'
import moment from 'moment'

export default function RecycleBin() {
  const { recycleBin, loading, actionLoading, fetchRecycleBin, restoreContract, permanentDeleteContract, emptyRecycleBin } = useContracts()

  useEffect(() => {
    fetchRecycleBin()
  }, [fetchRecycleBin])

  const isRestoring = (id) => !!actionLoading[`restore-${id}`]
  const isPermanentDeleting = (id) => !!actionLoading[`permanent-${id}`]
  const isEmptying = !!actionLoading['empty']
  const isAnyActionRunning = Object.values(actionLoading).some(v => !!v)

  const handleRestore = async (id, name) => {
    if (!confirm(`确认恢复合同「${name}」？将同时恢复其关联的付款计划和变更记录。`)) return
    try {
      await restoreContract(id)
    } catch (_) {
    }
  }

  const handlePermanentDelete = async (id, name) => {
    if (!confirm(`确认彻底删除合同「${name}」？此操作不可恢复，将级联删除所有关联数据。`)) return
    try {
      await permanentDeleteContract(id)
    } catch (_) {
    }
  }

  const handleEmpty = async () => {
    if (!confirm('确认清空回收站？所有合同将被彻底删除，此操作不可恢复！')) return
    try {
      await emptyRecycleBin()
    } catch (_) {
    }
  }

  const getDaysLeftStyle = (daysLeft) => {
    if (daysLeft <= 3) return 'text-danger-600 bg-danger-50'
    if (daysLeft <= 7) return 'text-warning-600 bg-warning-50'
    return 'text-gray-600 bg-gray-50'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">回收站</h1>
          <span className="text-sm text-gray-500">删除的合同将在此保留30天</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchRecycleBin}
            disabled={isAnyActionRunning}
            className="btn-secondary flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          {recycleBin.length > 0 && (
            <button
              onClick={handleEmpty}
              disabled={isEmptying}
              className="bg-danger-500 hover:bg-danger-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEmptying ? <Loader2 size={16} className="animate-spin" /> : <Trash size={16} />}
              {isEmptying ? '清空中...' : '清空回收站'}
            </button>
          )}
        </div>
      </div>

      {recycleBin.length > 0 && (
        <div className="card bg-warning-50 border-warning-200">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-warning-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-warning-800">
              <p className="font-medium">重要提示</p>
              <p className="mt-1">回收站中的合同将在删除30天后被系统自动彻底清理。点击「恢复」可还原合同及其关联的付款计划和变更记录。</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">加载中...</div>
      ) : recycleBin.length === 0 ? (
        <div className="card text-center py-16">
          <Trash2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-400">回收站为空</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recycleBin.map(c => {
            const restoring = isRestoring(c._id)
            const permDeleting = isPermanentDeleting(c._id)
            const disabled = restoring || permDeleting
            return (
              <div key={c._id} className={`card py-5 hover:shadow-md transition-shadow opacity-90 ${disabled ? 'pointer-events-none' : ''}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-700 line-through">{c.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{c.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${getDaysLeftStyle(c.daysLeft)}`}>
                        <Clock size={12} />
                        {c.willExpire ? '即将清理' : `剩余 ${c.daysLeft} 天`}
                      </span>
                      {restoring && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin" />
                          恢复中...
                        </span>
                      )}
                      {permDeleting && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-danger-50 text-danger-600 flex items-center gap-1">
                          <Loader2 size={12} className="animate-spin" />
                          删除中...
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-gray-500 grid grid-cols-4 gap-4">
                      <div>编号: {c.contractNo}</div>
                      <div>甲方: {c.partyA?.name}</div>
                      <div>乙方: {c.partyB?.name}</div>
                      <div>金额: <span className="font-semibold text-gray-600">¥{c.amount?.toLocaleString()}</span></div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      删除时间: {moment(c.deletedAt).format('YYYY-MM-DD HH:mm')}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRestore(c._id, c.name)}
                      disabled={disabled}
                      className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {restoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                      {restoring ? '恢复中' : '恢复'}
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(c._id, c.name)}
                      disabled={disabled}
                      className="px-3 py-1.5 text-sm font-medium text-danger-600 hover:bg-danger-50 rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {permDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash size={14} />}
                      {permDeleting ? '删除中' : '彻底删除'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
