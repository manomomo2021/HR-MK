import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  analyzeAttendanceData, 
  generateAttendanceReport, 
  getVerifyModeText,
  getLogTypeText 
} from '../utils/biometric'

const AttendanceDataViewer = ({ isOpen, onClose, attendanceData = [] }) => {
  const [activeTab, setActiveTab] = useState('summary')
  const [report, setReport] = useState(null)
  const [filteredData, setFilteredData] = useState([])
  const [filters, setFilters] = useState({
    employee: '',
    date: '',
    logType: '',
    verifyMode: ''
  })

  useEffect(() => {
    if (attendanceData.length > 0) {
      const generatedReport = generateAttendanceReport(attendanceData)
      setReport(generatedReport)
      setFilteredData(attendanceData)
    }
  }, [attendanceData])

  useEffect(() => {
    applyFilters()
  }, [filters, attendanceData])

  const applyFilters = () => {
    let filtered = [...attendanceData]

    if (filters.employee) {
      filtered = filtered.filter(log => 
        log.employeeName.toLowerCase().includes(filters.employee.toLowerCase()) ||
        log.employeeCode.toLowerCase().includes(filters.employee.toLowerCase())
      )
    }

    if (filters.date) {
      filtered = filtered.filter(log => log.date === filters.date)
    }

    if (filters.logType) {
      filtered = filtered.filter(log => log.logType === filters.logType)
    }

    if (filters.verifyMode) {
      filtered = filtered.filter(log => log.verifyMode.toString() === filters.verifyMode)
    }

    setFilteredData(filtered)
  }

  const clearFilters = () => {
    setFilters({
      employee: '',
      date: '',
      logType: '',
      verifyMode: ''
    })
  }

  const exportToCSV = () => {
    const csvContent = generateCSV(filteredData)
    downloadCSV(csvContent, `attendance_data_${new Date().toISOString().split('T')[0]}.csv`)
  }

  const generateCSV = (data) => {
    let csvContent = '\ufeff' // BOM for UTF-8
    csvContent += 'كود الموظف,اسم الموظف,التاريخ,الوقت,النوع,طريقة التحقق,الجهاز,كود العمل\n'
    
    data.forEach(log => {
      csvContent += `"${log.employeeCode}","${log.employeeName}","${log.date}","${log.time}","${getLogTypeText(log.logType)}","${getVerifyModeText(log.verifyMode)}","${log.deviceName}","${log.workCode}"\n`
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
          className="relative bg-white rounded-2xl shadow-neu max-w-7xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* رأس النافذة */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-800">عرض بيانات الحضور والانصراف</h2>
              <p className="text-sm text-gray-500 mt-1">
                {attendanceData.length} سجل • {report?.summary.employeesCount} موظف
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="neu-btn-primary text-sm"
              >
                <i className="fas fa-download"></i>
                تصدير CSV
              </button>
              <button
                onClick={onClose}
                className="neu-btn p-2"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>

          {/* التبويبات */}
          <div className="flex border-b border-gray-200">
            {[
              { id: 'summary', label: 'الملخص', icon: 'fa-chart-bar' },
              { id: 'daily', label: 'التحليل اليومي', icon: 'fa-calendar-day' },
              { id: 'employees', label: 'تحليل الموظفين', icon: 'fa-users' },
              { id: 'details', label: 'التفاصيل', icon: 'fa-list' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <i className={`fas ${tab.icon} mr-2`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* محتوى التبويبات */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* تبويب الملخص */}
            {activeTab === 'summary' && report && (
              <div className="space-y-6">
                {/* إحصائيات عامة */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="stat-card">
                    <i className="stat-icon fas fa-list text-blue-500"></i>
                    <h3 className="text-2xl font-bold text-gray-800 mb-1">{report.summary.totalLogs}</h3>
                    <p className="text-gray-600 text-sm">إجمالي السجلات</p>
                  </div>
                  
                  <div className="stat-card">
                    <i className="stat-icon fas fa-users text-green-500"></i>
                    <h3 className="text-2xl font-bold text-gray-800 mb-1">{report.summary.employeesCount}</h3>
                    <p className="text-gray-600 text-sm">عدد الموظفين</p>
                  </div>
                  
                  <div className="stat-card">
                    <i className="stat-icon fas fa-sign-in-alt text-purple-500"></i>
                    <h3 className="text-2xl font-bold text-gray-800 mb-1">{report.summary.inLogs}</h3>
                    <p className="text-gray-600 text-sm">سجلات الحضور</p>
                  </div>
                  
                  <div className="stat-card">
                    <i className="stat-icon fas fa-sign-out-alt text-red-500"></i>
                    <h3 className="text-2xl font-bold text-gray-800 mb-1">{report.summary.outLogs}</h3>
                    <p className="text-gray-600 text-sm">سجلات الانصراف</p>
                  </div>
                </div>

                {/* طرق التحقق */}
                <div className="neu-card p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">طرق التحقق المستخدمة</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {report.verifyModeStats.map(stat => (
                      <div key={stat.mode} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-800">{getVerifyModeText(stat.mode)}</p>
                          <p className="text-sm text-gray-500">{stat.count} سجل</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary-600">{stat.percentage}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* تبويب التحليل اليومي */}
            {activeTab === 'daily' && report && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">الإحصائيات اليومية</h3>
                <div className="table-responsive">
                  <table className="neu-table">
                    <thead>
                      <tr>
                        <th>التاريخ</th>
                        <th>إجمالي السجلات</th>
                        <th>سجلات الحضور</th>
                        <th>سجلات الانصراف</th>
                        <th>عدد الموظفين</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.dailyStats.map(stat => (
                        <tr key={stat.date}>
                          <td className="font-medium">{new Date(stat.date).toLocaleDateString('en-GB')}</td>
                          <td>{stat.totalLogs}</td>
                          <td className="text-green-600">{stat.inLogs}</td>
                          <td className="text-red-600">{stat.outLogs}</td>
                          <td>{stat.employeesCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* تبويب تحليل الموظفين */}
            {activeTab === 'employees' && report && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-800">إحصائيات الموظفين</h3>
                <div className="table-responsive">
                  <table className="neu-table">
                    <thead>
                      <tr>
                        <th>كود الموظف</th>
                        <th>اسم الموظف</th>
                        <th>إجمالي السجلات</th>
                        <th>سجلات الحضور</th>
                        <th>سجلات الانصراف</th>
                        <th>أيام العمل</th>
                        <th>أول سجل</th>
                        <th>آخر سجل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.employeeStats.map(stat => (
                        <tr key={stat.employeeId}>
                          <td className="font-mono">{stat.employeeCode}</td>
                          <td className="font-medium">{stat.employeeName}</td>
                          <td>{stat.totalLogs}</td>
                          <td className="text-green-600">{stat.inLogs}</td>
                          <td className="text-red-600">{stat.outLogs}</td>
                          <td>{stat.workDaysCount}</td>
                          <td className="text-sm">{new Date(stat.firstLog).toLocaleString('en-GB')}</td>
                          <td className="text-sm">{new Date(stat.lastLog).toLocaleString('en-GB')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* تبويب التفاصيل */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                {/* فلاتر */}
                <div className="neu-card p-4">
                  <h4 className="font-semibold text-gray-800 mb-3">فلترة البيانات</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الموظف</label>
                      <input
                        type="text"
                        value={filters.employee}
                        onChange={(e) => setFilters(prev => ({ ...prev, employee: e.target.value }))}
                        className="neu-input text-sm"
                        placeholder="اسم أو كود الموظف"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                      <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
                        className="neu-input text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                      <select
                        value={filters.logType}
                        onChange={(e) => setFilters(prev => ({ ...prev, logType: e.target.value }))}
                        className="neu-select text-sm"
                      >
                        <option value="">جميع الأنواع</option>
                        <option value="IN">حضور</option>
                        <option value="OUT">انصراف</option>
                      </select>
                    </div>
                    
                    <div className="flex items-end">
                      <button onClick={clearFilters} className="neu-btn text-sm w-full">
                        <i className="fas fa-times"></i>
                        مسح الفلاتر
                      </button>
                    </div>
                  </div>
                </div>

                {/* جدول التفاصيل */}
                <div className="neu-card">
                  <div className="p-4 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-800">
                      تفاصيل السجلات ({filteredData.length} سجل)
                    </h4>
                  </div>
                  <div className="table-responsive max-h-96 overflow-y-auto">
                    <table className="neu-table">
                      <thead className="sticky top-0 bg-white">
                        <tr>
                          <th>كود الموظف</th>
                          <th>اسم الموظف</th>
                          <th>التاريخ</th>
                          <th>الوقت</th>
                          <th>النوع</th>
                          <th>طريقة التحقق</th>
                          <th>الجهاز</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredData.map((log, index) => (
                          <tr key={index}>
                            <td className="font-mono text-sm">{log.employeeCode}</td>
                            <td className="font-medium">{log.employeeName}</td>
                            <td>{new Date(log.date).toLocaleDateString('en-GB')}</td>
                            <td className="font-mono">{log.time}</td>
                            <td>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                log.logType === 'IN' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                <i className={`fas ${log.logType === 'IN' ? 'fa-sign-in-alt' : 'fa-sign-out-alt'} mr-1`}></i>
                                {getLogTypeText(log.logType)}
                              </span>
                            </td>
                            <td className="text-sm">{getVerifyModeText(log.verifyMode)}</td>
                            <td className="text-sm text-gray-500">{log.deviceName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default AttendanceDataViewer
