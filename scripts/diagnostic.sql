-- ============================================
-- DIAGNOSTIC SCRIPT
-- ============================================

DO $$
DECLARE
  v_faculty_email TEXT := 'faculty@test.com';
  v_student_email TEXT := 'student@test.com';
  v_faculty_id UUID;
  v_student_id UUID;
  v_subject_count INTEGER;
  v_enrollment_count INTEGER;
BEGIN
  RAISE NOTICE 'Starting Diagnostics...';

  -- 1. Check Faculty Auth
  SELECT id INTO v_faculty_id FROM auth.users WHERE email = v_faculty_email;
  IF v_faculty_id IS NULL THEN
    RAISE WARNING '❌ Faculty Auth User (%) NOT FOUND.', v_faculty_email;
  ELSE
    RAISE NOTICE '✅ Faculty Auth User Found: %', v_faculty_id;
  END IF;

  -- 2. Check Student Auth
  SELECT id INTO v_student_id FROM auth.users WHERE email = v_student_email;
  IF v_student_id IS NULL THEN
    RAISE WARNING '❌ Student Auth User (%) NOT FOUND.', v_student_email;
  ELSE
    RAISE NOTICE '✅ Student Auth User Found: %', v_student_id;
  END IF;

  -- 3. Check Public Users
  PERFORM 1 FROM users WHERE email = v_faculty_email;
  IF NOT FOUND THEN RAISE WARNING '⚠️ Faculty not in public.users table'; END IF;

  PERFORM 1 FROM users WHERE email = v_student_email;
  IF NOT FOUND THEN RAISE WARNING '⚠️ Student not in public.users table'; END IF;

  -- 4. Check Subjects
  SELECT COUNT(*) INTO v_subject_count FROM subjects;
  RAISE NOTICE '📊 Total Subjects: %', v_subject_count;

  -- 5. Check Enrollments for Student
  IF v_student_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_enrollment_count FROM enrollments WHERE student_id = v_student_id;
    RAISE NOTICE '📊 Enrollments for %: %', v_student_email, v_enrollment_count;
  END IF;

  -- 6. ATTEMPT REPAIR (If Faculty/Student exist but data missing)
  IF v_faculty_id IS NOT NULL AND v_student_id IS NOT NULL THEN
     
     -- Ensure Profiles
     INSERT INTO users (id, email, password_hash, full_name, role)
     VALUES (v_faculty_id, v_faculty_email, 'x', 'Dr. Turing', 'faculty')
     ON CONFLICT (id) DO NOTHING;

     INSERT INTO faculty (id, employee_id, department, phone)
     VALUES (v_faculty_id, 'FAC001', 'CS', '123')
     ON CONFLICT (id) DO NOTHING;

     INSERT INTO users (id, email, password_hash, full_name, role)
     VALUES (v_student_id, v_student_email, 'x', 'Grace Hopper', 'student')
     ON CONFLICT (id) DO NOTHING;

     INSERT INTO students (id, roll_number, enrollment_year, semester, department, phone)
     VALUES (v_student_id, 'CS001', 2024, 3, 'CS', '456')
     ON CONFLICT (id) DO NOTHING;

     -- Ensure Subjects
     INSERT INTO subjects (subject_code, subject_name, faculty_id, semester, department)
     VALUES ('CS999', 'Diagnostic Subject', v_faculty_id, 3, 'Computer Science')
     ON CONFLICT (subject_code) DO NOTHING;

     -- Ensure Enrollmentm    
     INSERT INTO enrollments (student_id, subject_id)
     SELECT v_student_id, id FROM subjects WHERE subject_code = 'CS999'
     ON CONFLICT DO NOTHING;
     
     RAISE NOTICE '✅ Repair attempted. Added "Diagnostic Subject" and enrolled student.';
  END IF;

END $$;
