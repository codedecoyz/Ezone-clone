import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    Modal,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import { announcementService } from '../../../services/announcementService';
import { assignmentService } from '../../../services/assignmentService';
import { subjectService } from '../../../services/subjectService';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../styles/theme';

export default function ManageScreen() {
    const { user } = useAuth();
    const [tab, setTab] = useState<'announcements' | 'assignments'>('announcements');
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [assignments, setAssignments] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    // Assignment modal
    const [showModal, setShowModal] = useState(false);
    const [assignTitle, setAssignTitle] = useState('');
    const [assignMarks, setAssignMarks] = useState('100');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    // Marks entry
    const [showMarksModal, setShowMarksModal] = useState(false);
    const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
    const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
    const [marksMap, setMarksMap] = useState<{ [key: string]: string }>({});
    const [savingMarks, setSavingMarks] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
            return () => { };
        }, [user?.id])
    );

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const { data: subs } = await subjectService.getFacultySubjects(user.id);
            if (subs) setSubjects(subs);

            const { data: anns } = await announcementService.getFacultyAnnouncements(user.id);
            if (anns) setAnnouncements(anns);

            const { data: asgns } = await assignmentService.getFacultyAssignments(user.id);
            if (asgns) setAssignments(asgns);
        } catch (err) {
            console.error('Error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCreateAssignment = async () => {
        if (!selectedSubjectId || !assignTitle.trim() || !user?.id) return;
        setCreating(true);
        try {
            const { error } = await assignmentService.createAssignment(
                selectedSubjectId, user.id, assignTitle.trim(), parseInt(assignMarks) || 100
            );
            if (error) throw new Error(error);
            setShowModal(false);
            setAssignTitle('');
            setAssignMarks('100');
            setSelectedSubjectId(null);
            loadData();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleOpenMarksEntry = async (assignment: any) => {
        setSelectedAssignment(assignment);
        try {
            const { data: enrolled } = await subjectService.getEnrolledStudents(assignment.subject_id);
            const { data: existingMarks } = await assignmentService.getMarksForAssignment(assignment.id);

            const marksObj: { [key: string]: string } = {};
            (existingMarks || []).forEach((m: any) => {
                marksObj[m.student_id] = m.marks_obtained.toString();
            });
            setMarksMap(marksObj);
            setEnrolledStudents(enrolled || []);
            setShowMarksModal(true);
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveMarks = async () => {
        if (!selectedAssignment) return;
        setSavingMarks(true);
        try {
            const marks = Object.entries(marksMap)
                .filter(([_, v]) => v.trim() !== '')
                .map(([studentId, value]) => ({
                    assignment_id: selectedAssignment.id,
                    student_id: studentId,
                    marks_obtained: parseFloat(value),
                }));

            if (marks.length === 0) {
                Alert.alert('No marks', 'Please enter at least one mark');
                setSavingMarks(false);
                return;
            }

            const { error } = await assignmentService.addBulkMarks(marks);
            if (error) throw new Error(error);
            Alert.alert('Success', 'Marks saved!');
            setShowMarksModal(false);
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setSavingMarks(false);
        }
    };

    const handleDeleteAnnouncement = (id: string) => {
        Alert.alert('Delete', 'Delete this announcement?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive',
                onPress: async () => {
                    await announcementService.deleteAnnouncement(id);
                    loadData();
                },
            },
        ]);
    };

    if (loading) return <LoadingSpinner fullScreen />;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerBar}>
                <Text style={styles.headerTitle}>Manage</Text>
            </View>

            {/* Tabs */}
            <View style={styles.tabBar}>
                <TouchableOpacity style={[styles.tabItem, tab === 'announcements' && styles.tabItemActive]} onPress={() => setTab('announcements')}>
                    <Ionicons name="megaphone-outline" size={18} color={tab === 'announcements' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.tabText, tab === 'announcements' && styles.tabTextActive]}>Announcements</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabItem, tab === 'assignments' && styles.tabItemActive]} onPress={() => setTab('assignments')}>
                    <Ionicons name="document-text-outline" size={18} color={tab === 'assignments' ? Colors.primary : Colors.textSecondary} />
                    <Text style={[styles.tabText, tab === 'assignments' && styles.tabTextActive]}>Assignments</Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
            >
                {tab === 'announcements' ? (
                    <>
                        {announcements.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons name="megaphone-outline" size={40} color={Colors.textLight} />
                                <Text style={styles.emptyText}>No announcements yet</Text>
                            </View>
                        ) : (
                            announcements.map((ann) => (
                                <View key={ann.id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View style={styles.annDot} />
                                        <Text style={styles.cardSubject}>{ann.subjects?.subject_code}</Text>
                                        <Text style={styles.cardTime}>{format(new Date(ann.created_at), 'MMM d, h:mm a')}</Text>
                                    </View>
                                    <Text style={styles.cardTitle}>{ann.title}</Text>
                                    <Text style={styles.cardDesc}>{ann.content}</Text>
                                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteAnnouncement(ann.id)}>
                                        <Ionicons name="trash-outline" size={16} color={Colors.error} />
                                    </TouchableOpacity>
                                </View>
                            ))
                        )}
                    </>
                ) : (
                    <>
                        {assignments.length === 0 ? (
                            <View style={styles.emptyBox}>
                                <Ionicons name="document-text-outline" size={40} color={Colors.textLight} />
                                <Text style={styles.emptyText}>No assignments yet</Text>
                            </View>
                        ) : (
                            assignments.map((asgn) => (
                                <TouchableOpacity key={asgn.id} style={styles.card} onPress={() => handleOpenMarksEntry(asgn)}>
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.cardSubject}>{asgn.subjects?.subject_code}</Text>
                                        <Text style={styles.cardTime}>Total: {asgn.total_marks}</Text>
                                    </View>
                                    <Text style={styles.cardTitle}>{asgn.title}</Text>
                                    <Text style={styles.cardDesc}>Tap to enter/edit marks →</Text>
                                </TouchableOpacity>
                            ))
                        )}
                    </>
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    if (tab === 'assignments') {
                        setShowModal(true);
                    } else {
                        // Navigate to dashboard to use the announcement modal there
                        Alert.alert('Tip', 'Use the + button on the Dashboard to post announcements');
                    }
                }}
            >
                <Ionicons name="add" size={28} color={Colors.white} />
            </TouchableOpacity>

            {/* Create Assignment Modal */}
            <Modal visible={showModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Assignment</Text>
                            <TouchableOpacity onPress={() => setShowModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Subject</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                            {subjects.map((s) => (
                                <TouchableOpacity
                                    key={s.id}
                                    style={[styles.chip, selectedSubjectId === s.id && styles.chipActive]}
                                    onPress={() => setSelectedSubjectId(s.id)}
                                >
                                    <Text style={[styles.chipText, selectedSubjectId === s.id && styles.chipTextActive]}>{s.subject_code}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.inputLabel}>Title</Text>
                        <TextInput style={styles.input} value={assignTitle} onChangeText={setAssignTitle} placeholder="e.g. Quiz 1, Assignment 2" placeholderTextColor={Colors.textLight} />

                        <Text style={styles.inputLabel}>Total Marks</Text>
                        <TextInput style={styles.input} value={assignMarks} onChangeText={setAssignMarks} placeholder="100" keyboardType="numeric" placeholderTextColor={Colors.textLight} />

                        <TouchableOpacity
                            style={[styles.saveBtn, (!selectedSubjectId || !assignTitle.trim()) && { opacity: 0.5 }]}
                            onPress={handleCreateAssignment}
                            disabled={creating || !selectedSubjectId || !assignTitle.trim()}
                        >
                            <Text style={styles.saveBtnText}>{creating ? 'Creating...' : 'Create Assignment'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Enter Marks Modal */}
            <Modal visible={showMarksModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '85%' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Enter Marks</Text>
                                <Text style={{ fontSize: 12, color: Colors.textSecondary }}>
                                    {selectedAssignment?.title} (/{selectedAssignment?.total_marks})
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowMarksModal(false)}>
                                <Ionicons name="close" size={24} color={Colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 400 }}>
                            {enrolledStudents.map((student: any) => (
                                <View key={student.id} style={styles.markRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.markName}>{student.full_name}</Text>
                                        <Text style={styles.markRoll}>{student.roll_number}</Text>
                                    </View>
                                    <TextInput
                                        style={styles.markInput}
                                        value={marksMap[student.id] || ''}
                                        onChangeText={(v) => setMarksMap((prev) => ({ ...prev, [student.id]: v }))}
                                        keyboardType="numeric"
                                        placeholder="0"
                                        placeholderTextColor={Colors.textLight}
                                    />
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveMarks} disabled={savingMarks}>
                            <Text style={styles.saveBtnText}>{savingMarks ? 'Saving...' : 'Save Marks'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    headerBar: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
    headerTitle: { fontSize: Typography.fontSize.xxl, fontWeight: '700', color: Colors.textPrimary },

    tabBar: { flexDirection: 'row', marginHorizontal: Spacing.lg, backgroundColor: '#F1F5F9', borderRadius: BorderRadius.lg, padding: 4 },
    tabItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.sm + 2, borderRadius: BorderRadius.md },
    tabItemActive: { backgroundColor: Colors.white, ...Shadows.sm },
    tabText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textSecondary },
    tabTextActive: { color: Colors.primary },

    listContent: { padding: Spacing.lg },

    card: {
        backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md,
        marginBottom: Spacing.sm, ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9',
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    annDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginRight: 6 },
    cardSubject: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: Colors.primary, flex: 1 },
    cardTime: { fontSize: Typography.fontSize.xs, color: Colors.textLight },
    cardTitle: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
    cardDesc: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
    deleteBtn: { position: 'absolute', top: Spacing.md, right: Spacing.md },

    emptyBox: { alignItems: 'center', paddingVertical: Spacing.xxl },
    emptyText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm },

    fab: {
        position: 'absolute', bottom: 90, right: 20, width: 52, height: 52, borderRadius: 26,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadows.lg,
    },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl,
        padding: Spacing.lg, paddingBottom: Spacing.xxl + 10,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
    modalTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary },

    inputLabel: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
    input: {
        backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md, padding: Spacing.md,
        fontSize: Typography.fontSize.base, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
    },

    chip: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: '#F1F5F9', marginRight: Spacing.sm },
    chipActive: { backgroundColor: Colors.primary },
    chipText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textSecondary },
    chipTextActive: { color: Colors.white },

    saveBtn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.lg },
    saveBtnText: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.white },

    markRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    markName: { fontSize: Typography.fontSize.base, fontWeight: '500', color: Colors.textPrimary },
    markRoll: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
    markInput: {
        width: 70, backgroundColor: '#F8FAFC', borderRadius: BorderRadius.sm, padding: Spacing.sm,
        fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.textPrimary, textAlign: 'center',
        borderWidth: 1, borderColor: Colors.border,
    },
});
