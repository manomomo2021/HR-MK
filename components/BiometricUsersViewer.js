import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { BiometricDevice } from '../utils/biometric'

const BiometricUsersViewer = ({ isOpen, onClose, device }) => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUsers, setSelectedUsers] = useState([])

  useEffect(() => {
    if (isOpen && device) {
      fetchUsers()
    }
  }, [isOpen, device])

  const fetchUsers = async () => {
    if (!device) return

    setLoading(true)
    const loadingToast = toast.loading(`جاري جلب المستخدمين من ${device.name}...`)

    try {
      const biometricDevice = new BiometricDevice(device)
      await biometricDevice.connect()
      
      const usersList = await biometricDevice.getUsersList()
      setUsers(usersList)
      
      await biometricDevice.disconnect()
      
      toast.dismiss(loadingToast)
      toast.success(`تم جلب ${usersList.length} مستخدم من الجهاز`)
      
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(`فشل في جلب المستخدمين: ${error.message}`)
      console.error('خطأ في جلب المستخدمين:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.userId.toString().includes(searchQuery)
  )

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const selectAllUsers = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map(user => user.userId))
    }
  }

  const copyUserIds = () => {
    const ids = selectedUsers.length > 0 
      ? selectedUsers.join(', ')
      : filteredUsers.map(user => user.userId).join(', ')
    
    navigator.clipboard.writeText(ids).then(() => {
      toast.success(`تم نسخ ${selectedUsers.length > 0 ? selectedUsers.length : filteredUsers.length} معرف`)
    }).catch(() => {
      toast.error('فشل في نسخ المعرفات')
    })
  }

  const exportToCSV = () => {
    const csvContent = generateCSV(filteredUsers)
    downloadCSV(csvContent, `users_${device.name}_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const generateCSV = (data) => {
    let csvContent = '\ufeff' // BOM for UTF-8
    csvContent += 'معرف المستخدم,الاسم,رقم البطاقة,الصلاحية\n'
    
    data.forEach(user => {
      csvContent += `"${user.userId}","${user.name}","${user.cardNumber || ''}","${user.privilege || 0}"\n`
    })
    
    return csvContent
  }

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    URL.revokeObjectURL(url)
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* خلفية */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* النافذة */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white rounded-2xl shadow-neu max-w-4xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* رأس النافذة */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-800">مستخدمي جهاز البصمة</h2>
              <p className="text-sm text-gray-500 mt-1">
                {device?.name} • {users.length} مستخدم
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchUsers}
                disabled={loading}
                className="neu-btn text-sm"
              >
                <i className={`fas fa-sync ${loading ? 'fa-spin' : ''}`}></i>
                تحديث
              </button>
              <button
                onClick={onClose}
                className="neu-btn p-2"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* شريط البحث والإجراءات */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="neu-input"
                  placeholder="البحث بالاسم أو المعرف..."
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllUsers}
                  className="neu-btn text-sm"
                >
                  <i className="fas fa-check-square"></i>
                  {selectedUsers.length === filteredUsers.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
                <button
                  onClick={copyUserIds}
                  className="neu-btn-primary text-sm"
                  disabled={filteredUsers.length === 0}
                >
                  <i className="fas fa-copy"></i>
                  نسخ المعرفات
                </button>
                <button
                  onClick={exportToCSV}
                  className="neu-btn-success text-sm"
                  disabled={filteredUsers.length === 0}
                >
                  <i className="fas fa-download"></i>
                  تصدير CSV
                </button>
              </div>
            </div>
          </div>

          {/* قائمة المستخدمين */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-300px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="loading-spinner w-8 h-8"></div>
                <span className="mr-3">جاري تحميل المستخدمين...</span>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="table-responsive">
                <table className="neu-table">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                          onChange={selectAllUsers}
                          className="rounded"
                        />
                      </th>
                      <th>معرف المستخدم</th>
                      <th>الاسم</th>
                      <th>رقم البطاقة</th>
                      <th>الصلاحية</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user.userId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.userId)}
                            onChange={() => toggleUserSelection(user.userId)}
                            className="rounded"
                          />
                        </td>
                        <td className="font-mono font-bold text-primary-600">{user.userId}</td>
                        <td className="font-medium">{user.name}</td>
                        <td className="font-mono text-sm">{user.cardNumber || '-'}</td>
                        <td>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            user.privilege === 14 ? 'bg-red-100 text-red-800' :
                            user.privilege === 0 ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {user.privilege === 14 ? 'مدير' : user.privilege === 0 ? 'مستخدم' : `مستوى ${user.privilege}`}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(user.userId.toString())
                                toast.success(`تم نسخ المعرف: ${user.userId}`)
                              }}
                              className="w-8 h-8 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 hover:text-blue-700 flex items-center justify-center transition-colors duration-200"
                              title="نسخ المعرف"
                            >
                              <i className="fas fa-copy text-xs"></i>
                            </button>
                            <button
                              onClick={() => {
                                toast(`معلومات المستخدم:\nالمعرف: ${user.userId}\nالاسم: ${user.name}\nالبطاقة: ${user.cardNumber || 'غير محدد'}\nالصلاحية: ${user.privilege}`, {
                                  duration: 4000,
                                  icon: '👤'
                                })
                              }}
                              className="w-8 h-8 rounded-lg bg-green-100 hover:bg-green-200 text-green-600 hover:text-green-700 flex items-center justify-center transition-colors duration-200"
                              title="عرض التفاصيل"
                            >
                              <i className="fas fa-eye text-xs"></i>
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <i className="fas fa-users text-6xl text-gray-300 mb-4"></i>
                <h3 className="text-lg font-medium text-gray-500 mb-2">
                  {searchQuery ? 'لا توجد نتائج' : 'لا توجد مستخدمين'}
                </h3>
                <p className="text-gray-400 mb-4">
                  {searchQuery 
                    ? 'لا توجد مستخدمين مطابقين لمعايير البحث'
                    : 'لم يتم العثور على مستخدمين في الجهاز'
                  }
                </p>
                {!searchQuery && (
                  <button onClick={fetchUsers} className="neu-btn-primary">
                    <i className="fas fa-sync"></i>
                    إعادة المحاولة
                  </button>
                )}
              </div>
            )}
          </div>

          {/* معلومات إضافية */}
          {users.length > 0 && (
            <div className="p-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  عرض {filteredUsers.length} من {users.length} مستخدم
                  {selectedUsers.length > 0 && ` • ${selectedUsers.length} محدد`}
                </span>
                <span>
                  آخر تحديث: {new Date().toLocaleTimeString('en-GB')}
                </span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default BiometricUsersViewer
