/**
 * بيانات الحضور والانصراف الافتراضية
 */

// بيانات تجريبية للحضور والانصراف
const attendanceRecords = [
  {
    id: '1',
    employeeId: '1',
    employeeName: 'أحمد محمد السعيد',
    date: '2023-10-01',
    time: '09:00',
    type: 'check-in',
    notes: 'حضور في الموعد المحدد',
    timestamp: '2023-10-01T09:00:00.000Z',
    createdAt: '2023-10-01T09:00:00.000Z'
  },
  {
    id: '2',
    employeeId: '1',
    employeeName: 'أحمد محمد السعيد',
    date: '2023-10-01',
    time: '17:15',
    type: 'check-out',
    notes: 'انصراف متأخر قليلاً',
    timestamp: '2023-10-01T17:15:00.000Z',
    createdAt: '2023-10-01T17:15:00.000Z'
  },
  {
    id: '3',
    employeeId: '2',
    employeeName: 'فاطمة علي الحسن',
    date: '2023-10-01',
    time: '08:45',
    type: 'check-in',
    notes: 'حضور مبكر',
    timestamp: '2023-10-01T08:45:00.000Z',
    createdAt: '2023-10-01T08:45:00.000Z'
  },
  {
    id: '4',
    employeeId: '2',
    employeeName: 'فاطمة علي الحسن',
    date: '2023-10-01',
    time: '17:00',
    type: 'check-out',
    notes: 'انصراف في الموعد المحدد',
    timestamp: '2023-10-01T17:00:00.000Z',
    createdAt: '2023-10-01T17:00:00.000Z'
  },
  {
    id: '5',
    employeeId: '3',
    employeeName: 'عبدالله محمد الشمري',
    date: '2023-10-01',
    time: '09:30',
    type: 'check-in',
    notes: 'حضور متأخر',
    timestamp: '2023-10-01T09:30:00.000Z',
    createdAt: '2023-10-01T09:30:00.000Z'
  },
  {
    id: '6',
    employeeId: '3',
    employeeName: 'عبدالله محمد الشمري',
    date: '2023-10-01',
    time: '17:30',
    type: 'check-out',
    notes: 'انصراف متأخر',
    timestamp: '2023-10-01T17:30:00.000Z',
    createdAt: '2023-10-01T17:30:00.000Z'
  },
  {
    id: '7',
    employeeId: '4',
    employeeName: 'سارة أحمد العتيبي',
    date: '2023-10-01',
    time: '09:15',
    type: 'check-in',
    notes: 'حضور متأخر قليلاً',
    timestamp: '2023-10-01T09:15:00.000Z',
    createdAt: '2023-10-01T09:15:00.000Z'
  },
  {
    id: '8',
    employeeId: '4',
    employeeName: 'سارة أحمد العتيبي',
    date: '2023-10-01',
    time: '17:05',
    type: 'check-out',
    notes: 'انصراف متأخر قليلاً',
    timestamp: '2023-10-01T17:05:00.000Z',
    createdAt: '2023-10-01T17:05:00.000Z'
  },
  {
    id: '9',
    employeeId: '5',
    employeeName: 'محمد خالد الجهني',
    date: '2023-10-01',
    time: '08:55',
    type: 'check-in',
    notes: 'حضور في الموعد المحدد',
    timestamp: '2023-10-01T08:55:00.000Z',
    createdAt: '2023-10-01T08:55:00.000Z'
  },
  {
    id: '10',
    employeeId: '5',
    employeeName: 'محمد خالد الجهني',
    date: '2023-10-01',
    time: '17:10',
    type: 'check-out',
    notes: 'انصراف متأخر قليلاً',
    timestamp: '2023-10-01T17:10:00.000Z',
    createdAt: '2023-10-01T17:10:00.000Z'
  },
  {
    id: '11',
    employeeId: '1',
    employeeName: 'أحمد محمد السعيد',
    date: '2023-10-02',
    time: '09:05',
    type: 'check-in',
    notes: 'حضور متأخر قليلاً',
    timestamp: '2023-10-02T09:05:00.000Z',
    createdAt: '2023-10-02T09:05:00.000Z'
  },
  {
    id: '12',
    employeeId: '2',
    employeeName: 'فاطمة علي الحسن',
    date: '2023-10-02',
    time: '08:50',
    type: 'check-in',
    notes: 'حضور مبكر',
    timestamp: '2023-10-02T08:50:00.000Z',
    createdAt: '2023-10-02T08:50:00.000Z'
  }
];

// تصدير بيانات الحضور والانصراف
module.exports = attendanceRecords;
