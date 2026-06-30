import { motion, AnimatePresence } from 'framer-motion'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmText = 'تأكيد', cancelText = 'إلغاء', type = 'danger' }) {
  if (!isOpen) return null

  const colors = {
    danger:  { icon: 'fa-triangle-exclamation', iconBg: 'bg-danger-light', iconColor: 'text-danger', btn: 'bg-danger hover:bg-red-700 text-white', shadow: 'shadow-danger' },
    warning: { icon: 'fa-circle-exclamation',   iconBg: 'bg-warning-light', iconColor: 'text-warning', btn: 'bg-warning hover:bg-amber-700 text-white', shadow: 'shadow-warning' },
    info:    { icon: 'fa-circle-info',           iconBg: 'bg-info-light',    iconColor: 'text-info',    btn: 'bg-info hover:bg-sky-700 text-white', shadow: 'shadow-info' },
  }
  const c = colors[type] || colors.danger

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-3xl border border-surface-200 p-8 w-full max-w-sm mx-auto"
            style={{ boxShadow: '0 24px 48px rgba(15,23,42,0.15)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className={`w-16 h-16 rounded-2xl ${c.iconBg} flex items-center justify-center mx-auto mb-6`}>
              <i className={`fas ${c.icon} ${c.iconColor} text-2xl`}></i>
            </div>

            {/* Text */}
            <h3 className="text-xl font-black text-surface-900 text-center mb-3 tracking-tight">
              {title || 'تأكيد الإجراء'}
            </h3>
            <p className="text-surface-500 font-medium text-center leading-relaxed mb-8">
              {message || 'هل أنت متأكد من تنفيذ هذا الإجراء؟'}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-3 rounded-xl font-black text-sm bg-surface-100 text-surface-700
                           border border-surface-200 hover:bg-surface-200 transition-all duration-200"
              >
                {cancelText}
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { onConfirm(); onClose() }}
                className={`flex-1 py-3 rounded-xl font-black text-sm ${c.btn} transition-all duration-200`}
                style={{ boxShadow: type === 'danger' ? '0 4px 12px rgba(225,29,72,0.2)' : undefined }}
              >
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
