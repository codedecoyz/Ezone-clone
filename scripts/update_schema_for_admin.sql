-- ============================================
-- UPDATE SCHEMA FOR ADMIN
-- ============================================

-- 1. Update the 'role' check constraint to include 'admin'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('faculty', 'student', 'admin'));

-- 2. Create Admin Policies using RLS

-- Admin can view all data
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins can view all faculty" ON faculty FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins can view all students" ON students FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins can view all subjects" ON subjects FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins can view all enrollments" ON enrollments FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins can view all attendance" ON attendance_records FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins can view all qr sessions" ON qr_sessions FOR SELECT USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Admin can insert/update/delete data (Full Access)
-- Note: You might want to be more specific, but for now, we grant full access to admins if they are in the users table with role 'admin'
-- However, policies for INSERT/UPDATE usually need to be separate.

CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins can update users" ON users FOR UPDATE USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));
CREATE POLICY "Admins can delete users" ON users FOR DELETE USING (auth.uid() IN (SELECT id FROM users WHERE role = 'admin'));

-- Repeat for other tables as needed or simplify by bypassing RLS for admin using a service role function if possible, 
-- but since we are using client-side auth, RLS is the way.

-- IMPORTANT: The circular dependency (checking users table to see if user is admin) can be tricky.
-- A better approach for the "Admins" policy is to use a custom claim or just rely on the fact that we will manually insert the first admin.
-- For simplicity in this script, we will assume the initial admin is inserted manually or via a secure function.

-- 3. Create a function to safely create users (Admin only) - Optional, can use Supabase Auth API from client.

