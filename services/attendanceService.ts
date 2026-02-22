import { supabase } from '../lib/supabase';
import type { AttendanceStats } from '../types/database';
import type { AttendanceMarkData } from '../types/models';

export const attendanceService = {
  async markAttendance(records: AttendanceMarkData[]) {
    try {
      // Use upsert to handle both insert and update
      const { data, error } = await supabase
        .from('attendance_records')
        .upsert(
          records.map((record) => ({
            student_id: record.student_id,
            subject_id: record.subject_id,
            date: record.date,
            status: record.status,
            marked_by: record.marked_by,
            notes: record.notes,
            marked_at: new Date().toISOString(),
          })),
          {
            onConflict: 'student_id,subject_id,date',
            ignoreDuplicates: false,
          }
        );

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getAttendanceForDate(subjectId: string, date: string) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          students (
            roll_number
          )
        `)
        .eq('subject_id', subjectId)
        .eq('date', date);

      if (error) throw error;

      // Get student names
      const recordsWithNames = await Promise.all(
        (data || []).map(async (record: any) => {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', record.student_id)
            .single();

          return {
            ...record,
            student_name: userData?.full_name || '',
            roll_number: record.students?.roll_number || '',
          };
        })
      );

      return { data: recordsWithNames, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getStudentAttendance(studentId: string, subjectId: string) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId)
        .order('date', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async calculateAttendanceStats(
    studentId: string,
    subjectId: string
  ): Promise<{ data: AttendanceStats | null; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('status')
        .eq('student_id', studentId)
        .eq('subject_id', subjectId);

      if (error) throw error;

      const records = (data || []) as { status: string }[];
      const present = records.filter((r) => r.status === 'present').length;
      const absent = records.filter((r) => r.status === 'absent').length;
      const late = records.filter((r) => r.status === 'late').length;
      const excused = records.filter((r) => r.status === 'excused').length;
      const total = records.length;

      // Get subject setting for counting late
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('count_late_as_present')
        .eq('id', subjectId)
        .single();

      const countLate = subjectData?.count_late_as_present ?? true;
      const effectivePresent = countLate ? present + late : present;
      const percentage = total > 0 ? Math.round((effectivePresent / total) * 100) : 0;

      return {
        data: {
          present,
          absent,
          late,
          excused,
          total,
          percentage,
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getOverallAttendance(studentId: string) {
    try {
      // Get all subjects for student
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('subject_id')
        .eq('student_id', studentId);

      if (!enrollments || enrollments.length === 0) {
        return { data: { percentage: 0, totalClasses: 0, attended: 0 }, error: null };
      }

      let totalClasses = 0;
      let totalAttended = 0;

      for (const enrollment of enrollments) {
        const stats = await this.calculateAttendanceStats(studentId, enrollment.subject_id);
        if (stats.data) {
          totalClasses += stats.data.total;
          totalAttended += stats.data.present + (stats.data.late || 0);
        }
      }

      const percentage = totalClasses > 0 ? Math.round((totalAttended / totalClasses) * 100) : 0;

      return {
        data: {
          percentage,
          totalClasses,
          attended: totalAttended,
        },
        error: null,
      };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async getAttendanceForDateRange(
    subjectId: string,
    startDate: string,
    endDate: string
  ) {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          *,
          students (
            roll_number
          )
        `)
        .eq('subject_id', subjectId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      // Get student names
      const recordsWithNames = await Promise.all(
        (data || []).map(async (record: any) => {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', record.student_id)
            .single();

          return {
            ...record,
            student_name: userData?.full_name || '',
            roll_number: record.students?.roll_number || '',
          };
        })
      );

      return { data: recordsWithNames, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },
};

export default attendanceService;
