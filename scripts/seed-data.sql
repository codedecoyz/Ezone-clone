-- SEED DATA ONLY - Run this AFTER creating auth users
-- Make sure faculty@test.com and student@test.com exist in Authentication > Users

-- First, check what's there
SELECT email FROM auth.users;

-- Now seed everything
DO $$
DECLARE
  v_faculty_id UUID;
  v_student_id UUID;
  v_subject1_id UUID;
  v_subject2_id UUID;
  v_subject3_id UUID;
BEGIN
  SELECT id INTO v_faculty_id FROM auth.users WHERE email = 'faculty@test.com';
  SELECT id INTO v_student_id FROM auth.users WHERE email = 'student@test.com';

  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION '❌ faculty@test.com not found! Create it in Auth dashboard first.';
  END IF;
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION '❌ student@test.com not found! Create it in Auth dashboard first.';
  END IF;

  RAISE NOTICE '✅ Faculty ID: %', v_faculty_id;
  RAISE NOTICE '✅ Student ID: %', v_student_id;

  -- Users table
  INSERT INTO users (id, email, full_name, role, password_hash)
  VALUES
    (v_faculty_id, 'faculty@test.com', 'Dr. John Smith', 'faculty', 'managed-by-supabase-auth'),
    (v_student_id, 'student@test.com', 'Alice Johnson', 'student', 'managed-by-supabase-auth')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role;

  -- Faculty
  INSERT INTO faculty (id, employee_id, department, phone)
  VALUES (v_faculty_id, 'FAC001', 'Computer Science', '9876543210')
  ON CONFLICT (id) DO NOTHING;

  -- Student
  INSERT INTO students (id, roll_number, enrollment_year, semester, department, phone)
  VALUES (v_student_id, 'CS2024001', 2024, 1, 'Computer Science', '9123456789')
  ON CONFLICT (id) DO NOTHING;

  -- Subjects
  INSERT INTO subjects (id, subject_code, subject_name, faculty_id, semester, department, schedule)
  VALUES
    (uuid_generate_v4(), 'CS101', 'Introduction to Programming', v_faculty_id, 1, 'Computer Science', 'MWF 10:00 AM'),
    (uuid_generate_v4(), 'CS102', 'Data Structures', v_faculty_id, 1, 'Computer Science', 'TT 2:00 PM'),
    (uuid_generate_v4(), 'CS103', 'Database Systems', v_faculty_id, 1, 'Computer Science', 'MWF 11:00 AM')
  ON CONFLICT (subject_code) DO UPDATE SET faculty_id = EXCLUDED.faculty_id;

  SELECT id INTO v_subject1_id FROM subjects WHERE subject_code = 'CS101';
  SELECT id INTO v_subject2_id FROM subjects WHERE subject_code = 'CS102';
  SELECT id INTO v_subject3_id FROM subjects WHERE subject_code = 'CS103';

  -- Enrollments
  INSERT INTO enrollments (student_id, subject_id)
  VALUES
    (v_student_id, v_subject1_id),
    (v_student_id, v_subject2_id),
    (v_student_id, v_subject3_id)
  ON CONFLICT (student_id, subject_id) DO NOTHING;

  -- Attendance records
  INSERT INTO attendance_records (student_id, subject_id, date, status, marked_by, marked_at)
  VALUES
    (v_student_id, v_subject1_id, CURRENT_DATE - 1,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject1_id, CURRENT_DATE - 3,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject1_id, CURRENT_DATE - 5,  'absent',  v_faculty_id, NOW()),
    (v_student_id, v_subject1_id, CURRENT_DATE - 7,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject1_id, CURRENT_DATE - 9,  'late',    v_faculty_id, NOW()),
    (v_student_id, v_subject2_id, CURRENT_DATE - 2,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject2_id, CURRENT_DATE - 4,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject2_id, CURRENT_DATE - 6,  'absent',  v_faculty_id, NOW()),
    (v_student_id, v_subject2_id, CURRENT_DATE - 8,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject3_id, CURRENT_DATE - 1,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject3_id, CURRENT_DATE - 3,  'late',    v_faculty_id, NOW()),
    (v_student_id, v_subject3_id, CURRENT_DATE - 5,  'present', v_faculty_id, NOW()),
    (v_student_id, v_subject3_id, CURRENT_DATE - 7,  'absent',  v_faculty_id, NOW())
  ON CONFLICT (student_id, subject_id, date) DO NOTHING;

  RAISE NOTICE '✅ All data seeded!';
  RAISE NOTICE '   3 subjects, 3 enrollments, 13 attendance records';
END $$;

-- Verify
SELECT 'users' as tbl, count(*) FROM users
UNION ALL SELECT 'faculty', count(*) FROM faculty
UNION ALL SELECT 'students', count(*) FROM students
UNION ALL SELECT 'subjects', count(*) FROM subjects
UNION ALL SELECT 'enrollments', count(*) FROM enrollments
UNION ALL SELECT 'attendance_records', count(*) FROM attendance_records;
