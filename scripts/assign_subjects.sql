-- ============================================
-- ASSIGN SUBJECTS TO FACULTY & STUDENTS
-- ============================================

-- --------------------------------------------
-- 1. Helper: Find IDs (Run these first to get UUIDs)
-- --------------------------------------------

-- Find Faculty ID by Email
-- SELECT id, full_name, role FROM users WHERE email = 'faculty@example.com';

-- Find Student ID by Roll Number
-- SELECT s.id, u.full_name, s.roll_number 
-- FROM students s 
-- JOIN users u ON s.id = u.id 
-- WHERE s.roll_number = 'CS2024001';

-- Find Subject ID by Code
-- SELECT id, subject_code, subject_name FROM subjects WHERE subject_code = 'CS101';


-- --------------------------------------------
-- 2. Assign Subject to Faculty
-- --------------------------------------------

-- Updates an existing subject to be taught by a specific faculty member
-- Replace 'SUBJECT_UUID' and 'FACULTY_UUID' with actual IDs

/*
UPDATE subjects
SET faculty_id = 'FACULTY_UUID'
WHERE id = 'SUBJECT_UUID';
*/

-- Example using subqueries (if you know codes/emails):
/*
UPDATE subjects
SET faculty_id = (SELECT id FROM users WHERE email = 'faculty@example.com')
WHERE subject_code = 'CS101';
*/


-- --------------------------------------------
-- 3. Enroll Student in Subject
-- --------------------------------------------

-- Inserts a record into the enrollments table
-- Replace 'STUDENT_UUID' and 'SUBJECT_UUID' with actual IDs

/*
INSERT INTO enrollments (student_id, subject_id)
VALUES ('STUDENT_UUID', 'SUBJECT_UUID')
ON CONFLICT (student_id, subject_id) DO NOTHING;
*/

-- Example using subqueries (if you know roll numbers/codes):
/*
INSERT INTO enrollments (student_id, subject_id)
VALUES (
  (SELECT id FROM students WHERE roll_number = 'CS2024001'),
  (SELECT id FROM subjects WHERE subject_code = 'CS101')
)
ON CONFLICT (student_id, subject_id) DO NOTHING;
*/


-- --------------------------------------------
-- 4. Bulk Enrollment (Optional)
-- --------------------------------------------

-- Enroll all students of a specific semester and department into a subject
/*
INSERT INTO enrollments (student_id, subject_id)
SELECT id, (SELECT id FROM subjects WHERE subject_code = 'CS101')
FROM students
WHERE semester = 1 AND department = 'Computer Science'
ON CONFLICT (student_id, subject_id) DO NOTHING;
*/
