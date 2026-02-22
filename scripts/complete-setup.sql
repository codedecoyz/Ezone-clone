-- ============================================================
-- COMPLETE DATABASE SETUP - University Attendance Management
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- STEP 1: DROP EXISTING (clean slate)
-- ============================================================
DROP TABLE IF EXISTS qr_sessions CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS faculty CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP FUNCTION IF EXISTS get_user_details(UUID);
DROP FUNCTION IF EXISTS calculate_attendance_percentage(UUID, UUID);
DROP FUNCTION IF EXISTS calculate_subject_average_attendance(UUID);
DROP FUNCTION IF EXISTS validate_qr_session(VARCHAR, UUID);
DROP FUNCTION IF EXISTS mark_attendance_qr(VARCHAR, UUID);

-- ============================================================
-- STEP 2: CREATE TABLES
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL DEFAULT 'managed-by-supabase-auth',
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('faculty', 'student', 'admin')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE faculty (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  employee_id VARCHAR(50) UNIQUE NOT NULL,
  department VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE students (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  roll_number VARCHAR(50) UNIQUE NOT NULL,
  enrollment_year INTEGER NOT NULL,
  semester INTEGER NOT NULL,
  department VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE subjects (
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

CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  enrolled_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

CREATE TABLE attendance_records (
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

CREATE TABLE qr_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id UUID REFERENCES faculty(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  date DATE NOT NULL,
  valid_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- STEP 3: CREATE INDEXES
-- ============================================================

CREATE INDEX idx_subjects_faculty ON subjects(faculty_id);
CREATE INDEX idx_subjects_dept_sem ON subjects(department, semester);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_subject ON enrollments(subject_id);
CREATE INDEX idx_attendance_student_subject ON attendance_records(student_id, subject_id);
CREATE INDEX idx_attendance_subject_date ON attendance_records(subject_id, date);
CREATE INDEX idx_attendance_date ON attendance_records(date);
CREATE INDEX idx_qr_sessions_token ON qr_sessions(session_token);

-- ============================================================
-- STEP 4: ENABLE RLS
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE faculty ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_sessions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: CREATE RLS POLICIES (recursion-safe)
-- ============================================================

-- USERS: Allow any authenticated user to read basic info (names, roles)
-- This is needed because students see faculty names and faculty see student names
CREATE POLICY "authenticated_can_view_users" ON users FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "users_update_own" ON users FOR UPDATE
  USING (id = auth.uid());

-- Allow inserting own user row (needed during signup flow)
CREATE POLICY "users_insert_own" ON users FOR INSERT
  WITH CHECK (id = auth.uid());

-- FACULTY
CREATE POLICY "faculty_select_own" ON faculty FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "faculty_update_own" ON faculty FOR UPDATE
  USING (id = auth.uid());

-- STUDENTS
CREATE POLICY "students_select_own" ON students FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "students_update_own" ON students FOR UPDATE
  USING (id = auth.uid());

-- Faculty can view students enrolled in their subjects
CREATE POLICY "faculty_view_students" ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      INNER JOIN enrollments e ON s.id = e.subject_id
      WHERE s.faculty_id = auth.uid() AND e.student_id = students.id
    )
  );

-- SUBJECTS
CREATE POLICY "faculty_select_subjects" ON subjects FOR SELECT
  USING (faculty_id = auth.uid());

CREATE POLICY "faculty_update_subjects" ON subjects FOR UPDATE
  USING (faculty_id = auth.uid());

CREATE POLICY "students_select_enrolled_subjects" ON subjects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.subject_id = subjects.id AND e.student_id = auth.uid()
    )
  );

-- ENROLLMENTS
CREATE POLICY "students_select_enrollments" ON enrollments FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "faculty_select_enrollments" ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = enrollments.subject_id AND s.faculty_id = auth.uid()
    )
  );

-- ATTENDANCE RECORDS
CREATE POLICY "students_select_attendance" ON attendance_records FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "faculty_select_attendance" ON attendance_records FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = attendance_records.subject_id AND s.faculty_id = auth.uid()
    )
  );

CREATE POLICY "faculty_insert_attendance" ON attendance_records FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = subject_id AND s.faculty_id = auth.uid()
    )
  );

CREATE POLICY "faculty_update_attendance" ON attendance_records FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM subjects s
      WHERE s.id = attendance_records.subject_id AND s.faculty_id = auth.uid()
    )
  );

-- QR SESSIONS
CREATE POLICY "faculty_manage_qr" ON qr_sessions FOR ALL
  USING (faculty_id = auth.uid());

CREATE POLICY "students_select_qr" ON qr_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.subject_id = qr_sessions.subject_id AND e.student_id = auth.uid()
    )
  );

-- ============================================================
-- STEP 6: CREATE FUNCTIONS (all SECURITY DEFINER to bypass RLS)
-- ============================================================

-- Function: Get user details (bypasses RLS recursion)
CREATE OR REPLACE FUNCTION get_user_details(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  full_name VARCHAR,
  role VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.full_name, u.role
  FROM users u
  WHERE u.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  SELECT count_late_as_present INTO v_count_late
  FROM subjects WHERE id = p_subject_id;

  SELECT COUNT(*) INTO v_total_classes
  FROM attendance_records
  WHERE student_id = p_student_id AND subject_id = p_subject_id;

  IF v_total_classes = 0 THEN
    RETURN 0;
  END IF;

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
  SELECT * INTO v_session
  FROM qr_sessions
  WHERE session_token = p_session_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'error'::VARCHAR, NULL::UUID, 'Invalid QR code'::TEXT;
    RETURN;
  END IF;

  SELECT * INTO v_existing_record
  FROM attendance_records
  WHERE student_id = p_student_id
    AND subject_id = v_session.subject_id
    AND date = v_session.date;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, 'error'::VARCHAR, v_session.subject_id, 'Already marked for this session'::TEXT;
    RETURN;
  END IF;

  IF NOW() > v_session.valid_until THEN
    RETURN QUERY SELECT TRUE, 'late'::VARCHAR, v_session.subject_id, 'Marked as Late (scanned after timeout)'::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, 'present'::VARCHAR, v_session.subject_id, 'Marked Present'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark attendance via QR (used by qrService.ts)
CREATE OR REPLACE FUNCTION mark_attendance_qr(
  p_session_token VARCHAR,
  p_student_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  status_result VARCHAR,
  message TEXT
) AS $$
DECLARE
  v_session RECORD;
  v_existing RECORD;
  v_status VARCHAR;
  v_msg TEXT;
BEGIN
  -- Find the QR session
  SELECT * INTO v_session
  FROM qr_sessions
  WHERE session_token = p_session_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'error'::VARCHAR, 'Invalid QR code'::TEXT;
    RETURN;
  END IF;

  -- Check if already marked
  SELECT * INTO v_existing
  FROM attendance_records
  WHERE student_id = p_student_id
    AND subject_id = v_session.subject_id
    AND date = v_session.date;

  IF FOUND THEN
    RETURN QUERY SELECT FALSE, 'error'::VARCHAR, 'Attendance already marked for today'::TEXT;
    RETURN;
  END IF;

  -- Determine status based on time
  IF NOW() > v_session.valid_until THEN
    v_status := 'late';
    v_msg := 'Marked as Late (scanned after timeout)';
  ELSE
    v_status := 'present';
    v_msg := 'Attendance marked as Present';
  END IF;

  -- Insert attendance record
  INSERT INTO attendance_records (student_id, subject_id, date, status, marked_by, marked_at)
  VALUES (p_student_id, v_session.subject_id, v_session.date, v_status, v_session.faculty_id, NOW());

  RETURN QUERY SELECT TRUE, v_status, v_msg;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- STEP 7: SEED TEST DATA
-- ============================================================
-- NOTE: You must first create these 2 users in Supabase Auth
-- Dashboard > Authentication > Users > Add User:
--
--   1. Faculty:  faculty@test.com  /  test123
--   2. Student:  student@test.com  /  test123
--
-- After creating them, find their UUIDs in the Auth dashboard
-- and replace the placeholders below, then run ONLY Step 7.
-- ============================================================

-- >>> REPLACE THESE WITH REAL AUTH USER IDs FROM SUPABASE DASHBOARD <<<
-- DO variable substitution:

DO $$
DECLARE
  v_faculty_id UUID;
  v_student_id UUID;
  v_subject1_id UUID;
  v_subject2_id UUID;
  v_subject3_id UUID;
BEGIN
  -- ==========================================
  -- LOOK UP AUTH USER IDs
  -- ==========================================
  SELECT id INTO v_faculty_id FROM auth.users WHERE email = 'faculty@test.com';
  SELECT id INTO v_student_id FROM auth.users WHERE email = 'student@test.com';

  -- If users don't exist yet, abort gracefully
  IF v_faculty_id IS NULL THEN
    RAISE NOTICE '⚠️  faculty@test.com not found in auth.users. Create the user first in Auth dashboard!';
    RETURN;
  END IF;

  IF v_student_id IS NULL THEN
    RAISE NOTICE '⚠️  student@test.com not found in auth.users. Create the user first in Auth dashboard!';
    RETURN;
  END IF;

  RAISE NOTICE '✅ Faculty ID: %', v_faculty_id;
  RAISE NOTICE '✅ Student ID: %', v_student_id;

  -- ==========================================
  -- INSERT INTO users TABLE
  -- ==========================================
  INSERT INTO users (id, email, full_name, role, password_hash)
  VALUES
    (v_faculty_id, 'faculty@test.com', 'Dr. John Smith', 'faculty', 'managed-by-supabase-auth'),
    (v_student_id, 'student@test.com', 'Alice Johnson', 'student', 'managed-by-supabase-auth')
  ON CONFLICT (id) DO NOTHING;

  -- ==========================================
  -- INSERT FACULTY & STUDENT DETAILS
  -- ==========================================
  INSERT INTO faculty (id, employee_id, department, phone)
  VALUES (v_faculty_id, 'FAC001', 'Computer Science', '9876543210')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO students (id, roll_number, enrollment_year, semester, department, phone)
  VALUES (v_student_id, 'CS2024001', 2024, 1, 'Computer Science', '9123456789')
  ON CONFLICT (id) DO NOTHING;

  -- ==========================================
  -- CREATE SUBJECTS
  -- ==========================================
  INSERT INTO subjects (id, subject_code, subject_name, faculty_id, semester, department, schedule)
  VALUES
    (uuid_generate_v4(), 'CS101', 'Introduction to Programming', v_faculty_id, 1, 'Computer Science', 'MWF 10:00 AM'),
    (uuid_generate_v4(), 'CS102', 'Data Structures', v_faculty_id, 1, 'Computer Science', 'TT 2:00 PM'),
    (uuid_generate_v4(), 'CS103', 'Database Systems', v_faculty_id, 1, 'Computer Science', 'MWF 11:00 AM')
  ON CONFLICT (subject_code) DO NOTHING;

  -- Get subject IDs
  SELECT id INTO v_subject1_id FROM subjects WHERE subject_code = 'CS101';
  SELECT id INTO v_subject2_id FROM subjects WHERE subject_code = 'CS102';
  SELECT id INTO v_subject3_id FROM subjects WHERE subject_code = 'CS103';

  -- ==========================================
  -- ENROLL STUDENT IN ALL SUBJECTS
  -- ==========================================
  INSERT INTO enrollments (student_id, subject_id)
  VALUES
    (v_student_id, v_subject1_id),
    (v_student_id, v_subject2_id),
    (v_student_id, v_subject3_id)
  ON CONFLICT (student_id, subject_id) DO NOTHING;

  -- ==========================================
  -- ADD SAMPLE ATTENDANCE DATA (last 10 days)
  -- ==========================================
  INSERT INTO attendance_records (student_id, subject_id, date, status, marked_by, marked_at)
  VALUES
    -- CS101 - Intro to Programming
    (v_student_id, v_subject1_id, CURRENT_DATE - 1,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject1_id, CURRENT_DATE - 3,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject1_id, CURRENT_DATE - 5,  'absent',  v_faculty_id, NOW()),
    (v_student_id, v_subject1_id, CURRENT_DATE - 7,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject1_id, CURRENT_DATE - 9,  'late',    v_faculty_id, NOW()),
    -- CS102 - Data Structures
    (v_student_id, v_subject2_id, CURRENT_DATE - 2,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject2_id, CURRENT_DATE - 4,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject2_id, CURRENT_DATE - 6,  'absent',  v_faculty_id, NOW()),
    (v_student_id, v_subject2_id, CURRENT_DATE - 8,  'present', v_faculty_id, NOW()),
    -- CS103 - Database Systems
    (v_student_id, v_subject3_id, CURRENT_DATE - 1,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject3_id, CURRENT_DATE - 3,  'late',    v_faculty_id, NOW()),
    (v_student_id, v_subject3_id, CURRENT_DATE - 5,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject3_id, CURRENT_DATE - 7,  'absent',  v_faculty_id, NOW())
  ON CONFLICT (student_id, subject_id, date) DO NOTHING;

  RAISE NOTICE '✅ All seed data inserted successfully!';
  RAISE NOTICE '   Faculty: faculty@test.com / test123';
  RAISE NOTICE '   Student: student@test.com / test123';
  RAISE NOTICE '   Subjects: CS101, CS102, CS103';
  RAISE NOTICE '   Attendance records: 13 sample records';

END $$;
