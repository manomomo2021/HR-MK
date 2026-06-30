/**
 * مدير الإعدادات
 */

class SettingsManager {
    constructor() {
        this.settings = {};
    }

    /**
     * تهيئة مدير الإعدادات
     */
    init() {
        this.loadSettings();
        this.renderSettingsPage();
        this.setupEventListeners();
    }

    /**
     * تحميل الإعدادات
     */
    loadSettings() {
        this.settings = storage.get('settings', {});
    }

    /**
     * عرض صفحة الإعدادات
     */
    renderSettingsPage() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="settings-container">
                <!-- رأس الصفحة -->
                <div class="page-header mb-4">
                    <h2><i class="fas fa-cog"></i> إعدادات النظام</h2>
                    <p>إدارة وتخصيص إعدادات النظام العامة</p>
                </div>

                <!-- تبويبات الإعدادات -->
                <div class="settings-tabs mb-4">
                    <div class="tab-buttons neu-card">
                        <button class="tab-btn active" data-tab="company">
                            <i class="fas fa-building"></i>
                            بيانات الشركة
                        </button>
                        <button class="tab-btn" data-tab="work-hours">
                            <i class="fas fa-clock"></i>
                            ساعات العمل
                        </button>
                        <button class="tab-btn" data-tab="leaves">
                            <i class="fas fa-calendar-alt"></i>
                            إعدادات الأجازات
                        </button>
                        <button class="tab-btn" data-tab="attendance">
                            <i class="fas fa-fingerprint"></i>
                            إعدادات الحضور
                        </button>
                        <button class="tab-btn" data-tab="system">
                            <i class="fas fa-server"></i>
                            إعدادات النظام
                        </button>
                    </div>
                </div>

                <!-- محتوى التبويبات -->
                <div class="settings-content">
                    <!-- تبويب بيانات الشركة -->
                    <div id="company-tab" class="tab-content active">
                        <div class="neu-card">
                            <h4><i class="fas fa-building"></i> بيانات الشركة</h4>
                            <form id="companyForm">
                                <div class="form-group">
                                    <label class="form-label required">اسم الشركة</label>
                                    <input type="text" id="companyName" class="neu-input" required>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">العنوان</label>
                                    <textarea id="companyAddress" class="neu-input" rows="3"></textarea>
                                </div>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">رقم الهاتف</label>
                                            <input type="tel" id="companyPhone" class="neu-input">
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">البريد الإلكتروني</label>
                                            <input type="email" id="companyEmail" class="neu-input">
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">الموقع الإلكتروني</label>
                                    <input type="url" id="companyWebsite" class="neu-input">
                                </div>
                                <button type="submit" class="neu-btn neu-btn-primary">
                                    <i class="fas fa-save"></i>
                                    حفظ بيانات الشركة
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- تبويب ساعات العمل -->
                    <div id="work-hours-tab" class="tab-content">
                        <div class="neu-card">
                            <h4><i class="fas fa-clock"></i> ساعات العمل</h4>
                            <form id="workHoursForm">
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">وقت بداية العمل</label>
                                            <input type="time" id="startTime" class="neu-input" required>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">وقت نهاية العمل</label>
                                            <input type="time" id="endTime" class="neu-input" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">عدد أيام العمل في الأسبوع</label>
                                            <input type="number" id="workingDays" class="neu-input" min="1" max="7" value="5">
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">ساعات العمل اليومية</label>
                                            <input type="number" id="dailyHours" class="neu-input" min="1" max="24" step="0.5" value="8">
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">أيام الإجازة الأسبوعية</label>
                                    <div class="checkbox-group">
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="weekend-friday" value="friday">
                                            <span class="checkmark"></span>
                                            الجمعة
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="weekend-saturday" value="saturday">
                                            <span class="checkmark"></span>
                                            السبت
                                        </label>
                                        <label class="checkbox-label">
                                            <input type="checkbox" id="weekend-sunday" value="sunday">
                                            <span class="checkmark"></span>
                                            الأحد
                                        </label>
                                    </div>
                                </div>
                                <button type="submit" class="neu-btn neu-btn-primary">
                                    <i class="fas fa-save"></i>
                                    حفظ ساعات العمل
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- تبويب إعدادات الأجازات -->
                    <div id="leaves-tab" class="tab-content">
                        <div class="neu-card">
                            <h4><i class="fas fa-calendar-alt"></i> إعدادات الأجازات</h4>
                            <form id="leavesForm">
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">الأجازات السنوية (يوم)</label>
                                            <input type="number" id="annualLeaves" class="neu-input" min="0" max="365" required>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">الأجازات العارضة (يوم)</label>
                                            <input type="number" id="casualLeaves" class="neu-input" min="0" max="365" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">الأجازات المرضية (يوم)</label>
                                            <input type="number" id="sickLeaves" class="neu-input" min="0" max="365" required>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">الحد الأقصى للأجازات المتراكمة</label>
                                            <input type="number" id="maxCarryOver" class="neu-input" min="0" max="365" value="5">
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="allowNegativeBalance">
                                        <span class="checkmark"></span>
                                        السماح بالرصيد السالب للأجازات
                                    </label>
                                </div>
                                <button type="submit" class="neu-btn neu-btn-primary">
                                    <i class="fas fa-save"></i>
                                    حفظ إعدادات الأجازات
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- تبويب إعدادات الحضور -->
                    <div id="attendance-tab" class="tab-content">
                        <div class="neu-card">
                            <h4><i class="fas fa-fingerprint"></i> إعدادات الحضور</h4>
                            <form id="attendanceForm">
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">حد التأخير المسموح (دقيقة)</label>
                                            <input type="number" id="lateThreshold" class="neu-input" min="0" max="120" value="15">
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">حد الانصراف المبكر (دقيقة)</label>
                                            <input type="number" id="earlyLeaveThreshold" class="neu-input" min="0" max="120" value="15">
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">فترة المزامنة التلقائية (دقيقة)</label>
                                            <input type="number" id="syncInterval" class="neu-input" min="5" max="1440" value="60">
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">مهلة انتظار الاتصال (ثانية)</label>
                                            <input type="number" id="connectionTimeout" class="neu-input" min="5" max="300" value="30">
                                        </div>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="autoSync">
                                        <span class="checkmark"></span>
                                        تفعيل المزامنة التلقائية
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label class="checkbox-label">
                                        <input type="checkbox" id="allowManualEdit">
                                        <span class="checkmark"></span>
                                        السماح بالتعديل اليدوي لسجلات الحضور
                                    </label>
                                </div>
                                <button type="submit" class="neu-btn neu-btn-primary">
                                    <i class="fas fa-save"></i>
                                    حفظ إعدادات الحضور
                                </button>
                            </form>
                        </div>
                    </div>

                    <!-- تبويب إعدادات النظام -->
                    <div id="system-tab" class="tab-content">
                        <div class="neu-card">
                            <h4><i class="fas fa-server"></i> إعدادات النظام</h4>
                            <div class="system-info mb-4">
                                <h5>معلومات النظام</h5>
                                <div class="info-grid">
                                    <div class="info-item neu-inset">
                                        <label>إصدار النظام:</label>
                                        <span>1.0.0</span>
                                    </div>
                                    <div class="info-item neu-inset">
                                        <label>تاريخ آخر تحديث:</label>
                                        <span id="lastUpdate">-</span>
                                    </div>
                                    <div class="info-item neu-inset">
                                        <label>استخدام التخزين:</label>
                                        <span id="storageUsage">-</span>
                                    </div>
                                    <div class="info-item neu-inset">
                                        <label>عدد المستخدمين:</label>
                                        <span id="userCount">-</span>
                                    </div>
                                </div>
                            </div>
                            <div class="system-actions">
                                <h5>إجراءات النظام</h5>
                                <div class="action-buttons-grid">
                                    <button id="backupDataBtn" class="neu-btn neu-btn-success">
                                        <i class="fas fa-download"></i>
                                        إنشاء نسخة احتياطية
                                    </button>
                                    <button id="restoreDataBtn" class="neu-btn neu-btn-warning">
                                        <i class="fas fa-upload"></i>
                                        استعادة نسخة احتياطية
                                    </button>
                                    <button id="clearDataBtn" class="neu-btn neu-btn-danger">
                                        <i class="fas fa-trash-alt"></i>
                                        مسح جميع البيانات
                                    </button>
                                    <button id="resetSettingsBtn" class="neu-btn neu-btn-secondary">
                                        <i class="fas fa-undo"></i>
                                        إعادة تعيين الإعدادات
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- نافذة استعادة النسخة الاحتياطية -->
            <div id="restoreModal" class="modal">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h3>استعادة نسخة احتياطية</h3>
                    </div>
                    <div class="modal-body">
                        <div class="form-group">
                            <label class="form-label">اختر ملف النسخة الاحتياطية</label>
                            <input type="file" id="backupFile" class="neu-input" accept=".json">
                        </div>
                        <div class="alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            تحذير: سيتم استبدال جميع البيانات الحالية بالبيانات من النسخة الاحتياطية.
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button id="confirmRestoreBtn" class="neu-btn neu-btn-warning">
                            <i class="fas fa-upload"></i>
                            استعادة البيانات
                        </button>
                        <button id="cancelRestoreBtn" class="neu-btn">
                            <i class="fas fa-times"></i>
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.loadSettingsData();
        this.updateSystemInfo();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // تبديل التبويبات
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // نماذج الإعدادات
        document.getElementById('companyForm')?.addEventListener('submit', (e) => {
            this.saveCompanySettings(e);
        });

        document.getElementById('workHoursForm')?.addEventListener('submit', (e) => {
            this.saveWorkHoursSettings(e);
        });

        document.getElementById('leavesForm')?.addEventListener('submit', (e) => {
            this.saveLeavesSettings(e);
        });

        document.getElementById('attendanceForm')?.addEventListener('submit', (e) => {
            this.saveAttendanceSettings(e);
        });

        // إجراءات النظام
        document.getElementById('backupDataBtn')?.addEventListener('click', () => {
            this.createBackup();
        });

        document.getElementById('restoreDataBtn')?.addEventListener('click', () => {
            this.showRestoreModal();
        });

        document.getElementById('clearDataBtn')?.addEventListener('click', () => {
            this.clearAllData();
        });

        document.getElementById('resetSettingsBtn')?.addEventListener('click', () => {
            this.resetSettings();
        });

        // نافذة الاستعادة
        document.getElementById('confirmRestoreBtn')?.addEventListener('click', () => {
            this.restoreBackup();
        });

        document.getElementById('cancelRestoreBtn')?.addEventListener('click', () => {
            this.hideRestoreModal();
        });
    }

    /**
     * تبديل التبويبات
     * @param {string} tabName - اسم التبويب
     */
    switchTab(tabName) {
        // إزالة الفئة النشطة من جميع الأزرار والمحتوى
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

        // إضافة الفئة النشطة للتبويب المحدد
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`${tabName}-tab`).classList.add('active');
    }

    /**
     * تحميل بيانات الإعدادات في النماذج
     */
    loadSettingsData() {
        // بيانات الشركة
        const company = this.settings.company || {};
        document.getElementById('companyName').value = company.name || '';
        document.getElementById('companyAddress').value = company.address || '';
        document.getElementById('companyPhone').value = company.phone || '';
        document.getElementById('companyEmail').value = company.email || '';
        document.getElementById('companyWebsite').value = company.website || '';

        // ساعات العمل
        const workHours = this.settings.workHours || {};
        document.getElementById('startTime').value = workHours.startTime || '08:00';
        document.getElementById('endTime').value = workHours.endTime || '17:00';
        document.getElementById('workingDays').value = workHours.workingDays || 5;
        document.getElementById('dailyHours').value = workHours.dailyHours || 8;

        // أيام الإجازة الأسبوعية
        const weekends = workHours.weekends || ['friday', 'saturday'];
        weekends.forEach(day => {
            const checkbox = document.getElementById(`weekend-${day}`);
            if (checkbox) checkbox.checked = true;
        });

        // إعدادات الأجازات
        const leaves = this.settings.leaves || {};
        document.getElementById('annualLeaves').value = leaves.annualLeaves || 21;
        document.getElementById('casualLeaves').value = leaves.casualLeaves || 7;
        document.getElementById('sickLeaves').value = leaves.sickLeaves || 30;
        document.getElementById('maxCarryOver').value = leaves.maxCarryOver || 5;
        document.getElementById('allowNegativeBalance').checked = leaves.allowNegativeBalance || false;

        // إعدادات الحضور
        const attendance = this.settings.attendance || {};
        document.getElementById('lateThreshold').value = attendance.lateThreshold || 15;
        document.getElementById('earlyLeaveThreshold').value = attendance.earlyLeaveThreshold || 15;
        document.getElementById('syncInterval').value = attendance.syncInterval || 60;
        document.getElementById('connectionTimeout').value = attendance.connectionTimeout || 30;
        document.getElementById('autoSync').checked = attendance.autoSync || true;
        document.getElementById('allowManualEdit').checked = attendance.allowManualEdit || false;
    }

    /**
     * تحديث معلومات النظام
     */
    updateSystemInfo() {
        // آخر تحديث
        const lastUpdate = storage.get('lastUpdate');
        document.getElementById('lastUpdate').textContent = lastUpdate ?
            Utils.formatDate(lastUpdate, 'datetime') : 'غير محدد';

        // استخدام التخزين
        const systemInfo = app.getSystemInfo();
        const storageUsage = systemInfo.storageUsage;
        document.getElementById('storageUsage').textContent =
            `${storageUsage.percentage}% (${Math.round(storageUsage.used / 1024)} KB)`;

        // عدد المستخدمين
        const users = storage.get('users', []);
        document.getElementById('userCount').textContent = users.length;
    }

    /**
     * حفظ إعدادات الشركة
     * @param {Event} event - حدث الإرسال
     */
    saveCompanySettings(event) {
        event.preventDefault();

        try {
            const companyData = {
                name: Utils.cleanText(document.getElementById('companyName').value),
                address: Utils.cleanText(document.getElementById('companyAddress').value),
                phone: document.getElementById('companyPhone').value.trim(),
                email: document.getElementById('companyEmail').value.trim(),
                website: document.getElementById('companyWebsite').value.trim()
            };

            // التحقق من صحة البيانات
            if (!companyData.name) {
                NotificationManager.error('اسم الشركة مطلوب');
                return;
            }

            if (companyData.email && !Utils.isValidEmail(companyData.email)) {
                NotificationManager.error('البريد الإلكتروني غير صحيح');
                return;
            }

            // حفظ الإعدادات
            this.settings.company = companyData;
            this.saveSettings();

            NotificationManager.success('تم حفظ بيانات الشركة بنجاح');

            // تحديث عنوان الصفحة
            document.title = `${companyData.name} - نظام إدارة الموارد البشرية`;

        } catch (error) {
            console.error('خطأ في حفظ بيانات الشركة:', error);
            NotificationManager.error('حدث خطأ أثناء حفظ البيانات');
        }
    }

    /**
     * حفظ إعدادات ساعات العمل
     * @param {Event} event - حدث الإرسال
     */
    saveWorkHoursSettings(event) {
        event.preventDefault();

        try {
            // جمع أيام الإجازة المحددة
            const weekends = [];
            ['friday', 'saturday', 'sunday'].forEach(day => {
                const checkbox = document.getElementById(`weekend-${day}`);
                if (checkbox && checkbox.checked) {
                    weekends.push(day);
                }
            });

            const workHoursData = {
                startTime: document.getElementById('startTime').value,
                endTime: document.getElementById('endTime').value,
                workingDays: parseInt(document.getElementById('workingDays').value),
                dailyHours: parseFloat(document.getElementById('dailyHours').value),
                weekends: weekends
            };

            // التحقق من صحة البيانات
            if (!workHoursData.startTime || !workHoursData.endTime) {
                NotificationManager.error('أوقات العمل مطلوبة');
                return;
            }

            if (workHoursData.startTime >= workHoursData.endTime) {
                NotificationManager.error('وقت البداية يجب أن يكون قبل وقت النهاية');
                return;
            }

            // حفظ الإعدادات
            this.settings.workHours = workHoursData;
            this.saveSettings();

            NotificationManager.success('تم حفظ إعدادات ساعات العمل بنجاح');

        } catch (error) {
            console.error('خطأ في حفظ ساعات العمل:', error);
            NotificationManager.error('حدث خطأ أثناء حفظ البيانات');
        }
    }

    /**
     * حفظ إعدادات الأجازات
     * @param {Event} event - حدث الإرسال
     */
    saveLeavesSettings(event) {
        event.preventDefault();

        try {
            const leavesData = {
                annualLeaves: parseInt(document.getElementById('annualLeaves').value),
                casualLeaves: parseInt(document.getElementById('casualLeaves').value),
                sickLeaves: parseInt(document.getElementById('sickLeaves').value),
                maxCarryOver: parseInt(document.getElementById('maxCarryOver').value),
                allowNegativeBalance: document.getElementById('allowNegativeBalance').checked
            };

            // التحقق من صحة البيانات
            if (leavesData.annualLeaves < 0 || leavesData.casualLeaves < 0 || leavesData.sickLeaves < 0) {
                NotificationManager.error('عدد أيام الأجازات لا يمكن أن يكون سالباً');
                return;
            }

            // حفظ الإعدادات
            this.settings.leaves = leavesData;
            this.saveSettings();

            NotificationManager.success('تم حفظ إعدادات الأجازات بنجاح');

        } catch (error) {
            console.error('خطأ في حفظ إعدادات الأجازات:', error);
            NotificationManager.error('حدث خطأ أثناء حفظ البيانات');
        }
    }

    /**
     * حفظ إعدادات الحضور
     * @param {Event} event - حدث الإرسال
     */
    saveAttendanceSettings(event) {
        event.preventDefault();

        try {
            const attendanceData = {
                lateThreshold: parseInt(document.getElementById('lateThreshold').value),
                earlyLeaveThreshold: parseInt(document.getElementById('earlyLeaveThreshold').value),
                syncInterval: parseInt(document.getElementById('syncInterval').value),
                connectionTimeout: parseInt(document.getElementById('connectionTimeout').value),
                autoSync: document.getElementById('autoSync').checked,
                allowManualEdit: document.getElementById('allowManualEdit').checked
            };

            // حفظ الإعدادات
            this.settings.attendance = attendanceData;
            this.saveSettings();

            NotificationManager.success('تم حفظ إعدادات الحضور بنجاح');

        } catch (error) {
            console.error('خطأ في حفظ إعدادات الحضور:', error);
            NotificationManager.error('حدث خطأ أثناء حفظ البيانات');
        }
    }

    /**
     * حفظ الإعدادات في التخزين
     */
    saveSettings() {
        this.settings.lastUpdate = new Date().toISOString();
        storage.set('settings', this.settings);
        storage.set('lastUpdate', this.settings.lastUpdate);

        // تسجيل النشاط
        auth.logActivity('settings_update', 'تم تحديث إعدادات النظام');
    }

    /**
     * إنشاء نسخة احتياطية
     */
    createBackup() {
        try {
            const backupData = storage.createBackup();
            if (backupData) {
                const filename = `hr_backup_${new Date().toISOString().split('T')[0]}.json`;
                Utils.downloadFile(backupData, filename, 'application/json');

                NotificationManager.success('تم إنشاء النسخة الاحتياطية بنجاح');

                // تسجيل النشاط
                auth.logActivity('backup_create', 'تم إنشاء نسخة احتياطية');
            } else {
                NotificationManager.error('فشل في إنشاء النسخة الاحتياطية');
            }
        } catch (error) {
            console.error('خطأ في إنشاء النسخة الاحتياطية:', error);
            NotificationManager.error('حدث خطأ أثناء إنشاء النسخة الاحتياطية');
        }
    }

    /**
     * إظهار نافذة استعادة النسخة الاحتياطية
     */
    showRestoreModal() {
        const modal = document.getElementById('restoreModal');
        modal.classList.add('show');
    }

    /**
     * إخفاء نافذة استعادة النسخة الاحتياطية
     */
    hideRestoreModal() {
        const modal = document.getElementById('restoreModal');
        modal.classList.remove('show');
        document.getElementById('backupFile').value = '';
    }

    /**
     * استعادة النسخة الاحتياطية
     */
    async restoreBackup() {
        try {
            const fileInput = document.getElementById('backupFile');
            const file = fileInput.files[0];

            if (!file) {
                NotificationManager.error('يرجى اختيار ملف النسخة الاحتياطية');
                return;
            }

            // قراءة الملف
            const fileContent = await this.readFile(file);

            // استعادة البيانات
            const success = storage.restoreBackup(fileContent);

            if (success) {
                this.hideRestoreModal();
                NotificationManager.success('تم استعادة النسخة الاحتياطية بنجاح. سيتم إعادة تحميل الصفحة.');

                // إعادة تحميل الصفحة بعد ثانيتين
                setTimeout(() => {
                    location.reload();
                }, 2000);
            } else {
                NotificationManager.error('فشل في استعادة النسخة الاحتياطية. تأكد من صحة الملف.');
            }

        } catch (error) {
            console.error('خطأ في استعادة النسخة الاحتياطية:', error);
            NotificationManager.error('حدث خطأ أثناء استعادة النسخة الاحتياطية');
        }
    }

    /**
     * قراءة ملف
     * @param {File} file - الملف
     * @returns {Promise<string>} محتوى الملف
     */
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file);
        });
    }

    /**
     * مسح جميع البيانات
     */
    clearAllData() {
        ModalManager.confirm(
            'تأكيد مسح البيانات',
            'هل أنت متأكد من مسح جميع البيانات؟\n\nتحذير: هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع الموظفين والأجازات وسجلات الحضور.',
            () => {
                try {
                    storage.clear();
                    NotificationManager.success('تم مسح جميع البيانات. سيتم إعادة تحميل الصفحة.');

                    // إعادة تحميل الصفحة بعد ثانيتين
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                } catch (error) {
                    console.error('خطأ في مسح البيانات:', error);
                    NotificationManager.error('حدث خطأ أثناء مسح البيانات');
                }
            }
        );
    }

    /**
     * إعادة تعيين الإعدادات
     */
    resetSettings() {
        ModalManager.confirm(
            'تأكيد إعادة التعيين',
            'هل أنت متأكد من إعادة تعيين جميع الإعدادات إلى القيم الافتراضية؟',
            () => {
                try {
                    // حذف الإعدادات الحالية
                    storage.remove('settings');

                    // إعادة تهيئة الإعدادات الافتراضية
                    storage.initializeDefaultData();

                    // إعادة تحميل الإعدادات
                    this.loadSettings();
                    this.loadSettingsData();
                    this.updateSystemInfo();

                    NotificationManager.success('تم إعادة تعيين الإعدادات بنجاح');

                    // تسجيل النشاط
                    auth.logActivity('settings_reset', 'تم إعادة تعيين إعدادات النظام');
                } catch (error) {
                    console.error('خطأ في إعادة تعيين الإعدادات:', error);
                    NotificationManager.error('حدث خطأ أثناء إعادة تعيين الإعدادات');
                }
            }
        );
    }
}

// إنشاء مثيل عام من مدير الإعدادات
const settingsManager = new SettingsManager();
