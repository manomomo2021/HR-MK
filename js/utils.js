/**
 * أدوات مساعدة عامة
 */

class Utils {
    /**
     * تنسيق التاريخ
     * @param {Date|string} date - التاريخ
     * @param {string} format - تنسيق التاريخ (date, datetime, time)
     * @returns {string} التاريخ المنسق
     */
    static formatDate(date, format = 'date') {
        if (!date) return '';
        
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';

        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        };

        if (format === 'datetime') {
            options.hour = '2-digit';
            options.minute = '2-digit';
        } else if (format === 'time') {
            return d.toLocaleTimeString('ar-SA', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        return d.toLocaleDateString('ar-SA', options);
    }

    /**
     * تنسيق الوقت الحالي
     * @returns {string} الوقت الحالي
     */
    static getCurrentTime() {
        return new Date().toLocaleString('ar-SA', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    /**
     * حساب العمر
     * @param {Date|string} birthDate - تاريخ الميلاد
     * @returns {number} العمر بالسنوات
     */
    static calculateAge(birthDate) {
        if (!birthDate) return 0;
        
        const birth = new Date(birthDate);
        const today = new Date();
        
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * حساب الفرق بين تاريخين بالأيام
     * @param {Date|string} startDate - التاريخ الأول
     * @param {Date|string} endDate - التاريخ الثاني
     * @returns {number} عدد الأيام
     */
    static daysDifference(startDate, endDate) {
        if (!startDate || !endDate) return 0;
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        const timeDiff = end.getTime() - start.getTime();
        return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 لتضمين اليوم الأول
    }

    /**
     * التحقق من صحة البريد الإلكتروني
     * @param {string} email - البريد الإلكتروني
     * @returns {boolean} صحيح أم لا
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * التحقق من صحة رقم الهاتف السعودي
     * @param {string} phone - رقم الهاتف
     * @returns {boolean} صحيح أم لا
     */
    static isValidSaudiPhone(phone) {
        const phoneRegex = /^(\+966|966|0)?[5][0-9]{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    /**
     * التحقق من صحة الرقم القومي السعودي
     * @param {string} nationalId - الرقم القومي
     * @returns {boolean} صحيح أم لا
     */
    static isValidSaudiNationalId(nationalId) {
        if (!nationalId || nationalId.length !== 10) return false;
        
        const id = nationalId.toString();
        if (!/^\d{10}$/.test(id)) return false;
        
        // خوارزمية التحقق من الرقم القومي السعودي
        let sum = 0;
        for (let i = 0; i < 9; i++) {
            const digit = parseInt(id[i]);
            if (i % 2 === 0) {
                const doubled = digit * 2;
                sum += doubled > 9 ? doubled - 9 : doubled;
            } else {
                sum += digit;
            }
        }
        
        const checkDigit = (10 - (sum % 10)) % 10;
        return checkDigit === parseInt(id[9]);
    }

    /**
     * تنظيف النص من المسافات الزائدة
     * @param {string} text - النص
     * @returns {string} النص المنظف
     */
    static cleanText(text) {
        if (!text) return '';
        return text.toString().trim().replace(/\s+/g, ' ');
    }

    /**
     * تحويل النص إلى أحرف كبيرة
     * @param {string} text - النص
     * @returns {string} النص بأحرف كبيرة
     */
    static capitalize(text) {
        if (!text) return '';
        return text.toString().charAt(0).toUpperCase() + text.slice(1);
    }

    /**
     * إنشاء معرف فريد
     * @returns {string} معرف فريد
     */
    static generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    /**
     * تحويل الملف إلى Base64
     * @param {File} file - الملف
     * @returns {Promise<string>} البيانات كـ Base64
     */
    static fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * تحميل ملف
     * @param {string} content - محتوى الملف
     * @param {string} filename - اسم الملف
     * @param {string} contentType - نوع المحتوى
     */
    static downloadFile(content, filename, contentType = 'text/plain') {
        const blob = new Blob([content], { type: contentType });
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
    }

    /**
     * نسخ النص إلى الحافظة
     * @param {string} text - النص المراد نسخه
     * @returns {Promise<boolean>} نجح العملية
     */
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('خطأ في نسخ النص:', error);
            return false;
        }
    }

    /**
     * تأخير التنفيذ
     * @param {number} ms - المدة بالميلي ثانية
     * @returns {Promise} وعد بالتأخير
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * تنسيق الأرقام
     * @param {number} number - الرقم
     * @param {number} decimals - عدد الخانات العشرية
     * @returns {string} الرقم المنسق
     */
    static formatNumber(number, decimals = 0) {
        if (isNaN(number)) return '0';
        return Number(number).toLocaleString('ar-SA', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    /**
     * تنسيق المبلغ المالي
     * @param {number} amount - المبلغ
     * @param {string} currency - العملة
     * @returns {string} المبلغ المنسق
     */
    static formatCurrency(amount, currency = 'ريال') {
        const formatted = this.formatNumber(amount, 2);
        return `${formatted} ${currency}`;
    }

    /**
     * البحث في النص
     * @param {string} text - النص
     * @param {string} query - كلمة البحث
     * @returns {boolean} وجدت أم لا
     */
    static searchText(text, query) {
        if (!text || !query) return false;
        return text.toString().toLowerCase().includes(query.toLowerCase());
    }

    /**
     * ترتيب المصفوفة
     * @param {Array} array - المصفوفة
     * @param {string} key - المفتاح للترتيب
     * @param {string} direction - اتجاه الترتيب (asc, desc)
     * @returns {Array} المصفوفة مرتبة
     */
    static sortArray(array, key, direction = 'asc') {
        return [...array].sort((a, b) => {
            let aVal = a[key];
            let bVal = b[key];
            
            // التعامل مع التواريخ
            if (aVal instanceof Date || (typeof aVal === 'string' && !isNaN(Date.parse(aVal)))) {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }
            
            // التعامل مع الأرقام
            if (!isNaN(aVal) && !isNaN(bVal)) {
                aVal = Number(aVal);
                bVal = Number(bVal);
            }
            
            // التعامل مع النصوص
            if (typeof aVal === 'string' && typeof bVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (direction === 'desc') {
                return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
            } else {
                return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
            }
        });
    }

    /**
     * تصفية المصفوفة
     * @param {Array} array - المصفوفة
     * @param {Object} filters - المرشحات
     * @returns {Array} المصفوفة مصفاة
     */
    static filterArray(array, filters) {
        return array.filter(item => {
            return Object.keys(filters).every(key => {
                const filterValue = filters[key];
                const itemValue = item[key];
                
                if (filterValue === '' || filterValue === null || filterValue === undefined) {
                    return true;
                }
                
                if (typeof filterValue === 'string') {
                    return this.searchText(itemValue, filterValue);
                }
                
                return itemValue === filterValue;
            });
        });
    }

    /**
     * تجميع المصفوفة
     * @param {Array} array - المصفوفة
     * @param {string} key - المفتاح للتجميع
     * @returns {Object} البيانات مجمعة
     */
    static groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(item);
            return groups;
        }, {});
    }

    /**
     * إزالة التكرارات من المصفوفة
     * @param {Array} array - المصفوفة
     * @param {string} key - المفتاح للمقارنة
     * @returns {Array} المصفوفة بدون تكرارات
     */
    static uniqueArray(array, key) {
        if (!key) {
            return [...new Set(array)];
        }

        const seen = new Set();
        return array.filter(item => {
            const value = item[key];
            if (seen.has(value)) {
                return false;
            }
            seen.add(value);
            return true;
        });
    }
}

/**
 * مدير الإشعارات
 */
class NotificationManager {
    /**
     * إظهار إشعار
     * @param {string} message - رسالة الإشعار
     * @param {string} type - نوع الإشعار (success, error, warning, info)
     * @param {number} duration - مدة الإظهار بالميلي ثانية
     */
    static show(message, type = 'info', duration = 3000) {
        const notification = document.getElementById('notification');
        const messageElement = notification.querySelector('.notification-message');
        const iconElement = notification.querySelector('.notification-icon');

        // تحديد الأيقونة حسب النوع
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        // تحديث المحتوى
        messageElement.textContent = message;
        iconElement.className = `notification-icon ${icons[type] || icons.info}`;

        // إزالة الفئات السابقة وإضافة الفئة الجديدة
        notification.className = `notification ${type}`;

        // إظهار الإشعار
        notification.classList.add('show');

        // إخفاء الإشعار بعد المدة المحددة
        setTimeout(() => {
            notification.classList.remove('show');
        }, duration);
    }

    /**
     * إظهار إشعار نجاح
     * @param {string} message - رسالة الإشعار
     */
    static success(message) {
        this.show(message, 'success');
    }

    /**
     * إظهار إشعار خطأ
     * @param {string} message - رسالة الإشعار
     */
    static error(message) {
        this.show(message, 'error');
    }

    /**
     * إظهار إشعار تحذير
     * @param {string} message - رسالة الإشعار
     */
    static warning(message) {
        this.show(message, 'warning');
    }

    /**
     * إظهار إشعار معلومات
     * @param {string} message - رسالة الإشعار
     */
    static info(message) {
        this.show(message, 'info');
    }
}

/**
 * مدير النوافذ المنبثقة
 */
class ModalManager {
    /**
     * إظهار نافذة تأكيد
     * @param {string} title - عنوان النافذة
     * @param {string} message - رسالة التأكيد
     * @param {Function} onConfirm - دالة التأكيد
     * @param {Function} onCancel - دالة الإلغاء
     */
    static confirm(title, message, onConfirm, onCancel = null) {
        const modal = document.getElementById('confirmModal');
        const titleElement = document.getElementById('confirmTitle');
        const messageElement = document.getElementById('confirmMessage');
        const yesButton = document.getElementById('confirmYes');
        const noButton = document.getElementById('confirmNo');

        // تحديث المحتوى
        titleElement.textContent = title;
        messageElement.textContent = message;

        // إزالة المستمعين السابقين
        const newYesButton = yesButton.cloneNode(true);
        const newNoButton = noButton.cloneNode(true);
        yesButton.parentNode.replaceChild(newYesButton, yesButton);
        noButton.parentNode.replaceChild(newNoButton, noButton);

        // إضافة المستمعين الجدد
        newYesButton.addEventListener('click', () => {
            modal.classList.remove('show');
            if (onConfirm) onConfirm();
        });

        newNoButton.addEventListener('click', () => {
            modal.classList.remove('show');
            if (onCancel) onCancel();
        });

        // إظهار النافذة
        modal.classList.add('show');
    }

    /**
     * إخفاء جميع النوافذ المنبثقة
     */
    static hideAll() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
        });
    }
}
