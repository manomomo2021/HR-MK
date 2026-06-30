import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

const PerformanceModal = ({ isOpen, onClose, evaluation, employees, onSave }) => {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [criteria, setCriteria] = useState([
    { name: 'جودة العمل', weight: 25, score: 0 },
    { name: 'الالتزام بالمواعيد', weight: 20, score: 0 },
    { name: 'التعاون مع الفريق', weight: 20, score: 0 },
    { name: 'المبادرة والإبداع', weight: 15, score: 0 },
    { name: 'التطوير المهني', weight: 10, score: 0 },
    { name: 'التواصل الفعال', weight: 10, score: 0 }
  ])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm()

  const selectedEmployeeId = watch('employeeId')

  // حساب الدرجة الإجمالية
  const totalScore = criteria.reduce((sum, criterion) => {
    return sum + (criterion.score * criterion.weight / 100)
  }, 0)

  // تحميل بيانات التقييم عند فتح النافذة للتعديل
  useEffect(() => {
    if (isOpen) {
      if (evaluation) {
        reset({
          employeeId: evaluation.employeeId || '',
          employeeName: evaluation.employeeName || '',
          period: evaluation.period || '',
          evaluatorName: evaluation.evaluatorName || '',
          goals: evaluation.goals || '',
          achievements: evaluation.achievements || '',
          strengths: evaluation.strengths || '',
          improvements: evaluation.improvements || '',
          developmentPlan: evaluation.developmentPlan || '',
          comments: evaluation.comments || ''
        })
        
        if (evaluation.criteria) {
          setCriteria(evaluation.criteria)
        }
      } else {
        // للموظف العادي، تعيين بياناته تلقائياً
        const defaultEmployeeId = user?.role === 'employee' ? user.employeeId : ''
        const defaultEmployeeName = user?.role === 'employee' ? user.name : ''
        
        reset({
          employeeId: defaultEmployeeId,
          employeeName: defaultEmployeeName,
          period: '',
          evaluatorName: user?.name || '',
          goals: '',
          achievements: '',
          strengths: '',
          improvements: '',
          developmentPlan: '',
          comments: ''
        })
        
        // إعادة تعيين المعايير للقيم الافتراضية
        setCriteria([
          { name: 'جودة العمل', weight: 25, score: 0 },
          { name: 'الالتزام بالمواعيد', weight: 20, score: 0 },
          { name: 'التعاون مع الفريق', weight: 20, score: 0 },
          { name: 'المبادرة والإبداع', weight: 15, score: 0 },
          { name: 'التطوير المهني', weight: 10, score: 0 },
          { name: 'التواصل الفعال', weight: 10, score: 0 }
        ])
      }
    }
  }, [isOpen, evaluation, reset, user])

  // تحديث اسم الموظف عند تغيير الموظف المحدد
  useEffect(() => {
    if (selectedEmployeeId && employees.length > 0) {
      const selectedEmployee = employees.find(emp => emp.id.toString() === selectedEmployeeId.toString())
      if (selectedEmployee) {
        reset(prev => ({
          ...prev,
          employeeName: selectedEmployee.name
        }))
      }
    }
  }, [selectedEmployeeId, employees, reset])

  const handleCriterionScoreChange = (index, score) => {
    const newCriteria = [...criteria]
    newCriteria[index].score = Math.min(100, Math.max(0, parseInt(score) || 0))
    setCriteria(newCriteria)
  }

  const onSubmit = async (data) => {
    setIsLoading(true)
    
    try {
      // التحقق من صحة البيانات
      const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0)
      if (totalWeight !== 100) {
        toast.error('مجموع أوزان المعايير يجب أن يساوي 100%')
        return
      }

      // العثور على اسم الموظف
      const selectedEmployee = employees.find(emp => emp.id.toString() === data.employeeId.toString())
      if (!selectedEmployee) {
        toast.error('يرجى اختيار موظف صحيح')
        return
      }

      const evaluationData = {
        ...data,
        employeeId: parseInt(data.employeeId),
        employeeName: selectedEmployee.name,
        criteria,
        totalScore: Math.round(totalScore),
        evaluatorId: user?.id,
        evaluatorName: data.evaluatorName
      }

      await onSave(evaluationData)
    } catch (error) {
      console.error('خطأ في حفظ التقييم:', error)
      toast.error('حدث خطأ أثناء حفظ البيانات')
    } finally {
      setIsLoading(false)
    }
  }

  const getPerformanceLevel = (score) => {
    if (score >= 90) return { text: 'ممتاز', color: 'text-green-600' }
    if (score >= 80) return { text: 'جيد جداً', color: 'text-blue-600' }
    if (score >= 70) return { text: 'جيد', color: 'text-yellow-600' }
    if (score >= 60) return { text: 'مقبول', color: 'text-orange-600' }
    return { text: 'يحتاج تحسين', color: 'text-red-600' }
  }

  const performanceLevel = getPerformanceLevel(totalScore)

  return (
    <AnimatePresence>
      {isOpen && (
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
              <h2 className="text-xl font-bold text-gray-800">
                {evaluation ? 'تعديل تقييم الأداء' : 'تقييم أداء جديد'}
              </h2>
              <button
                onClick={onClose}
                className="neu-btn p-2"
                disabled={isLoading}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* محتوى النافذة */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* معلومات أساسية */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-info-circle text-primary-500"></i>
                    معلومات التقييم
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الموظف *
                      </label>
                      <select
                        {...register('employeeId', { required: 'اختيار الموظف مطلوب' })}
                        className="neu-select"
                        disabled={user?.role === 'employee'}
                      >
                        <option value="">اختر الموظف</option>
                        {employees.map(employee => (
                          <option key={employee.id} value={employee.id}>
                            {employee.name}
                          </option>
                        ))}
                      </select>
                      {errors.employeeId && (
                        <p className="text-red-500 text-sm mt-1">{errors.employeeId.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        فترة التقييم *
                      </label>
                      <select
                        {...register('period', { required: 'فترة التقييم مطلوبة' })}
                        className="neu-select"
                      >
                        <option value="">اختر الفترة</option>
                        <option value="Q1-2024">الربع الأول 2024</option>
                        <option value="Q2-2024">الربع الثاني 2024</option>
                        <option value="Q3-2024">الربع الثالث 2024</option>
                        <option value="Q4-2024">الربع الرابع 2024</option>
                        <option value="annual-2024">سنوي 2024</option>
                      </select>
                      {errors.period && (
                        <p className="text-red-500 text-sm mt-1">{errors.period.message}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        اسم المقيم *
                      </label>
                      <input
                        {...register('evaluatorName', { required: 'اسم المقيم مطلوب' })}
                        className="neu-input"
                        placeholder="اسم المقيم"
                      />
                      {errors.evaluatorName && (
                        <p className="text-red-500 text-sm mt-1">{errors.evaluatorName.message}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* معايير التقييم */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-star text-yellow-500"></i>
                    معايير التقييم
                  </h3>
                  
                  <div className="space-y-4">
                    {criteria.map((criterion, index) => (
                      <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                        <div className="flex-1">
                          <span className="font-medium text-gray-800">{criterion.name}</span>
                          <span className="text-sm text-gray-500 ml-2">({criterion.weight}%)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={criterion.score}
                            onChange={(e) => handleCriterionScoreChange(index, e.target.value)}
                            className="neu-input w-20 text-center"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500">/ 100</span>
                        </div>
                        <div className="w-24 text-right">
                          <span className="font-bold text-blue-600">
                            {(criterion.score * criterion.weight / 100).toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* الدرجة الإجمالية */}
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-800">الدرجة الإجمالية</h4>
                        <p className="text-sm text-gray-600">مجموع جميع المعايير</p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{totalScore.toFixed(1)}/100</div>
                        <div className={`text-sm font-medium ${performanceLevel.color}`}>
                          {performanceLevel.text}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* تفاصيل التقييم */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <i className="fas fa-clipboard-list text-green-500"></i>
                    تفاصيل التقييم
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الأهداف المحققة
                      </label>
                      <textarea
                        {...register('achievements')}
                        className="neu-input"
                        rows="3"
                        placeholder="اذكر الأهداف والإنجازات المحققة خلال فترة التقييم..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        نقاط القوة
                      </label>
                      <textarea
                        {...register('strengths')}
                        className="neu-input"
                        rows="3"
                        placeholder="اذكر نقاط القوة والمهارات المميزة للموظف..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        مجالات التحسين
                      </label>
                      <textarea
                        {...register('improvements')}
                        className="neu-input"
                        rows="3"
                        placeholder="اذكر المجالات التي تحتاج إلى تحسين وتطوير..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        خطة التطوير
                      </label>
                      <textarea
                        {...register('developmentPlan')}
                        className="neu-input"
                        rows="3"
                        placeholder="اقترح خطة لتطوير مهارات الموظف وتحسين أدائه..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ملاحظات إضافية
                      </label>
                      <textarea
                        {...register('comments')}
                        className="neu-input"
                        rows="2"
                        placeholder="أي ملاحظات أو تعليقات إضافية..."
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            {/* أزرار النافذة */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="neu-btn"
                disabled={isLoading}
              >
                <i className="fas fa-times"></i>
                إلغاء
              </button>
              <button
                onClick={handleSubmit(onSubmit)}
                className="neu-btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="loading-spinner w-4 h-4"></div>
                    جاري الحفظ...
                  </div>
                ) : (
                  <>
                    <i className="fas fa-save"></i>
                    حفظ التقييم
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default PerformanceModal
