-- ADD 10 TEST STUDENTS (safe to re-run)
-- Looks up existing auth users by email, creates new ones only if needed

DO $$
DECLARE
  v_faculty_id UUID;
  v_ids UUID[] := ARRAY[]::UUID[];
  v_emails TEXT[] := ARRAY[
    'student1@test.com','student2@test.com','student3@test.com','student4@test.com','student5@test.com',
    'student6@test.com','student7@test.com','student8@test.com','student9@test.com','student10@test.com'
  ];
  v_names TEXT[] := ARRAY[
    'Rahul Sharma','Priya Patel','Amit Kumar','Sneha Gupta','Vikram Singh',
    'Ananya Reddy','Rohan Mehta','Kavya Nair','Arjun Joshi','Meera Iyer'
  ];
  v_rolls TEXT[] := ARRAY[
    'CS2024002','CS2024003','CS2024004','CS2024005','CS2024006',
    'CS2024007','CS2024008','CS2024009','CS2024010','CS2024011'
  ];
  v_id UUID;
  v_sub1 UUID;
  v_sub2 UUID;
  v_sub3 UUID;
  i INT;
BEGIN
  SELECT id INTO v_faculty_id FROM auth.users WHERE email = 'faculty@test.com';
  SELECT id INTO v_sub1 FROM subjects WHERE subject_code = 'CS101';
  SELECT id INTO v_sub2 FROM subjects WHERE subject_code = 'CS102';
  SELECT id INTO v_sub3 FROM subjects WHERE subject_code = 'CS103';

  -- For each student, find or create auth user
  FOR i IN 1..10 LOOP
    SELECT id INTO v_id FROM auth.users WHERE email = v_emails[i];

    IF v_id IS NULL THEN
      v_id := gen_random_uuid();
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token)
      VALUES (v_id, '00000000-0000-0000-0000-000000000000', v_emails[i], crypt('test123', gen_salt('bf')), now(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}', '{}', now(), now(), '');
      RAISE NOTICE 'Created auth user: %', v_emails[i];
    ELSE
      RAISE NOTICE 'Auth user exists: % (id: %)', v_emails[i], v_id;
    END IF;

    v_ids := v_ids || v_id;

    -- Users table
    INSERT INTO users (id, email, full_name, role, password_hash)
    VALUES (v_id, v_emails[i], v_names[i], 'student', 'managed-by-supabase-auth')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    -- Students table
    INSERT INTO students (id, roll_number, enrollment_year, semester, department, phone)
    VALUES (v_id, v_rolls[i], 2024, 1, 'Computer Science', '910000000' || i::text)
    ON CONFLICT (id) DO NOTHING;

    -- Enroll in all 3 subjects
    INSERT INTO enrollments (student_id, subject_id) VALUES (v_id, v_sub1) ON CONFLICT DO NOTHING;
    INSERT INTO enrollments (student_id, subject_id) VALUES (v_id, v_sub2) ON CONFLICT DO NOTHING;
    INSERT INTO enrollments (student_id, subject_id) VALUES (v_id, v_sub3) ON CONFLICT DO NOTHING;

    -- Add yesterday's attendance (CS101)
    INSERT INTO attendance_records (student_id, subject_id, date, status, marked_by, marked_at)
    VALUES (v_id, v_sub1, CURRENT_DATE - 1,
      CASE WHEN i <= 6 THEN 'present' WHEN i <= 8 THEN 'absent' ELSE 'late' END,
      v_faculty_id, now())
    ON CONFLICT (student_id, subject_id, date) DO NOTHING;
  END LOOP;

  RAISE NOTICE '✅ Done! 10 students ready.';
END $$;

-- Verify
SELECT 'students' as tbl, count(*) FROM students
UNION ALL SELECT 'enrollments', count(*) FROM enrollments
UNION ALL SELECT 'attendance', count(*) FROM attendance_records;
