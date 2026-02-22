-- ============================================
-- SEED DATA SCRIPT (UPDATED)
-- ============================================

-- Execute this block in Supabase SQL Editor (Dashboard) to populate data linked to Auth users.

DO $$
DECLARE
  v_faculty_auth_id UUID;
  v_student_auth_id UUID;
  v_subject_db_id UUID;
  v_subject_net_id UUID;
BEGIN
  -- --------------------------------------------
  -- 1. Fetch Auth IDs (Must run in Dashboard)
  -- --------------------------------------------
  
  -- Faculty: faculty@test.com
  SELECT id INTO v_faculty_auth_id FROM auth.users WHERE email = 'faculty@test.com';
  
  -- Student: student@test.com
  SELECT id INTO v_student_auth_id FROM auth.users WHERE email = 'student@test.com';

  -- --------------------------------------------
  -- 2. Create Public Users (Link to Auth)
  -- --------------------------------------------

  IF v_faculty_auth_id IS NOT NULL THEN
    INSERT INTO users (id, email, password_hash, full_name, role)
    VALUES (v_faculty_auth_id, 'faculty@test.com', 'link_to_auth', 'Faculty User', 'faculty')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
    
    -- Create Faculty Profile
    INSERT INTO faculty (id, employee_id, department, phone)
    VALUES (v_faculty_auth_id, 'FAC001', 'Computer Science', '555-0101')
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Faculty user linked: %', v_faculty_auth_id;
  ELSE
    RAISE NOTICE 'User faculty@test.com NOT FOUND in auth.users. Please create it first.';
  END IF;

  IF v_student_auth_id IS NOT NULL THEN
    INSERT INTO users (id, email, password_hash, full_name, role)
    VALUES (v_student_auth_id, 'student@test.com', 'link_to_auth', 'Student User', 'student')
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    -- Create Student Profile
    INSERT INTO students (id, roll_number, enrollment_year, semester, department, phone)
    VALUES (v_student_auth_id, 'CS2024001', 2024, 3, 'Computer Science', '555-0102')
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Student user linked: %', v_student_auth_id;
  ELSE
    RAISE NOTICE 'User student@test.com NOT FOUND in auth.users. Please create it first.';
  END IF;

  -- --------------------------------------------
  -- 3. Create Subjects (Only if Faculty exists)
  -- --------------------------------------------
  
  IF v_faculty_auth_id IS NOT NULL THEN
    -- Database Management
    INSERT INTO subjects (subject_code, subject_name, faculty_id, semester, department, schedule)
    VALUES ('CS301', 'Database Management Systems', v_faculty_auth_id, 3, 'Computer Science', 'Mon 10:00 AM')
    ON CONFLICT (subject_code) DO UPDATE SET faculty_id = v_faculty_auth_id
    RETURNING id INTO v_subject_db_id;

    -- Computer Networks
    INSERT INTO subjects (subject_code, subject_name, faculty_id, semester, department, schedule)
    VALUES ('CS302', 'Computer Networks', v_faculty_auth_id, 3, 'Computer Science', 'Tue 02:00 PM')
    ON CONFLICT (subject_code) DO UPDATE SET faculty_id = v_faculty_auth_id
    RETURNING id INTO v_subject_net_id;
  END IF;

  -- --------------------------------------------
  -- 4. Enroll Students & Add Attendance (Only if both exist)
  -- --------------------------------------------

  IF v_student_auth_id IS NOT NULL AND v_subject_db_id IS NOT NULL THEN
    -- Enroll
    INSERT INTO enrollments (student_id, subject_id) VALUES (v_student_auth_id, v_subject_db_id) ON CONFLICT DO NOTHING;
    INSERT INTO enrollments (student_id, subject_id) VALUES (v_student_auth_id, v_subject_net_id) ON CONFLICT DO NOTHING;
    
    -- Attendance
    INSERT INTO attendance_records (student_id, subject_id, date, status, marked_by)
    VALUES (v_student_auth_id, v_subject_db_id, CURRENT_DATE - INTERVAL '1 day', 'present', v_faculty_auth_id)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO attendance_records (student_id, subject_id, date, status, marked_by)
    VALUES (v_student_auth_id, v_subject_net_id, CURRENT_DATE, 'present', v_faculty_auth_id)
    ON CONFLICT DO NOTHING;
  END IF;

END $$;
