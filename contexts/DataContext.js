import { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

const DataContext = createContext()

export const useData = () => {
  const context = useContext(DataContext)
  if (!context) throw new Error('useData must be used within a DataProvider')
  return context
}

export const DataProvider = ({ children }) => {
  const [employees, setEmployees] = useState([])
  const [devices, setDevices] = useState([])
  const [leaves, setLeaves] = useState([])
  const [leaveBalances, setLeaveBalances] = useState([])
  const [attendance, setAttendance] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/db-sync', {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })

      // 304 can be returned without a body; keep current state in this case.
      if (response.status === 304) {
        return
      }

      const text = await response.text()
      const result = text ? JSON.parse(text) : { success: false, error: 'Empty sync response' }

      if (result.success && result.data) {
        setEmployees(result.data.employees || [])
        setDevices(result.data.devices || [])
        setLeaves(result.data.leaves || [])
        setAttendance(result.data.attendance || [])
        setSettings(result.data.settings || {})
      } else {
        throw new Error(result.error || 'Failed to sync data')
      }
    } catch (error) {
      console.error('خطأ في استرجاع البيانات الحقيقية:', error)
      toast.error('حدث خطأ في مزامنة قاعدة البيانات المركزية')
      // Fallback to empty if DB fails so UI doesn't crash completely
      setEmployees([])
      setDevices([])
    } finally {
      setLoading(false)
    }
  }

  const addEmployee = async (employeeData) => {
    try {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...employeeData,
          employee_id: `EMP${new Date().getFullYear().toString().slice(-2)}${(employees.length + 1).toString().padStart(3, '0')}`
        })
      });
      const result = await response.json();
      if (result.success) {
        await loadAllData();
        toast.success('تمت الإضافة بنجاح عبر النظام المركزي');
        return { success: true };
      } else throw new Error(result.error);
    } catch (e) {
      toast.error('أخفق النظام المركزي في حفظ بيانات الموظف');
      return { success: false };
    }
  }

  const updateEmployee = async (employeeId, updatedData) => {
    try {
      const response = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: employeeId, ...updatedData })
      });
      const result = await response.json();
      if (result.success) {
        await loadAllData();
        toast.success('تم التحديث بنجاح عبر النظام المركزي');
        return { success: true };
      } else throw new Error(result.error);
    } catch (e) {
      toast.error('أخفق النظام في حفظ التعديل');
      return { success: false };
    }
  }

  const deleteEmployee = async (employeeId) => {
    try {
      const response = await fetch('/api/employees', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: employeeId })
      });
      const result = await response.json();
      if (result.success) {
        await loadAllData();
        toast.success('تم الأرشفة بنجاح');
        return { success: true };
      } else throw new Error(result.error);
    } catch (e) {
      toast.error('لم نتمكن من الحذف من القاعدة المركزية');
      return { success: false };
    }
  }

  const setStorageData = (key, data) => {
    try {
      localStorage.setItem(`hr_system_${key}`, JSON.stringify(data));
      return true;
    } catch { return false; }
  }

  const addLeave = async (leaveData) => {
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leaveData)
      })
      const result = await res.json()
      if (result.success) {
        await loadAllData()
        return { success: true }
      } else throw new Error(result.error)
    } catch (e) {
      console.error('[addLeave]', e)
      return { success: false, error: e.message }
    }
  }

  const updateLeave = async (id, leaveData) => {
    try {
      const res = await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...leaveData })
      })
      const result = await res.json()
      if (result.success) { await loadAllData(); return { success: true } }
      else throw new Error(result.error)
    } catch (e) {
      console.error('[updateLeave]', e)
      return { success: false, error: e.message }
    }
  }

  const updateLeaveStatus = async (id, status) => {
    try {
      const res = await fetch('/api/leaves', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      const result = await res.json()
      if (result.success) { await loadAllData(); return { success: true } }
      else throw new Error(result.error)
    } catch (e) {
      console.error('[updateLeaveStatus]', e)
      return { success: false, error: e.message }
    }
  }

  const deleteLeave = async (id) => {
    try {
      const res = await fetch('/api/leaves', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      const result = await res.json()
      if (result.success) { await loadAllData(); return { success: true } }
      else throw new Error(result.error)
    } catch (e) {
      console.error('[deleteLeave]', e)
      return { success: false, error: e.message }
    }
  }

  const value = {
    employees, devices, leaves, attendance, settings, loading,
    loadAllData, addEmployee, updateEmployee, deleteEmployee,
    addLeave, updateLeave, updateLeaveStatus, deleteLeave,
    setEmployees, setDevices, setLeaves, setAttendance, setSettings
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}
