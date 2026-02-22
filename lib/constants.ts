// App Constants

// Attendance Status Values
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  LATE: 'late',
  EXCUSED: 'excused',
} as const;

// User Roles
export const USER_ROLES = {
  FACULTY: 'faculty',
  STUDENT: 'student',
  ADMIN: 'admin',
} as const;

// QR Code Settings
export const QR_CODE_VALIDITY_MINUTES = 10;
export const QR_CODE_SIZE = 300;

// Offline Sync Settings
export const SYNC_QUEUE_KEY = 'attendance_sync_queue';
export const MAX_OFFLINE_DAYS = 30;

// Date Settings
export const MAX_PAST_DAYS = 90;

// Attendance Percentage Thresholds
export const ATTENDANCE_THRESHOLDS = {
  EXCELLENT: 80,
  GOOD: 60,
} as const;

// Status Colors (matching theme)
export const STATUS_COLORS = {
  present: '#10B981',  // Green
  absent: '#EF4444',   // Red
  late: '#F59E0B',     // Amber
  excused: '#6B7280',  // Gray
} as const;

export type AttendanceStatus = typeof ATTENDANCE_STATUS[keyof typeof ATTENDANCE_STATUS];
export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
