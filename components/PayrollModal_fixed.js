import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { formatCurrency, CURRENCIES } from '../utils/currency'
import database from '../utils/database'

const PayrollModal = ({ isOpen, onClose, payroll, onSave }) => {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [autoCalculate, setAutoCalculate] = useState(true)
  const [workingDaysInMonth] = useState(22) // أيام العمل الافتراضية في الشهر
  const [showCalculations, setShowCalculations] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [employees, setEmployees] = useState([])
  const [attendanceData, setAttendanceData] = useState([])
  const [employeeAttendance, setEmployeeAttendance] = useState([])
  const [isLoadingEmployeeData, setIsLoadingEmployeeData] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues
  } = useForm()

  // مراقبة التغييرات لحساب الإجماليات تلقائياً
  const employeeId = watch('employeeId')
  const employeeName = watch('employeeName')
  const month = watch('month')
  const basicSalary = parseFloat(watch('basicSalary')) || 0
  const transportAllowance = parseFloat(watch('transportAllowance')) || 0
  const housingAllowance = parseFloat(watch('housingAllowance')) || 0
  const otherAllowances = parseFloat(watch('otherAllowances')) || 0
  const absentDays = parseFloat(watch('absentDays')) || 0
  const lateDays = parseFloat(watch('lateDays')) || 0
  const loanDeduction = parseFloat(watch('loanDeduction')) || 0
  const otherDeductions = parseFloat(watch('otherDeductions')) || 0

  // حسابات متقدمة حسب أيام العمل
  const dailySalary = basicSalary / workingDaysInMonth
  const actualWorkingDays = Math.max(0, workingDaysInMonth - absentDays)
  const proportionalSalary = dailySalary * actualWorkingDays
  const totalAllowances = transportAllowance + housingAllowance + otherAllowances
  const grossSalary = proportionalSalary + totalAllowances

  // الخصومات التلقائية
  const absentDeduction = dailySalary * absentDays
  const lateDeduction = lateDays * (dailySalary * 0.1) // 10% من اليوم للتأخير
  const insuranceDeduction = grossSalary * 0.09 // 9% تأمينات اجتماعية
  const totalDeductions = absentDeduction + lateDeduction + loanDeduction +
                         insuranceDeduction + otherDeductions
  const netSalary = Math.max(0, grossSalary - totalDeductions)

  // نسب مفيدة للعرض
  const attendanceRate = workingDaysInMonth > 0 ? ((actualWorkingDays / workingDaysInMonth) * 100) : 0
  const deductionRate = grossSalary > 0 ? ((totalDeductions / grossSalary) * 100) : 0
  const netRate = grossSalary > 0 ? ((netSalary / grossSalary) * 100) : 0

  // تحديث الحسابات التلقائية
  useEffect(() => {
    if (autoCalculate && isOpen) {
      setValue('workingDays', actualWorkingDays)
      setValue('absentDeduction', absentDeduction.toFixed(2))
      setValue('lateDeduction', lateDeduction.toFixed(2))
      setValue('insuranceDeduction', insuranceDeduction.toFixed(2))
    }
  }, [basicSalary, absentDays, lateDays, autoCalculate, isOpen, setValue, actualWorkingDays, absentDeduction, lateDeduction, insuranceDeduction])

  // تحميل بيانات الموظفين عند فتح النافذة
  useEffect(() => {
    const loadEmployees = async () => {
      if (isOpen) {
        try {
          const employeesData = await database.getEmployees();
          setEmployees(employeesData);
        } catch (error) {
          console.error('خطأ في تحميل بيانات الموظفين:', error);
          toast.error('حدث خطأ في تحميل بيانات الموظفين');
        }
      }
    };

    loadEmployees();
  }, [isOpen]);

  // تحميل بيانات الراتب عند فتح النافذة للتعديل
  useEffect(() => {
    if (isOpen && payroll) {
      reset({
        employeeName: payroll.employeeName || '',
        month: payroll.month || '',
        basicSalary: payroll.basicSalary || 0,
        transportAllowance: payroll.transportAllowance || 0,
        housingAllowance: payroll.housingAllowance || 0,
        otherAllowances: payroll.otherAllowances || 0,
        workingDays: payroll.workingDays || workingDaysInMonth,
        absentDays: payroll.absentDays || 0,
        lateDays: payroll.lateDays || 0,
        loanDeduction: payroll.loanDeduction || 0,
        otherDeductions: payroll.otherDeductions || 0,
        absentDeduction: payroll.absentDeduction || 0,
        lateDeduction: payroll.lateDeduction || 0,
        insuranceDeduction: payroll.insuranceDeduction || 0
      })
    } else if (isOpen && !payroll) {
      // إعادة تعيين النموذج للإضافة الجديدة
      reset({
        employeeName: '',
        month: new Date().toISOString().slice(0, 7), // الشهر الحالي
        basicSalary: 0,
        transportAllowance: 0,
        housingAllowance: 0,
        otherAllowances: 0,
        workingDays: workingDaysInMonth,
        absentDays: 0,
        lateDays: 0,
        loanDeduction: 0,
        otherDeductions: 0,
        absentDeduction: 0,
        lateDeduction: 0,
        insuranceDeduction: 0
      })
    }
  }, [isOpen, payroll, reset, workingDaysInMonth])

  // دالة لجلب بيانات السلف للموظف
  const loadEmployeeLoans = async (employeeId) => {
    try {
      const allLoans = await database.getLoans();
      const employeeLoans = allLoans.filter(loan =>
        loan.employeeId === employeeId &&
        loan.status === 'approved' &&
        loan.autoDeduction === 1
      );

      // حساب إجمالي السلف المستحقة للخصم
      const totalLoanDeduction = employeeLoans.reduce((sum, loan) => {
        const monthlyInstallment = parseFloat(loan.monthlyInstallment) || 0;
        return sum + monthlyInstallment;
      }, 0);

      // تعيين قيمة خصم السلف في النموذج
      setValue('loanDeduction', totalLoanDeduction);

      if (employeeLoans.length > 0) {
        toast.success(`تم جلب بيانات السلف: ${employeeLoans.length} سلفة، إجمالي الخصم الشهري: ${formatCurrency(totalLoanDeduction)}`);
      }

      return employeeLoans;
    } catch (error) {
      console.error('خطأ في جلب بيانات السلف:', error);
      return [];
    }
  };

  // دالة لجلب بيانات الموظف عند اختياره
  const handleEmployeeChange = async (employeeId) => {
    if (!employeeId) return;

    setIsLoadingEmployeeData(true);
    try {
      // البحث عن بيانات الموظف
      const employee = employees.find(emp => emp.id === employeeId);
      if (employee) {
        // تعيين بيانات الموظف في النموذج