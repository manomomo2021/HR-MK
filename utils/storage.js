/**
 * نظام تخزين مؤقت للحضور والانصراف
 * يعتمد على الذاكرة (In-Memory) ويصلح للاستخدام في التطوير أو كـ Cache داخلي
 * @author 
 */

class MemoryStorage {
  constructor() {
    this._storage = new Map()
    console.log("✅ MemoryStorage initialized")
  }

  /**
   * جلب البيانات من التخزين
   * @param {string} key - المفتاح
   * @param {*} [defaultValue=null] - القيمة الافتراضية إذا لم يوجد المفتاح
   * @returns {*} القيمة المخزنة أو القيمة الافتراضية
   */
  get(key, defaultValue = null) {
    if (this._storage.has(key)) {
      const value = this._storage.get(key).value
      console.log(`📥 [GET] المفتاح: ${key}`, value)
      return value
    }
    console.warn(`⚠️ [MISS] المفتاح: ${key} غير موجود. إرجاع القيمة الافتراضية.`)
    return defaultValue
  }

  /**
   * حفظ البيانات في التخزين
   * @param {string} key - المفتاح
   * @param {*} value - القيمة المراد تخزينها
   */
  set(key, value) {
    this._storage.set(key, { value, updatedAt: new Date() })
    console.log(`💾 [SET] المفتاح: ${key}`, value)
  }

  /**
   * إضافة عنصر إلى Array مخزن
   * @param {string} key - المفتاح
   * @param {*} item - العنصر المراد إضافته
   */
  addToArray(key, item) {
    const arr = this.get(key, [])
    if (!Array.isArray(arr)) {
      throw new Error(`❌ المفتاح ${key} لا يحتوي على Array`)
    }
    arr.push(item)
    this.set(key, arr)
    console.log(`➕ [PUSH] تمت إضافة عنصر جديد للمفتاح: ${key}`, item)
  }

  /**
   * حذف البيانات من التخزين
   * @param {string} key - المفتاح
   */
  remove(key) {
    if (this._storage.has(key)) {
      this._storage.delete(key)
      console.log(`🗑️ [REMOVE] تم حذف المفتاح: ${key}`)
    } else {
      console.warn(`⚠️ [REMOVE] المفتاح ${key} غير موجود`)
    }
  }

  /**
   * مسح جميع البيانات
   */
  clear() {
    this._storage.clear()
    console.log("🧹 [CLEAR] تم مسح جميع البيانات")
  }

  /**
   * التحقق من وجود مفتاح
   * @param {string} key 
   * @returns {boolean}
   */
  has(key) {
    return this._storage.has(key)
  }

  /**
   * حجم التخزين (عدد المفاتيح)
   * @returns {number}
   */
  size() {
    return this._storage.size
  }

  /**
   * جلب جميع المفاتيح
   * @returns {string[]}
   */
  keys() {
    return Array.from(this._storage.keys())
  }
}

// إنشاء نسخة واحدة فقط (Singleton)
const storage = new MemoryStorage()
export default storage
