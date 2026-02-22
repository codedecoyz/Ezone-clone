-- ANNOUNCEMENTS & ASSIGNMENTS FEATURE
-- Run this in Supabase SQL Editor

-- 1. Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  total_marks INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Assignment marks table
CREATE TABLE IF NOT EXISTS assignment_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id),
  marks_obtained NUMERIC(6,2) NOT NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(assignment_id, student_id)
);

-- Enable RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_marks ENABLE ROW LEVEL SECURITY;

-- RLS Policies: authenticated users can read
CREATE POLICY "auth_select_announcements" ON announcements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_assignments" ON assignments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "auth_select_marks" ON assignment_marks FOR SELECT USING (auth.role() = 'authenticated');

-- Faculty can insert/update announcements
CREATE POLICY "faculty_insert_announcements" ON announcements FOR INSERT WITH CHECK (auth.uid() = faculty_id);
CREATE POLICY "faculty_update_announcements" ON announcements FOR UPDATE USING (auth.uid() = faculty_id);
CREATE POLICY "faculty_delete_announcements" ON announcements FOR DELETE USING (auth.uid() = faculty_id);

-- Faculty can insert/update assignments
CREATE POLICY "faculty_insert_assignments" ON assignments FOR INSERT WITH CHECK (auth.uid() = faculty_id);
CREATE POLICY "faculty_update_assignments" ON assignments FOR UPDATE USING (auth.uid() = faculty_id);

-- Faculty can insert/update marks
CREATE POLICY "faculty_insert_marks" ON assignment_marks FOR INSERT WITH CHECK (true);
CREATE POLICY "faculty_update_marks" ON assignment_marks FOR UPDATE USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcements_subject ON announcements(subject_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_marks_assignment ON assignment_marks(assignment_id);
CREATE INDEX IF NOT EXISTS idx_marks_student ON assignment_marks(student_id);

-- Add some sample data
DO $$
DECLARE
  v_faculty_id UUID;
  v_sub1 UUID;
  v_sub2 UUID;
  v_asgn1 UUID;
  v_asgn2 UUID;
BEGIN
  SELECT id INTO v_faculty_id FROM auth.users WHERE email = 'faculty@test.com';
  SELECT id INTO v_sub1 FROM subjects WHERE subject_code = 'CS101';
  SELECT id INTO v_sub2 FROM subjects WHERE subject_code = 'CS102';

  -- Sample announcements
  INSERT INTO announcements (subject_id, faculty_id, title, content) VALUES
    (v_sub1, v_faculty_id, 'Mid-term Exam Schedule', 'Mid-term exam for CS101 will be held on March 15th. Syllabus covers Chapters 1-5.'),
    (v_sub1, v_faculty_id, 'Lab Session Cancelled', 'Tomorrow''s lab session is cancelled due to maintenance. Will be rescheduled next week.'),
    (v_sub2, v_faculty_id, 'Assignment 1 Deadline Extended', 'The deadline for Assignment 1 has been extended to March 5th. Please submit on time.')
  ON CONFLICT DO NOTHING;

  -- Sample assignments
  INSERT INTO assignments (id, subject_id, faculty_id, title, total_marks) VALUES
    (gen_random_uuid(), v_sub1, v_faculty_id, 'Assignment 1 - Arrays & Loops', 50),
    (gen_random_uuid(), v_sub1, v_faculty_id, 'Quiz 1', 20)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_asgn1 FROM assignments WHERE title = 'Assignment 1 - Arrays & Loops' LIMIT 1;
  SELECT id INTO v_asgn2 FROM assignments WHERE title = 'Quiz 1' LIMIT 1;

  -- Sample marks for some students
  IF v_asgn1 IS NOT NULL THEN
    INSERT INTO assignment_marks (assignment_id, student_id, marks_obtained, remarks)
    SELECT v_asgn1, s.id, 
      (30 + floor(random() * 20))::numeric,
      CASE WHEN random() > 0.5 THEN 'Good work' ELSE NULL END
    FROM students s LIMIT 5
    ON CONFLICT (assignment_id, student_id) DO NOTHING;
  END IF;

  IF v_asgn2 IS NOT NULL THEN
    INSERT INTO assignment_marks (assignment_id, student_id, marks_obtained, remarks)
    SELECT v_asgn2, s.id,
      (10 + floor(random() * 10))::numeric,
      NULL
    FROM students s LIMIT 5
    ON CONFLICT (assignment_id, student_id) DO NOTHING;
  END IF;

  RAISE NOTICE '✅ Announcements & Assignments tables created with sample data!';
END $$;
