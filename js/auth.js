/**
 * نظام المصادقة وإدارة المستخدمين
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionKey = 'current_session';
        this.init();
    }

    /**
     * تهيئة نظام المصادقة
     */
    init() {
        // التحقق من وجود جلسة نشطة
        const session = storage.get(this.sessionKey);
        if (session && this.isValidSession(session)) {
            this.currentUser = session.user;
            this.showMainApp();
        } else {
            this.showLoginScreen();
        }
    }

    /**
     * التحقق من صحة الجلسة
     * @param {Object} session - بيانات الجلسة
     * @returns {boolean} صحيحة أم لا
     */
    isValidSession(session) {
        if (!session || !session.user || !session.expiresAt) {
            return false;
        }
        
        const now = new Date().getTime();
        return now < session.expiresAt;
    }

    /**
     * تسجيل الدخول
     * @param {string} username - اسم المستخدم
     * @param {string} password - كلمة المرور
     * @returns {Object} نتيجة تسجيل الدخول
     */
    login(username, password) {
        try {
            // التحقق من صحة البيانات
            if (!username || !password) {
                return {
                    success: false,
                    message: 'يرجى إدخال اسم المستخدم وكلمة المرور'
                };
            }

            // البحث عن المستخدم
            const users = storage.get('users', []);
            const user = users.find(u => 
                u.username.toLowerCase() === username.toLowerCase() && 
                u.password === password
            );

            if (!user) {
                return {
                    success: false,
                    message: 'اسم المستخدم أو كلمة المرور غير صحيحة'
                };
            }

            // إنشاء جلسة جديدة
            const session = {
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    role: user.role,
                    email: user.email
                },
                loginTime: new Date().toISOString(),
                expiresAt: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 ساعة
            };

            // حفظ الجلسة
            storage.set(this.sessionKey, session);
            this.currentUser = session.user;

            // تسجيل عملية تسجيل الدخول
            this.logActivity('login', 'تسجيل دخول ناجح');

            return {
                success: true,
                message: 'تم تسجيل الدخول بنجاح',
                user: this.currentUser
            };

        } catch (error) {
            console.error('خطأ في تسجيل الدخول:', error);
            return {
                success: false,
                message: 'حدث خطأ أثناء تسجيل الدخول'
            };
        }
    }

    /**
     * تسجيل الخروج
     */
    logout() {
        try {
            // تسجيل عملية تسجيل الخروج
            this.logActivity('logout', 'تسجيل خروج');

            // مسح الجلسة
            storage.remove(this.sessionKey);
            this.currentUser = null;

            // إظهار شاشة تسجيل الدخول
            this.showLoginScreen();

            // إظهار رسالة تأكيد
            NotificationManager.show('تم تسجيل الخروج بنجاح', 'info');

        } catch (error) {
            console.error('خطأ في تسجيل الخروج:', error);
        }
    }

    /**
     * التحقق من تسجيل الدخول
     * @returns {boolean} مسجل دخول أم لا
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }

    /**
     * الحصول على المستخدم الحالي
     * @returns {Object|null} بيانات المستخدم
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * التحقق من الصلاحيات
     * @param {string} permission - الصلاحية المطلوبة
     * @returns {boolean} يملك الصلاحية أم لا
     */
    hasPermission(permission) {
        if (!this.currentUser) return false;
        
        // المدير يملك جميع الصلاحيات
        if (this.currentUser.role === 'admin') return true;
        
        // تحديد الصلاحيات حسب الدور
        const permissions = {
            'hr_manager': [
                'view_employees', 'add_employee', 'edit_employee', 'delete_employee',
                'view_attendance', 'edit_attendance',
                'view_leaves', 'add_leave', 'edit_leave', 'delete_leave',
                'view_reports', 'export_reports',
                'view_devices', 'add_device', 'edit_device'
            ],
            'employee': [
                'view_own_data', 'view_own_attendance', 'view_own_leaves', 'request_leave'
            ]
        };
        
        const userPermissions = permissions[this.currentUser.role] || [];
        return userPermissions.includes(permission);
    }

    /**
     * إظهار شاشة تسجيل الدخول
     */
    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        
        // تركيز على حقل اسم المستخدم
        setTimeout(() => {
            const usernameField = document.getElementById('username');
            if (usernameField) usernameField.focus();
        }, 100);
    }

    /**
     * إظهار التطبيق الرئيسي
     */
    showMainApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'flex';
        
        // تحديث اسم المستخدم في الشريط العلوي
        const currentUserElement = document.getElementById('currentUser');
        if (currentUserElement && this.currentUser) {
            currentUserElement.textContent = this.currentUser.name;
        }
        
        // تحديث الوقت
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 60000); // كل دقيقة
    }

    /**
     * تحديث الوقت الحالي
     */
    updateCurrentTime() {
        const timeElement = document.getElementById('currentTime');
        if (timeElement) {
            timeElement.textContent = Utils.getCurrentTime();
        }
    }

    /**
     * تسجيل النشاطات
     * @param {string} action - نوع النشاط
     * @param {string} description - وصف النشاط
     */
    logActivity(action, description) {
        try {
            const activities = storage.get('activities', []);
            const activity = {
                id: storage.getNextId('activity'),
                userId: this.currentUser ? this.currentUser.id : null,
                username: this.currentUser ? this.currentUser.username : 'غير معروف',
                action: action,
                description: description,
                timestamp: new Date().toISOString(),
                ip: 'localhost', // في التطبيق الحقيقي يمكن الحصول على IP الحقيقي
                userAgent: navigator.userAgent
            };
            
            activities.push(activity);
            
            // الاحتفاظ بآخر 1000 نشاط فقط
            if (activities.length > 1000) {
                activities.splice(0, activities.length - 1000);
            }
            
            storage.set('activities', activities);
        } catch (error) {
            console.error('خطأ في تسجيل النشاط:', error);
        }
    }

    /**
     * تغيير كلمة المرور
     * @param {string} oldPassword - كلمة المرور القديمة
     * @param {string} newPassword - كلمة المرور الجديدة
     * @returns {Object} نتيجة العملية
     */
    changePassword(oldPassword, newPassword) {
        try {
            if (!this.currentUser) {
                return {
                    success: false,
                    message: 'يجب تسجيل الدخول أولاً'
                };
            }

            // التحقق من كلمة المرور القديمة
            const users = storage.get('users', []);
            const user = users.find(u => u.id === this.currentUser.id);
            
            if (!user || user.password !== oldPassword) {
                return {
                    success: false,
                    message: 'كلمة المرور القديمة غير صحيحة'
                };
            }

            // التحقق من قوة كلمة المرور الجديدة
            if (newPassword.length < 6) {
                return {
                    success: false,
                    message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'
                };
            }

            // تحديث كلمة المرور
            const success = storage.updateItem('users', user.id, { password: newPassword });
            
            if (success) {
                this.logActivity('password_change', 'تم تغيير كلمة المرور');
                return {
                    success: true,
                    message: 'تم تغيير كلمة المرور بنجاح'
                };
            } else {
                return {
                    success: false,
                    message: 'فشل في تغيير كلمة المرور'
                };
            }

        } catch (error) {
            console.error('خطأ في تغيير كلمة المرور:', error);
            return {
                success: false,
                message: 'حدث خطأ أثناء تغيير كلمة المرور'
            };
        }
    }

    /**
     * إضافة مستخدم جديد (للمدير فقط)
     * @param {Object} userData - بيانات المستخدم
     * @returns {Object} نتيجة العملية
     */
    addUser(userData) {
        try {
            // التحقق من الصلاحيات
            if (!this.hasPermission('manage_users')) {
                return {
                    success: false,
                    message: 'ليس لديك صلاحية لإضافة مستخدمين'
                };
            }

            // التحقق من البيانات المطلوبة
            if (!userData.username || !userData.password || !userData.name) {
                return {
                    success: false,
                    message: 'يرجى إدخال جميع البيانات المطلوبة'
                };
            }

            // التحقق من عدم تكرار اسم المستخدم
            const users = storage.get('users', []);
            const existingUser = users.find(u => u.username.toLowerCase() === userData.username.toLowerCase());
            
            if (existingUser) {
                return {
                    success: false,
                    message: 'اسم المستخدم موجود بالفعل'
                };
            }

            // إنشاء المستخدم الجديد
            const newUser = {
                id: storage.getNextId('user'),
                username: userData.username.toLowerCase(),
                password: userData.password,
                name: Utils.cleanText(userData.name),
                role: userData.role || 'employee',
                email: userData.email || '',
                createdAt: new Date().toISOString(),
                createdBy: this.currentUser.id
            };

            // حفظ المستخدم
            const success = storage.addItem('users', newUser);
            
            if (success) {
                this.logActivity('user_add', `تم إضافة مستخدم جديد: ${newUser.name}`);
                return {
                    success: true,
                    message: 'تم إضافة المستخدم بنجاح',
                    user: newUser
                };
            } else {
                return {
                    success: false,
                    message: 'فشل في إضافة المستخدم'
                };
            }

        } catch (error) {
            console.error('خطأ في إضافة المستخدم:', error);
            return {
                success: false,
                message: 'حدث خطأ أثناء إضافة المستخدم'
            };
        }
    }
}

// إنشاء مثيل عام من مدير المصادقة
const auth = new AuthManager();
