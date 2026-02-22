import { supabase } from '../lib/supabase';

export const assignmentService = {
    async createAssignment(subjectId: string, facultyId: string, title: string, totalMarks: number) {
        try {
            const { data, error } = await supabase
                .from('assignments')
                .insert({ subject_id: subjectId, faculty_id: facultyId, title, total_marks: totalMarks })
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async getAssignmentsBySubject(subjectId: string) {
        try {
            const { data, error } = await supabase
                .from('assignments')
                .select('*')
                .eq('subject_id', subjectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async getFacultyAssignments(facultyId: string) {
        try {
            const { data, error } = await supabase
                .from('assignments')
                .select('*, subjects(subject_code, subject_name)')
                .eq('faculty_id', facultyId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async addMarks(assignmentId: string, studentId: string, marksObtained: number, remarks?: string) {
        try {
            const { data, error } = await supabase
                .from('assignment_marks')
                .upsert(
                    { assignment_id: assignmentId, student_id: studentId, marks_obtained: marksObtained, remarks },
                    { onConflict: 'assignment_id,student_id' }
                )
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async addBulkMarks(marks: { assignment_id: string; student_id: string; marks_obtained: number; remarks?: string }[]) {
        try {
            const { data, error } = await supabase
                .from('assignment_marks')
                .upsert(marks, { onConflict: 'assignment_id,student_id' })
                .select();

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async getMarksForAssignment(assignmentId: string) {
        try {
            const { data, error } = await supabase
                .from('assignment_marks')
                .select('*')
                .eq('assignment_id', assignmentId)
                .order('marks_obtained', { ascending: false });

            if (error) throw error;

            // Get student names
            const marksWithNames = await Promise.all(
                (data || []).map(async (mark: any) => {
                    const { data: userData } = await supabase
                        .from('users')
                        .select('full_name')
                        .eq('id', mark.student_id)
                        .single();

                    const { data: studentData } = await supabase
                        .from('students')
                        .select('roll_number')
                        .eq('id', mark.student_id)
                        .single();

                    return {
                        ...mark,
                        student_name: userData?.full_name || '',
                        roll_number: studentData?.roll_number || '',
                    };
                })
            );

            return { data: marksWithNames, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async getStudentMarks(studentId: string) {
        try {
            const { data, error } = await supabase
                .from('assignment_marks')
                .select('*, assignments(id, title, total_marks, subject_id, subjects(subject_code, subject_name))')
                .eq('student_id', studentId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },
};

export default assignmentService;
