import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const AdvancedCalendar = ({ events = [], onDateSelect, onEventClick }) => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(null)
  const [viewMode, setViewMode] = useState('month') // month, week, day
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)

  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ]

  const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []
    
    // أيام الشهر السابق
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false
      })
    }

    // أيام الشهر الحالي
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day)
      const isToday = dayDate.toDateString() === new Date().toDateString()
      
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        isToday
      })
    }

    // أيام الشهر التالي لإكمال الشبكة
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false
      })
    }

    return days
  }

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + direction)
      return newDate
    })
  }

  const handleDateClick = (day) => {
    setSelectedDate(day.date)
    if (onDateSelect) {
      onDateSelect(day.date)
    }
  }

  const handleEventClick = (event) => {
    setSelectedEvent(event)
    setShowEventModal(true)
    if (onEventClick) {
      onEventClick(event)
    }
  }

  const days = getDaysInMonth(currentDate)

  const eventTypes = {
    meeting: { color: 'bg-blue-500', icon: 'fas fa-users' },
    deadline: { color: 'bg-red-500', icon: 'fas fa-exclamation-triangle' },
    holiday: { color: 'bg-green-500', icon: 'fas fa-calendar-day' },
    birthday: { color: 'bg-purple-500', icon: 'fas fa-birthday-cake' },
    task: { color: 'bg-orange-500', icon: 'fas fa-tasks' }
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* رأس التقويم */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4 space-x-reverse">
            <button
              onClick={() => navigateMonth(-1)}
              className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-all"
            >
              <i className="fas fa-chevron-right"></i>
            </button>
            
            <h2 className="text-2xl font-bold">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            
            <button
              onClick={() => navigateMonth(1)}
              className="w-10 h-10 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 flex items-center justify-center transition-all"
            >
              <i className="fas fa-chevron-left"></i>
            </button>
          </div>

          <div className="flex gap-2">
            {['month', 'week', 'day'].map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-2 rounded-lg transition-all ${
                  viewMode === mode 
                    ? 'bg-white text-blue-600' 
                    : 'bg-white bg-opacity-20 hover:bg-opacity-30'
                }`}
              >
                {mode === 'month' ? 'شهر' : mode === 'week' ? 'أسبوع' : 'يوم'}
              </button>
            ))}
          </div>
        </div>

        {/* أيام الأسبوع */}
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map(day => (
            <div key={day} className="text-center py-2 text-blue-100 font-medium">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* شبكة التقويم */}
      <div className="p-6">
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day.date)
            const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString()
            
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.01 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => handleDateClick(day)}
                className={`
                  relative min-h-[80px] p-2 rounded-xl cursor-pointer transition-all duration-200
                  ${day.isCurrentMonth 
                    ? 'bg-gray-50 hover:bg-blue-50' 
                    : 'bg-gray-100 text-gray-400'
                  }
                  ${day.isToday ? 'bg-blue-100 border-2 border-blue-500' : ''}
                  ${isSelected ? 'bg-blue-200 border-2 border-blue-600' : ''}
                `}
              >
                <div className={`
                  text-sm font-medium mb-1
                  ${day.isToday ? 'text-blue-600' : ''}
                  ${isSelected ? 'text-blue-700' : ''}
                `}>
                  {day.date.getDate()}
                </div>

                {/* الأحداث */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 2).map((event, eventIndex) => {
                    const eventType = eventTypes[event.type] || eventTypes.task
                    return (
                      <motion.div
                        key={eventIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + eventIndex * 0.05 }}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEventClick(event)
                        }}
                        className={`
                          ${eventType.color} text-white text-xs px-2 py-1 rounded-md
                          hover:opacity-80 transition-opacity cursor-pointer
                          flex items-center gap-1
                        `}
                      >
                        <i className={`${eventType.icon} text-xs`}></i>
                        <span className="truncate">{event.title}</span>
                      </motion.div>
                    )
                  })}
                  
                  {dayEvents.length > 2 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayEvents.length - 2} أخرى
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* نافذة تفاصيل الحدث */}
      <AnimatePresence>
        {showEventModal && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEventModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">تفاصيل الحدث</h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                >
                  <i className="fas fa-times text-gray-600"></i>
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${eventTypes[selectedEvent.type]?.color || 'bg-gray-500'}`}></div>
                  <h4 className="font-semibold text-gray-800">{selectedEvent.title}</h4>
                </div>

                {selectedEvent.description && (
                  <p className="text-gray-600">{selectedEvent.description}</p>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <i className="fas fa-calendar"></i>
                  <span>{new Date(selectedEvent.date).toLocaleDateString('ar-EG')}</span>
                </div>

                {selectedEvent.time && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <i className="fas fa-clock"></i>
                    <span>{selectedEvent.time}</span>
                  </div>
                )}

                {selectedEvent.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <i className="fas fa-map-marker-alt"></i>
                    <span>{selectedEvent.location}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button className="neu-btn-primary flex-1">
                  <i className="fas fa-edit mr-2"></i>
                  تعديل
                </button>
                <button className="neu-btn-danger">
                  <i className="fas fa-trash mr-2"></i>
                  حذف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* مفاتيح الألوان */}
      <div className="px-6 pb-6">
        <div className="bg-gray-50 rounded-xl p-4">
          <h4 className="font-semibold text-gray-800 mb-3">أنواع الأحداث</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(eventTypes).map(([type, config]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${config.color}`}></div>
                <span className="text-sm text-gray-600">
                  {type === 'meeting' ? 'اجتماع' :
                   type === 'deadline' ? 'موعد نهائي' :
                   type === 'holiday' ? 'إجازة' :
                   type === 'birthday' ? 'عيد ميلاد' : 'مهمة'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdvancedCalendar
