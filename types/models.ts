// Application Models and Types

import type { AttendanceStatus, UserRole } from '../lib/constants';

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AttendanceMarkData {
  student_id: string;
  subject_id: string;
  date: string;
  status: AttendanceStatus;
  marked_by: string;
  notes?: string;
}

export interface OfflineQueueItem {
  id: string;
  type: 'attendance_mark';
  data: AttendanceMarkData;
  timestamp: string;
  synced: boolean;
  retries: number;
}

export interface OfflineSyncQueue {
  queue: OfflineQueueItem[];
}

export interface SubjectCardData {
  id: string;
  subject_code: string;
  subject_name: string;
  students_count: number;
  schedule?: string;
  attendance_percentage: number;
  faculty_name?: string;
}

export interface StudentListItemData {
  id: string;
  full_name: string;
  roll_number: string;
  status: AttendanceStatus;
  previous_status?: AttendanceStatus;
}

export interface AttendanceFormData {
  [studentId: string]: AttendanceStatus;
}

export interface QRSessionData {
  id: string;
  session_token: string;
  subject_id: string;
  subject_name: string;
  valid_until: string;
  created_at: string;
}

export interface ScannedStudent {
  student_id: string;
  name: string;
  roll_number: string;
  status: AttendanceStatus;
  time: string;
}

export interface ReportFilters {
  subject_id: string;
  start_date: string;
  end_date: string;
}

export interface AttendanceReportData {
  subject_name: string;
  subject_code: string;
  faculty_name: string;
  start_date: string;
  end_date: string;
  records: Array<{
    date: string;
    roll_number: string;
    student_name: string;
    status: AttendanceStatus;
  }>;
  summary: {
    total_classes: number;
    average_attendance: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    excused_count: number;
  };
}
