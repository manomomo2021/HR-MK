/**
 * نظام إدارة التخزين المحلي
 * يوفر واجهة موحدة للتعامل مع Local Storage
 */

class StorageManager {
    constructor() {
        this.prefix = 'hr_system_';
        this.initializeDefaultData();
    }

    /**
     * تهيئة البيانات الافتراضية
     */
    initializeDefaultData() {
        // إنشاء البيانات الافتراضية إذا لم تكن موجودة
        if (!this.get('users')) {
            this.set('users', [
                {
                    id: 1,
                    username: 'admin',
                    password: 'admin123', // في التطبيق الحقيقي يجب تشفير كلمة المرور
                    name: 'مدير النظام',
                    role: 'admin',
                    email: 'admin@company.com',
                    createdAt: new Date().toISOString()
                }
            ]);
        }

        if (!this.get('employees')) {
            this.set('employees', []);
        }

        if (!this.get('devices')) {
            this.set('devices', []);
        }

        if (!this.get('leaves')) {
            this.set('leaves', []);
        }

        if (!this.get('attendance')) {
            this.set('attendance', []);
        }

        if (!this.get('settings')) {
            this.set('settings', {
                company: {
                    name: 'شركة المثال للتكنولوجيا',
                    address: 'الرياض، المملكة العربية السعودية',
                    phone: '+966 11 123 4567',
                    email: 'info@example.com'
                },
                workHours: {
                    startTime: '08:00',
                    endTime: '17:00',
                    workingDays: 5,
                    weekends: ['friday', 'saturday']
                },
                leaves: {
                    annualLeaves: 21,
                    casualLeaves: 7,
                    sickLeaves: 30
                },
                attendance: {
                    lateThreshold: 15, // دقائق
                    earlyLeaveThreshold: 15,
                    autoSync: true,
                    syncInterval: 60 // دقائق
                }
            });
        }

        if (!this.get('counters')) {
            this.set('counters', {
                employeeId: 1000,
                deviceId: 1,
                leaveId: 1,
                attendanceId: 1
            });
        }
    }

    /**
     * حفظ البيانات في Local Storage
     * @param {string} key - مفتاح البيانات
     * @param {*} value - القيمة المراد حفظها
     */
    set(key, value) {
        try {
            const fullKey = this.prefix + key;
            const serializedValue = JSON.stringify(value);
            localStorage.setItem(fullKey, serializedValue);
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
            return false;
        }
    }

    /**
     * استرجاع البيانات من Local Storage
     * @param {string} key - مفتاح البيانات
     * @param {*} defaultValue - القيمة الافتراضية
     * @returns {*} البيانات المسترجعة
     */
    get(key, defaultValue = null) {
        try {
            const fullKey = this.prefix + key;
            const serializedValue = localStorage.getItem(fullKey);
            
            if (serializedValue === null) {
                return defaultValue;
            }
            
            return JSON.parse(serializedValue);
        } catch (error) {
            console.error('خطأ في استرجاع البيانات:', error);
            return defaultValue;
        }
    }

    /**
     * حذف البيانات من Local Storage
     * @param {string} key - مفتاح البيانات
     */
    remove(key) {
        try {
            const fullKey = this.prefix + key;
            localStorage.removeItem(fullKey);
            return true;
        } catch (error) {
            console.error('خطأ في حذف البيانات:', error);
            return false;
        }
    }

    /**
     * مسح جميع البيانات
     */
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('خطأ في مسح البيانات:', error);
            return false;
        }
    }

    /**
     * الحصول على معرف جديد للكيان
     * @param {string} entityType - نوع الكيان (employee, device, leave, attendance)
     * @returns {number} المعرف الجديد
     */
    getNextId(entityType) {
        const counters = this.get('counters', {});
        const counterKey = entityType + 'Id';
        
        if (!counters[counterKey]) {
            counters[counterKey] = 1;
        }
        
        const nextId = counters[counterKey];
        counters[counterKey]++;
        
        this.set('counters', counters);
        return nextId;
    }

    /**
     * إضافة عنصر جديد إلى مصفوفة
     * @param {string} key - مفتاح المصفوفة
     * @param {*} item - العنصر المراد إضافته
     * @returns {boolean} نجح العملية
     */
    addItem(key, item) {
        try {
            const items = this.get(key, []);
            items.push(item);
            return this.set(key, items);
        } catch (error) {
            console.error('خطأ في إضافة العنصر:', error);
            return false;
        }
    }

    /**
     * تحديث عنصر في مصفوفة
     * @param {string} key - مفتاح المصفوفة
     * @param {number|string} id - معرف العنصر
     * @param {*} updatedItem - البيانات المحدثة
     * @returns {boolean} نجح العملية
     */
    updateItem(key, id, updatedItem) {
        try {
            const items = this.get(key, []);
            const index = items.findIndex(item => item.id == id);
            
            if (index !== -1) {
                items[index] = { ...items[index], ...updatedItem };
                return this.set(key, items);
            }
            
            return false;
        } catch (error) {
            console.error('خطأ في تحديث العنصر:', error);
            return false;
        }
    }

    /**
     * حذف عنصر من مصفوفة
     * @param {string} key - مفتاح المصفوفة
     * @param {number|string} id - معرف العنصر
     * @returns {boolean} نجح العملية
     */
    deleteItem(key, id) {
        try {
            const items = this.get(key, []);
            const filteredItems = items.filter(item => item.id != id);
            return this.set(key, filteredItems);
        } catch (error) {
            console.error('خطأ في حذف العنصر:', error);
            return false;
        }
    }

    /**
     * البحث في مصفوفة
     * @param {string} key - مفتاح المصفوفة
     * @param {function} predicate - دالة البحث
     * @returns {Array} النتائج
     */
    findItems(key, predicate) {
        try {
            const items = this.get(key, []);
            return items.filter(predicate);
        } catch (error) {
            console.error('خطأ في البحث:', error);
            return [];
        }
    }

    /**
     * الحصول على عنصر واحد
     * @param {string} key - مفتاح المصفوفة
     * @param {number|string} id - معرف العنصر
     * @returns {*} العنصر أو null
     */
    getItem(key, id) {
        try {
            const items = this.get(key, []);
            return items.find(item => item.id == id) || null;
        } catch (error) {
            console.error('خطأ في استرجاع العنصر:', error);
            return null;
        }
    }

    /**
     * تصدير البيانات
     * @returns {Object} جميع البيانات
     */
    exportData() {
        try {
            const data = {};
            const keys = Object.keys(localStorage);
            
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    const cleanKey = key.replace(this.prefix, '');
                    data[cleanKey] = this.get(cleanKey);
                }
            });
            
            return data;
        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            return {};
        }
    }

    /**
     * استيراد البيانات
     * @param {Object} data - البيانات المراد استيرادها
     * @returns {boolean} نجح العملية
     */
    importData(data) {
        try {
            Object.keys(data).forEach(key => {
                this.set(key, data[key]);
            });
            return true;
        } catch (error) {
            console.error('خطأ في استيراد البيانات:', error);
            return false;
        }
    }

    /**
     * إنشاء نسخة احتياطية
     * @returns {string} البيانات كـ JSON string
     */
    createBackup() {
        try {
            const data = this.exportData();
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
            return null;
        }
    }

    /**
     * استعادة من نسخة احتياطية
     * @param {string} backupData - البيانات كـ JSON string
     * @returns {boolean} نجح العملية
     */
    restoreBackup(backupData) {
        try {
            const data = JSON.parse(backupData);
            return this.importData(data);
        } catch (error) {
            console.error('خطأ في استعادة النسخة الاحتياطية:', error);
            return false;
        }
    }
}

// إنشاء مثيل عام من مدير التخزين
const storage = new StorageManager();
