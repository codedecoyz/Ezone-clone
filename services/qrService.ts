import { QR_CODE_VALIDITY_MINUTES } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { generateUUID } from '../lib/utils';

export const qrService = {
  async generateQRSession(facultyId: string, subjectId: string, date: string) {
    try {
      // Generate session token
      const sessionToken = generateUUID();
      const validUntil = new Date();
      validUntil.setMinutes(validUntil.getMinutes() + QR_CODE_VALIDITY_MINUTES);

      const { data, error } = await supabase
        .from('qr_sessions')
        .insert({
          subject_id: subjectId,
          faculty_id: facultyId,
          session_token: sessionToken,
          date,
          valid_until: validUntil.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async validateQRSession(sessionToken: string, studentId: string) {
    try {
      // Call database function to validate
      const { data, error } = await supabase.rpc('validate_qr_session', {
        p_session_token: sessionToken,
        p_student_id: studentId,
      });

      if (error) throw error;

      // Data returns: { is_valid, status, subject_id, message }
      return { data, error: null };
    } catch (error: any) {
      return { data: null, error: error.message };
    }
  },

  async markAttendanceFromQR(
    sessionToken: string,
    studentId: string
  ) {
    try {
      // Use secure RPC to validate and insert in one go
      const { data, error } = await supabase.rpc('mark_attendance_qr', {
        p_session_token: sessionToken,
        p_student_id: studentId,
      });

      if (error) throw error;

      // data is an array of rows because it returns TABLE(...)
      // We expect one row
      const result = data && data[0] ? data[0] : null;

      if (!result) {
        return { success: false, message: 'Unknown error', error: null };
      }

      return {
        success: result.success,
        message: result.message,
        status: result.status_result,
        error: null,
      };
    } catch (error: any) {
      // Handle duplicate attendance gracefully
      if (error?.code === '23505') {
        return { success: true, message: 'Attendance already marked for today!', status: 'present', error: null };
      }
      console.error('QR Scan Error:', error);
      return { success: false, message: error.message || 'Failed to mark attendance', error: error.message };
    }
  },

  async getSessionScans(sessionToken: string) {
    try {
      // Get session details
      const { data: session } = await supabase
        .from('qr_sessions')
        .select('subject_id, date, created_at')
        .eq('session_token', sessionToken)
        .single();

      if (!session) {
        return { data: [], error: 'Session not found' };
      }

      // Get attendance records marked after session creation
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          student_id,
          status,
          marked_at,
          students (
            roll_number
          )
        `)
        .eq('subject_id', session.subject_id)
        .eq('date', session.date)
        .gte('marked_at', session.created_at)
        .order('marked_at', { ascending: false });

      if (error) throw error;

      // Get student names
      const scansWithNames = await Promise.all(
        (data || []).map(async (record: any) => {
          const { data: userData } = await supabase
            .from('users')
            .select('full_name')
            .eq('id', record.student_id)
            .single();

          return {
            student_id: record.student_id,
            name: userData?.full_name || '',
            roll_number: record.students?.roll_number || '',
            status: record.status,
            time: record.marked_at,
          };
        })
      );

      return { data: scansWithNames, error: null };
    } catch (error: any) {
      return { data: [], error: error.message };
    }
  },
};

export default qrService;
