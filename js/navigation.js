/**
 * مدير التنقل بين الصفحات
 */

class NavigationManager {
    constructor() {
        this.currentPage = 'dashboard';
        this.pages = {
            dashboard: {
                title: 'لوحة التحكم',
                component: 'DashboardPage'
            },
            employees: {
                title: 'الموظفين',
                component: 'EmployeesPage'
            },
            devices: {
                title: 'الأجهزة الثانوية',
                component: 'DevicesPage'
            },
            'annual-leaves': {
                title: 'الأجازات السنوية',
                component: 'AnnualLeavesPage'
            },
            'leave-registration': {
                title: 'تسجيل الأجازات',
                component: 'LeaveRegistrationPage'
            },
            attendance: {
                title: 'الحضور والانصراف',
                component: 'AttendancePage'
            },
            'manual-attendance': {
                title: 'الحضور والانصراف اليدوي',
                component: 'ManualAttendancePage'
            },
            reports: {
                title: 'التقارير',
                component: 'ReportsPage'
            },
            settings: {
                title: 'الإعدادات',
                component: 'SettingsPage'
            }
        };
        this.init();
    }

    /**
     * تهيئة نظام التنقل
     */
    init() {
        this.setupEventListeners();
        this.loadPage('dashboard');
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // مستمعي أحداث القائمة الجانبية
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const page = item.getAttribute('data-page');
                if (page) {
                    this.loadPage(page);
                }
            });
        });

        // مستمع حدث الرجوع في المتصفح
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.page) {
                this.loadPage(e.state.page, false);
            }
        });
    }

    /**
     * تحميل صفحة
     * @param {string} pageName - اسم الصفحة
     * @param {boolean} pushState - إضافة إلى تاريخ المتصفح
     */
    loadPage(pageName, pushState = true) {
        try {
            // التحقق من وجود الصفحة
            if (!this.pages[pageName]) {
                console.error('الصفحة غير موجودة:', pageName);
                return;
            }

            // التحقق من الصلاحيات
            if (!this.hasPagePermission(pageName)) {
                NotificationManager.error('ليس لديك صلاحية للوصول إلى هذه الصفحة');
                return;
            }

            // تحديث الصفحة الحالية
            this.currentPage = pageName;

            // تحديث القائمة الجانبية
            this.updateSidebarSelection(pageName);

            // تحميل محتوى الصفحة
            this.renderPage(pageName);

            // إضافة إلى تاريخ المتصفح
            if (pushState) {
                history.pushState({ page: pageName }, '', `#${pageName}`);
            }

            // تسجيل النشاط
            if (auth.isLoggedIn()) {
                auth.logActivity('page_visit', `زيارة صفحة: ${this.pages[pageName].title}`);
            }

        } catch (error) {
            console.error('خطأ في تحميل الصفحة:', error);
            NotificationManager.error('حدث خطأ أثناء تحميل الصفحة');
        }
    }

    /**
     * التحقق من صلاحية الوصول للصفحة
     * @param {string} pageName - اسم الصفحة
     * @returns {boolean} يملك الصلاحية أم لا
     */
    hasPagePermission(pageName) {
        if (!auth.isLoggedIn()) return false;

        // تحديد الصلاحيات المطلوبة لكل صفحة
        const pagePermissions = {
            dashboard: ['view_dashboard'],
            employees: ['view_employees'],
            devices: ['view_devices'],
            'annual-leaves': ['view_leaves'],
            'leave-registration': ['view_leaves'],
            attendance: ['view_attendance'],
            'manual-attendance': ['view_attendance'],
            reports: ['view_reports'],
            settings: ['view_settings']
        };

        const requiredPermissions = pagePermissions[pageName] || [];
        
        // إذا لم تكن هناك صلاحيات محددة، السماح بالوصول
        if (requiredPermissions.length === 0) return true;

        // التحقق من الصلاحيات
        return requiredPermissions.some(permission => auth.hasPermission(permission));
    }

    /**
     * تحديث تحديد القائمة الجانبية
     * @param {string} pageName - اسم الصفحة
     */
    updateSidebarSelection(pageName) {
        // إزالة التحديد من جميع العناصر
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
        });

        // إضافة التحديد للعنصر الحالي
        const currentItem = document.querySelector(`[data-page="${pageName}"]`);
        if (currentItem) {
            currentItem.classList.add('active');
        }
    }

    /**
     * عرض محتوى الصفحة
     * @param {string} pageName - اسم الصفحة
     */
    renderPage(pageName) {
        const contentArea = document.getElementById('pageContent');
        const pageInfo = this.pages[pageName];

        // إظهار مؤشر التحميل
        contentArea.innerHTML = this.getLoadingHTML();

        // محاكاة تأخير التحميل
        setTimeout(() => {
            try {
                // تحميل محتوى الصفحة
                const pageHTML = this.getPageHTML(pageName);
                contentArea.innerHTML = pageHTML;

                // تهيئة الصفحة
                this.initializePage(pageName);

            } catch (error) {
                console.error('خطأ في عرض الصفحة:', error);
                contentArea.innerHTML = this.getErrorHTML('حدث خطأ أثناء تحميل الصفحة');
            }
        }, 300);
    }

    /**
     * الحصول على HTML مؤشر التحميل
     * @returns {string} HTML مؤشر التحميل
     */
    getLoadingHTML() {
        return `
            <div class="loading-container" style="display: flex; justify-content: center; align-items: center; height: 300px;">
                <div class="loading-spinner" style="
                    width: 50px; 
                    height: 50px; 
                    border: 4px solid var(--border-color); 
                    border-top: 4px solid var(--primary-color); 
                    border-radius: 50%; 
                    animation: spin 1s linear infinite;
                "></div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            </div>
        `;
    }

    /**
     * الحصول على HTML رسالة الخطأ
     * @param {string} message - رسالة الخطأ
     * @returns {string} HTML رسالة الخطأ
     */
    getErrorHTML(message) {
        return `
            <div class="error-container neu-card" style="text-align: center; padding: 50px;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: var(--error-color); margin-bottom: 20px;"></i>
                <h3 style="color: var(--text-primary); margin-bottom: 10px;">خطأ</h3>
                <p style="color: var(--text-secondary);">${message}</p>
                <button onclick="navigation.loadPage('dashboard')" class="neu-btn neu-btn-primary" style="margin-top: 20px;">
                    <i class="fas fa-home"></i>
                    العودة للرئيسية
                </button>
            </div>
        `;
    }

    /**
     * الحصول على HTML الصفحة
     * @param {string} pageName - اسم الصفحة
     * @returns {string} HTML الصفحة
     */
    getPageHTML(pageName) {
        switch (pageName) {
            case 'dashboard':
                return this.getDashboardHTML();
            case 'employees':
                return this.getEmployeesHTML();
            case 'devices':
                return this.getDevicesHTML();
            case 'annual-leaves':
                return this.getAnnualLeavesHTML();
            case 'leave-registration':
                return this.getLeaveRegistrationHTML();
            case 'attendance':
                return this.getAttendanceHTML();
            case 'manual-attendance':
                return this.getManualAttendanceHTML();
            case 'reports':
                return this.getReportsHTML();
            case 'settings':
                return this.getSettingsHTML();
            default:
                return this.getErrorHTML('الصفحة غير موجودة');
        }
    }

    /**
     * تهيئة الصفحة بعد التحميل
     * @param {string} pageName - اسم الصفحة
     */
    initializePage(pageName) {
        switch (pageName) {
            case 'dashboard':
                if (typeof dashboardManager !== 'undefined') {
                    dashboardManager.init();
                }
                break;
            case 'employees':
                if (typeof EmployeeManager !== 'undefined') {
                    EmployeeManager.init();
                }
                break;
            case 'devices':
                if (typeof DeviceManager !== 'undefined') {
                    DeviceManager.init();
                }
                break;
            case 'annual-leaves':
                if (typeof LeaveManager !== 'undefined') {
                    LeaveManager.initAnnualLeaves();
                }
                break;
            case 'leave-registration':
                if (typeof LeaveManager !== 'undefined') {
                    LeaveManager.initLeaveRegistration();
                }
                break;
            case 'attendance':
                if (typeof AttendanceManager !== 'undefined') {
                    AttendanceManager.init();
                }
                break;
            case 'manual-attendance':
                // سيتم تحميل الصفحة تلقائياً من خلال React
                break;
            case 'reports':
                if (typeof ReportManager !== 'undefined') {
                    ReportManager.init();
                }
                break;
            case 'settings':
                if (typeof SettingsManager !== 'undefined') {
                    SettingsManager.init();
                }
                break;
        }
    }

    /**
     * الحصول على HTML لوحة التحكم
     * @returns {string} HTML لوحة التحكم
     */
    getDashboardHTML() {
        return `
            <div class="dashboard-container">
                <div class="page-header mb-4">
                    <h2><i class="fas fa-tachometer-alt"></i> لوحة التحكم</h2>
                    <p>نظرة عامة على النظام والإحصائيات الرئيسية</p>
                </div>

                <!-- الإحصائيات الرئيسية -->
                <div class="dashboard-stats mb-4">
                    <div class="form-row">
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-users stat-icon" style="color: var(--primary-color);"></i>
                                <h3 id="totalEmployees">0</h3>
                                <p>إجمالي الموظفين</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-user-check stat-icon" style="color: var(--success-color);"></i>
                                <h3 id="presentToday">0</h3>
                                <p>حاضر اليوم</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-calendar-alt stat-icon" style="color: var(--warning-color);"></i>
                                <h3 id="onLeaveToday">0</h3>
                                <p>في إجازة اليوم</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-fingerprint stat-icon" style="color: var(--info-color);"></i>
                                <h3 id="totalDevices">0</h3>
                                <p>أجهزة البصمة</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- الأنشطة الحديثة والروابط السريعة -->
                <div class="form-row">
                    <div class="form-col-2">
                        <div class="neu-card">
                            <h4><i class="fas fa-history"></i> الأنشطة الحديثة</h4>
                            <div id="recentActivities" class="recent-activities">
                                <!-- سيتم تحميل الأنشطة هنا -->
                            </div>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="neu-card">
                            <h4><i class="fas fa-link"></i> روابط سريعة</h4>
                            <div class="quick-links">
                                <a href="#" onclick="navigation.loadPage('employees')" class="quick-link neu-btn">
                                    <i class="fas fa-user-plus"></i>
                                    إضافة موظف جديد
                                </a>
                                <a href="#" onclick="navigation.loadPage('leave-registration')" class="quick-link neu-btn">
                                    <i class="fas fa-calendar-plus"></i>
                                    تسجيل إجازة
                                </a>
                                <a href="#" onclick="navigation.loadPage('attendance')" class="quick-link neu-btn">
                                    <i class="fas fa-sync-alt"></i>
                                    سحب بيانات الحضور
                                </a>
                                <a href="#" onclick="navigation.loadPage('reports')" class="quick-link neu-btn">
                                    <i class="fas fa-chart-bar"></i>
                                    إنشاء تقرير
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- تنبيهات النظام -->
                <div class="system-alerts neu-card">
                    <h4><i class="fas fa-bell"></i> تنبيهات النظام</h4>
                    <div id="systemAlerts" class="alerts-list">
                        <!-- سيتم تحميل التنبيهات هنا -->
                    </div>
                </div>
            </div>
        `;
    }

    // باقي دوال HTML للصفحات الأخرى
    getEmployeesHTML() {
        return '<div id="employeesContent">جاري تحميل صفحة الموظفين...</div>';
    }

    getDevicesHTML() {
        return '<div id="devicesContent">جاري تحميل صفحة الأجهزة...</div>';
    }

    getAnnualLeavesHTML() {
        return '<div id="annualLeavesContent">جاري تحميل صفحة الأجازات السنوية...</div>';
    }

    getLeaveRegistrationHTML() {
        return '<div id="leaveRegistrationContent">جاري تحميل صفحة تسجيل الأجازات...</div>';
    }

    getAttendanceHTML() {
        return '<div id="attendanceContent">جاري تحميل صفحة الحضور والانصراف...</div>';
    }

    getReportsHTML() {
        return '<div id="reportsContent">جاري تحميل صفحة التقارير...</div>';
    }

    getSettingsHTML() {
        return '<div id="settingsContent">جاري تحميل صفحة الإعدادات...</div>';
    }

    getManualAttendanceHTML() {
        return '<div id="manualAttendanceContent">جاري تحميل صفحة الحضور والانصراف اليدوي...</div>';
    }
}

// إنشاء مثيل عام من مدير التنقل
const navigation = new NavigationManager();
