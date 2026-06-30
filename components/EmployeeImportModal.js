import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  readCSVFile, convertImportedDataToEmployee, validateImportedEmployees,
  generateEmployeeTemplate, convertToCSV, downloadCSV
} from '../utils/excel'

const EmployeeImportModal = ({ isOpen, onClose, onImport, existingEmployees = [] }) => {
  const [file, setFile] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewData, setPreviewData] = useState([])
  const [validationResult, setValidationResult] = useState(null)
  const [step, setStep] = useState(1) // 1: اختيار الملف, 2: معاينة, 3: النتائج

  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) { toast.error('يرجى اختيار ملف CSV فقط'); return }
      setFile(selectedFile); setPreviewData([]); setValidationResult(null); setStep(1)
    }
  }

  const processFile = async () => {
    if (!file) { toast.error('يرجى اختيار ملف أولاً'); return }
    setIsProcessing(true)
    const loadingToast = toast.loading('جاري معالجة الملف...')
    try {
      const rawData = await readCSVFile(file)
      if (rawData.length === 0) throw new Error('الملف فارغ أو لا يحتوي على بيانات صحيحة')
      const employeeData = convertImportedDataToEmployee(rawData)
      const validation = validateImportedEmployees(employeeData, existingEmployees)

      setPreviewData(employeeData); setValidationResult(validation); setStep(2)
      toast.dismiss(loadingToast)

      if (validation.isValid) toast.success(`تم تحليل ${employeeData.length} موظف بنجاح`)
      else toast.error(`تم العثور على ${validation.errors.length} خطأ في البيانات`)
    } catch (error) {
      console.error('خطأ في معالجة الملف:', error)
      toast.dismiss(loadingToast); toast.error(error.message || 'حدث خطأ أثناء معالجة الملف')
    } finally { setIsProcessing(false) }
  }

  const handleImport = async () => {
    if (!validationResult?.isValid) { toast.error('يجب إصلاح جميع الأخطاء قبل الاستيراد'); return }
    setIsProcessing(true)
    const loadingToast = toast.loading('جاري استيراد الموظفين...')
    try {
      await onImport(previewData)
      setStep(3); toast.dismiss(loadingToast); toast.success(`تم استيراد ${previewData.length} موظف بنجاح`)
    } catch (error) {
      console.error('خطأ في الاستيراد:', error)
      toast.dismiss(loadingToast); toast.error('حدث خطأ أثناء استيراد الموظفين')
    } finally { setIsProcessing(false) }
  }

  const downloadTemplate = () => {
    const template = generateEmployeeTemplate()
    const csvContent = convertToCSV(template.data, template.headers)
    downloadCSV(csvContent, 'employee_template.csv')
    toast.success('تم تحميل القالب بنجاح')
  }

  const resetModal = () => { setFile(null); setPreviewData([]); setValidationResult(null); setStep(1) }
  const handleClose = () => { resetModal(); onClose() }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 !m-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={handleClose} />

          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl shadow-indigo-500/10 max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 bg-white/5 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2"></div>
              <div>
                <h2 className="text-2xl font-black text-white relative z-10 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"><i className="fas fa-file-import"></i></div>
                  استيراد جداول الكوادر المدعمة
                </h2>
                <p className="text-sm text-slate-400 mt-1 font-mono">الخطوة {step} من 3: {step === 1 ? 'تهيئة الرابطة' : step === 2 ? 'تحليل وتدقيق' : 'إنفاذ البيانات'}</p>
              </div>
              <button onClick={handleClose} disabled={isProcessing} className="relative z-10 w-10 h-10 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer border border-transparent hover:border-rose-500/20 group">
                <i className="fas fa-times group-hover:rotate-90 transition-transform"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 relative hide-scrollbar">

              {/* Step 1: File Selection */}
              {step === 1 && (
                <div className="space-y-8">
                  <div className="bg-indigo-500/10 p-6 rounded-2xl border border-indigo-500/20 flex gap-4">
                    <div className="text-indigo-400 text-3xl shrink-0"><i className="fas fa-info-circle"></i></div>
                    <div>
                      <h3 className="text-lg font-bold text-indigo-300 mb-2">تعليمات الربط والتشفير</h3>
                      <div className="text-sm text-indigo-200/80 space-y-2 font-medium">
                        <p>• النظام يدعم صيغ CSV للبيانات الضخمة فقط</p>
                        <p>• يجب تضمين ترويسة الحقول باللغة المعتمدة للمركز الرئيسي</p>
                        <p>• أعمدة الإلزام الأساسية: الاسم الأمني، والبريد الإلكتروني القياسي</p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <button onClick={downloadTemplate} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-all flex items-center gap-2 mx-auto cursor-pointer">
                      <i className="fas fa-download text-emerald-400"></i> إستخراج هيكل التعبئة الخالي
                    </button>
                    <p className="text-sm text-slate-500 mt-3 font-medium">الهيكل مُبرمج لتلافي أخطاء التعرف الضوئي التلقائي</p>
                  </div>

                  <div className="border-2 border-dashed border-indigo-500/30 rounded-3xl p-12 text-center bg-slate-900/50 hover:bg-indigo-500/5 transition-colors group">
                    <div className="space-y-4 relative z-10">
                      <div className="w-24 h-24 rounded-3xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center shadow-inner shadow-indigo-500/20 group-hover:scale-110 transition-transform border border-indigo-500/20">
                        <i className="fas fa-file-csv text-5xl"></i>
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white mb-2">قم بإسقاط الملف المشفر هنا</h4>
                        <p className="text-slate-400">فقط بيانات بصيغة CSV مدعومة بالترميز الثنائي UTF-8</p>
                      </div>
                      <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="file-input" />
                      <label htmlFor="file-input" className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all inline-block mt-4 cursor-pointer">
                        <i className="fas fa-folder-open mr-2"></i> استعراض المصفوفة
                      </label>
                      {file && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/20 max-w-sm mx-auto">
                          <p className="text-emerald-400 font-bold flex items-center justify-center gap-2">
                            <i className="fas fa-file-check"></i> {file.name}
                          </p>
                          <p className="text-xs text-emerald-500/70 mt-1 font-mono">حجم الكتلة: {(file.size / 1024).toFixed(2)} KB</p>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Data Preview & Validation */}
              {step === 2 && (
                <div className="space-y-8">
                  {validationResult && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5 text-center">
                        <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 mx-auto flex items-center justify-center mb-3"><i className="fas fa-users text-xl"></i></div>
                        <h3 className="text-3xl font-black text-white">{validationResult.summary.totalRows}</h3>
                        <p className="text-slate-400 text-sm mt-1">عناصر مقروءة</p>
                      </div>
                      <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 text-center">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center mb-3"><i className="fas fa-check-double text-xl"></i></div>
                        <h3 className="text-3xl font-black text-emerald-400">{validationResult.summary.validRows}</h3>
                        <p className="text-emerald-500/70 text-sm mt-1">سجلات آمنة</p>
                      </div>
                      <div className="bg-rose-500/10 p-6 rounded-2xl border border-rose-500/20 text-center">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center mb-3"><i className="fas fa-radiation text-xl"></i></div>
                        <h3 className="text-3xl font-black text-rose-400">{validationResult.summary.errorRows}</h3>
                        <p className="text-rose-500/70 text-sm mt-1">تناقضات إجهاض</p>
                      </div>
                      <div className="bg-amber-500/10 p-6 rounded-2xl border border-amber-500/20 text-center">
                        <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-3"><i className="fas fa-exclamation-triangle text-xl"></i></div>
                        <h3 className="text-3xl font-black text-amber-400">{validationResult.summary.warningRows}</h3>
                        <p className="text-amber-500/70 text-sm mt-1">مخاطر محتملة</p>
                      </div>
                    </div>
                  )}

                  {validationResult && (validationResult.errors.length > 0 || validationResult.warnings.length > 0) && (
                    <div className="space-y-4">
                      {validationResult.errors.length > 0 && (
                        <div className="bg-rose-500/10 p-6 rounded-2xl border border-rose-500/30">
                          <h4 className="font-bold text-rose-400 mb-3 flex items-center gap-2"><i className="fas fa-shield-virus"></i> تناقضات حظرت المعالجة الأوتوماتيكية:</h4>
                          <ul className="text-sm text-rose-300 space-y-2 font-medium">
                            {validationResult.errors.map((error, index) => <li key={index}>• {error}</li>)}
                          </ul>
                        </div>
                      )}
                      {validationResult.warnings.length > 0 && (
                        <div className="bg-amber-500/10 p-6 rounded-2xl border border-amber-500/30">
                          <h4 className="font-bold text-amber-400 mb-3 flex items-center gap-2"><i className="fas fa-exclamation-triangle"></i> إنذارات أمنية مستوى متدني:</h4>
                          <ul className="text-sm text-amber-300 space-y-2 font-medium">
                            {validationResult.warnings.map((warning, index) => <li key={index}>• {warning}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                  {previewData.length > 0 && (
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 overflow-hidden">
                      <h4 className="text-lg font-bold text-indigo-400 mb-4">عينات السحب العشوائي المستهدفة (Top 5)</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-slate-900/50">
                              <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider rounded-tr-xl">الاسم المشفر</th>
                              <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">الاتصال</th>
                              <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">التشغيل</th>
                              <th className="py-3 px-4 font-bold text-slate-400 uppercase tracking-wider">النطاق</th>
                              <th className="py-3 px-4 font-bold text-emerald-400 uppercase tracking-wider rounded-tl-xl">الأجر الأساسي</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {previewData.slice(0, 5).map((employee, index) => (
                              <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 px-4 font-bold text-white">{employee.name}</td>
                                <td className="py-3 px-4 text-slate-400 font-mono">{employee.email || 'N/A'}</td>
                                <td className="py-3 px-4 text-slate-300">{employee.position}</td>
                                <td className="py-3 px-4 text-slate-300">{employee.department}</td>
                                <td className="py-3 px-4 font-mono font-bold text-emerald-400">{employee.basicSalary.toLocaleString()} {employee.currency}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {previewData.length > 5 && <div className="text-center mt-4 pt-4 border-t border-white/5 text-slate-500 font-mono text-xs">+ تم إخفاء {previewData.length - 5} عقد تدفق أخرى</div>}
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Success Result */}
              {step === 3 && (
                <div className="text-center py-12">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-24 h-24 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center text-5xl mb-6 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                    <i className="fas fa-shield-check"></i>
                  </motion.div>
                  <h3 className="text-3xl font-black text-white mb-2">نجاح عملية الإنزال</h3>
                  <p className="text-slate-400 mb-8">تم تفعيل وإدخال {previewData.length} كادر ضمن منظومة العمليات المركزية المظلمة</p>

                  <div className="bg-emerald-500/10 p-6 rounded-2xl border border-emerald-500/20 max-w-lg mx-auto text-right">
                    <h4 className="font-bold text-emerald-400 mb-4 border-b border-emerald-500/20 pb-2">تقرير النظام المالي والإداري:</h4>
                    <ul className="text-sm text-emerald-200/80 space-y-3">
                      <li className="flex gap-3"><i className="fas fa-check-circle text-emerald-500 mt-0.5"></i> تمرير جميع المفاتيح الأمنية بنجاح</li>
                      <li className="flex gap-3"><i className="fas fa-check-circle text-emerald-500 mt-0.5"></i> تأسيس الأكواد المركزية التلقائية للمولدات البشرية</li>
                      <li className="flex gap-3"><i className="fas fa-check-circle text-emerald-500 mt-0.5"></i> الكوادر متاحة الآن في شبكة الإدارة والمراقبة</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Action Footer */}
            <div className="flex items-center justify-between p-6 border-t border-white/10 bg-slate-900/80 backdrop-blur-xl shrink-0 relative z-20">
              <div>
                {step === 2 && (
                  <button onClick={() => setStep(1)} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-all cursor-pointer" disabled={isProcessing}>
                    <i className="fas fa-undo-alt ml-2"></i> تراجع خطوة
                  </button>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={handleClose} disabled={isProcessing} className="bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl border border-white/10 transition-all cursor-pointer">
                  {step === 3 ? 'إغلاق المحطة' : 'إجهاض العملية'}
                </button>

                {step === 1 && file && (
                  <button onClick={processFile} disabled={isProcessing} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all flex items-center gap-2 cursor-pointer">
                    {isProcessing ? <><div className="loading-spinner w-4 h-4"></div> تجزئة ومعالجة...</> : <><i className="fas fa-microchip"></i> تحليل وتدقيق</>}
                  </button>
                )}

                {step === 2 && validationResult?.isValid && (
                  <button onClick={handleImport} disabled={isProcessing} className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center gap-2 cursor-pointer">
                    {isProcessing ? <><div className="loading-spinner w-4 h-4"></div> حقن البيانات...</> : <><i className="fas fa-meteor"></i> تأكيد الحقن المركزي</>}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default EmployeeImportModal
