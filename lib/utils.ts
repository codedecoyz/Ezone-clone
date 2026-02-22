import { format, parseISO } from 'date-fns';
import { ATTENDANCE_THRESHOLDS } from './constants';

/**
 * Format date to display string
 */
export function formatDate(date: Date | string, formatStr: string = 'MMM dd, yyyy'): string {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return format(dateObj, formatStr);
}

/**
 * Get attendance percentage color based on thresholds
 */
export function getAttendanceColor(percentage: number): string {
  if (percentage >= ATTENDANCE_THRESHOLDS.EXCELLENT) return '#10B981'; // Green
  if (percentage >= ATTENDANCE_THRESHOLDS.GOOD) return '#F59E0B'; // Amber
  return '#EF4444'; // Red
}

/**
 * Calculate attendance percentage
 */
export function calculateAttendancePercentage(
  presentCount: number,
  totalClasses: number,
  lateCount: number = 0,
  countLateAsPresent: boolean = true
): number {
  if (totalClasses === 0) return 0;

  const effectivePresent = countLateAsPresent ? presentCount + lateCount : presentCount;
  return Math.round((effectivePresent / totalClasses) * 100);
}

/**
 * Get motivational message based on attendance percentage
 */
export function getMotivationalMessage(percentage: number): string {
  if (percentage >= 80) return "Keep up the great work! 🎯";
  if (percentage >= 60) return "You're doing well! Keep going 💪";
  return "Attendance needs improvement ⚠️";
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate random UUID (for QR session tokens)
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format countdown timer (MM:SS)
 */
export function formatCountdown(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Get timer color based on remaining time
 */
export function getTimerColor(remainingMs: number): string {
  if (remainingMs < 60000) return '#EF4444';     // Red < 1 min
  if (remainingMs < 300000) return '#F59E0B';    // Orange < 5 min
  return '#10B981';                              // Green >= 5 min
}
