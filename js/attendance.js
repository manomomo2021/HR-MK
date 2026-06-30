/**
 * مدير الحضور والانصراف
 */

class AttendanceManager {
    constructor() {
        this.attendanceRecords = [];
        this.searchQuery = '';
    }

    /**
     * تهيئة مدير الحضور
     */
    init() {
        this.loadAttendanceRecords();
        this.renderAttendancePage();
        this.setupEventListeners();
    }

    /**
     * تحميل سجلات الحضور
     */
    loadAttendanceRecords() {
        this.attendanceRecords = storage.get('attendance', []);
    }

    /**
     * عرض صفحة الحضور والانصراف
     */
    renderAttendancePage() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="attendance-container">
                <!-- رأس الصفحة -->
                <div class="page-header d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2><i class="fas fa-clock"></i> الحضور والانصراف</h2>
                        <p>عرض ومراقبة سجلات الحضور والانصراف</p>
                    </div>
                    <div class="d-flex gap-2">
                        <button id="syncAttendanceBtn" class="neu-btn neu-btn-primary">
                            <i class="fas fa-sync-alt"></i>
                            سحب البيانات
                        </button>
                        <button id="addAttendanceBtn" class="neu-btn neu-btn-success">
                            <i class="fas fa-plus"></i>
                            إضافة سجل يدوي
                        </button>
                    </div>
                </div>

                <!-- إحصائيات الحضور -->
                <div class="attendance-stats mb-4">
                    <div class="form-row">
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-users stat-icon" style="color: var(--primary-color);"></i>
                                <h3 id="totalEmployeesToday">0</h3>
                                <p>إجمالي الموظفين</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-check-circle stat-icon" style="color: var(--success-color);"></i>
                                <h3 id="presentToday">0</h3>
                                <p>حاضر اليوم</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-times-circle stat-icon" style="color: var(--error-color);"></i>
                                <h3 id="absentToday">0</h3>
                                <p>غائب اليوم</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-clock stat-icon" style="color: var(--warning-color);"></i>
                                <h3 id="lateToday">0</h3>
                                <p>متأخر اليوم</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- شريط البحث والفلترة -->
                <div class="search-filter-bar neu-card mb-4">
                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">البحث</label>
                                <input type="text" id="attendanceSearch" class="neu-input" 
                                       placeholder="البحث بالاسم...">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">التاريخ من</label>
                                <input type="date" id="dateFromFilter" class="neu-input">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">التاريخ إلى</label>
                                <input type="date" id="dateToFilter" class="neu-input">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">الحالة</label>
                                <select id="statusFilter" class="neu-select">
                                    <option value="">جميع الحالات</option>
                                    <option value="present">حاضر</option>
                                    <option value="absent">غائب</option>
                                    <option value="late">متأخر</option>
                                    <option value="early_leave">انصراف مبكر</option>
                                    <option value="leave">إجازة</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- جدول الحضور -->
                <div class="attendance-table-container neu-card">
                    <div class="table-header d-flex justify-content-between align-items-center mb-3">
                        <h4>سجلات الحضور (<span id="attendanceCount">0</span>)</h4>
                        <div class="table-actions">
                            <button id="exportAttendanceBtn" class="neu-btn neu-btn-small">
                                <i class="fas fa-download"></i>
                                تصدير
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="neu-table" id="attendanceTable">
                            <thead>
                                <tr>
                                    <th>التاريخ</th>
                                    <th>اسم الموظف</th>
                                    <th>وقت الحضور</th>
                                    <th>وقت الانصراف</th>
                                    <th>ساعات العمل</th>
                                    <th>الحالة</th>
                                    <th>ملاحظات</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody id="attendanceTableBody">
                                <!-- سيتم تحميل البيانات هنا -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.updateAttendanceStats();
        this.setDefaultDateFilters();
        this.renderAttendanceTable();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // البحث والفلاتر
        document.getElementById('attendanceSearch')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderAttendanceTable();
        });

        ['dateFromFilter', 'dateToFilter', 'statusFilter'].forEach(filterId => {
            document.getElementById(filterId)?.addEventListener('change', () => {
                this.renderAttendanceTable();
            });
        });

        // سحب البيانات
        document.getElementById('syncAttendanceBtn')?.addEventListener('click', () => {
            this.syncAttendanceData();
        });

        // إضافة سجل يدوي
        document.getElementById('addAttendanceBtn')?.addEventListener('click', () => {
            this.showAddAttendanceModal();
        });

        // تصدير البيانات
        document.getElementById('exportAttendanceBtn')?.addEventListener('click', () => {
            this.exportAttendance();
        });
    }

    /**
     * تحديث إحصائيات الحضور
     */
    updateAttendanceStats() {
        const today = new Date().toISOString().split('T')[0];
        const todayRecords = this.attendanceRecords.filter(record => 
            record.date === today
        );

        const employees = storage.get('employees', []);
        const totalEmployees = employees.length;
        const presentToday = todayRecords.filter(record => 
            record.status === 'present' || record.status === 'late'
        ).length;
        const absentToday = totalEmployees - presentToday;
        const lateToday = todayRecords.filter(record => 
            record.status === 'late'
        ).length;

        document.getElementById('totalEmployeesToday').textContent = totalEmployees;
        document.getElementById('presentToday').textContent = presentToday;
        document.getElementById('absentToday').textContent = absentToday;
        document.getElementById('lateToday').textContent = lateToday;
    }

    /**
     * تعيين فلاتر التاريخ الافتراضية
     */
    setDefaultDateFilters() {
        const today = new Date().toISOString().split('T')[0];
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        const weekAgoStr = weekAgo.toISOString().split('T')[0];

        document.getElementById('dateFromFilter').value = weekAgoStr;
        document.getElementById('dateToFilter').value = today;
    }

    /**
     * عرض جدول الحضور
     */
    renderAttendanceTable() {
        const tbody = document.getElementById('attendanceTableBody');
        const countElement = document.getElementById('attendanceCount');
        
        if (!tbody) return;

        // تطبيق الفلاتر والبحث
        let filteredRecords = this.getFilteredAttendanceRecords();

        // تحديث العدد
        if (countElement) {
            countElement.textContent = filteredRecords.length;
        }

        // عرض البيانات
        if (filteredRecords.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center" style="padding: 40px;">
                        <i class="fas fa-clock" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
                        <p style="color: var(--text-secondary);">لا توجد سجلات حضور مطابقة للبحث</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredRecords.map(record => `
            <tr>
                <td>${Utils.formatDate(record.date)}</td>
                <td><strong>${record.employeeName}</strong></td>
                <td>${record.checkIn || '-'}</td>
                <td>${record.checkOut || '-'}</td>
                <td>${record.workingHours || '-'}</td>
                <td>
                    <span class="badge ${this.getStatusBadgeClass(record.status)}">
                        ${this.getStatusText(record.status)}
                    </span>
                </td>
                <td>${record.notes || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="attendanceManager.editRecord(${record.id})" 
                                class="neu-btn neu-btn-small" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="attendanceManager.deleteRecord(${record.id})" 
                                class="neu-btn neu-btn-small neu-btn-danger" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * الحصول على سجلات الحضور المفلترة
     * @returns {Array} قائمة السجلات المفلترة
     */
    getFilteredAttendanceRecords() {
        let filtered = [...this.attendanceRecords];

        // تطبيق البحث
        if (this.searchQuery) {
            filtered = filtered.filter(record => 
                Utils.searchText(record.employeeName, this.searchQuery)
            );
        }

        // تطبيق فلتر التاريخ من
        const dateFrom = document.getElementById('dateFromFilter')?.value;
        if (dateFrom) {
            filtered = filtered.filter(record => record.date >= dateFrom);
        }

        // تطبيق فلتر التاريخ إلى
        const dateTo = document.getElementById('dateToFilter')?.value;
        if (dateTo) {
            filtered = filtered.filter(record => record.date <= dateTo);
        }

        // تطبيق فلتر الحالة
        const statusFilter = document.getElementById('statusFilter')?.value;
        if (statusFilter) {
            filtered = filtered.filter(record => record.status === statusFilter);
        }

        // ترتيب حسب التاريخ (الأحدث أولاً)
        return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    /**
     * الحصول على فئة الشارة للحالة
     * @param {string} status - الحالة
     * @returns {string} فئة CSS
     */
    getStatusBadgeClass(status) {
        const classes = {
            'present': 'badge-success',
            'absent': 'badge-danger',
            'late': 'badge-warning',
            'early_leave': 'badge-warning',
            'leave': 'badge-info'
        };
        return classes[status] || 'badge-secondary';
    }

    /**
     * الحصول على نص الحالة
     * @param {string} status - الحالة
     * @returns {string} النص المقابل
     */
    getStatusText(status) {
        const texts = {
            'present': 'حاضر',
            'absent': 'غائب',
            'late': 'متأخر',
            'early_leave': 'انصراف مبكر',
            'leave': 'إجازة'
        };
        return texts[status] || status;
    }

    /**
     * مزامنة بيانات الحضور
     */
    async syncAttendanceData() {
        NotificationManager.info('جاري سحب بيانات الحضور من الأجهزة...');

        try {
            // محاكاة سحب البيانات من أجهزة البصمة
            await Utils.delay(2000);

            // في التطبيق الحقيقي، هنا سيتم الاتصال بأجهزة البصمة
            // وسحب البيانات الجديدة

            NotificationManager.success('تم سحب بيانات الحضور بنجاح');

            // تحديث البيانات
            this.loadAttendanceRecords();
            this.updateAttendanceStats();
            this.renderAttendanceTable();

            // تسجيل النشاط
            auth.logActivity('attendance_sync', 'تم سحب بيانات الحضور من الأجهزة');

        } catch (error) {
            console.error('خطأ في سحب البيانات:', error);
            NotificationManager.error('حدث خطأ أثناء سحب البيانات');
        }
    }

    /**
     * إظهار نافذة إضافة سجل حضور يدوي
     */
    showAddAttendanceModal() {
        NotificationManager.info('ميزة إضافة السجلات اليدوية قيد التطوير');
    }

    /**
     * تعديل سجل حضور
     * @param {number} recordId - معرف السجل
     */
    editRecord(recordId) {
        NotificationManager.info('ميزة تعديل السجلات قيد التطوير');
    }

    /**
     * حذف سجل حضور
     * @param {number} recordId - معرف السجل
     */
    deleteRecord(recordId) {
        NotificationManager.info('ميزة حذف السجلات قيد التطوير');
    }

    /**
     * تصدير بيانات الحضور
     */
    exportAttendance() {
        NotificationManager.info('ميزة تصدير بيانات الحضور قيد التطوير');
    }
}

// إنشاء مثيل عام من مدير الحضور
const attendanceManager = new AttendanceManager();
