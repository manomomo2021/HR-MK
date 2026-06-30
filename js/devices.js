/**
 * مدير الأجهزة الثانوية
 * إدارة أجهزة البصمة والاتصال بها
 */

class DeviceManager {
    constructor() {
        this.devices = [];
        this.currentDevice = null;
    }

    /**
     * تهيئة مدير الأجهزة
     */
    init() {
        this.loadDevices();
        this.renderDevicesPage();
        this.setupEventListeners();
    }

    /**
     * تحميل بيانات الأجهزة
     */
    loadDevices() {
        this.devices = storage.get('devices', []);
    }

    /**
     * عرض صفحة الأجهزة
     */
    renderDevicesPage() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="devices-container">
                <!-- رأس الصفحة -->
                <div class="page-header d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2><i class="fas fa-fingerprint"></i> إدارة الأجهزة الثانوية</h2>
                        <p>إدارة أجهزة البصمة والاتصال بها</p>
                    </div>
                    <button id="addDeviceBtn" class="neu-btn neu-btn-primary">
                        <i class="fas fa-plus"></i>
                        إضافة جهاز جديد
                    </button>
                </div>

                <!-- إحصائيات الأجهزة -->
                <div class="devices-stats mb-4">
                    <div class="form-row">
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-fingerprint stat-icon" style="color: var(--primary-color);"></i>
                                <h3 id="totalDevices">0</h3>
                                <p>إجمالي الأجهزة</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-check-circle stat-icon" style="color: var(--success-color);"></i>
                                <h3 id="connectedDevices">0</h3>
                                <p>الأجهزة المتصلة</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-times-circle stat-icon" style="color: var(--error-color);"></i>
                                <h3 id="disconnectedDevices">0</h3>
                                <p>الأجهزة غير المتصلة</p>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="stat-card neu-card text-center">
                                <i class="fas fa-sync-alt stat-icon" style="color: var(--info-color);"></i>
                                <button id="syncAllDevicesBtn" class="neu-btn neu-btn-small">
                                    <i class="fas fa-sync-alt"></i>
                                    مزامنة الكل
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- جدول الأجهزة -->
                <div class="devices-table-container neu-card">
                    <div class="table-header d-flex justify-content-between align-items-center mb-3">
                        <h4>قائمة الأجهزة</h4>
                        <div class="table-actions">
                            <button id="testAllConnectionsBtn" class="neu-btn neu-btn-small">
                                <i class="fas fa-network-wired"></i>
                                اختبار جميع الاتصالات
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="neu-table" id="devicesTable">
                            <thead>
                                <tr>
                                    <th>اسم الجهاز</th>
                                    <th>عنوان IP</th>
                                    <th>البورت</th>
                                    <th>حالة الاتصال</th>
                                    <th>آخر مزامنة</th>
                                    <th>عدد الموظفين</th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody id="devicesTableBody">
                                <!-- سيتم تحميل البيانات هنا -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- نافذة إضافة/تعديل جهاز -->
            <div id="deviceModal" class="modal">
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3 id="deviceModalTitle">إضافة جهاز جديد</h3>
                    </div>
                    <div class="modal-body">
                        <form id="deviceForm">
                            <div class="form-group">
                                <label class="form-label required">اسم الجهاز</label>
                                <input type="text" id="deviceName" class="neu-input" 
                                       placeholder="مثال: جهاز فرع المهندسين" required>
                            </div>
                            <div class="form-row">
                                <div class="form-col-2">
                                    <div class="form-group">
                                        <label class="form-label required">عنوان IP</label>
                                        <input type="text" id="deviceIp" class="neu-input" 
                                               placeholder="192.168.1.100" pattern="^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$" required>
                                    </div>
                                </div>
                                <div class="form-col">
                                    <div class="form-group">
                                        <label class="form-label required">البورت</label>
                                        <input type="number" id="devicePort" class="neu-input" 
                                               placeholder="4370" min="1" max="65535" required>
                                    </div>
                                </div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">الوصف</label>
                                <textarea id="deviceDescription" class="neu-input" rows="3" 
                                          placeholder="وصف اختياري للجهاز..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">الموقع</label>
                                <input type="text" id="deviceLocation" class="neu-input" 
                                       placeholder="مثال: الطابق الأول - مدخل المبنى">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" form="deviceForm" class="neu-btn neu-btn-primary">
                            <i class="fas fa-save"></i>
                            حفظ
                        </button>
                        <button type="button" id="testConnectionBtn" class="neu-btn neu-btn-warning">
                            <i class="fas fa-network-wired"></i>
                            اختبار الاتصال
                        </button>
                        <button type="button" id="cancelDeviceBtn" class="neu-btn">
                            <i class="fas fa-times"></i>
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>

            <!-- نافذة تفاصيل الجهاز -->
            <div id="deviceDetailsModal" class="modal">
                <div class="modal-content" style="max-width: 700px;">
                    <div class="modal-header">
                        <h3>تفاصيل الجهاز</h3>
                    </div>
                    <div class="modal-body">
                        <div id="deviceDetailsContent">
                            <!-- سيتم تحميل التفاصيل هنا -->
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" id="closeDetailsBtn" class="neu-btn">
                            <i class="fas fa-times"></i>
                            إغلاق
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.updateDeviceStats();
        this.renderDevicesTable();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // زر إضافة جهاز جديد
        document.getElementById('addDeviceBtn')?.addEventListener('click', () => {
            this.showDeviceModal();
        });

        // نموذج الجهاز
        document.getElementById('deviceForm')?.addEventListener('submit', (e) => {
            this.handleDeviceSubmit(e);
        });

        // إلغاء نموذج الجهاز
        document.getElementById('cancelDeviceBtn')?.addEventListener('click', () => {
            this.hideDeviceModal();
        });

        // اختبار الاتصال في النموذج
        document.getElementById('testConnectionBtn')?.addEventListener('click', () => {
            this.testConnectionFromForm();
        });

        // مزامنة جميع الأجهزة
        document.getElementById('syncAllDevicesBtn')?.addEventListener('click', () => {
            this.syncAllDevices();
        });

        // اختبار جميع الاتصالات
        document.getElementById('testAllConnectionsBtn')?.addEventListener('click', () => {
            this.testAllConnections();
        });

        // إغلاق نافذة التفاصيل
        document.getElementById('closeDetailsBtn')?.addEventListener('click', () => {
            document.getElementById('deviceDetailsModal').classList.remove('show');
        });
    }

    /**
     * تحديث إحصائيات الأجهزة
     */
    updateDeviceStats() {
        const totalDevices = this.devices.length;
        const connectedDevices = this.devices.filter(device => device.status === 'connected').length;
        const disconnectedDevices = totalDevices - connectedDevices;

        document.getElementById('totalDevices').textContent = totalDevices;
        document.getElementById('connectedDevices').textContent = connectedDevices;
        document.getElementById('disconnectedDevices').textContent = disconnectedDevices;
    }

    /**
     * عرض جدول الأجهزة
     */
    renderDevicesTable() {
        const tbody = document.getElementById('devicesTableBody');
        
        if (!tbody) return;

        if (this.devices.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 40px;">
                        <i class="fas fa-fingerprint" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
                        <p style="color: var(--text-secondary);">لا توجد أجهزة مضافة</p>
                        <button onclick="deviceManager.showDeviceModal()" class="neu-btn neu-btn-primary mt-2">
                            <i class="fas fa-plus"></i>
                            إضافة جهاز جديد
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.devices.map(device => `
            <tr>
                <td><strong>${device.name}</strong></td>
                <td><code>${device.ip}</code></td>
                <td>${device.port}</td>
                <td>
                    <span class="badge ${device.status === 'connected' ? 'badge-success' : 'badge-danger'}">
                        <i class="fas ${device.status === 'connected' ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                        ${device.status === 'connected' ? 'متصل' : 'غير متصل'}
                    </span>
                </td>
                <td>${device.lastSync ? Utils.formatDate(device.lastSync, 'datetime') : 'لم يتم'}</td>
                <td>${this.getDeviceEmployeeCount(device.id)}</td>
                <td>
                    <div class="action-buttons">
                        <button onclick="deviceManager.viewDevice(${device.id})" 
                                class="neu-btn neu-btn-small" title="عرض التفاصيل">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="deviceManager.testConnection(${device.id})" 
                                class="neu-btn neu-btn-small neu-btn-warning" title="اختبار الاتصال">
                            <i class="fas fa-network-wired"></i>
                        </button>
                        <button onclick="deviceManager.syncDevice(${device.id})" 
                                class="neu-btn neu-btn-small" title="مزامنة">
                            <i class="fas fa-sync-alt"></i>
                        </button>
                        <button onclick="deviceManager.editDevice(${device.id})" 
                                class="neu-btn neu-btn-small" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="deviceManager.deleteDevice(${device.id})" 
                                class="neu-btn neu-btn-small neu-btn-danger" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    /**
     * الحصول على عدد الموظفين المرتبطين بالجهاز
     * @param {number} deviceId - معرف الجهاز
     * @returns {number} عدد الموظفين
     */
    getDeviceEmployeeCount(deviceId) {
        const employees = storage.get('employees', []);
        return employees.filter(emp => emp.devices && emp.devices.includes(deviceId)).length;
    }

    /**
     * إظهار نافذة إضافة/تعديل جهاز
     * @param {Object} device - بيانات الجهاز (للتعديل)
     */
    showDeviceModal(device = null) {
        const modal = document.getElementById('deviceModal');
        const title = document.getElementById('deviceModalTitle');
        const form = document.getElementById('deviceForm');

        this.currentDevice = device;

        if (device) {
            title.textContent = 'تعديل بيانات الجهاز';
            this.fillDeviceForm(device);
        } else {
            title.textContent = 'إضافة جهاز جديد';
            form.reset();
            // تعيين قيم افتراضية
            document.getElementById('devicePort').value = '4370';
        }

        modal.classList.add('show');
    }

    /**
     * إخفاء نافذة الجهاز
     */
    hideDeviceModal() {
        const modal = document.getElementById('deviceModal');
        modal.classList.remove('show');
        this.currentDevice = null;
    }

    /**
     * ملء نموذج الجهاز بالبيانات
     * @param {Object} device - بيانات الجهاز
     */
    fillDeviceForm(device) {
        document.getElementById('deviceName').value = device.name || '';
        document.getElementById('deviceIp').value = device.ip || '';
        document.getElementById('devicePort').value = device.port || '';
        document.getElementById('deviceDescription').value = device.description || '';
        document.getElementById('deviceLocation').value = device.location || '';
    }

    /**
     * معالج إرسال نموذج الجهاز
     * @param {Event} event - حدث الإرسال
     */
    handleDeviceSubmit(event) {
        event.preventDefault();

        try {
            // جمع البيانات من النموذج
            const formData = this.getDeviceFormData();

            // التحقق من صحة البيانات
            const validation = this.validateDeviceData(formData);
            if (!validation.isValid) {
                NotificationManager.error(validation.message);
                return;
            }

            // حفظ الجهاز
            if (this.currentDevice) {
                this.updateDevice(formData);
            } else {
                this.addDevice(formData);
            }

        } catch (error) {
            console.error('خطأ في حفظ الجهاز:', error);
            NotificationManager.error('حدث خطأ أثناء حفظ بيانات الجهاز');
        }
    }

    /**
     * جمع البيانات من النموذج
     * @returns {Object} بيانات الجهاز
     */
    getDeviceFormData() {
        return {
            name: Utils.cleanText(document.getElementById('deviceName').value),
            ip: document.getElementById('deviceIp').value.trim(),
            port: parseInt(document.getElementById('devicePort').value),
            description: Utils.cleanText(document.getElementById('deviceDescription').value),
            location: Utils.cleanText(document.getElementById('deviceLocation').value)
        };
    }

    /**
     * التحقق من صحة بيانات الجهاز
     * @param {Object} data - بيانات الجهاز
     * @returns {Object} نتيجة التحقق
     */
    validateDeviceData(data) {
        // التحقق من الحقول المطلوبة
        if (!data.name) {
            return { isValid: false, message: 'اسم الجهاز مطلوب' };
        }

        if (!data.ip) {
            return { isValid: false, message: 'عنوان IP مطلوب' };
        }

        // التحقق من صحة عنوان IP
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (!ipRegex.test(data.ip)) {
            return { isValid: false, message: 'عنوان IP غير صحيح' };
        }

        // التحقق من صحة أجزاء IP
        const ipParts = data.ip.split('.');
        for (let part of ipParts) {
            const num = parseInt(part);
            if (num < 0 || num > 255) {
                return { isValid: false, message: 'عنوان IP غير صحيح' };
            }
        }

        if (!data.port || data.port < 1 || data.port > 65535) {
            return { isValid: false, message: 'رقم البورت يجب أن يكون بين 1 و 65535' };
        }

        // التحقق من عدم تكرار IP والبورت
        const existingDevice = this.devices.find(device =>
            device.ip === data.ip &&
            device.port === data.port &&
            (!this.currentDevice || device.id !== this.currentDevice.id)
        );

        if (existingDevice) {
            return { isValid: false, message: 'يوجد جهاز آخر بنفس عنوان IP والبورت' };
        }

        return { isValid: true };
    }

    /**
     * إضافة جهاز جديد
     * @param {Object} data - بيانات الجهاز
     */
    addDevice(data) {
        const device = {
            id: storage.getNextId('device'),
            ...data,
            status: 'disconnected',
            lastSync: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const success = storage.addItem('devices', device);

        if (success) {
            // تحديث البيانات المحلية
            this.loadDevices();
            this.updateDeviceStats();
            this.renderDevicesTable();

            // إخفاء النافذة وإظهار رسالة نجاح
            this.hideDeviceModal();
            NotificationManager.success('تم إضافة الجهاز بنجاح');

            // تسجيل النشاط
            auth.logActivity('device_add', `تم إضافة جهاز جديد: ${device.name}`);
        } else {
            NotificationManager.error('فشل في إضافة الجهاز');
        }
    }

    /**
     * تحديث بيانات جهاز
     * @param {Object} data - البيانات الجديدة
     */
    updateDevice(data) {
        const updatedData = {
            ...data,
            updatedAt: new Date().toISOString()
        };

        const success = storage.updateItem('devices', this.currentDevice.id, updatedData);

        if (success) {
            // تحديث البيانات المحلية
            this.loadDevices();
            this.updateDeviceStats();
            this.renderDevicesTable();

            // إخفاء النافذة وإظهار رسالة نجاح
            this.hideDeviceModal();
            NotificationManager.success('تم تحديث بيانات الجهاز بنجاح');

            // تسجيل النشاط
            auth.logActivity('device_update', `تم تحديث بيانات الجهاز: ${data.name}`);
        } else {
            NotificationManager.error('فشل في تحديث بيانات الجهاز');
        }
    }

    /**
     * عرض تفاصيل جهاز
     * @param {number} deviceId - معرف الجهاز
     */
    viewDevice(deviceId) {
        const device = this.devices.find(dev => dev.id === deviceId);
        if (!device) {
            NotificationManager.error('الجهاز غير موجود');
            return;
        }

        const modal = document.getElementById('deviceDetailsModal');
        const content = document.getElementById('deviceDetailsContent');

        const employeeCount = this.getDeviceEmployeeCount(deviceId);
        const employees = storage.get('employees', []).filter(emp =>
            emp.devices && emp.devices.includes(deviceId)
        );

        content.innerHTML = `
            <div class="device-details">
                <div class="form-row mb-3">
                    <div class="form-col">
                        <div class="detail-item neu-inset">
                            <label>اسم الجهاز:</label>
                            <strong>${device.name}</strong>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="detail-item neu-inset">
                            <label>حالة الاتصال:</label>
                            <span class="badge ${device.status === 'connected' ? 'badge-success' : 'badge-danger'}">
                                ${device.status === 'connected' ? 'متصل' : 'غير متصل'}
                            </span>
                        </div>
                    </div>
                </div>

                <div class="form-row mb-3">
                    <div class="form-col">
                        <div class="detail-item neu-inset">
                            <label>عنوان IP:</label>
                            <code>${device.ip}</code>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="detail-item neu-inset">
                            <label>البورت:</label>
                            <code>${device.port}</code>
                        </div>
                    </div>
                </div>

                ${device.location ? `
                <div class="detail-item neu-inset mb-3">
                    <label>الموقع:</label>
                    <span>${device.location}</span>
                </div>
                ` : ''}

                ${device.description ? `
                <div class="detail-item neu-inset mb-3">
                    <label>الوصف:</label>
                    <span>${device.description}</span>
                </div>
                ` : ''}

                <div class="form-row mb-3">
                    <div class="form-col">
                        <div class="detail-item neu-inset">
                            <label>تاريخ الإضافة:</label>
                            <span>${Utils.formatDate(device.createdAt, 'datetime')}</span>
                        </div>
                    </div>
                    <div class="form-col">
                        <div class="detail-item neu-inset">
                            <label>آخر تحديث:</label>
                            <span>${Utils.formatDate(device.updatedAt, 'datetime')}</span>
                        </div>
                    </div>
                </div>

                <div class="detail-item neu-inset mb-3">
                    <label>آخر مزامنة:</label>
                    <span>${device.lastSync ? Utils.formatDate(device.lastSync, 'datetime') : 'لم يتم'}</span>
                </div>

                <div class="detail-item neu-inset">
                    <label>الموظفين المرتبطين (${employeeCount}):</label>
                    ${employees.length > 0 ? `
                        <ul style="margin-top: 10px; padding-right: 20px;">
                            ${employees.map(emp => `<li>${emp.name} (${emp.code})</li>`).join('')}
                        </ul>
                    ` : '<p style="color: var(--text-secondary); margin-top: 10px;">لا يوجد موظفين مرتبطين</p>'}
                </div>
            </div>
        `;

        modal.classList.add('show');
    }

    /**
     * تعديل جهاز
     * @param {number} deviceId - معرف الجهاز
     */
    editDevice(deviceId) {
        const device = this.devices.find(dev => dev.id === deviceId);
        if (!device) {
            NotificationManager.error('الجهاز غير موجود');
            return;
        }

        this.showDeviceModal(device);
    }

    /**
     * حذف جهاز
     * @param {number} deviceId - معرف الجهاز
     */
    deleteDevice(deviceId) {
        const device = this.devices.find(dev => dev.id === deviceId);
        if (!device) {
            NotificationManager.error('الجهاز غير موجود');
            return;
        }

        const employeeCount = this.getDeviceEmployeeCount(deviceId);
        let confirmMessage = `هل أنت متأكد من حذف الجهاز "${device.name}"؟`;

        if (employeeCount > 0) {
            confirmMessage += `\n\nتحذير: يوجد ${employeeCount} موظف مرتبط بهذا الجهاز. سيتم إلغاء ربطهم بالجهاز.`;
        }

        ModalManager.confirm(
            'تأكيد حذف الجهاز',
            confirmMessage,
            () => {
                const success = storage.deleteItem('devices', deviceId);

                if (success) {
                    // إلغاء ربط الموظفين بالجهاز
                    this.unlinkEmployeesFromDevice(deviceId);

                    // تحديث البيانات المحلية
                    this.loadDevices();
                    this.updateDeviceStats();
                    this.renderDevicesTable();

                    NotificationManager.success('تم حذف الجهاز بنجاح');

                    // تسجيل النشاط
                    auth.logActivity('device_delete', `تم حذف الجهاز: ${device.name}`);
                } else {
                    NotificationManager.error('فشل في حذف الجهاز');
                }
            }
        );
    }

    /**
     * إلغاء ربط الموظفين بالجهاز
     * @param {number} deviceId - معرف الجهاز
     */
    unlinkEmployeesFromDevice(deviceId) {
        const employees = storage.get('employees', []);
        let updated = false;

        employees.forEach(employee => {
            if (employee.devices && employee.devices.includes(deviceId)) {
                employee.devices = employee.devices.filter(id => id !== deviceId);
                storage.updateItem('employees', employee.id, { devices: employee.devices });
                updated = true;
            }
        });

        if (updated) {
            console.log(`تم إلغاء ربط الموظفين بالجهاز ${deviceId}`);
        }
    }

    /**
     * اختبار اتصال جهاز
     * @param {number} deviceId - معرف الجهاز
     */
    async testConnection(deviceId) {
        const device = this.devices.find(dev => dev.id === deviceId);
        if (!device) {
            NotificationManager.error('الجهاز غير موجود');
            return;
        }

        NotificationManager.info('جاري اختبار الاتصال...');

        try {
            // محاكاة اختبار الاتصال
            const isConnected = await this.simulateConnectionTest(device.ip, device.port);

            // تحديث حالة الجهاز
            const newStatus = isConnected ? 'connected' : 'disconnected';
            storage.updateItem('devices', deviceId, {
                status: newStatus,
                lastConnectionTest: new Date().toISOString()
            });

            // تحديث البيانات المحلية
            this.loadDevices();
            this.updateDeviceStats();
            this.renderDevicesTable();

            if (isConnected) {
                NotificationManager.success(`الجهاز "${device.name}" متصل بنجاح`);
            } else {
                NotificationManager.error(`فشل الاتصال بالجهاز "${device.name}"`);
            }

            // تسجيل النشاط
            auth.logActivity('device_test', `اختبار اتصال الجهاز: ${device.name} - ${isConnected ? 'نجح' : 'فشل'}`);

        } catch (error) {
            console.error('خطأ في اختبار الاتصال:', error);
            NotificationManager.error('حدث خطأ أثناء اختبار الاتصال');
        }
    }

    /**
     * اختبار الاتصال من النموذج
     */
    async testConnectionFromForm() {
        const ip = document.getElementById('deviceIp').value.trim();
        const port = parseInt(document.getElementById('devicePort').value);

        if (!ip || !port) {
            NotificationManager.error('يرجى إدخال عنوان IP والبورت أولاً');
            return;
        }

        // التحقق من صحة IP
        const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
        if (!ipRegex.test(ip)) {
            NotificationManager.error('عنوان IP غير صحيح');
            return;
        }

        NotificationManager.info('جاري اختبار الاتصال...');

        try {
            const isConnected = await this.simulateConnectionTest(ip, port);

            if (isConnected) {
                NotificationManager.success('تم الاتصال بنجاح!');
            } else {
                NotificationManager.error('فشل في الاتصال');
            }

        } catch (error) {
            console.error('خطأ في اختبار الاتصال:', error);
            NotificationManager.error('حدث خطأ أثناء اختبار الاتصال');
        }
    }

    /**
     * محاكاة اختبار الاتصال
     * @param {string} ip - عنوان IP
     * @param {number} port - رقم البورت
     * @returns {Promise<boolean>} نتيجة الاختبار
     */
    async simulateConnectionTest(ip, port) {
        // محاكاة تأخير الشبكة
        await Utils.delay(1000 + Math.random() * 2000);

        // محاكاة نتيجة عشوائية (في التطبيق الحقيقي سيتم الاتصال الفعلي)
        // يمكن تحسين هذا ليتضمن ping أو محاولة اتصال TCP
        const successRate = 0.8; // 80% نسبة نجاح
        return Math.random() < successRate;
    }

    /**
     * مزامنة جهاز
     * @param {number} deviceId - معرف الجهاز
     */
    async syncDevice(deviceId) {
        const device = this.devices.find(dev => dev.id === deviceId);
        if (!device) {
            NotificationManager.error('الجهاز غير موجود');
            return;
        }

        if (device.status !== 'connected') {
            NotificationManager.error('الجهاز غير متصل. يرجى اختبار الاتصال أولاً');
            return;
        }

        NotificationManager.info('جاري مزامنة البيانات...');

        try {
            // محاكاة عملية المزامنة
            await this.simulateDeviceSync(device);

            // تحديث وقت آخر مزامنة
            storage.updateItem('devices', deviceId, {
                lastSync: new Date().toISOString()
            });

            // تحديث البيانات المحلية
            this.loadDevices();
            this.renderDevicesTable();

            NotificationManager.success(`تم مزامنة الجهاز "${device.name}" بنجاح`);

            // تسجيل النشاط
            auth.logActivity('device_sync', `مزامنة الجهاز: ${device.name}`);

        } catch (error) {
            console.error('خطأ في المزامنة:', error);
            NotificationManager.error('حدث خطأ أثناء المزامنة');
        }
    }

    /**
     * محاكاة مزامنة الجهاز
     * @param {Object} device - بيانات الجهاز
     */
    async simulateDeviceSync(device) {
        // محاكاة تأخير المزامنة
        await Utils.delay(2000 + Math.random() * 3000);

        // في التطبيق الحقيقي، هنا سيتم:
        // 1. سحب بيانات الحضور من الجهاز
        // 2. تحديث قاعدة البيانات المحلية
        // 3. إرسال بيانات الموظفين الجدد للجهاز

        console.log(`تمت مزامنة الجهاز: ${device.name}`);
    }

    /**
     * مزامنة جميع الأجهزة
     */
    async syncAllDevices() {
        const connectedDevices = this.devices.filter(device => device.status === 'connected');

        if (connectedDevices.length === 0) {
            NotificationManager.warning('لا توجد أجهزة متصلة للمزامنة');
            return;
        }

        NotificationManager.info(`جاري مزامنة ${connectedDevices.length} جهاز...`);

        try {
            // مزامنة الأجهزة بشكل متتالي
            for (const device of connectedDevices) {
                await this.syncDevice(device.id);
                await Utils.delay(500); // تأخير قصير بين الأجهزة
            }

            NotificationManager.success('تم مزامنة جميع الأجهزة بنجاح');

        } catch (error) {
            console.error('خطأ في مزامنة الأجهزة:', error);
            NotificationManager.error('حدث خطأ أثناء مزامنة الأجهزة');
        }
    }

    /**
     * اختبار جميع الاتصالات
     */
    async testAllConnections() {
        if (this.devices.length === 0) {
            NotificationManager.warning('لا توجد أجهزة لاختبار الاتصال');
            return;
        }

        NotificationManager.info(`جاري اختبار اتصال ${this.devices.length} جهاز...`);

        try {
            // اختبار الأجهزة بشكل متوازي
            const testPromises = this.devices.map(device =>
                this.testConnection(device.id)
            );

            await Promise.all(testPromises);

            const connectedCount = this.devices.filter(d => d.status === 'connected').length;
            NotificationManager.success(`تم اختبار جميع الأجهزة. ${connectedCount} من ${this.devices.length} متصل`);

        } catch (error) {
            console.error('خطأ في اختبار الاتصالات:', error);
            NotificationManager.error('حدث خطأ أثناء اختبار الاتصالات');
        }
    }
}

// إنشاء مثيل عام من مدير الأجهزة
const deviceManager = new DeviceManager();
