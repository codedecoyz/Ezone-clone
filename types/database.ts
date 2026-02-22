// Database Types for Supabase Tables

export interface User {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'faculty' | 'student';
  created_at: string;
  updated_at: string;
}

export interface Faculty {
  id: string; // References users.id
  employee_id: string;
  department: string;
  phone?: string;
  created_at: string;
}

export interface Student {
  id: string; // References users.id
  roll_number: string;
  enrollment_year: number;
  semester: number;
  department: string;
  phone?: string;
  created_at: string;
}

export interface Subject {
  id: string;
  subject_code: string;
  subject_name: string;
  faculty_id?: string;
  semester: number;
  department: string;
  schedule?: string;
  count_late_as_present: boolean;
  created_at: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  subject_id: string;
  enrolled_at: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  subject_id: string;
  date: string; // Date in YYYY-MM-DD format
  status: 'present' | 'absent' | 'late' | 'excused';
  marked_by?: string; // Faculty ID
  marked_at: string;
  notes?: string;
}

export interface QRSession {
  id: string;
  subject_id: string;
  faculty_id: string;
  session_token: string;
  date: string; // Date in YYYY-MM-DD format
  valid_until: string; // ISO timestamp
  created_at: string;
}

// Extended types with joined data
export interface SubjectWithStats extends Subject {
  students_count?: number;
  average_attendance?: number;
  faculty_name?: string;
}

export interface StudentWithAttendance extends Student {
  full_name: string;
  email: string;
  present_count?: number;
  absent_count?: number;
  late_count?: number;
  excused_count?: number;
  total_classes?: number;
  attendance_percentage?: number;
}

export interface AttendanceWithStudent extends AttendanceRecord {
  student_name: string;
  roll_number: string;
}

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
}
