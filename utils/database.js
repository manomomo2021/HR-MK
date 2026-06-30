
// استخدام IndexedDB كحل بديل لقاعدة البيانات
// تهيئة قاعدة البيانات

const DB_NAME = 'hr_system_db';
const DB_VERSION = 1;
const DB_STORES = {
  employees: 'employees',
  attendance: 'attendance',
  payrolls: 'payrolls',
  loans: 'loans'
};

let db = null;

// فتح قاعدة البيانات
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('خطأ في فتح قاعدة البيانات:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('تم فتح قاعدة البيانات بنجاح');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      
      // إنشاء جدول الموظفين
      if (!db.objectStoreNames.contains(DB_STORES.employees)) {
        const employeesStore = db.createObjectStore(DB_STORES.employees, { keyPath: 'id' });
        employeesStore.createIndex('status', 'status', { unique: false });
      }
      
      // إنشاء جدول الحضور والانصراف
      if (!db.objectStoreNames.contains(DB_STORES.attendance)) {
        const attendanceStore = db.createObjectStore(DB_STORES.attendance, { keyPath: 'id' });
        attendanceStore.createIndex('employeeId', 'employeeId', { unique: false });
        attendanceStore.createIndex('date', 'date', { unique: false });
      }
      
      // إنشاء جدول الرواتب
      if (!db.objectStoreNames.contains(DB_STORES.payrolls)) {
        const payrollsStore = db.createObjectStore(DB_STORES.payrolls, { keyPath: 'id' });
        payrollsStore.createIndex('month', 'month', { unique: false });
        payrollsStore.createIndex('employeeId', 'employeeId', { unique: false });
      }
      
      // إنشاء جدول السلف
      if (!db.objectStoreNames.contains(DB_STORES.loans)) {
        const loansStore = db.createObjectStore(DB_STORES.loans, { keyPath: 'id' });
        loansStore.createIndex('status', 'status', { unique: false });
        loansStore.createIndex('employeeId', 'employeeId', { unique: false });
      }
      
      console.log('تم تهيئة قاعدة البيانات بنجاح');
    };
  });
};

// تهيئة قاعدة البيانات
const initDatabase = async () => {
  try {
    await openDatabase();
    return Promise.resolve();
  } catch (error) {
    console.error('خطأ في تهيئة قاعدة البيانات:', error);
    return Promise.reject(error);
  }
};

// الحصول على جميع العناصر من مخزن
const getAllFromStore = (storeName, indexName, keyRange) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDatabase();
      const transaction = database.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      let request;
      if (indexName && keyRange) {
        const index = store.index(indexName);
        request = index.getAll(keyRange);
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    } catch (error) {
      reject(error);
    }
  });
};

// الحصول على عنصر واحد من المخزن
const getOneFromStore = (storeName, id) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDatabase();
      const transaction = database.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = (event) => {
        resolve(event.target.result);
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    } catch (error) {
      reject(error);
    }
  });
};

// حفظ عنصر في المخزن
const saveToStore = (storeName, item) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDatabase();
      const transaction = database.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // تحديث وقت التعديل
      item.updatedAt = new Date().toISOString();
      if (!item.createdAt) {
        item.createdAt = item.updatedAt;
      }
      
      const request = store.put(item);
      
      request.onsuccess = (event) => {
        resolve();
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    } catch (error) {
      reject(error);
    }
  });
};

// دوال التعامل مع الموظفين
const getEmployees = () => {
  return getAllFromStore(DB_STORES.employees, 'status', IDBKeyRange.only('active'));
};

const getEmployeeById = (id) => {
  return getOneFromStore(DB_STORES.employees, id);
};

const saveEmployee = (employee) => {
  return saveToStore(DB_STORES.employees, employee);
};

// دوال التعامل مع الحضور والانصراف
const getAttendance = (employeeId, month) => {
  return new Promise(async (resolve, reject) => {
    try {
      const database = await openDatabase();
      const transaction = database.transaction([DB_STORES.attendance], 'readonly');
      const store = transaction.objectStore(DB_STORES.attendance);
      const index = store.index('employeeId');
      
      const request = index.openCursor(IDBKeyRange.only(employeeId));
      const results = [];
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.date.startsWith(month)) {
            results.push(cursor.value);
          }
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      request.onerror = (event) => {
        reject(event.target.error);
      };
    } catch (error) {
      reject(error);
    }
  });
};

const saveAttendance = (attendance) => {
  return saveToStore(DB_STORES.attendance, attendance);
};

// دوال التعامل مع الرواتب
const getPayrolls = (month) => {
  return getAllFromStore(DB_STORES.payrolls, 'month', IDBKeyRange.only(month));
};

const savePayroll = (payroll) => {
  return saveToStore(DB_STORES.payrolls, payroll);
};

// دوال التعامل مع السلف
const getLoans = () => {
  return getAllFromStore(DB_STORES.loans, 'status', IDBKeyRange.only('approved'));
};

const saveLoan = (loan) => {
  return saveToStore(DB_STORES.loans, loan);
};

export default {
  initDatabase,
  getEmployees,
  getEmployeeById,
  saveEmployee,
  getAttendance,
  saveAttendance,
  getPayrolls,
  savePayroll,
  getLoans,
  saveLoan
};
