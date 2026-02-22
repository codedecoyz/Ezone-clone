-- ============================================
-- CREATE TEST USERS (Requires pgcrypto)
-- ============================================

-- Ensure pgcrypto is enabled for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create Identity & User Function
-- This function mimics what Supabase Auth does, but effectively "side-loads" users.
-- WARNING: This is for development/testing only. In production, use Supabase Auth API.

CREATE OR REPLACE FUNCTION create_test_user(
    p_email TEXT,
    p_password TEXT,
    p_role TEXT,
    p_full_name TEXT,
    p_extra_data JSONB DEFAULT '{}'::JSONB
) RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    -- Check if user already exists
    SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;
    
    IF v_user_id IS NOT NULL THEN
        RAISE NOTICE 'User % already exists with ID %', p_email, v_user_id;
        
        -- Update public.users linkage just in case
        INSERT INTO public.users (id, email, password_hash, full_name, role)
        VALUES (v_user_id, p_email, 'managed_by_auth', p_full_name, p_role)
        ON CONFLICT (id) DO UPDATE SET role = p_role, full_name = p_full_name;
        
        RETURN v_user_id;
    END IF;

    -- Generate ID
    v_user_id := gen_random_uuid();
    v_encrypted_pw := crypt(p_password, gen_salt('bf'));

    -- Insert into auth.users
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        recovery_sent_at,
        last_sign_in_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- Default instance_id
        v_user_id,
        'authenticated',
        'authenticated', -- auth role
        p_email,
        v_encrypted_pw,
        NOW(), -- email_confirmed_at (Bypasses verification)
        NOW(),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        jsonb_build_object('full_name', p_full_name),
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    );

    -- Insert into public.users
    INSERT INTO public.users (id, email, password_hash, full_name, role)
    VALUES (v_user_id, p_email, 'managed_by_auth', p_full_name, p_role);

    RAISE NOTICE 'Created user % with ID %', p_email, v_user_id;
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Execute Updates
DO $$
DECLARE
    v_admin_id UUID;
    v_faculty_id UUID;
    v_student1_id UUID;
    v_student2_id UUID;
    v_subject_db_id UUID;
    v_subject_net_id UUID;
BEGIN
    -- Create Admin
    v_admin_id := create_test_user('admin@test.com', 'password123', 'admin', 'System Administrator');
    
    -- Create Faculty
    v_faculty_id := create_test_user('faculty@test.com', 'password123', 'faculty', 'Dr. Alan Turing');
    INSERT INTO public.faculty (id, employee_id, department, phone)
    VALUES (v_faculty_id, 'FAC001', 'Computer Science', '555-0101')
    ON CONFLICT (id) DO NOTHING;

    -- Create Students
    v_student1_id := create_test_user('student1@test.com', 'password123', 'student', 'Grace Hopper');
    INSERT INTO public.students (id, roll_number, enrollment_year, semester, department, phone)
    VALUES (v_student1_id, 'CS2024001', 2024, 3, 'Computer Science', '555-0102')
    ON CONFLICT (id) DO NOTHING;

    v_student2_id := create_test_user('student2@test.com', 'password123', 'student', 'Ada Lovelace');
    INSERT INTO public.students (id, roll_number, enrollment_year, semester, department, phone)
    VALUES (v_student2_id, 'CS2024002', 2024, 3, 'Computer Science', '555-0103')
    ON CONFLICT (id) DO NOTHING;

    -- Create Subjects (Assign to faculty)
    INSERT INTO public.subjects (subject_code, subject_name, faculty_id, semester, department, schedule)
    VALUES ('CS301', 'Database Systems', v_faculty_id, 3, 'Computer Science', 'Mon 10:00 AM')
    ON CONFLICT (subject_code) DO UPDATE SET faculty_id = v_faculty_id
    RETURNING id INTO v_subject_db_id;

    INSERT INTO public.subjects (subject_code, subject_name, faculty_id, semester, department, schedule)
    VALUES ('CS302', 'Computer Networks', v_faculty_id, 3, 'Computer Science', 'Tue 02:00 PM')
    ON CONFLICT (subject_code) DO UPDATE SET faculty_id = v_faculty_id
    RETURNING id INTO v_subject_net_id;

    -- Enroll Students
    INSERT INTO public.enrollments (student_id, subject_id) VALUES (v_student1_id, v_subject_db_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.enrollments (student_id, subject_id) VALUES (v_student1_id, v_subject_net_id) ON CONFLICT DO NOTHING;
    INSERT INTO public.enrollments (student_id, subject_id) VALUES (v_student2_id, v_subject_db_id) ON CONFLICT DO NOTHING;

    -- Add some attendance
    INSERT INTO public.attendance_records (student_id, subject_id, date, status, marked_by)
    VALUES (v_student1_id, v_subject_db_id, CURRENT_DATE - INTERVAL '1 day', 'present', v_faculty_id)
    ON CONFLICT DO NOTHING;
    
    INSERT INTO public.attendance_records (student_id, subject_id, date, status, marked_by)
    VALUES (v_student1_id, v_subject_db_id, CURRENT_DATE, 'late', v_faculty_id)
    ON CONFLICT DO NOTHING;
    
    RAISE NOTICE 'Seed data created successfully!';
    
END $$;
