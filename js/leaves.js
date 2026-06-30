/**
 * مدير الأجازات
 * إدارة أرصدة الأجازات وتسجيل الأجازات
 */

class LeaveManager {
    constructor() {
        this.leaveBalances = [];
        this.leaves = [];
        this.currentLeave = null;
        this.searchQuery = '';
    }

    /**
     * تهيئة صفحة الأجازات السنوية
     */
    initAnnualLeaves() {
        this.loadLeaveBalances();
        this.renderAnnualLeavesPage();
        this.setupAnnualLeavesEventListeners();
    }

    /**
     * تهيئة صفحة تسجيل الأجازات
     */
    initLeaveRegistration() {
        this.loadLeaves();
        this.renderLeaveRegistrationPage();
        this.setupLeaveRegistrationEventListeners();
    }

    /**
     * تحميل أرصدة الأجازات
     */
    loadLeaveBalances() {
        this.leaveBalances = storage.get('leaveBalances', []);
    }

    /**
     * تحميل سجلات الأجازات
     */
    loadLeaves() {
        this.leaves = storage.get('leaves', []);
    }

    /**
     * عرض صفحة الأجازات السنوية
     */
    renderAnnualLeavesPage() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="annual-leaves-container">
                <!-- رأس الصفحة -->
                <div class="page-header d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2><i class="fas fa-calendar-check"></i> الأجازات السنوية</h2>
                        <p>عرض وإدارة أرصدة الأجازات للموظفين</p>
                    </div>
                    <button id="updateAllBalancesBtn" class="neu-btn neu-btn-primary">
                        <i class="fas fa-sync-alt"></i>
                        تحديث جميع الأرصدة
                    </button>
                </div>

                <!-- إحصائيات الأجازات -->
                <div class="leaves-stats mb-4">
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
                                <i class="fas fa-calendar-day stat-icon" style="color: var(--success-color);"></i>
                                <h3 id="totalAnnualLeaves">0</h3>
                                <p>إجمالي الأجازات السنوية</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-calendar-minus stat-icon" style="color: var(--warning-color);"></i>
                                <h3 id="usedAnnualLeaves">0</h3>
                                <p>الأجازات المستهلكة</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-calendar-plus stat-icon" style="color: var(--info-color);"></i>
                                <h3 id="remainingAnnualLeaves">0</h3>
                                <p>الأجازات المتبقية</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- شريط البحث -->
                <div class="search-filter-bar neu-card mb-4">
                    <div class="form-row">
                        <div class="form-col-2">
                            <div class="form-group mb-0">
                                <label class="form-label">البحث</label>
                                <input type="text" id="leaveBalanceSearch" class="neu-input" 
                                       placeholder="البحث بالاسم أو كود الموظف...">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">السنة</label>
                                <select id="yearFilter" class="neu-select">
                                    <option value="">جميع السنوات</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">&nbsp;</label>
                                <button id="clearLeaveFiltersBtn" class="neu-btn" style="width: 100%;">
                                    <i class="fas fa-times"></i>
                                    مسح الفلاتر
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- جدول أرصدة الأجازات -->
                <div class="leave-balances-table-container neu-card">
                    <div class="table-header d-flex justify-content-between align-items-center mb-3">
                        <h4>أرصدة الأجازات (<span id="leaveBalanceCount">0</span>)</h4>
                        <div class="table-actions">
                            <button id="exportLeaveBalancesBtn" class="neu-btn neu-btn-small">
                                <i class="fas fa-download"></i>
                                تصدير
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="neu-table" id="leaveBalancesTable">
                            <thead>
                                <tr>
                                    <th>اسم الموظف</th>
                                    <th>الأجازات السنوية</th>
                                    <th>المستهلك</th>
                                    <th>المتبقي</th>
                                    <th>الأجازات العارضة</th>
                                    <th>المستهلك</th>
                                    <th>المتبقي</th>
                                    <th>الأجازات المرضية</th>
                                    <th>المستهلك</th>
                                    <th>المتبقي</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody id="leaveBalancesTableBody">
                                <!-- سيتم تحميل البيانات هنا -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- نافذة تحديث رصيد الأجازات -->
            <div id="updateBalanceModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>تحديث رصيد الأجازات</h3>
                    </div>
                    <div class="modal-body">
                        <form id="updateBalanceForm">
                            <div class="form-group">
                                <label class="form-label">اسم الموظف</label>
                                <input type="text" id="balanceEmployeeName" class="neu-input" readonly>
                            </div>
                            <div class="form-row">
                                <div class="form-col">
                                    <div class="form-group">
                                        <label class="form-label">الأجازات السنوية</label>
                                        <input type="number" id="balanceAnnualLeaves" class="neu-input" min="0" required>
                                    </div>
                                </div>
                                <div class="form-col">
                                    <div class="form-group">
                                        <label class="form-label">الأجازات العارضة</label>
                                        <input type="number" id="balanceCasualLeaves" class="neu-input" min="0" required>
                                    </div>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-col">
                                    <div class="form-group">
                                        <label class="form-label">الأجازات المرضية</label>
                                        <input type="number" id="balanceSickLeaves" class="neu-input" min="0" required>
                                    </div>
                                </div>
                                <div class="form-col">
                                    <div class="form-group">
                                        <label class="form-label">السنة</label>
                                        <input type="number" id="balanceYear" class="neu-input" 
                                               min="2020" max="2030" required>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">ملاحظات</label>
                                <textarea id="balanceNotes" class="neu-input" rows="3" 
                                          placeholder="سبب التحديث (اختياري)..."></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" form="updateBalanceForm" class="neu-btn neu-btn-primary">
                            <i class="fas fa-save"></i>
                            حفظ التحديث
                        </button>
                        <button type="button" id="cancelUpdateBalanceBtn" class="neu-btn">
                            <i class="fas fa-times"></i>
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.updateLeaveStats();
        this.updateYearFilter();
        this.renderLeaveBalancesTable();
    }

    /**
     * إعداد مستمعي أحداث صفحة الأجازات السنوية
     */
    setupAnnualLeavesEventListeners() {
        // البحث
        document.getElementById('leaveBalanceSearch')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderLeaveBalancesTable();
        });

        // فلتر السنة
        document.getElementById('yearFilter')?.addEventListener('change', () => {
            this.renderLeaveBalancesTable();
        });

        // مسح الفلاتر
        document.getElementById('clearLeaveFiltersBtn')?.addEventListener('click', () => {
            this.clearLeaveFilters();
        });

        // تحديث جميع الأرصدة
        document.getElementById('updateAllBalancesBtn')?.addEventListener('click', () => {
            this.updateAllBalances();
        });

        // نموذج تحديث الرصيد
        document.getElementById('updateBalanceForm')?.addEventListener('submit', (e) => {
            this.handleUpdateBalanceSubmit(e);
        });

        // إلغاء تحديث الرصيد
        document.getElementById('cancelUpdateBalanceBtn')?.addEventListener('click', () => {
            this.hideUpdateBalanceModal();
        });

        // تصدير البيانات
        document.getElementById('exportLeaveBalancesBtn')?.addEventListener('click', () => {
            this.exportLeaveBalances();
        });
    }

    /**
     * تحديث إحصائيات الأجازات
     */
    updateLeaveStats() {
        const totalEmployees = this.leaveBalances.length;
        const totalAnnual = this.leaveBalances.reduce((sum, balance) => sum + balance.annualLeaves, 0);
        const usedAnnual = this.leaveBalances.reduce((sum, balance) => sum + balance.usedAnnual, 0);
        const remainingAnnual = totalAnnual - usedAnnual;

        document.getElementById('totalEmployees').textContent = totalEmployees;
        document.getElementById('totalAnnualLeaves').textContent = totalAnnual;
        document.getElementById('usedAnnualLeaves').textContent = usedAnnual;
        document.getElementById('remainingAnnualLeaves').textContent = remainingAnnual;
    }

    /**
     * تحديث فلتر السنوات
     */
    updateYearFilter() {
        const yearFilter = document.getElementById('yearFilter');
        if (!yearFilter) return;

        const years = [...new Set(this.leaveBalances.map(balance => balance.year))].sort((a, b) => b - a);
        
        // مسح الخيارات الحالية (عدا الخيار الأول)
        yearFilter.innerHTML = '<option value="">جميع السنوات</option>';
        
        // إضافة السنوات
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearFilter.appendChild(option);
        });

        // تحديد السنة الحالية كافتراضية
        const currentYear = new Date().getFullYear();
        if (years.includes(currentYear)) {
            yearFilter.value = currentYear;
        }
    }

    /**
     * عرض جدول أرصدة الأجازات
     */
    renderLeaveBalancesTable() {
        const tbody = document.getElementById('leaveBalancesTableBody');
        const countElement = document.getElementById('leaveBalanceCount');

        if (!tbody) return;

        // تطبيق الفلاتر والبحث
        let filteredBalances = this.getFilteredLeaveBalances();

        // تحديث العدد
        if (countElement) {
            countElement.textContent = filteredBalances.length;
        }

        // عرض البيانات
        if (filteredBalances.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="11" class="text-center" style="padding: 40px;">
                        <i class="fas fa-calendar-check" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
                        <p style="color: var(--text-secondary);">لا توجد أرصدة أجازات مطابقة للبحث</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredBalances.map(balance => {
            const annualRemaining = balance.annualLeaves - balance.usedAnnual;
            const casualRemaining = balance.casualLeaves - balance.usedCasual;
            const sickRemaining = balance.sickLeaves - balance.usedSick;

            return `
                <tr>
                    <td><strong>${balance.employeeName}</strong></td>
                    <td class="text-center">${balance.annualLeaves}</td>
                    <td class="text-center">${balance.usedAnnual}</td>
                    <td class="text-center">
                        <span class="badge ${annualRemaining > 0 ? 'badge-success' : 'badge-warning'}">
                            ${annualRemaining}
                        </span>
                    </td>
                    <td class="text-center">${balance.casualLeaves}</td>
                    <td class="text-center">${balance.usedCasual}</td>
                    <td class="text-center">
                        <span class="badge ${casualRemaining > 0 ? 'badge-success' : 'badge-warning'}">
                            ${casualRemaining}
                        </span>
                    </td>
                    <td class="text-center">${balance.sickLeaves}</td>
                    <td class="text-center">${balance.usedSick}</td>
                    <td class="text-center">
                        <span class="badge ${sickRemaining > 0 ? 'badge-success' : 'badge-warning'}">
                            ${sickRemaining}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button onclick="leaveManager.updateBalance(${balance.id})"
                                    class="neu-btn neu-btn-small" title="تحديث الرصيد">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="leaveManager.viewLeaveHistory(${balance.employeeId})"
                                    class="neu-btn neu-btn-small" title="تاريخ الأجازات">
                                <i class="fas fa-history"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    /**
     * الحصول على أرصدة الأجازات المفلترة
     * @returns {Array} قائمة الأرصدة المفلترة
     */
    getFilteredLeaveBalances() {
        let filtered = [...this.leaveBalances];

        // تطبيق البحث
        if (this.searchQuery) {
            filtered = filtered.filter(balance =>
                Utils.searchText(balance.employeeName, this.searchQuery)
            );
        }

        // تطبيق فلتر السنة
        const yearFilter = document.getElementById('yearFilter')?.value;
        if (yearFilter) {
            filtered = filtered.filter(balance => balance.year == yearFilter);
        }

        return filtered;
    }

    /**
     * مسح فلاتر الأجازات
     */
    clearLeaveFilters() {
        document.getElementById('leaveBalanceSearch').value = '';
        document.getElementById('yearFilter').value = '';
        this.searchQuery = '';
        this.renderLeaveBalancesTable();
    }

    /**
     * تحديث رصيد أجازات موظف
     * @param {number} balanceId - معرف رصيد الأجازات
     */
    updateBalance(balanceId) {
        const balance = this.leaveBalances.find(b => b.id === balanceId);
        if (!balance) {
            NotificationManager.error('رصيد الأجازات غير موجود');
            return;
        }

        this.showUpdateBalanceModal(balance);
    }

    /**
     * إظهار نافذة تحديث الرصيد
     * @param {Object} balance - بيانات الرصيد
     */
    showUpdateBalanceModal(balance) {
        const modal = document.getElementById('updateBalanceModal');

        // ملء النموذج
        document.getElementById('balanceEmployeeName').value = balance.employeeName;
        document.getElementById('balanceAnnualLeaves').value = balance.annualLeaves;
        document.getElementById('balanceCasualLeaves').value = balance.casualLeaves;
        document.getElementById('balanceSickLeaves').value = balance.sickLeaves;
        document.getElementById('balanceYear').value = balance.year;
        document.getElementById('balanceNotes').value = '';

        this.currentBalance = balance;
        modal.classList.add('show');
    }

    /**
     * إخفاء نافذة تحديث الرصيد
     */
    hideUpdateBalanceModal() {
        const modal = document.getElementById('updateBalanceModal');
        modal.classList.remove('show');
        this.currentBalance = null;
    }

    /**
     * معالج إرسال نموذج تحديث الرصيد
     * @param {Event} event - حدث الإرسال
     */
    handleUpdateBalanceSubmit(event) {
        event.preventDefault();

        try {
            const formData = {
                annualLeaves: parseInt(document.getElementById('balanceAnnualLeaves').value),
                casualLeaves: parseInt(document.getElementById('balanceCasualLeaves').value),
                sickLeaves: parseInt(document.getElementById('balanceSickLeaves').value),
                year: parseInt(document.getElementById('balanceYear').value),
                notes: Utils.cleanText(document.getElementById('balanceNotes').value)
            };

            // التحقق من صحة البيانات
            if (formData.annualLeaves < 0 || formData.casualLeaves < 0 || formData.sickLeaves < 0) {
                NotificationManager.error('لا يمكن أن تكون الأرصدة أقل من صفر');
                return;
            }

            // تحديث الرصيد
            const updatedData = {
                ...formData,
                updatedAt: new Date().toISOString(),
                updatedBy: auth.getCurrentUser().id
            };

            const success = storage.updateItem('leaveBalances', this.currentBalance.id, updatedData);

            if (success) {
                // تحديث البيانات المحلية
                this.loadLeaveBalances();
                this.updateLeaveStats();
                this.renderLeaveBalancesTable();

                // إخفاء النافذة وإظهار رسالة نجاح
                this.hideUpdateBalanceModal();
                NotificationManager.success('تم تحديث رصيد الأجازات بنجاح');

                // تسجيل النشاط
                auth.logActivity('leave_balance_update',
                    `تم تحديث رصيد أجازات الموظف: ${this.currentBalance.employeeName}`);
            } else {
                NotificationManager.error('فشل في تحديث رصيد الأجازات');
            }

        } catch (error) {
            console.error('خطأ في تحديث الرصيد:', error);
            NotificationManager.error('حدث خطأ أثناء تحديث الرصيد');
        }
    }

    /**
     * تحديث جميع الأرصدة للسنة الجديدة
     */
    updateAllBalances() {
        const currentYear = new Date().getFullYear();

        ModalManager.confirm(
            'تحديث جميع الأرصدة',
            `هل أنت متأكد من تحديث أرصدة جميع الموظفين للسنة ${currentYear}؟\nسيتم إنشاء أرصدة جديدة للموظفين الذين لا يملكون رصيد لهذه السنة.`,
            () => {
                this.performBulkBalanceUpdate(currentYear);
            }
        );
    }

    /**
     * تنفيذ تحديث جماعي للأرصدة
     * @param {number} year - السنة
     */
    performBulkBalanceUpdate(year) {
        try {
            const employees = storage.get('employees', []);
            const settings = storage.get('settings', {});
            const leaveSettings = settings.leaves || {};

            let updatedCount = 0;
            let createdCount = 0;

            employees.forEach(employee => {
                // البحث عن رصيد موجود للموظف في هذه السنة
                const existingBalance = this.leaveBalances.find(balance =>
                    balance.employeeId === employee.id && balance.year === year
                );

                if (existingBalance) {
                    // تحديث الرصيد الموجود
                    const updatedData = {
                        annualLeaves: leaveSettings.annualLeaves || 21,
                        casualLeaves: leaveSettings.casualLeaves || 7,
                        sickLeaves: leaveSettings.sickLeaves || 30,
                        updatedAt: new Date().toISOString(),
                        updatedBy: auth.getCurrentUser().id
                    };

                    storage.updateItem('leaveBalances', existingBalance.id, updatedData);
                    updatedCount++;
                } else {
                    // إنشاء رصيد جديد
                    const newBalance = {
                        id: storage.getNextId('leave'),
                        employeeId: employee.id,
                        employeeName: employee.name,
                        annualLeaves: leaveSettings.annualLeaves || 21,
                        casualLeaves: leaveSettings.casualLeaves || 7,
                        sickLeaves: leaveSettings.sickLeaves || 30,
                        usedAnnual: 0,
                        usedCasual: 0,
                        usedSick: 0,
                        year: year,
                        createdAt: new Date().toISOString(),
                        createdBy: auth.getCurrentUser().id
                    };

                    storage.addItem('leaveBalances', newBalance);
                    createdCount++;
                }
            });

            // تحديث البيانات المحلية
            this.loadLeaveBalances();
            this.updateLeaveStats();
            this.updateYearFilter();
            this.renderLeaveBalancesTable();

            NotificationManager.success(
                `تم تحديث الأرصدة بنجاح. تم تحديث ${updatedCount} رصيد وإنشاء ${createdCount} رصيد جديد.`
            );

            // تسجيل النشاط
            auth.logActivity('bulk_balance_update',
                `تحديث جماعي للأرصدة للسنة ${year}: ${updatedCount} محدث، ${createdCount} جديد`);

        } catch (error) {
            console.error('خطأ في التحديث الجماعي:', error);
            NotificationManager.error('حدث خطأ أثناء تحديث الأرصدة');
        }
    }

    /**
     * عرض تاريخ أجازات موظف
     * @param {number} employeeId - معرف الموظف
     */
    viewLeaveHistory(employeeId) {
        const employee = storage.get('employees', []).find(emp => emp.id === employeeId);
        if (!employee) {
            NotificationManager.error('الموظف غير موجود');
            return;
        }

        // التنقل إلى صفحة تسجيل الأجازات مع فلتر الموظف
        navigation.loadPage('leave-registration');

        // تطبيق فلتر الموظف بعد تحميل الصفحة
        setTimeout(() => {
            const employeeFilter = document.getElementById('employeeFilter');
            if (employeeFilter) {
                employeeFilter.value = employeeId;
                employeeFilter.dispatchEvent(new Event('change'));
            }
        }, 500);
    }

    /**
     * تصدير أرصدة الأجازات
     */
    exportLeaveBalances() {
        try {
            const filteredBalances = this.getFilteredLeaveBalances();

            if (filteredBalances.length === 0) {
                NotificationManager.warning('لا توجد بيانات للتصدير');
                return;
            }

            // تحضير البيانات للتصدير
            const exportData = filteredBalances.map(balance => ({
                'اسم الموظف': balance.employeeName,
                'السنة': balance.year,
                'الأجازات السنوية': balance.annualLeaves,
                'المستهلك من السنوية': balance.usedAnnual,
                'المتبقي من السنوية': balance.annualLeaves - balance.usedAnnual,
                'الأجازات العارضة': balance.casualLeaves,
                'المستهلك من العارضة': balance.usedCasual,
                'المتبقي من العارضة': balance.casualLeaves - balance.usedCasual,
                'الأجازات المرضية': balance.sickLeaves,
                'المستهلك من المرضية': balance.usedSick,
                'المتبقي من المرضية': balance.sickLeaves - balance.usedSick,
                'تاريخ الإنشاء': Utils.formatDate(balance.createdAt, 'datetime')
            }));

            // تحويل إلى CSV
            const csvContent = this.convertToCSV(exportData);

            // تحميل الملف
            const filename = `leave_balances_${new Date().toISOString().split('T')[0]}.csv`;
            Utils.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');

            NotificationManager.success('تم تصدير البيانات بنجاح');

            // تسجيل النشاط
            auth.logActivity('leave_balances_export', `تم تصدير أرصدة ${filteredBalances.length} موظف`);

        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            NotificationManager.error('حدث خطأ أثناء تصدير البيانات');
        }
    }

    /**
     * عرض صفحة تسجيل الأجازات
     */
    renderLeaveRegistrationPage() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="leave-registration-container">
                <!-- رأس الصفحة -->
                <div class="page-header d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2><i class="fas fa-calendar-plus"></i> تسجيل الأجازات</h2>
                        <p>تسجيل ومتابعة جميع أنواع الأجازات</p>
                    </div>
                    <button id="addLeaveBtn" class="neu-btn neu-btn-primary">
                        <i class="fas fa-plus"></i>
                        تسجيل إجازة جديدة
                    </button>
                </div>

                <!-- شريط البحث والفلترة -->
                <div class="search-filter-bar neu-card mb-4">
                    <div class="form-row">
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">البحث</label>
                                <input type="text" id="leaveSearch" class="neu-input"
                                       placeholder="البحث بالاسم...">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">الموظف</label>
                                <select id="employeeFilter" class="neu-select">
                                    <option value="">جميع الموظفين</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">نوع الأجازة</label>
                                <select id="leaveTypeFilter" class="neu-select">
                                    <option value="">جميع الأنواع</option>
                                    <option value="annual">اعتيادية</option>
                                    <option value="casual">عارضة</option>
                                    <option value="sick">مرضية</option>
                                    <option value="unpaid">بدون أجر</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">الحالة</label>
                                <select id="statusFilter" class="neu-select">
                                    <option value="">جميع الحالات</option>
                                    <option value="approved">موافق عليها</option>
                                    <option value="pending">في الانتظار</option>
                                    <option value="rejected">مرفوضة</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- جدول الأجازات -->
                <div class="leaves-table-container neu-card">
                    <div class="table-header d-flex justify-content-between align-items-center mb-3">
                        <h4>سجل الأجازات (<span id="leaveCount">0</span>)</h4>
                        <div class="table-actions">
                            <button id="exportLeavesBtn" class="neu-btn neu-btn-small">
                                <i class="fas fa-download"></i>
                                تصدير
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="neu-table" id="leavesTable">
                            <thead>
                                <tr>
                                    <th>اسم الموظف</th>
                                    <th>نوع الأجازة</th>
                                    <th>تاريخ البداية</th>
                                    <th>تاريخ النهاية</th>
                                    <th>عدد الأيام</th>
                                    <th>الحالة</th>
                                    <th>تاريخ التسجيل</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody id="leavesTableBody">
                                <!-- سيتم تحميل البيانات هنا -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- نافذة إضافة/تعديل إجازة -->
            <div id="leaveModal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3 id="leaveModalTitle">تسجيل إجازة جديدة</h3>
                    </div>
                    <div class="modal-body">
                        <form id="leaveForm">
                            <div class="form-group">
                                <label class="form-label required">الموظف</label>
                                <select id="leaveEmployee" class="neu-select" required>
                                    <option value="">اختر الموظف</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label class="form-label required">نوع الأجازة</label>
                                <select id="leaveType" class="neu-select" required>
                                    <option value="">اختر نوع الأجازة</option>
                                    <option value="annual">اعتيادية</option>
                                    <option value="casual">عارضة</option>
                                    <option value="sick">مرضية</option>
                                    <option value="unpaid">بدون أجر</option>
                                </select>
                            </div>
                            <div class="form-row">
                                <div class="form-col">
                                    <div class="form-group">
                                        <label class="form-label required">تاريخ البداية</label>
                                        <input type="date" id="leaveStartDate" class="neu-input" required>
                                    </div>
                                </div>
                                <div class="form-col">
                                    <div class="form-group">
                                        <label class="form-label required">تاريخ النهاية</label>
                                        <input type="date" id="leaveEndDate" class="neu-input" required>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">عدد الأيام</label>
                                <input type="number" id="leaveDays" class="neu-input" readonly>
                            </div>
                            <div class="form-group">
                                <label class="form-label">ملاحظات</label>
                                <textarea id="leaveNotes" class="neu-input" rows="3"
                                          placeholder="ملاحظات إضافية (اختياري)..."></textarea>
                            </div>
                            <div id="leaveBalanceInfo" class="neu-inset" style="display: none;">
                                <!-- سيتم عرض معلومات الرصيد هنا -->
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" form="leaveForm" class="neu-btn neu-btn-primary">
                            <i class="fas fa-save"></i>
                            حفظ الإجازة
                        </button>
                        <button type="button" id="cancelLeaveBtn" class="neu-btn">
                            <i class="fas fa-times"></i>
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.updateEmployeeFilters();
        this.renderLeavesTable();
    }

    /**
     * إعداد مستمعي أحداث صفحة تسجيل الأجازات
     */
    setupLeaveRegistrationEventListeners() {
        // زر إضافة إجازة جديدة
        document.getElementById('addLeaveBtn')?.addEventListener('click', () => {
            this.showLeaveModal();
        });

        // البحث والفلاتر
        document.getElementById('leaveSearch')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderLeavesTable();
        });

        ['employeeFilter', 'leaveTypeFilter', 'statusFilter'].forEach(filterId => {
            document.getElementById(filterId)?.addEventListener('change', () => {
                this.renderLeavesTable();
            });
        });

        // نموذج الإجازة
        document.getElementById('leaveForm')?.addEventListener('submit', (e) => {
            this.handleLeaveSubmit(e);
        });

        // إلغاء نموذج الإجازة
        document.getElementById('cancelLeaveBtn')?.addEventListener('click', () => {
            this.hideLeaveModal();
        });

        // حساب عدد الأيام تلقائياً
        ['leaveStartDate', 'leaveEndDate'].forEach(fieldId => {
            document.getElementById(fieldId)?.addEventListener('change', () => {
                this.calculateLeaveDays();
            });
        });

        // عرض معلومات الرصيد عند اختيار الموظف ونوع الإجازة
        ['leaveEmployee', 'leaveType'].forEach(fieldId => {
            document.getElementById(fieldId)?.addEventListener('change', () => {
                this.updateLeaveBalanceInfo();
            });
        });

        // تصدير البيانات
        document.getElementById('exportLeavesBtn')?.addEventListener('click', () => {
            this.exportLeaves();
        });
    }

    /**
     * تحويل البيانات إلى CSV
     * @param {Array} data - البيانات
     * @returns {string} محتوى CSV
     */
    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = Object.keys(data[0]);
        const csvRows = [];

        // إضافة الرؤوس
        csvRows.push(headers.join(','));

        // إضافة البيانات
        data.forEach(row => {
            const values = headers.map(header => {
                const value = row[header] || '';
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });

        return '\ufeff' + csvRows.join('\n');
    }
}

// إنشاء مثيل عام من مدير الأجازات
const leaveManager = new LeaveManager();
