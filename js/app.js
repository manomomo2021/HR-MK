/**
 * التطبيق الرئيسي
 * نقطة البداية لتشغيل النظام
 */

class HRApp {
    constructor() {
        this.isInitialized = false;
        this.version = '1.0.0';
        this.init();
    }

    /**
     * تهيئة التطبيق
     */
    async init() {
        try {
            console.log('🚀 بدء تشغيل نظام إدارة الموارد البشرية...');
            
            // انتظار تحميل DOM
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.startApp());
            } else {
                this.startApp();
            }

        } catch (error) {
            console.error('❌ خطأ في تهيئة التطبيق:', error);
            this.showCriticalError('فشل في تشغيل التطبيق');
        }
    }

    /**
     * بدء تشغيل التطبيق
     */
    async startApp() {
        try {
            // إظهار شاشة التحميل
            this.showLoadingScreen();

            // تهيئة المكونات الأساسية
            await this.initializeCore();

            // إعداد مستمعي الأحداث
            this.setupEventListeners();

            // إخفاء شاشة التحميل
            this.hideLoadingScreen();

            // تسجيل نجاح التشغيل
            console.log('✅ تم تشغيل النظام بنجاح');
            this.isInitialized = true;

            // إظهار رسالة ترحيب للمدير
            if (auth.isLoggedIn()) {
                setTimeout(() => {
                    NotificationManager.success(`مرحباً ${auth.getCurrentUser().name}، تم تحميل النظام بنجاح`);
                }, 1000);
            }

        } catch (error) {
            console.error('❌ خطأ في بدء التطبيق:', error);
            this.hideLoadingScreen();
            this.showCriticalError('حدث خطأ أثناء تشغيل التطبيق');
        }
    }

    /**
     * تهيئة المكونات الأساسية
     */
    async initializeCore() {
        // تهيئة نظام التخزين
        if (typeof storage === 'undefined') {
            throw new Error('نظام التخزين غير متوفر');
        }

        // تهيئة نظام المصادقة
        if (typeof auth === 'undefined') {
            throw new Error('نظام المصادقة غير متوفر');
        }

        // تهيئة نظام التنقل
        if (typeof navigation === 'undefined') {
            throw new Error('نظام التنقل غير متوفر');
        }

        // تحميل البيانات الأولية
        await this.loadInitialData();

        console.log('✅ تم تهيئة المكونات الأساسية');
    }

    /**
     * تحميل البيانات الأولية
     */
    async loadInitialData() {
        try {
            // تحميل الإعدادات
            const settings = storage.get('settings');
            if (settings) {
                document.title = `${settings.company.name} - نظام إدارة الموارد البشرية`;
            }

            // تحميل بيانات تجريبية إذا كانت قاعدة البيانات فارغة
            await this.loadSampleDataIfNeeded();

        } catch (error) {
            console.warn('⚠️ تحذير في تحميل البيانات الأولية:', error);
        }
    }

    /**
     * تحميل بيانات تجريبية إذا لزم الأمر
     */
    async loadSampleDataIfNeeded() {
        const employees = storage.get('employees', []);
        
        // إذا لم تكن هناك موظفين، تحميل بيانات تجريبية
        if (employees.length === 0) {
            console.log('📊 تحميل بيانات تجريبية...');
            
            const sampleEmployees = [
                {
                    id: storage.getNextId('employee'),
                    code: 'EMP001',
                    name: 'أحمد محمد علي',
                    nationalId: '1234567890',
                    birthDate: '1990-05-15',
                    gender: 'male',
                    maritalStatus: 'married',
                    address: 'الرياض، حي النخيل',
                    phone: '0501234567',
                    email: 'ahmed.ali@company.com',
                    department: 'تقنية المعلومات',
                    position: 'مطور برمجيات',
                    hireDate: '2020-01-15',
                    contractType: 'permanent',
                    basicSalary: 8000,
                    allowances: 1500,
                    devices: [],
                    createdAt: new Date().toISOString()
                },
                {
                    id: storage.getNextId('employee'),
                    code: 'EMP002',
                    name: 'فاطمة سعد الغامدي',
                    nationalId: '2345678901',
                    birthDate: '1992-08-22',
                    gender: 'female',
                    maritalStatus: 'single',
                    address: 'جدة، حي الروضة',
                    phone: '0507654321',
                    email: 'fatima.alghamdi@company.com',
                    department: 'الموارد البشرية',
                    position: 'أخصائية موارد بشرية',
                    hireDate: '2021-03-10',
                    contractType: 'permanent',
                    basicSalary: 7000,
                    allowances: 1200,
                    devices: [],
                    createdAt: new Date().toISOString()
                }
            ];

            // حفظ الموظفين التجريبيين
            sampleEmployees.forEach(employee => {
                storage.addItem('employees', employee);
                
                // إضافة رصيد أجازات لكل موظف
                const leaveBalance = {
                    id: storage.getNextId('leave'),
                    employeeId: employee.id,
                    employeeName: employee.name,
                    annualLeaves: 21,
                    casualLeaves: 7,
                    sickLeaves: 30,
                    usedAnnual: 0,
                    usedCasual: 0,
                    usedSick: 0,
                    year: new Date().getFullYear(),
                    createdAt: new Date().toISOString()
                };
                storage.addItem('leaveBalances', leaveBalance);
            });

            console.log('✅ تم تحميل البيانات التجريبية');
        }
    }

    /**
     * إعداد مستمعي الأحداث العامة
     */
    setupEventListeners() {
        // مستمع حدث تسجيل الدخول
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin.bind(this));
        }

        // مستمع حدث تسجيل الخروج
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // مستمع أحداث لوحة المفاتيح
        document.addEventListener('keydown', this.handleKeyboardShortcuts.bind(this));

        // مستمع حدث إغلاق النوافذ المنبثقة بالضغط خارجها
        document.addEventListener('click', this.handleModalClose.bind(this));

        // مستمع حدث تغيير حجم النافذة
        window.addEventListener('resize', this.handleWindowResize.bind(this));

        console.log('✅ تم إعداد مستمعي الأحداث');
    }

    /**
     * معالج تسجيل الدخول
     * @param {Event} event - حدث النموذج
     */
    handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        
        if (!username || !password) {
            NotificationManager.error('يرجى إدخال اسم المستخدم وكلمة المرور');
            return;
        }

        // محاولة تسجيل الدخول
        const result = auth.login(username, password);
        
        if (result.success) {
            NotificationManager.success(result.message);
            auth.showMainApp();
            
            // مسح النموذج
            document.getElementById('loginForm').reset();
        } else {
            NotificationManager.error(result.message);
            
            // تركيز على حقل كلمة المرور
            document.getElementById('password').focus();
            document.getElementById('password').select();
        }
    }

    /**
     * معالج تسجيل الخروج
     * @param {Event} event - حدث الزر
     */
    handleLogout(event) {
        event.preventDefault();
        
        ModalManager.confirm(
            'تأكيد تسجيل الخروج',
            'هل أنت متأكد من تسجيل الخروج من النظام؟',
            () => {
                auth.logout();
            }
        );
    }

    /**
     * معالج اختصارات لوحة المفاتيح
     * @param {KeyboardEvent} event - حدث لوحة المفاتيح
     */
    handleKeyboardShortcuts(event) {
        // Ctrl + L: تسجيل الخروج
        if (event.ctrlKey && event.key === 'l') {
            event.preventDefault();
            if (auth.isLoggedIn()) {
                this.handleLogout(event);
            }
        }

        // Escape: إغلاق النوافذ المنبثقة
        if (event.key === 'Escape') {
            ModalManager.hideAll();
        }

        // Ctrl + 1-8: التنقل السريع بين الصفحات
        if (event.ctrlKey && event.key >= '1' && event.key <= '8') {
            event.preventDefault();
            const pages = ['dashboard', 'employees', 'devices', 'annual-leaves', 'leave-registration', 'attendance', 'reports', 'settings'];
            const pageIndex = parseInt(event.key) - 1;
            if (pages[pageIndex] && auth.isLoggedIn()) {
                navigation.loadPage(pages[pageIndex]);
            }
        }
    }

    /**
     * معالج إغلاق النوافذ المنبثقة
     * @param {Event} event - حدث النقر
     */
    handleModalClose(event) {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('show');
        }
    }

    /**
     * معالج تغيير حجم النافذة
     */
    handleWindowResize() {
        // يمكن إضافة منطق للتعامل مع الشاشات الصغيرة هنا
        const sidebar = document.querySelector('.sidebar');
        if (sidebar && window.innerWidth < 768) {
            // إخفاء القائمة الجانبية في الشاشات الصغيرة
            sidebar.style.transform = 'translateX(100%)';
        }
    }

    /**
     * إظهار شاشة التحميل
     */
    showLoadingScreen() {
        const loadingHTML = `
            <div id="appLoading" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: var(--background-color);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            ">
                <div style="text-align: center;">
                    <div style="
                        width: 60px;
                        height: 60px;
                        border: 4px solid var(--border-color);
                        border-top: 4px solid var(--primary-color);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 20px;
                    "></div>
                    <h3 style="color: var(--text-primary); margin-bottom: 10px;">جاري تحميل النظام...</h3>
                    <p style="color: var(--text-secondary);">يرجى الانتظار</p>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', loadingHTML);
    }

    /**
     * إخفاء شاشة التحميل
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('appLoading');
        if (loadingScreen) {
            loadingScreen.remove();
        }
    }

    /**
     * إظهار خطأ حرج
     * @param {string} message - رسالة الخطأ
     */
    showCriticalError(message) {
        document.body.innerHTML = `
            <div style="
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: var(--background-color);
                font-family: 'Cairo', sans-serif;
            ">
                <div style="
                    text-align: center;
                    padding: 40px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    max-width: 400px;
                ">
                    <i class="fas fa-exclamation-triangle" style="
                        font-size: 4rem;
                        color: var(--error-color);
                        margin-bottom: 20px;
                    "></i>
                    <h2 style="color: var(--text-primary); margin-bottom: 15px;">خطأ في النظام</h2>
                    <p style="color: var(--text-secondary); margin-bottom: 20px;">${message}</p>
                    <button onclick="location.reload()" style="
                        padding: 12px 24px;
                        background: var(--primary-color);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-family: inherit;
                    ">إعادة تحميل الصفحة</button>
                </div>
            </div>
        `;
    }

    /**
     * الحصول على معلومات النظام
     * @returns {Object} معلومات النظام
     */
    getSystemInfo() {
        return {
            version: this.version,
            isInitialized: this.isInitialized,
            currentUser: auth.getCurrentUser(),
            currentPage: navigation.currentPage,
            storageUsage: this.getStorageUsage()
        };
    }

    /**
     * الحصول على استخدام التخزين
     * @returns {Object} معلومات استخدام التخزين
     */
    getStorageUsage() {
        try {
            const used = JSON.stringify(localStorage).length;
            const quota = 5 * 1024 * 1024; // 5MB تقريباً
            return {
                used: used,
                quota: quota,
                percentage: Math.round((used / quota) * 100)
            };
        } catch (error) {
            return { used: 0, quota: 0, percentage: 0 };
        }
    }
}

// بدء تشغيل التطبيق
const app = new HRApp();
