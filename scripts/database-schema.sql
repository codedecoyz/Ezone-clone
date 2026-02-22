-- University Attendance Management System - Database Schema
-- Run this script in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- STEP 1: CREATE TABLES
-- ============================================

-- Table: users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('faculty', 'student')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: faculty
CREATE TABLE IF NOT EXISTS faculty (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  department VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: students
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  roll_number VARCHAR(50) UNIQUE NOT NULL,
  enrollment_year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  department VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: subjects
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_code VARCHAR(20) UNIQUE NOT NULL,
  subject_name VARCHAR(255) NOT NULL,
  faculty_id UUID REFERENCES faculty(id) ON DELETE SET NULL,
  semester INTEGER NOT NULL,
  department VARCHAR(100) NOT NULL,
  schedule VARCHAR(100),
  count_late_as_present BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table: enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

-- Table: attendance_records
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by UUID REFERENCES faculty(id) ON DELETE SET NULL,
  marked_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,
  UNIQUE(student_id, subject_id, date)
);

-- Table: qr_sessions
CREATE TABLE IF NOT EXISTS qr_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES faculty(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  date DATE NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- STEP 2: CREATE INDEXES
-- ============================================

-- Subjects indexes
CREATE INDEX IF NOT EXISTS idx_subjects_faculty ON subjects(faculty_id);
CREATE INDEX IF NOT EXISTS idx_subjects_dept_sem ON subjects(department, semester);

-- Enrollments indexes
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON enrollments(subject_id);

-- Attendance records indexes (CRITICAL for performance)
CREATE INDEX IF NOT EXISTS idx_attendance_student_subject ON attendance_records(student_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject_date ON attendance_records(subject_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);

-- QR sessions index
CREATE INDEX IF NOT EXISTS idx_qr_sessions_token ON qr_sessions(session_token);

-- ============================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 4: CREATE RLS POLICIES
-- ============================================

-- Users policies
CREATE POLICY "Users can view their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Faculty policies
CREATE POLICY "Faculty can view their own data"
  ON faculty FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Faculty can update their own data"
  ON faculty FOR UPDATE
  USING (auth.uid() = id);

-- Students policies
CREATE POLICY "Students can view their own data"
  ON students FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Students can update their own data"
  ON students FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Faculty can view students in their subjects"
  ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      INNER JOIN enrollments e ON s.id = e.subject_id
      WHERE s.faculty_id = auth.uid() AND e.student_id = students.id
    )
  );

-- Subjects policies
CREATE POLICY "Faculty can view their own subjects"
  ON subjects FOR SELECT
  USING (faculty_id = auth.uid());

CREATE POLICY "Faculty can update their own subjects"
  ON subjects FOR UPDATE
  USING (faculty_id = auth.uid());

CREATE POLICY "Students can view enrolled subjects"
  ON subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.subject_id = subjects.id AND e.student_id = auth.uid()
    )
  );

-- Enrollments policies
CREATE POLICY "Students can view their enrollments"
  ON enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Faculty can view enrollments for their subjects"
  ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = enrollments.subject_id AND s.faculty_id = auth.uid()
    )
  );

-- Attendance records policies
CREATE POLICY "Students can view their own attendance"
  ON attendance_records FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Faculty can view attendance for their subjects"
  ON attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = attendance_records.subject_id AND s.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can insert attendance for their subjects"
  ON attendance_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_id AND s.faculty_id = auth.uid()
    )
  );

CREATE POLICY "Faculty can update attendance for their subjects"
  ON attendance_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = attendance_records.subject_id AND s.faculty_id = auth.uid()
    )
  );

-- QR sessions policies
CREATE POLICY "Faculty can manage their QR sessions"
  ON qr_sessions FOR ALL
  USING (faculty_id = auth.uid());

CREATE POLICY "Students can view active QR sessions"
  ON qr_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.subject_id = qr_sessions.subject_id AND e.student_id = auth.uid()
    )
  );

-- ============================================
-- STEP 5: CREATE DATABASE FUNCTIONS
-- ============================================

-- Function: Calculate attendance percentage
CREATE OR REPLACE FUNCTION calculate_attendance_percentage(
  p_student_id UUID,
  p_subject_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_total_classes INTEGER;
  v_present_count INTEGER;
  v_count_late BOOLEAN;
BEGIN
  -- Get subject setting
  SELECT count_late_as_present INTO v_count_late
  FROM subjects WHERE id = p_subject_id;

  -- Count total classes
  SELECT COUNT(*) INTO v_total_classes
  FROM attendance_records
  WHERE student_id = p_student_id AND subject_id = p_subject_id;

  IF v_total_classes = 0 THEN
    RETURN 0;
  END IF;

  -- Count present (and late if configured)
  IF v_count_late THEN
    SELECT COUNT(*) INTO v_present_count
    FROM attendance_records
    WHERE student_id = p_student_id
      AND subject_id = p_subject_id
      AND status IN ('present', 'late');
  ELSE
    SELECT COUNT(*) INTO v_present_count
    FROM attendance_records
    WHERE student_id = p_student_id
      AND subject_id = p_subject_id
      AND status = 'present';
  END IF;

  RETURN ROUND((v_present_count::NUMERIC / v_total_classes::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Calculate subject average attendance
CREATE OR REPLACE FUNCTION calculate_subject_average_attendance(
  p_subject_id UUID
) RETURNS NUMERIC AS $$
DECLARE
  v_avg_percentage NUMERIC;
BEGIN
  SELECT AVG(
    CASE
      WHEN COUNT(*) > 0 THEN
        (COUNT(CASE WHEN status IN ('present', 'late') THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100
      ELSE 0
    END
  ) INTO v_avg_percentage
  FROM attendance_records
  WHERE subject_id = p_subject_id
  GROUP BY student_id;

  RETURN COALESCE(ROUND(v_avg_percentage, 2), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Validate QR session
CREATE OR REPLACE FUNCTION validate_qr_session(
  p_session_token VARCHAR,
  p_student_id UUID
) RETURNS TABLE (
  is_valid BOOLEAN,
  status_result VARCHAR,
  subject_id_result UUID,
  message_result TEXT
) AS $$
DECLARE
  v_session RECORD;
  v_existing_record RECORD;
BEGIN
  -- Find session
  SELECT * INTO v_session
  FROM qr_sessions
  WHERE session_token = p_session_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'error'::VARCHAR, NULL::UUID, 'Invalid QR code'::TEXT;
    RETURN;
  END IF;

  -- Check if already marked
  SELECT * INTO v_existing_record
  FROM attendance_records
  WHERE student_id = p_student_id
    AND subject_id = v_session.subject_id
    AND date = v_session.date;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, 'error'::VARCHAR, v_session.subject_id, 'Already marked for this session'::TEXT;
    RETURN;
  END IF;

  -- Check timeout
  IF NOW() > v_session.valid_until THEN
    RETURN QUERY SELECT TRUE, 'late'::VARCHAR, v_session.subject_id, 'Marked as Late (scanned after timeout)'::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, 'present'::VARCHAR, v_session.subject_id, 'Marked Present'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 6: CREATE SAMPLE DATA (OPTIONAL)
-- ============================================

-- Note: You'll need to create users through Supabase Auth
-- Then insert their data into faculty/students tables
-- This is just an example structure

-- Example: Insert a faculty member (after creating user in Supabase Auth)
-- INSERT INTO faculty (id, employee_id, department, phone)
-- VALUES ('user-uuid-from-auth', 'FAC001', 'Computer Science', '1234567890');

-- Example: Insert a student (after creating user in Supabase Auth)
-- INSERT INTO students (id, roll_number, enrollment_year, semester, department, phone)
-- VALUES ('user-uuid-from-auth', 'CS2024001', 2024, 5, 'Computer Science', '0987654321');

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Instructions:
-- 1. Copy this entire script
-- 2. Go to your Supabase project > SQL Editor
-- 3. Paste and run the script
-- 4. Create admin users through Supabase Auth dashboard
-- 5. Link users to faculty/students tables using their auth IDs
