/**
 * مدير الموظفين
 * إدارة بيانات الموظفين والعمليات المتعلقة بهم
 */

class EmployeeManager {
    constructor() {
        this.employees = [];
        this.currentEmployee = null;
        this.searchQuery = '';
        this.sortField = 'name';
        this.sortDirection = 'asc';
    }

    /**
     * تهيئة مدير الموظفين
     */
    init() {
        this.loadEmployees();
        this.renderEmployeesPage();
        this.setupEventListeners();
    }

    /**
     * تحميل بيانات الموظفين
     */
    loadEmployees() {
        this.employees = storage.get('employees', []);
    }

    /**
     * عرض صفحة الموظفين
     */
    renderEmployeesPage() {
        const content = document.getElementById('pageContent');
        content.innerHTML = `
            <div class="employees-container">
                <!-- رأس الصفحة -->
                <div class="page-header d-flex justify-content-between align-items-center mb-4">
                    <div>
                        <h2><i class="fas fa-users"></i> إدارة الموظفين</h2>
                        <p>إضافة وتعديل وإدارة بيانات الموظفين</p>
                    </div>
                    <button id="addEmployeeBtn" class="neu-btn neu-btn-primary">
                        <i class="fas fa-plus"></i>
                        إضافة موظف جديد
                    </button>
                </div>

                <!-- شريط البحث والفلترة -->
                <div class="search-filter-bar neu-card mb-4">
                    <div class="form-row">
                        <div class="form-col-2">
                            <div class="form-group mb-0">
                                <label class="form-label">البحث</label>
                                <input type="text" id="employeeSearch" class="neu-input" 
                                       placeholder="البحث بالاسم، الكود، أو الرقم القومي...">
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">القسم</label>
                                <select id="departmentFilter" class="neu-select">
                                    <option value="">جميع الأقسام</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">نوع العقد</label>
                                <select id="contractFilter" class="neu-select">
                                    <option value="">جميع الأنواع</option>
                                    <option value="permanent">دائم</option>
                                    <option value="temporary">مؤقت</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-col">
                            <div class="form-group mb-0">
                                <label class="form-label">&nbsp;</label>
                                <button id="clearFiltersBtn" class="neu-btn" style="width: 100%;">
                                    <i class="fas fa-times"></i>
                                    مسح الفلاتر
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- جدول الموظفين -->
                <div class="employees-table-container neu-card">
                    <div class="table-header d-flex justify-content-between align-items-center mb-3">
                        <h4>قائمة الموظفين (<span id="employeeCount">0</span>)</h4>
                        <div class="table-actions">
                            <button id="exportEmployeesBtn" class="neu-btn neu-btn-small">
                                <i class="fas fa-download"></i>
                                تصدير
                            </button>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="neu-table" id="employeesTable">
                            <thead>
                                <tr>
                                    <th data-sort="code">كود الموظف <i class="fas fa-sort"></i></th>
                                    <th data-sort="name">الاسم <i class="fas fa-sort"></i></th>
                                    <th data-sort="department">القسم <i class="fas fa-sort"></i></th>
                                    <th data-sort="position">المنصب <i class="fas fa-sort"></i></th>
                                    <th data-sort="hireDate">تاريخ التعيين <i class="fas fa-sort"></i></th>
                                    <th data-sort="contractType">نوع العقد <i class="fas fa-sort"></i></th>
                                    <th>الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody id="employeesTableBody">
                                <!-- سيتم تحميل البيانات هنا -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <!-- نافذة إضافة/تعديل موظف -->
            <div id="employeeModal" class="modal">
                <div class="modal-content" style="max-width: 800px;">
                    <div class="modal-header">
                        <h3 id="employeeModalTitle">إضافة موظف جديد</h3>
                    </div>
                    <div class="modal-body">
                        <form id="employeeForm">
                            <!-- البيانات الشخصية -->
                            <div class="form-section">
                                <h4><i class="fas fa-user"></i> البيانات الشخصية</h4>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">الاسم الكامل</label>
                                            <input type="text" id="employeeName" class="neu-input" required>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">الرقم القومي</label>
                                            <input type="text" id="employeeNationalId" class="neu-input" 
                                                   maxlength="10" pattern="[0-9]{10}" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">تاريخ الميلاد</label>
                                            <input type="date" id="employeeBirthDate" class="neu-input" required>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">العمر</label>
                                            <input type="text" id="employeeAge" class="neu-input" readonly>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">الجنس</label>
                                            <select id="employeeGender" class="neu-select" required>
                                                <option value="">اختر الجنس</option>
                                                <option value="male">ذكر</option>
                                                <option value="female">أنثى</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">الحالة الاجتماعية</label>
                                            <select id="employeeMaritalStatus" class="neu-select">
                                                <option value="">اختر الحالة</option>
                                                <option value="single">أعزب</option>
                                                <option value="married">متزوج</option>
                                                <option value="divorced">مطلق</option>
                                                <option value="widowed">أرمل</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-col-2">
                                        <div class="form-group">
                                            <label class="form-label">العنوان</label>
                                            <input type="text" id="employeeAddress" class="neu-input">
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">رقم الهاتف</label>
                                            <input type="tel" id="employeePhone" class="neu-input" required>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">البريد الإلكتروني</label>
                                            <input type="email" id="employeeEmail" class="neu-input">
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- البيانات الوظيفية -->
                            <div class="form-section">
                                <h4><i class="fas fa-briefcase"></i> البيانات الوظيفية</h4>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">القسم</label>
                                            <input type="text" id="employeeDepartment" class="neu-input" required>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">المسمى الوظيفي</label>
                                            <input type="text" id="employeePosition" class="neu-input" required>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">تاريخ التعيين</label>
                                            <input type="date" id="employeeHireDate" class="neu-input" required>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">نوع العقد</label>
                                            <select id="employeeContractType" class="neu-select" required>
                                                <option value="">اختر نوع العقد</option>
                                                <option value="permanent">دائم</option>
                                                <option value="temporary">مؤقت</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div class="form-row">
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label required">المرتب الأساسي</label>
                                            <input type="number" id="employeeBasicSalary" class="neu-input" 
                                                   min="0" step="0.01" required>
                                        </div>
                                    </div>
                                    <div class="form-col">
                                        <div class="form-group">
                                            <label class="form-label">البدلات</label>
                                            <input type="number" id="employeeAllowances" class="neu-input" 
                                                   min="0" step="0.01" value="0">
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="submit" form="employeeForm" class="neu-btn neu-btn-primary">
                            <i class="fas fa-save"></i>
                            حفظ
                        </button>
                        <button type="button" id="cancelEmployeeBtn" class="neu-btn">
                            <i class="fas fa-times"></i>
                            إلغاء
                        </button>
                    </div>
                </div>
            </div>
        `;

        // تحديث قائمة الأقسام في الفلتر
        this.updateDepartmentFilter();
        
        // عرض الموظفين
        this.renderEmployeesTable();
    }

    /**
     * إعداد مستمعي الأحداث
     */
    setupEventListeners() {
        // زر إضافة موظف جديد
        document.getElementById('addEmployeeBtn')?.addEventListener('click', () => {
            this.showEmployeeModal();
        });

        // البحث
        document.getElementById('employeeSearch')?.addEventListener('input', (e) => {
            this.searchQuery = e.target.value;
            this.renderEmployeesTable();
        });

        // فلاتر
        document.getElementById('departmentFilter')?.addEventListener('change', () => {
            this.renderEmployeesTable();
        });

        document.getElementById('contractFilter')?.addEventListener('change', () => {
            this.renderEmployeesTable();
        });

        // مسح الفلاتر
        document.getElementById('clearFiltersBtn')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // ترتيب الجدول
        document.querySelectorAll('#employeesTable th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.getAttribute('data-sort');
                this.sortEmployees(field);
            });
        });

        // نموذج الموظف
        document.getElementById('employeeForm')?.addEventListener('submit', (e) => {
            this.handleEmployeeSubmit(e);
        });

        // إلغاء نموذج الموظف
        document.getElementById('cancelEmployeeBtn')?.addEventListener('click', () => {
            this.hideEmployeeModal();
        });

        // حساب العمر تلقائياً
        document.getElementById('employeeBirthDate')?.addEventListener('change', (e) => {
            const age = Utils.calculateAge(e.target.value);
            document.getElementById('employeeAge').value = age ? `${age} سنة` : '';
        });

        // تصدير البيانات
        document.getElementById('exportEmployeesBtn')?.addEventListener('click', () => {
            this.exportEmployees();
        });
    }

    /**
     * عرض جدول الموظفين
     */
    renderEmployeesTable() {
        const tbody = document.getElementById('employeesTableBody');
        const countElement = document.getElementById('employeeCount');

        if (!tbody) return;

        // تطبيق الفلاتر والبحث
        let filteredEmployees = this.getFilteredEmployees();

        // تطبيق الترتيب
        filteredEmployees = Utils.sortArray(filteredEmployees, this.sortField, this.sortDirection);

        // تحديث العدد
        if (countElement) {
            countElement.textContent = filteredEmployees.length;
        }

        // عرض البيانات
        if (filteredEmployees.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center" style="padding: 40px;">
                        <i class="fas fa-users" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 15px;"></i>
                        <p style="color: var(--text-secondary);">لا توجد موظفين مطابقين للبحث</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = filteredEmployees.map(employee => `
            <tr>
                <td><strong>${employee.code}</strong></td>
                <td>${employee.name}</td>
                <td>${employee.department}</td>
                <td>${employee.position}</td>
                <td>${Utils.formatDate(employee.hireDate)}</td>
                <td>
                    <span class="badge ${employee.contractType === 'permanent' ? 'badge-success' : 'badge-warning'}">
                        ${employee.contractType === 'permanent' ? 'دائم' : 'مؤقت'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button onclick="employeeManager.viewEmployee(${employee.id})"
                                class="neu-btn neu-btn-small" title="عرض">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="employeeManager.editEmployee(${employee.id})"
                                class="neu-btn neu-btn-small" title="تعديل">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="employeeManager.deleteEmployee(${employee.id})"
                                class="neu-btn neu-btn-small neu-btn-danger" title="حذف">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // تحديث أيقونات الترتيب
        this.updateSortIcons();
    }

    /**
     * الحصول على الموظفين المفلترين
     * @returns {Array} قائمة الموظفين المفلترة
     */
    getFilteredEmployees() {
        let filtered = [...this.employees];

        // تطبيق البحث
        if (this.searchQuery) {
            filtered = filtered.filter(employee =>
                Utils.searchText(employee.name, this.searchQuery) ||
                Utils.searchText(employee.code, this.searchQuery) ||
                Utils.searchText(employee.nationalId, this.searchQuery) ||
                Utils.searchText(employee.department, this.searchQuery) ||
                Utils.searchText(employee.position, this.searchQuery)
            );
        }

        // تطبيق فلتر القسم
        const departmentFilter = document.getElementById('departmentFilter')?.value;
        if (departmentFilter) {
            filtered = filtered.filter(employee => employee.department === departmentFilter);
        }

        // تطبيق فلتر نوع العقد
        const contractFilter = document.getElementById('contractFilter')?.value;
        if (contractFilter) {
            filtered = filtered.filter(employee => employee.contractType === contractFilter);
        }

        return filtered;
    }

    /**
     * ترتيب الموظفين
     * @param {string} field - حقل الترتيب
     */
    sortEmployees(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        this.renderEmployeesTable();
    }

    /**
     * تحديث أيقونات الترتيب
     */
    updateSortIcons() {
        document.querySelectorAll('#employeesTable th[data-sort] i').forEach(icon => {
            icon.className = 'fas fa-sort';
        });

        const currentHeader = document.querySelector(`#employeesTable th[data-sort="${this.sortField}"] i`);
        if (currentHeader) {
            currentHeader.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'}`;
        }
    }

    /**
     * مسح الفلاتر
     */
    clearFilters() {
        document.getElementById('employeeSearch').value = '';
        document.getElementById('departmentFilter').value = '';
        document.getElementById('contractFilter').value = '';
        this.searchQuery = '';
        this.renderEmployeesTable();
    }

    /**
     * تحديث قائمة الأقسام في الفلتر
     */
    updateDepartmentFilter() {
        const departmentFilter = document.getElementById('departmentFilter');
        if (!departmentFilter) return;

        const departments = [...new Set(this.employees.map(emp => emp.department))].filter(Boolean);

        // مسح الخيارات الحالية (عدا الخيار الأول)
        departmentFilter.innerHTML = '<option value="">جميع الأقسام</option>';

        // إضافة الأقسام
        departments.forEach(dept => {
            const option = document.createElement('option');
            option.value = dept;
            option.textContent = dept;
            departmentFilter.appendChild(option);
        });
    }

    /**
     * إظهار نافذة إضافة/تعديل موظف
     * @param {Object} employee - بيانات الموظف (للتعديل)
     */
    showEmployeeModal(employee = null) {
        const modal = document.getElementById('employeeModal');
        const title = document.getElementById('employeeModalTitle');
        const form = document.getElementById('employeeForm');

        this.currentEmployee = employee;

        if (employee) {
            title.textContent = 'تعديل بيانات الموظف';
            this.fillEmployeeForm(employee);
        } else {
            title.textContent = 'إضافة موظف جديد';
            form.reset();
            // تعيين كود الموظف التلقائي
            const nextCode = this.generateEmployeeCode();
            // سيتم تعيين الكود عند الحفظ
        }

        modal.classList.add('show');
    }

    /**
     * إخفاء نافذة الموظف
     */
    hideEmployeeModal() {
        const modal = document.getElementById('employeeModal');
        modal.classList.remove('show');
        this.currentEmployee = null;
    }

    /**
     * ملء نموذج الموظف بالبيانات
     * @param {Object} employee - بيانات الموظف
     */
    fillEmployeeForm(employee) {
        document.getElementById('employeeName').value = employee.name || '';
        document.getElementById('employeeNationalId').value = employee.nationalId || '';
        document.getElementById('employeeBirthDate').value = employee.birthDate || '';
        document.getElementById('employeeAge').value = employee.birthDate ? `${Utils.calculateAge(employee.birthDate)} سنة` : '';
        document.getElementById('employeeGender').value = employee.gender || '';
        document.getElementById('employeeMaritalStatus').value = employee.maritalStatus || '';
        document.getElementById('employeeAddress').value = employee.address || '';
        document.getElementById('employeePhone').value = employee.phone || '';
        document.getElementById('employeeEmail').value = employee.email || '';
        document.getElementById('employeeDepartment').value = employee.department || '';
        document.getElementById('employeePosition').value = employee.position || '';
        document.getElementById('employeeHireDate').value = employee.hireDate || '';
        document.getElementById('employeeContractType').value = employee.contractType || '';
        document.getElementById('employeeBasicSalary').value = employee.basicSalary || '';
        document.getElementById('employeeAllowances').value = employee.allowances || 0;
    }

    /**
     * معالج إرسال نموذج الموظف
     * @param {Event} event - حدث الإرسال
     */
    handleEmployeeSubmit(event) {
        event.preventDefault();

        try {
            // جمع البيانات من النموذج
            const formData = this.getFormData();

            // التحقق من صحة البيانات
            const validation = this.validateEmployeeData(formData);
            if (!validation.isValid) {
                NotificationManager.error(validation.message);
                return;
            }

            // حفظ الموظف
            if (this.currentEmployee) {
                this.updateEmployee(formData);
            } else {
                this.addEmployee(formData);
            }

        } catch (error) {
            console.error('خطأ في حفظ الموظف:', error);
            NotificationManager.error('حدث خطأ أثناء حفظ بيانات الموظف');
        }
    }

    /**
     * جمع البيانات من النموذج
     * @returns {Object} بيانات الموظف
     */
    getFormData() {
        return {
            name: Utils.cleanText(document.getElementById('employeeName').value),
            nationalId: document.getElementById('employeeNationalId').value.trim(),
            birthDate: document.getElementById('employeeBirthDate').value,
            gender: document.getElementById('employeeGender').value,
            maritalStatus: document.getElementById('employeeMaritalStatus').value,
            address: Utils.cleanText(document.getElementById('employeeAddress').value),
            phone: document.getElementById('employeePhone').value.trim(),
            email: document.getElementById('employeeEmail').value.trim(),
            department: Utils.cleanText(document.getElementById('employeeDepartment').value),
            position: Utils.cleanText(document.getElementById('employeePosition').value),
            hireDate: document.getElementById('employeeHireDate').value,
            contractType: document.getElementById('employeeContractType').value,
            basicSalary: parseFloat(document.getElementById('employeeBasicSalary').value) || 0,
            allowances: parseFloat(document.getElementById('employeeAllowances').value) || 0
        };
    }

    /**
     * التحقق من صحة بيانات الموظف
     * @param {Object} data - بيانات الموظف
     * @returns {Object} نتيجة التحقق
     */
    validateEmployeeData(data) {
        // التحقق من الحقول المطلوبة
        if (!data.name) {
            return { isValid: false, message: 'اسم الموظف مطلوب' };
        }

        if (!data.nationalId) {
            return { isValid: false, message: 'الرقم القومي مطلوب' };
        }

        if (!Utils.isValidSaudiNationalId(data.nationalId)) {
            return { isValid: false, message: 'الرقم القومي غير صحيح' };
        }

        if (!data.birthDate) {
            return { isValid: false, message: 'تاريخ الميلاد مطلوب' };
        }

        if (!data.gender) {
            return { isValid: false, message: 'الجنس مطلوب' };
        }

        if (!data.phone) {
            return { isValid: false, message: 'رقم الهاتف مطلوب' };
        }

        if (!Utils.isValidSaudiPhone(data.phone)) {
            return { isValid: false, message: 'رقم الهاتف غير صحيح' };
        }

        if (data.email && !Utils.isValidEmail(data.email)) {
            return { isValid: false, message: 'البريد الإلكتروني غير صحيح' };
        }

        if (!data.department) {
            return { isValid: false, message: 'القسم مطلوب' };
        }

        if (!data.position) {
            return { isValid: false, message: 'المسمى الوظيفي مطلوب' };
        }

        if (!data.hireDate) {
            return { isValid: false, message: 'تاريخ التعيين مطلوب' };
        }

        if (!data.contractType) {
            return { isValid: false, message: 'نوع العقد مطلوب' };
        }

        if (data.basicSalary <= 0) {
            return { isValid: false, message: 'المرتب الأساسي يجب أن يكون أكبر من صفر' };
        }

        // التحقق من عدم تكرار الرقم القومي
        const existingEmployee = this.employees.find(emp =>
            emp.nationalId === data.nationalId &&
            (!this.currentEmployee || emp.id !== this.currentEmployee.id)
        );

        if (existingEmployee) {
            return { isValid: false, message: 'الرقم القومي موجود بالفعل لموظف آخر' };
        }

        // التحقق من عدم تكرار البريد الإلكتروني
        if (data.email) {
            const existingEmail = this.employees.find(emp =>
                emp.email === data.email &&
                (!this.currentEmployee || emp.id !== this.currentEmployee.id)
            );

            if (existingEmail) {
                return { isValid: false, message: 'البريد الإلكتروني موجود بالفعل لموظف آخر' };
            }
        }

        return { isValid: true };
    }

    /**
     * إضافة موظف جديد
     * @param {Object} data - بيانات الموظف
     */
    addEmployee(data) {
        const employee = {
            id: storage.getNextId('employee'),
            code: this.generateEmployeeCode(),
            ...data,
            devices: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const success = storage.addItem('employees', employee);

        if (success) {
            // إضافة رصيد أجازات للموظف الجديد
            this.createLeaveBalance(employee);

            // تحديث البيانات المحلية
            this.loadEmployees();
            this.updateDepartmentFilter();
            this.renderEmployeesTable();

            // إخفاء النافذة وإظهار رسالة نجاح
            this.hideEmployeeModal();
            NotificationManager.success('تم إضافة الموظف بنجاح');

            // تسجيل النشاط
            auth.logActivity('employee_add', `تم إضافة موظف جديد: ${employee.name}`);
        } else {
            NotificationManager.error('فشل في إضافة الموظف');
        }
    }

    /**
     * تحديث بيانات موظف
     * @param {Object} data - البيانات الجديدة
     */
    updateEmployee(data) {
        const updatedData = {
            ...data,
            updatedAt: new Date().toISOString()
        };

        const success = storage.updateItem('employees', this.currentEmployee.id, updatedData);

        if (success) {
            // تحديث البيانات المحلية
            this.loadEmployees();
            this.updateDepartmentFilter();
            this.renderEmployeesTable();

            // إخفاء النافذة وإظهار رسالة نجاح
            this.hideEmployeeModal();
            NotificationManager.success('تم تحديث بيانات الموظف بنجاح');

            // تسجيل النشاط
            auth.logActivity('employee_update', `تم تحديث بيانات الموظف: ${data.name}`);
        } else {
            NotificationManager.error('فشل في تحديث بيانات الموظف');
        }
    }

    /**
     * عرض تفاصيل موظف
     * @param {number} employeeId - معرف الموظف
     */
    viewEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            NotificationManager.error('الموظف غير موجود');
            return;
        }

        // يمكن إضافة نافذة منبثقة لعرض التفاصيل
        // أو التنقل إلى صفحة تفاصيل الموظف
        console.log('عرض تفاصيل الموظف:', employee);
        NotificationManager.info('ميزة عرض التفاصيل قيد التطوير');
    }

    /**
     * تعديل موظف
     * @param {number} employeeId - معرف الموظف
     */
    editEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            NotificationManager.error('الموظف غير موجود');
            return;
        }

        this.showEmployeeModal(employee);
    }

    /**
     * حذف موظف
     * @param {number} employeeId - معرف الموظف
     */
    deleteEmployee(employeeId) {
        const employee = this.employees.find(emp => emp.id === employeeId);
        if (!employee) {
            NotificationManager.error('الموظف غير موجود');
            return;
        }

        ModalManager.confirm(
            'تأكيد حذف الموظف',
            `هل أنت متأكد من حذف الموظف "${employee.name}"؟\nسيتم حذف جميع البيانات المرتبطة به.`,
            () => {
                const success = storage.deleteItem('employees', employeeId);

                if (success) {
                    // حذف البيانات المرتبطة
                    this.deleteRelatedData(employeeId);

                    // تحديث البيانات المحلية
                    this.loadEmployees();
                    this.updateDepartmentFilter();
                    this.renderEmployeesTable();

                    NotificationManager.success('تم حذف الموظف بنجاح');

                    // تسجيل النشاط
                    auth.logActivity('employee_delete', `تم حذف الموظف: ${employee.name}`);
                } else {
                    NotificationManager.error('فشل في حذف الموظف');
                }
            }
        );
    }

    /**
     * حذف البيانات المرتبطة بالموظف
     * @param {number} employeeId - معرف الموظف
     */
    deleteRelatedData(employeeId) {
        // حذف رصيد الأجازات
        const leaveBalances = storage.get('leaveBalances', []);
        const filteredBalances = leaveBalances.filter(balance => balance.employeeId !== employeeId);
        storage.set('leaveBalances', filteredBalances);

        // حذف سجلات الأجازات
        const leaves = storage.get('leaves', []);
        const filteredLeaves = leaves.filter(leave => leave.employeeId !== employeeId);
        storage.set('leaves', filteredLeaves);

        // حذف سجلات الحضور
        const attendance = storage.get('attendance', []);
        const filteredAttendance = attendance.filter(record => record.employeeId !== employeeId);
        storage.set('attendance', filteredAttendance);
    }

    /**
     * إنشاء رصيد أجازات للموظف الجديد
     * @param {Object} employee - بيانات الموظف
     */
    createLeaveBalance(employee) {
        const settings = storage.get('settings', {});
        const leaveSettings = settings.leaves || {};

        const leaveBalance = {
            id: storage.getNextId('leave'),
            employeeId: employee.id,
            employeeName: employee.name,
            annualLeaves: leaveSettings.annualLeaves || 21,
            casualLeaves: leaveSettings.casualLeaves || 7,
            sickLeaves: leaveSettings.sickLeaves || 30,
            usedAnnual: 0,
            usedCasual: 0,
            usedSick: 0,
            year: new Date().getFullYear(),
            createdAt: new Date().toISOString()
        };

        storage.addItem('leaveBalances', leaveBalance);
    }

    /**
     * توليد كود موظف جديد
     * @returns {string} كود الموظف
     */
    generateEmployeeCode() {
        const year = new Date().getFullYear().toString().slice(-2);
        const count = this.employees.length + 1;
        return `EMP${year}${count.toString().padStart(3, '0')}`;
    }

    /**
     * تصدير بيانات الموظفين
     */
    exportEmployees() {
        try {
            const filteredEmployees = this.getFilteredEmployees();

            if (filteredEmployees.length === 0) {
                NotificationManager.warning('لا توجد بيانات للتصدير');
                return;
            }

            // تحضير البيانات للتصدير
            const exportData = filteredEmployees.map(employee => ({
                'كود الموظف': employee.code,
                'الاسم': employee.name,
                'الرقم القومي': employee.nationalId,
                'تاريخ الميلاد': Utils.formatDate(employee.birthDate),
                'العمر': Utils.calculateAge(employee.birthDate),
                'الجنس': employee.gender === 'male' ? 'ذكر' : 'أنثى',
                'الحالة الاجتماعية': this.getMaritalStatusText(employee.maritalStatus),
                'العنوان': employee.address,
                'رقم الهاتف': employee.phone,
                'البريد الإلكتروني': employee.email,
                'القسم': employee.department,
                'المسمى الوظيفي': employee.position,
                'تاريخ التعيين': Utils.formatDate(employee.hireDate),
                'نوع العقد': employee.contractType === 'permanent' ? 'دائم' : 'مؤقت',
                'المرتب الأساسي': employee.basicSalary,
                'البدلات': employee.allowances,
                'إجمالي الراتب': employee.basicSalary + employee.allowances
            }));

            // تحويل إلى CSV
            const csvContent = this.convertToCSV(exportData);

            // تحميل الملف
            const filename = `employees_${new Date().toISOString().split('T')[0]}.csv`;
            Utils.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');

            NotificationManager.success('تم تصدير البيانات بنجاح');

            // تسجيل النشاط
            auth.logActivity('employees_export', `تم تصدير بيانات ${filteredEmployees.length} موظف`);

        } catch (error) {
            console.error('خطأ في تصدير البيانات:', error);
            NotificationManager.error('حدث خطأ أثناء تصدير البيانات');
        }
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
                // تنظيف القيم وإضافة علامات اقتباس إذا لزم الأمر
                return `"${value.toString().replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });

        return '\ufeff' + csvRows.join('\n'); // إضافة BOM للدعم العربي
    }

    /**
     * الحصول على نص الحالة الاجتماعية
     * @param {string} status - الحالة الاجتماعية
     * @returns {string} النص المقابل
     */
    getMaritalStatusText(status) {
        const statusMap = {
            'single': 'أعزب',
            'married': 'متزوج',
            'divorced': 'مطلق',
            'widowed': 'أرمل'
        };
        return statusMap[status] || '';
    }
}

// إنشاء مثيل عام من مدير الموظفين
const employeeManager = new EmployeeManager();
