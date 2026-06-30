// مساعدات لمعالجة ملفات Excel

// تحويل البيانات إلى CSV
export const convertToCSV = (data, headers = null) => {
  if (!data || data.length === 0) return ''
  
  // إضافة BOM للدعم الصحيح للعربية
  let csvContent = '\ufeff'
  
  // إضافة الرؤوس
  const actualHeaders = headers || Object.keys(data[0])
  csvContent += actualHeaders.join(',') + '\n'
  
  // إضافة البيانات
  data.forEach(row => {
    const values = actualHeaders.map(header => {
      let value = row[header] || ''
      // تنظيف القيم وإضافة علامات اقتباس للنصوص التي تحتوي على فواصل
      if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
        value = '"' + value.replace(/"/g, '""') + '"'
      }
      return value
    })
    csvContent += values.join(',') + '\n'
  })
  
  return csvContent
}

// تحميل ملف CSV
export const downloadCSV = (content, filename) => {
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

// قراءة ملف CSV
export const readCSVFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const text = e.target.result
        const data = parseCSV(text)
        resolve(data)
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('فشل في قراءة الملف'))
    }
    
    reader.readAsText(file, 'UTF-8')
  })
}

// تحليل محتوى CSV
export const parseCSV = (text) => {
  const lines = text.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []
  
  // إزالة BOM إذا وجد
  const firstLine = lines[0].replace(/^\ufeff/, '')
  const headers = parseCSVLine(firstLine)
  
  const data = []
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    if (values.length === headers.length) {
      const row = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      data.push(row)
    }
  }
  
  return data
}

// تحليل سطر CSV
const parseCSVLine = (line) => {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"'
        i++ // تخطي الاقتباس التالي
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// إنشاء قالب Excel للموظفين
export const generateEmployeeTemplate = () => {
  const template = [
    {
      'الاسم الكامل': 'أحمد محمد علي',
      'البريد الإلكتروني': 'ahmed@company.com',
      'رقم الهاتف': '0501234567',
      'المنصب': 'مطور برمجيات',
      'القسم': 'تقنية المعلومات',
      'تاريخ الميلاد': '1990-01-15',
      'تاريخ الانضمام': '2023-01-01',
      'نوع العقد': 'permanent',
      'الراتب الأساسي': '8000',
      'بدل المواصلات': '500',
      'بدل السكن': '1000',
      'بدلات أخرى': '200',
      'خصومات ثابتة': '0',
      'العملة': 'SAR',
      'العنوان': 'الرياض، المملكة العربية السعودية',
      'الجنسية': 'سعودي',
      'الحالة الاجتماعية': 'متزوج',
      'رقم الهوية': '1234567890',
      'رقم جواز السفر': '',
      'حالة الموظف': 'active'
    }
  ]
  
  const headers = [
    'الاسم الكامل',
    'البريد الإلكتروني', 
    'رقم الهاتف',
    'المنصب',
    'القسم',
    'تاريخ الميلاد',
    'تاريخ الانضمام',
    'نوع العقد',
    'الراتب الأساسي',
    'بدل المواصلات',
    'بدل السكن',
    'بدلات أخرى',
    'خصومات ثابتة',
    'العملة',
    'العنوان',
    'الجنسية',
    'الحالة الاجتماعية',
    'رقم الهوية',
    'رقم جواز السفر',
    'حالة الموظف'
  ]
  
  return { data: template, headers }
}

// تحويل بيانات الموظفين للتصدير
export const prepareEmployeesForExport = (employees) => {
  return employees.map(employee => ({
    'الاسم الكامل': employee.name || '',
    'البريد الإلكتروني': employee.email || '',
    'رقم الهاتف': employee.phone || '',
    'المنصب': employee.position || '',
    'القسم': employee.department || '',
    'تاريخ الميلاد': employee.birthDate || '',
    'تاريخ الانضمام': employee.joinDate || '',
    'نوع العقد': employee.contractType || '',
    'الراتب الأساسي': employee.basicSalary || '0',
    'بدل المواصلات': employee.transportAllowance || '0',
    'بدل السكن': employee.housingAllowance || '0',
    'بدلات أخرى': employee.otherAllowances || '0',
    'خصومات ثابتة': employee.fixedDeductions || '0',
    'العملة': employee.currency || 'SAR',
    'العنوان': employee.address || '',
    'الجنسية': employee.nationality || '',
    'الحالة الاجتماعية': employee.maritalStatus || '',
    'رقم الهوية': employee.nationalId || '',
    'رقم جواز السفر': employee.passportNumber || '',
    'حالة الموظف': employee.status || 'active',
    'تاريخ الإنشاء': employee.createdAt ? new Date(employee.createdAt).toLocaleDateString('en-GB') : '',
    'آخر تحديث': employee.updatedAt ? new Date(employee.updatedAt).toLocaleDateString('en-GB') : ''
  }))
}

// تحويل البيانات المستوردة إلى تنسيق الموظف
export const convertImportedDataToEmployee = (importedData) => {
  return importedData.map((row, index) => {
    // التحقق من الحقول المطلوبة
    if (!row['الاسم الكامل'] || !row['البريد الإلكتروني']) {
      throw new Error(`السطر ${index + 2}: الاسم والبريد الإلكتروني مطلوبان`)
    }
    
    // التحقق من صحة البريد الإلكتروني
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(row['البريد الإلكتروني'])) {
      throw new Error(`السطر ${index + 2}: البريد الإلكتروني غير صحيح`)
    }
    
    // التحقق من صحة الراتب
    const basicSalary = parseFloat(row['الراتب الأساسي']) || 0
    if (basicSalary < 0) {
      throw new Error(`السطر ${index + 2}: الراتب الأساسي لا يمكن أن يكون سالباً`)
    }
    
    return {
      name: row['الاسم الكامل'].trim(),
      email: row['البريد الإلكتروني'].trim().toLowerCase(),
      phone: row['رقم الهاتف'] || '',
      position: row['المنصب'] || '',
      department: row['القسم'] || '',
      birthDate: row['تاريخ الميلاد'] || '',
      joinDate: row['تاريخ الانضمام'] || new Date().toISOString().split('T')[0],
      contractType: row['نوع العقد'] || 'permanent',
      basicSalary: basicSalary,
      transportAllowance: parseFloat(row['بدل المواصلات']) || 0,
      housingAllowance: parseFloat(row['بدل السكن']) || 0,
      otherAllowances: parseFloat(row['بدلات أخرى']) || 0,
      fixedDeductions: parseFloat(row['خصومات ثابتة']) || 0,
      currency: row['العملة'] || 'SAR',
      address: row['العنوان'] || '',
      nationality: row['الجنسية'] || '',
      maritalStatus: row['الحالة الاجتماعية'] || '',
      nationalId: row['رقم الهوية'] || '',
      passportNumber: row['رقم جواز السفر'] || '',
      status: row['حالة الموظف'] || 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
}

// التحقق من صحة البيانات المستوردة
export const validateImportedEmployees = (employees, existingEmployees = []) => {
  const errors = []
  const warnings = []
  const duplicates = []
  
  // التحقق من التكرار في البيانات المستوردة
  const emailMap = new Map()
  const nationalIdMap = new Map()
  
  employees.forEach((employee, index) => {
    const lineNumber = index + 2 // +2 لأن الفهرس يبدأ من 0 والسطر الأول هو الرؤوس
    
    // التحقق من تكرار البريد الإلكتروني
    if (emailMap.has(employee.email)) {
      duplicates.push(`السطر ${lineNumber}: البريد الإلكتروني "${employee.email}" مكرر في السطر ${emailMap.get(employee.email)}`)
    } else {
      emailMap.set(employee.email, lineNumber)
    }
    
    // التحقق من تكرار رقم الهوية
    if (employee.nationalId && nationalIdMap.has(employee.nationalId)) {
      duplicates.push(`السطر ${lineNumber}: رقم الهوية "${employee.nationalId}" مكرر في السطر ${nationalIdMap.get(employee.nationalId)}`)
    } else if (employee.nationalId) {
      nationalIdMap.set(employee.nationalId, lineNumber)
    }
    
    // التحقق من وجود الموظف في النظام
    const existingEmployee = existingEmployees.find(emp => 
      emp.email === employee.email || 
      (employee.nationalId && emp.nationalId === employee.nationalId)
    )
    
    if (existingEmployee) {
      warnings.push(`السطر ${lineNumber}: الموظف "${employee.name}" موجود بالفعل في النظام`)
    }
    
    // التحقق من صحة التواريخ
    if (employee.birthDate && !isValidDate(employee.birthDate)) {
      errors.push(`السطر ${lineNumber}: تاريخ الميلاد غير صحيح`)
    }
    
    if (employee.joinDate && !isValidDate(employee.joinDate)) {
      errors.push(`السطر ${lineNumber}: تاريخ الانضمام غير صحيح`)
    }
    
    // التحقق من صحة العملة
    const validCurrencies = ['SAR', 'USD', 'EUR', 'AED', 'KWD', 'QAR', 'BHD', 'OMR', 'JOD', 'EGP', 'LBP', 'TRY', 'GBP', 'JPY', 'CNY', 'INR']
    if (employee.currency && !validCurrencies.includes(employee.currency)) {
      errors.push(`السطر ${lineNumber}: العملة "${employee.currency}" غير مدعومة`)
    }
  })
  
  return {
    isValid: errors.length === 0 && duplicates.length === 0,
    errors: [...errors, ...duplicates],
    warnings,
    summary: {
      totalRows: employees.length,
      validRows: employees.length - errors.length - duplicates.length,
      errorRows: errors.length + duplicates.length,
      warningRows: warnings.length
    }
  }
}

// التحقق من صحة التاريخ
const isValidDate = (dateString) => {
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date) && dateString.match(/^\d{4}-\d{2}-\d{2}$/)
}

export default {
  convertToCSV,
  downloadCSV,
  readCSVFile,
  parseCSV,
  generateEmployeeTemplate,
  prepareEmployeesForExport,
  convertImportedDataToEmployee,
  validateImportedEmployees
}
