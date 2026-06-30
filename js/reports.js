/**
 * مدير التقارير
 */

class ReportManager {
    constructor() {
        this.currentReport = null;
    }

    /**
     * تهيئة مدير التقارير
     */
    init() {
        this.renderReportsPage();
        this.setupEventListeners();
    }

    /**
     * عرض صفحة التقارير
     */
    renderReportsPage() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="reports-container">
                <!-- رأس الصفحة -->
                <div class="page-header mb-4">
                    <h2><i class="fas fa-chart-bar"></i> التقارير</h2>
                    <p>استخراج وعرض التقارير المختلفة للنظام</p>
                </div>

                <!-- أنواع التقارير -->
                <div class="reports-grid mb-4">
                    <div class="form-row">
                        <div class="form-col">
                            <div class="report-card neu-card" data-report="attendance">
                                <div class="report-icon">
                                    <i class="fas fa-clock"></i>
                                </div>
                                <h4>تقرير الحضور والغياب</h4>
                                <p>تقرير شامل عن حضور وغياب الموظفين خلال فترة محددة</p>
                                <button class="neu-btn neu-btn-primary">
                                    <i class="fas fa-chart-line"></i>
                                    إنشاء التقرير
                                </button>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="report-card neu-card" data-report="leaves">
                                <div class="report-icon">
                                    <i class="fas fa-calendar-alt"></i>
                                </div>
                                <h4>تقرير الأجازات</h4>
                                <p>تقرير مفصل عن جميع أنواع الأجازات والأرصدة المتبقية</p>
                                <button class="neu-btn neu-btn-primary">
                                    <i class="fas fa-calendar-check"></i>
                                    إنشاء التقرير
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-col">
                            <div class="report-card neu-card" data-report="employees">
                                <div class="report-icon">
                                    <i class="fas fa-users"></i>
                                </div>
                                <h4>تقرير الموظفين</h4>
                                <p>تقرير شامل عن بيانات الموظفين والمعلومات الوظيفية</p>
                                <button class="neu-btn neu-btn-primary">
                                    <i class="fas fa-user-friends"></i>
                                    إنشاء التقرير
                                </button>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="report-card neu-card" data-report="summary">
                                <div class="report-icon">
                                    <i class="fas fa-chart-pie"></i>
                                </div>
                                <h4>التقرير الإجمالي</h4>
                                <p>ملخص شامل لجميع إحصائيات النظام والمؤشرات الرئيسية</p>
                                <button class="neu-btn neu-btn-primary">
                                    <i class="fas fa-analytics"></i>
                                    إنشاء التقرير
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- منطقة عرض التقرير -->
                <div id="reportDisplay" class="report-display neu-card" style="display: none;">
                    <div class="report-header d-flex justify-content-between align-items-center mb-4">
                        <h3 id="reportTitle">عنوان التقرير</h3>
                        <div class="report-actions">
                            <button id="printReportBtn" class="neu-btn neu-btn-small">
                                <i class="fas fa-print"></i>
                                طباعة
                            </button>
                            <button id="exportReportBtn" class="neu-btn neu-btn-small">
                                <i class="fas fa-download"></i>
                                تصدير
                            </button>
                            <button id="closeReportBtn" class="neu-btn neu-btn-small">
                                <i class="fas fa-times"></i>
                                إغلاق
                            </button>
                        </div>
                    </div>
                    <div id="reportContent" class="report-content">
                        <!-- سيتم عرض محتوى التقرير هنا -->
                    </div>
                </div>
            </div>

            <!-- نافذة إعدادات التقرير -->
            <div id="reportSettingsModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3 id="reportSettingsTitle">إعدادات التقرير</h3>
                    </div>
                    <div class="modal-body">
                        <form id="reportSettingsForm">
                            <div class="form-group">
                                <label class="form-label">نوع التقرير</label>
                                <input type="text" id="reportType" class="neu-input" readonly>
                            </div>
                            <div class="form-row">
                                <div class="form-col">
                                    <div class="form-group">
                                        <label class="form-label">من تاريخ</label>
                                        <input type="date" id="reportDateFrom" class="neu-input" required>
                                    </div>
                                </div>
                                <div class="form-col">
                                    <div class="form-group">
                                        <label class="form-label">إلى تاريخ</label>
                                        <input type="date" id="reportDateTo" class="neu-input" required>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group" id="employeeFilterGroup" style="display: none;">
                                <label class="form-label">الموظف</label>
                                <select id="reportEmployee" class="neu-select">
                                    <option value="">جميع الموظفين</option>
                                </select>
                            </div>
                            <div class="form-group" id="departmentFilterGroup" style="display: none;">
                                <label class="form-label">القسم</label>
                                <select id="reportDepartment" class="neu-select">
                                    <option value="">جميع الأقسام</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label">تنسيق التقرير</label>
                                <select id="reportFormat" class="neu-select">
                                    <option value="html">عرض على الشاشة</option>
                                    <option value="pdf">PDF</option>
                                    <option value="excel">Excel</option>
                                </select>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" form="reportSettingsForm" class="neu-btn neu-btn-primary">
                            <i class="fas fa-chart-bar"></i>
                            إنشاء التقرير
                        </button>
                        <button type="button" id="cancelReportBtn" class="neu-btn">
                            <i class="fas fa-times"></i>
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // بطاقات التقارير
        document.querySelectorAll('.report-card button').forEach(button => {
            button.addEventListener('click', (e) => {
                const reportCard = e.target.closest('.report-card');
                const reportType = reportCard.getAttribute('data-report');
                this.showReportSettings(reportType);
            });
        });

        // نموذج إعدادات التقرير
        document.getElementById('reportSettingsForm')?.addEventListener('submit', (e) => {
            this.handleReportGeneration(e);
        });

        // إلغاء إعدادات التقرير
        document.getElementById('cancelReportBtn')?.addEventListener('click', () => {
            this.hideReportSettings();
        });

        // إجراءات التقرير
        document.getElementById('printReportBtn')?.addEventListener('click', () => {
            this.printReport();
        });

        document.getElementById('exportReportBtn')?.addEventListener('click', () => {
            this.exportReport();
        });

        document.getElementById('closeReportBtn')?.addEventListener('click', () => {
            this.closeReport();
        });
    }

    /**
     * إظهار نافذة إعدادات التقرير
     * @param {string} reportType - نوع التقرير
     */
    showReportSettings(reportType) {
        const modal = document.getElementById('reportSettingsModal');
        const title = document.getElementById('reportSettingsTitle');
        const typeField = document.getElementById('reportType');

        // تحديد عنوان التقرير
        const reportTitles = {
            'attendance': 'تقرير الحضور والغياب',
            'leaves': 'تقرير الأجازات',
            'employees': 'تقرير الموظفين',
            'summary': 'التقرير الإجمالي'
        };

        title.textContent = `إعدادات ${reportTitles[reportType]}`;
        typeField.value = reportTitles[reportType];

        // تعيين التواريخ الافتراضية
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        document.getElementById('reportDateFrom').value = monthAgo.toISOString().split('T')[0];
        document.getElementById('reportDateTo').value = today.toISOString().split('T')[0];

        // إظهار/إخفاء الفلاتر حسب نوع التقرير
        this.toggleReportFilters(reportType);

        // تحديث قوائم الموظفين والأقسام
        this.updateReportFilters();

        this.currentReport = reportType;
        modal.classList.add('show');
    }

    /**
     * إخفاء نافذة إعدادات التقرير
     */
    hideReportSettings() {
        const modal = document.getElementById('reportSettingsModal');
        modal.classList.remove('show');
        this.currentReport = null;
    }

    /**
     * تبديل فلاتر التقرير حسب النوع
     * @param {string} reportType - نوع التقرير
     */
    toggleReportFilters(reportType) {
        const employeeGroup = document.getElementById('employeeFilterGroup');
        const departmentGroup = document.getElementById('departmentFilterGroup');

        // إخفاء جميع الفلاتر أولاً
        employeeGroup.style.display = 'none';
        departmentGroup.style.display = 'none';

        // إظهار الفلاتر المناسبة
        switch (reportType) {
            case 'attendance':
            case 'leaves':
                employeeGroup.style.display = 'block';
                departmentGroup.style.display = 'block';
                break;
            case 'employees':
                departmentGroup.style.display = 'block';
                break;
        }
    }

    /**
     * تحديث فلاتر التقرير
     */
    updateReportFilters() {
        // تحديث قائمة الموظفين
        const employeeSelect = document.getElementById('reportEmployee');
        const employees = storage.get('employees', []);
        
        employeeSelect.innerHTML = '<option value="">جميع الموظفين</option>';
        employees.forEach(employee => {
            const option = document.createElement('option');
            option.value = employee.id;
            option.textContent = employee.name;
            employeeSelect.appendChild(option);
        });

        // تحديث قائمة الأقسام
        const departmentSelect = document.getElementById('reportDepartment');
        const departments = [...new Set(employees.map(emp => emp.department))].filter(Boolean);
        
        departmentSelect.innerHTML = '<option value="">جميع الأقسام</option>';
        departments.forEach(department => {
            const option = document.createElement('option');
            option.value = department;
            option.textContent = department;
            departmentSelect.appendChild(option);
        });
    }

    /**
     * معالج إنشاء التقرير
     * @param {Event} event - حدث الإرسال
     */
    handleReportGeneration(event) {
        event.preventDefault();

        try {
            // جمع إعدادات التقرير
            const settings = {
                type: this.currentReport,
                dateFrom: document.getElementById('reportDateFrom').value,
                dateTo: document.getElementById('reportDateTo').value,
                employee: document.getElementById('reportEmployee').value,
                department: document.getElementById('reportDepartment').value,
                format: document.getElementById('reportFormat').value
            };

            // التحقق من صحة البيانات
            if (!settings.dateFrom || !settings.dateTo) {
                NotificationManager.error('يرجى تحديد فترة التقرير');
                return;
            }

            if (new Date(settings.dateFrom) > new Date(settings.dateTo)) {
                NotificationManager.error('تاريخ البداية يجب أن يكون قبل تاريخ النهاية');
                return;
            }

            // إنشاء التقرير
            this.generateReport(settings);

        } catch (error) {
            console.error('خطأ في إنشاء التقرير:', error);
            NotificationManager.error('حدث خطأ أثناء إنشاء التقرير');
        }
    }

    /**
     * إنشاء التقرير
     * @param {Object} settings - إعدادات التقرير
     */
    generateReport(settings) {
        NotificationManager.info('جاري إنشاء التقرير...');

        // إخفاء نافذة الإعدادات
        this.hideReportSettings();

        // محاكاة تأخير إنشاء التقرير
        setTimeout(() => {
            try {
                let reportContent = '';
                let reportTitle = '';

                switch (settings.type) {
                    case 'attendance':
                        reportContent = this.generateAttendanceReport(settings);
                        reportTitle = 'تقرير الحضور والغياب';
                        break;
                    case 'leaves':
                        reportContent = this.generateLeavesReport(settings);
                        reportTitle = 'تقرير الأجازات';
                        break;
                    case 'employees':
                        reportContent = this.generateEmployeesReport(settings);
                        reportTitle = 'تقرير الموظفين';
                        break;
                    case 'summary':
                        reportContent = this.generateSummaryReport(settings);
                        reportTitle = 'التقرير الإجمالي';
                        break;
                    default:
                        throw new Error('نوع تقرير غير مدعوم');
                }

                // عرض التقرير
                this.displayReport(reportTitle, reportContent);

                NotificationManager.success('تم إنشاء التقرير بنجاح');

                // تسجيل النشاط
                auth.logActivity('report_generate', `تم إنشاء ${reportTitle}`);

            } catch (error) {
                console.error('خطأ في إنشاء التقرير:', error);
                NotificationManager.error('فشل في إنشاء التقرير');
            }
        }, 1500);
    }

    /**
     * عرض التقرير
     * @param {string} title - عنوان التقرير
     * @param {string} content - محتوى التقرير
     */
    displayReport(title, content) {
        const reportDisplay = document.getElementById('reportDisplay');
        const reportTitle = document.getElementById('reportTitle');
        const reportContent = document.getElementById('reportContent');

        reportTitle.textContent = title;
        reportContent.innerHTML = content;
        reportDisplay.style.display = 'block';

        // التمرير إلى التقرير
        reportDisplay.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * إنشاء تقرير الحضور والغياب
     * @param {Object} settings - إعدادات التقرير
     * @returns {string} محتوى التقرير
     */
    generateAttendanceReport(settings) {
        return `
            <div class="report-summary mb-4">
                <h4>ملخص التقرير</h4>
                <p>فترة التقرير: من ${Utils.formatDate(settings.dateFrom)} إلى ${Utils.formatDate(settings.dateTo)}</p>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    هذا التقرير قيد التطوير. سيتم عرض بيانات الحضور والغياب التفصيلية هنا.
                </div>
            </div>
        `;
    }

    /**
     * إنشاء تقرير الأجازات
     * @param {Object} settings - إعدادات التقرير
     * @returns {string} محتوى التقرير
     */
    generateLeavesReport(settings) {
        return `
            <div class="report-summary mb-4">
                <h4>ملخص التقرير</h4>
                <p>فترة التقرير: من ${Utils.formatDate(settings.dateFrom)} إلى ${Utils.formatDate(settings.dateTo)}</p>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    هذا التقرير قيد التطوير. سيتم عرض بيانات الأجازات التفصيلية هنا.
                </div>
            </div>
        `;
    }

    /**
     * إنشاء تقرير الموظفين
     * @param {Object} settings - إعدادات التقرير
     * @returns {string} محتوى التقرير
     */
    generateEmployeesReport(settings) {
        const employees = storage.get('employees', []);
        let filteredEmployees = employees;

        // تطبيق فلتر القسم
        if (settings.department) {
            filteredEmployees = employees.filter(emp => emp.department === settings.department);
        }

        return `
            <div class="report-summary mb-4">
                <h4>ملخص التقرير</h4>
                <p>إجمالي الموظفين: ${filteredEmployees.length}</p>
                ${settings.department ? `<p>القسم: ${settings.department}</p>` : ''}
            </div>
            <div class="table-responsive">
                <table class="neu-table">
                    <thead>
                        <tr>
                            <th>كود الموظف</th>
                            <th>الاسم</th>
                            <th>القسم</th>
                            <th>المنصب</th>
                            <th>تاريخ التعيين</th>
                            <th>نوع العقد</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredEmployees.map(emp => `
                            <tr>
                                <td>${emp.code}</td>
                                <td>${emp.name}</td>
                                <td>${emp.department}</td>
                                <td>${emp.position}</td>
                                <td>${Utils.formatDate(emp.hireDate)}</td>
                                <td>${emp.contractType === 'permanent' ? 'دائم' : 'مؤقت'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * إنشاء التقرير الإجمالي
     * @param {Object} settings - إعدادات التقرير
     * @returns {string} محتوى التقرير
     */
    generateSummaryReport(settings) {
        const employees = storage.get('employees', []);
        const devices = storage.get('devices', []);
        const leaveBalances = storage.get('leaveBalances', []);

        return `
            <div class="report-summary">
                <h4>الإحصائيات العامة</h4>
                <div class="form-row mb-4">
                    <div class="form-col">
                        <div class="stat-card neu-inset text-center">
                            <h3>${employees.length}</h3>
                            <p>إجمالي الموظفين</p>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="stat-card neu-inset text-center">
                            <h3>${devices.length}</h3>
                            <p>أجهزة البصمة</p>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="stat-card neu-inset text-center">
                            <h3>${leaveBalances.length}</h3>
                            <p>أرصدة الأجازات</p>
                        </div>
                    </div>
                </div>
                <div class="alert alert-info">
                    <i class="fas fa-info-circle"></i>
                    هذا التقرير قيد التطوير. سيتم إضافة المزيد من الإحصائيات والرسوم البيانية.
                </div>
            </div>
        `;
    }

    /**
     * طباعة التقرير
     */
    printReport() {
        const reportContent = document.getElementById('reportContent').innerHTML;
        const reportTitle = document.getElementById('reportTitle').textContent;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>${reportTitle}</title>
                    <style>
                        body { font-family: Arial, sans-serif; direction: rtl; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                        th { background-color: #f2f2f2; }
                        .stat-card { border: 1px solid #ddd; padding: 15px; margin: 10px; }
                    </style>
                </head>
                <body>
                    <h1>${reportTitle}</h1>
                    ${reportContent}
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    }

    /**
     * تصدير التقرير
     */
    exportReport() {
        NotificationManager.info('ميزة تصدير التقارير قيد التطوير');
    }

    /**
     * إغلاق التقرير
     */
    closeReport() {
        const reportDisplay = document.getElementById('reportDisplay');
        reportDisplay.style.display = 'none';
    }
}

// إنشاء مثيل عام من مدير التقارير
const reportManager = new ReportManager();
