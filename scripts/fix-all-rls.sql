-- FIX ALL RLS RECURSION - Run this in Supabase SQL Editor
-- Replaces complex cross-referencing policies with simple authenticated-user policies

-- Drop all existing SELECT policies that cause recursion
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "authenticated_can_view_users" ON users;
DROP POLICY IF EXISTS "faculty_select_own" ON faculty;
DROP POLICY IF EXISTS "faculty_view_students" ON students;
DROP POLICY IF EXISTS "students_select_own" ON students;
DROP POLICY IF EXISTS "faculty_select_subjects" ON subjects;
DROP POLICY IF EXISTS "students_select_enrolled_subjects" ON subjects;
DROP POLICY IF EXISTS "students_select_enrollments" ON enrollments;
DROP POLICY IF EXISTS "faculty_select_enrollments" ON enrollments;
DROP POLICY IF EXISTS "students_select_attendance" ON attendance_records;
DROP POLICY IF EXISTS "faculty_select_attendance" ON attendance_records;
DROP POLICY IF EXISTS "faculty_manage_qr" ON qr_sessions;
DROP POLICY IF EXISTS "students_select_qr" ON qr_sessions;

-- Recreate with simple authenticated-user policies (no cross-references = no recursion)
CREATE POLICY "auth_select_users" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_faculty" ON faculty FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_students" ON students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_subjects" ON subjects FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_enrollments" ON enrollments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_attendance" ON attendance_records FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_qr" ON qr_sessions FOR SELECT USING (auth.role() = 'authenticated');

-- Keep write policies (these don't cause recursion)
-- Faculty can manage QR sessions (INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "faculty_manage_qr" ON qr_sessions;
CREATE POLICY "faculty_insert_qr" ON qr_sessions FOR INSERT WITH CHECK (faculty_id = auth.uid());
CREATE POLICY "faculty_update_qr" ON qr_sessions FOR UPDATE USING (faculty_id = auth.uid());
CREATE POLICY "faculty_delete_qr" ON qr_sessions FOR DELETE USING (faculty_id = auth.uid());
