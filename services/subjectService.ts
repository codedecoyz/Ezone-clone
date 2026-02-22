import { supabase } from '../lib/supabase';

export const subjectService = {
  async getFacultySubjects(facultyId: string) {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          enrollments(count)
        `)
        .eq('faculty_id', facultyId)
        .order('subject_name');

      if (error) throw error;

      // Process to get student counts
      const subjectsWithStats = await Promise.all(
        (data || []).map(async (subject: any) => {
          // Get enrollment count
          const { count: studentsCount } = await supabase
            .from('enrollments')
            .select('id', { count: 'exact', head: true })
            .eq('subject_id', subject.id);

          // Calculate average attendance directly
          let avgAttendance = 0;
          const { count: totalRecords } = await supabase
            .from('attendance_records')
            .select('id', { count: 'exact', head: true })
            .eq('subject_id', subject.id);

          if (totalRecords && totalRecords > 0) {
            const { count: presentRecords } = await supabase
              .from('attendance_records')
              .select('id', { count: 'exact', head: true })
              .eq('subject_id', subject.id)
              .in('status', ['present', 'late']);

            avgAttendance = Math.round(((presentRecords || 0) / totalRecords) * 100);
          }

          return {
            ...subject,
            students_count: studentsCount || 0,
            average_attendance: avgAttendance,
          };
        })
      );

      return { data: subjectsWithStats, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getStudentSubjects(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          subject_id,
          subjects (
            id,
            subject_code,
            subject_name,
            faculty_id,
            semester,
            department,
            schedule,
            count_late_as_present
          )
        `)
        .eq('student_id', studentId);

      if (error) throw error;

      // Get faculty names and attendance stats
      const subjectsWithStats = await Promise.all(
        (data || []).map(async (enrollment: any) => {
          const subject = enrollment.subjects;

          // Get faculty name
          let facultyName = 'Unknown';
          if (subject.faculty_id) {
            const { data: facultyData } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', subject.faculty_id)
              .single();
            facultyName = facultyData?.full_name || 'Unknown';
          }

          // Calculate attendance percentage
          const { data: percentage } = await supabase
            .rpc('calculate_attendance_percentage', {
              p_student_id: studentId,
              p_subject_id: subject.id,
            });

          // Get attendance counts
          const { data: records } = await supabase
            .from('attendance_records')
            .select('status')
            .eq('student_id', studentId)
            .eq('subject_id', subject.id);

          const presentCount = records?.filter((r) => r.status === 'present').length || 0;
          const absentCount = records?.filter((r) => r.status === 'absent').length || 0;
          const lateCount = records?.filter((r) => r.status === 'late').length || 0;
          const excusedCount = records?.filter((r) => r.status === 'excused').length || 0;

          return {
            ...subject,
            faculty_name: facultyName,
            present_count: presentCount,
            absent_count: absentCount,
            late_count: lateCount,
            excused_count: excusedCount,
            total_classes: records?.length || 0,
            attendance_percentage: percentage || 0,
          };
        })
      );

      return { data: subjectsWithStats, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getSubjectById(subjectId: string) {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getEnrolledStudents(subjectId: string) {
    try {
      const { data, error } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          students (
            id,
            roll_number,
            department,
            semester
          )
        `)
        .eq('subject_id', subjectId)
        .order('students(roll_number)');

      if (error) throw error;

      // Get user details for each student
      const studentsWithDetails = await Promise.all(
        (data || []).map(async (enrollment: any) => {
          const student = enrollment.students;

          const { data: userData } = await supabase
            .from('users')
            .select('full_name, email')
            .eq('id', student.id)
            .single();

          return {
            ...student,
            full_name: userData?.full_name || '',
            email: userData?.email || '',
          };
        })
      );

      return { data: studentsWithDetails, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
};

export default subjectService;
