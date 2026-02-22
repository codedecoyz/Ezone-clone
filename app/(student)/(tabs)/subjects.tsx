import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import { subjectService } from '../../../services/subjectService';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../styles/theme';

interface StudentSubject {
  id: string;
  subject_name: string;
  subject_code: string;
  schedule?: string;
  faculty_name?: string;
  attendance_percentage?: number;
}

export default function SubjectsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchSubjects();
    }, [user?.id])
  );

  const fetchSubjects = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await subjectService.getStudentSubjects(user.id);
      if (error) throw new Error(error);
      if (data) setSubjects(data as unknown as StudentSubject[]);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSpinner fullScreen />;

  const subjectColors = ['#4F46E5', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>My Subjects</Text>
        <Text style={styles.headerSubtitle}>{subjects.length} enrolled</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSubjects(); }} />}
      >
        {subjects.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="book-outline" size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No Subjects</Text>
            <Text style={styles.emptySubtitle}>You are not enrolled in any subjects yet</Text>
          </View>
        ) : (
          subjects.map((subject, index) => (
            <View key={subject.id} style={styles.subjectCard}>
              <View style={styles.subjectTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{subject.subject_name}</Text>
                  <View style={styles.subjectMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{subject.faculty_name || 'Faculty'}</Text>
                    </View>
                    {subject.schedule && (
                      <View style={styles.metaItem}>
                        <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                        <Text style={styles.metaText}>{subject.schedule}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={[styles.codeBadge, { backgroundColor: (subjectColors[index % subjectColors.length]) + '15' }]}>
                  <Text style={[styles.codeText, { color: subjectColors[index % subjectColors.length] }]}>{subject.subject_code}</Text>
                </View>
              </View>
              <View style={styles.progressSection}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Attendance</Text>
                  <Text style={[
                    styles.progressValue,
                    { color: (subject.attendance_percentage || 0) >= 75 ? Colors.success : Colors.error }
                  ]}>{Math.round(subject.attendance_percentage || 0)}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(2, subject.attendance_percentage || 0)}%`,
                      backgroundColor: (subject.attendance_percentage || 0) >= 75 ? Colors.success : Colors.error,
                    }
                  ]} />
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerBar: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.md },
  headerTitle: { fontSize: Typography.fontSize.xxl, fontWeight: '700', color: Colors.textPrimary },
  headerSubtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  listContent: { padding: Spacing.lg },

  emptyBox: { alignItems: 'center', paddingVertical: Spacing.xxl + 20 },
  emptyTitle: { fontSize: Typography.fontSize.lg, fontWeight: '600', color: Colors.textPrimary, marginTop: Spacing.md },
  emptySubtitle: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  subjectCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg - 4,
    marginBottom: Spacing.md, ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9',
  },
  subjectTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  subjectName: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6 },
  subjectMeta: { flexDirection: 'row', gap: Spacing.md, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary },
  codeBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  codeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  progressSection: { marginTop: Spacing.md },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  progressLabel: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: Colors.textLight },
  progressValue: { fontSize: Typography.fontSize.xs, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
});
