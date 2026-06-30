/**
 * مدير لوحة التحكم
 */

class DashboardManager {
    constructor() {
        this.refreshInterval = null;
    }

    /**
     * تهيئة لوحة التحكم
     */
    init() {
        this.loadDashboardData();
        this.setupAutoRefresh();
    }

    /**
     * تحميل بيانات لوحة التحكم
     */
    loadDashboardData() {
        this.updateStatistics();
        this.loadRecentActivities();
        this.loadSystemAlerts();
    }

    /**
     * تحديث الإحصائيات
     */
    updateStatistics() {
        try {
            // إحصائيات الموظفين
            const employees = storage.get('employees', []);
            const totalEmployees = employees.length;
            
            // إحصائيات الحضور اليوم
            const today = new Date().toISOString().split('T')[0];
            const attendanceRecords = storage.get('attendance', []);
            const todayAttendance = attendanceRecords.filter(record => record.date === today);
            const presentToday = todayAttendance.filter(record => 
                record.status === 'present' || record.status === 'late'
            ).length;

            // إحصائيات الأجازات اليوم
            const leaves = storage.get('leaves', []);
            const todayLeaves = leaves.filter(leave => {
                const startDate = new Date(leave.startDate);
                const endDate = new Date(leave.endDate);
                const todayDate = new Date(today);
                return todayDate >= startDate && todayDate <= endDate && leave.status === 'approved';
            });
            const onLeaveToday = todayLeaves.length;

            // إحصائيات الأجهزة
            const devices = storage.get('devices', []);
            const totalDevices = devices.length;

            // تحديث العناصر في الصفحة
            this.updateStatElement('totalEmployees', totalEmployees);
            this.updateStatElement('presentToday', presentToday);
            this.updateStatElement('onLeaveToday', onLeaveToday);
            this.updateStatElement('totalDevices', totalDevices);

        } catch (error) {
            console.error('خطأ في تحديث الإحصائيات:', error);
        }
    }

    /**
     * تحديث عنصر إحصائية
     * @param {string} elementId - معرف العنصر
     * @param {number} value - القيمة
     */
    updateStatElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // تأثير العد التصاعدي
            this.animateNumber(element, parseInt(element.textContent) || 0, value, 1000);
        }
    }

    /**
     * تأثير العد التصاعدي للأرقام
     * @param {HTMLElement} element - العنصر
     * @param {number} start - القيمة الابتدائية
     * @param {number} end - القيمة النهائية
     * @param {number} duration - مدة التأثير
     */
    animateNumber(element, start, end, duration) {
        if (start === end) return;
        
        const range = end - start;
        const increment = range / (duration / 16); // 60 FPS
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Math.round(current);
        }, 16);
    }

    /**
     * تحميل الأنشطة الحديثة
     */
    loadRecentActivities() {
        try {
            const activities = storage.get('activities', []);
            const recentActivities = activities
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                .slice(0, 10); // آخر 10 أنشطة

            const container = document.getElementById('recentActivities');
            if (!container) return;

            if (recentActivities.length === 0) {
                container.innerHTML = `
                    <div class="no-activities">
                        <i class="fas fa-info-circle"></i>
                        <p>لا توجد أنشطة حديثة</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = recentActivities.map(activity => `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="${this.getActivityIcon(activity.action)}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-description">${activity.description}</div>
                        <div class="activity-meta">
                            <span class="activity-user">${activity.username}</span>
                            <span class="activity-time">${Utils.formatDate(activity.timestamp, 'datetime')}</span>
                        </div>
                    </div>
                </div>
            `).join('');

        } catch (error) {
            console.error('خطأ في تحميل الأنشطة:', error);
        }
    }

    /**
     * الحصول على أيقونة النشاط
     * @param {string} action - نوع النشاط
     * @returns {string} فئة الأيقونة
     */
    getActivityIcon(action) {
        const icons = {
            'login': 'fas fa-sign-in-alt',
            'logout': 'fas fa-sign-out-alt',
            'employee_add': 'fas fa-user-plus',
            'employee_update': 'fas fa-user-edit',
            'employee_delete': 'fas fa-user-minus',
            'device_add': 'fas fa-fingerprint',
            'device_update': 'fas fa-edit',
            'device_delete': 'fas fa-trash',
            'leave_add': 'fas fa-calendar-plus',
            'leave_update': 'fas fa-calendar-edit',
            'attendance_sync': 'fas fa-sync-alt',
            'settings_update': 'fas fa-cog',
            'backup_create': 'fas fa-download',
            'report_generate': 'fas fa-chart-bar'
        };
        return icons[action] || 'fas fa-info-circle';
    }

    /**
     * تحميل تنبيهات النظام
     */
    loadSystemAlerts() {
        try {
            const alerts = this.generateSystemAlerts();
            const container = document.getElementById('systemAlerts');
            if (!container) return;

            if (alerts.length === 0) {
                container.innerHTML = `
                    <div class="no-alerts">
                        <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                        <p>لا توجد تنبيهات في الوقت الحالي</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = alerts.map(alert => `
                <div class="alert alert-${alert.type}">
                    <i class="${alert.icon}"></i>
                    <div class="alert-content">
                        <div class="alert-title">${alert.title}</div>
                        <div class="alert-message">${alert.message}</div>
                    </div>
                    ${alert.action ? `
                        <button class="alert-action neu-btn neu-btn-small" onclick="${alert.action}">
                            ${alert.actionText}
                        </button>
                    ` : ''}
                </div>
            `).join('');

        } catch (error) {
            console.error('خطأ في تحميل التنبيهات:', error);
        }
    }

    /**
     * إنشاء تنبيهات النظام
     * @returns {Array} قائمة التنبيهات
     */
    generateSystemAlerts() {
        const alerts = [];

        try {
            // تحقق من الأجهزة غير المتصلة
            const devices = storage.get('devices', []);
            const disconnectedDevices = devices.filter(device => device.status !== 'connected');
            
            if (disconnectedDevices.length > 0) {
                alerts.push({
                    type: 'warning',
                    icon: 'fas fa-exclamation-triangle',
                    title: 'أجهزة غير متصلة',
                    message: `يوجد ${disconnectedDevices.length} جهاز غير متصل. قد يؤثر هذا على دقة بيانات الحضور.`,
                    action: 'navigation.loadPage("devices")',
                    actionText: 'فحص الأجهزة'
                });
            }

            // تحقق من الموظفين بدون أرصدة أجازات
            const employees = storage.get('employees', []);
            const leaveBalances = storage.get('leaveBalances', []);
            const currentYear = new Date().getFullYear();
            
            const employeesWithoutBalance = employees.filter(employee => {
                return !leaveBalances.some(balance => 
                    balance.employeeId === employee.id && balance.year === currentYear
                );
            });

            if (employeesWithoutBalance.length > 0) {
                alerts.push({
                    type: 'info',
                    icon: 'fas fa-calendar-alt',
                    title: 'أرصدة أجازات مفقودة',
                    message: `يوجد ${employeesWithoutBalance.length} موظف بدون رصيد أجازات للسنة الحالية.`,
                    action: 'navigation.loadPage("annual-leaves")',
                    actionText: 'تحديث الأرصدة'
                });
            }

            // تحقق من استخدام التخزين
            const systemInfo = app.getSystemInfo();
            if (systemInfo.storageUsage.percentage > 80) {
                alerts.push({
                    type: 'warning',
                    icon: 'fas fa-hdd',
                    title: 'مساحة التخزين منخفضة',
                    message: `تم استخدام ${systemInfo.storageUsage.percentage}% من مساحة التخزين المتاحة.`,
                    action: 'navigation.loadPage("settings")',
                    actionText: 'إدارة البيانات'
                });
            }

            // تحقق من الأجازات المعلقة
            const leaves = storage.get('leaves', []);
            const pendingLeaves = leaves.filter(leave => leave.status === 'pending');
            
            if (pendingLeaves.length > 0) {
                alerts.push({
                    type: 'info',
                    icon: 'fas fa-clock',
                    title: 'أجازات في الانتظار',
                    message: `يوجد ${pendingLeaves.length} طلب إجازة في انتظار الموافقة.`,
                    action: 'navigation.loadPage("leave-registration")',
                    actionText: 'مراجعة الطلبات'
                });
            }

            // تحقق من آخر نسخة احتياطية
            const lastBackup = storage.get('lastBackup');
            if (!lastBackup) {
                alerts.push({
                    type: 'warning',
                    icon: 'fas fa-shield-alt',
                    title: 'لم يتم إنشاء نسخة احتياطية',
                    message: 'يُنصح بإنشاء نسخة احتياطية من البيانات بانتظام.',
                    action: 'navigation.loadPage("settings")',
                    actionText: 'إنشاء نسخة احتياطية'
                });
            } else {
                const daysSinceBackup = Math.floor(
                    (new Date() - new Date(lastBackup)) / (1000 * 60 * 60 * 24)
                );
                
                if (daysSinceBackup > 7) {
                    alerts.push({
                        type: 'info',
                        icon: 'fas fa-download',
                        title: 'نسخة احتياطية قديمة',
                        message: `آخر نسخة احتياطية كانت منذ ${daysSinceBackup} يوم.`,
                        action: 'navigation.loadPage("settings")',
                        actionText: 'إنشاء نسخة جديدة'
                    });
                }
            }

        } catch (error) {
            console.error('خطأ في إنشاء التنبيهات:', error);
        }

        return alerts;
    }

    /**
     * إعداد التحديث التلقائي
     */
    setupAutoRefresh() {
        // تحديث البيانات كل 5 دقائق
        this.refreshInterval = setInterval(() => {
            this.loadDashboardData();
        }, 5 * 60 * 1000);
    }

    /**
     * إيقاف التحديث التلقائي
     */
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    /**
     * تحديث يدوي للبيانات
     */
    refreshData() {
        NotificationManager.info('جاري تحديث البيانات...');
        
        setTimeout(() => {
            this.loadDashboardData();
            NotificationManager.success('تم تحديث البيانات بنجاح');
        }, 1000);
    }
}

// إنشاء مثيل عام من مدير لوحة التحكم
const dashboardManager = new DashboardManager();
