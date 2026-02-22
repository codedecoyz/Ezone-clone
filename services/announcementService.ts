import { supabase } from '../lib/supabase';

export const announcementService = {
    async createAnnouncement(subjectId: string, facultyId: string, title: string, content: string) {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .insert({ subject_id: subjectId, faculty_id: facultyId, title, content })
                .select()
                .single();

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async getAnnouncementsBySubject(subjectId: string) {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*')
                .eq('subject_id', subjectId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async getFacultyAnnouncements(facultyId: string) {
        try {
            const { data, error } = await supabase
                .from('announcements')
                .select('*, subjects(subject_code, subject_name)')
                .eq('faculty_id', facultyId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async getStudentAnnouncements(studentId: string) {
        try {
            // Get enrolled subject IDs
            const { data: enrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select('subject_id')
                .eq('student_id', studentId);

            if (enrollError) throw enrollError;

            const subjectIds = (enrollments || []).map((e: any) => e.subject_id);
            if (subjectIds.length === 0) return { data: [], error: null };

            const { data, error } = await supabase
                .from('announcements')
                .select('*, subjects(subject_code, subject_name)')
                .in('subject_id', subjectIds)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            return { data, error: null };
        } catch (error: any) {
            return { data: null, error: error.message };
        }
    },

    async deleteAnnouncement(id: string) {
        try {
            const { error } = await supabase.from('announcements').delete().eq('id', id);
            if (error) throw error;
            return { error: null };
        } catch (error: any) {
            return { error: error.message };
        }
    },
};

export default announcementService;
