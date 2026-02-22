import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from '../../../components/common/Card';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { ProgressCircle } from '../../../components/dashboard/ProgressCircle';
import { useAuth } from '../../../contexts/AuthContext';
import { getMotivationalMessage } from '../../../lib/utils';
import { announcementService } from '../../../services/announcementService';
import { attendanceService } from '../../../services/attendanceService';
import { subjectService } from '../../../services/subjectService';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../styles/theme';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [overallAttendance, setOverallAttendance] = useState({
    percentage: 0,
    attended: 0,
    total: 0,
  });

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: subjectsData } = await subjectService.getStudentSubjects(user.id);
      if (subjectsData) setSubjects(subjectsData);

      const { data: overallData } = await attendanceService.getOverallAttendance(user.id);
      if (overallData) {
        setOverallAttendance({
          percentage: overallData.percentage,
          attended: overallData.attended,
          total: overallData.totalClasses,
        });
      }

      const { data: anns } = await announcementService.getStudentAnnouncements(user.id);
      if (anns) setAnnouncements(anns);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  const subjectColors = ['#4F46E5', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <LinearGradient colors={['#4F46E5', '#4338CA', '#3B82F6']} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.welcomeText}>Welcome back,</Text>
              <Text style={styles.userName}>{user?.full_name}</Text>
            </View>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color={Colors.white} />
              </View>
              <View style={styles.onlineDot} />
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {/* Overall Attendance Card */}
          <Card style={styles.attendanceCard}>
            <ProgressCircle percentage={overallAttendance.percentage} size={130} />
            <Text style={styles.attendanceLabel}>OVERALL ATTENDANCE</Text>
            <Text style={styles.motivationalText}>
              {getMotivationalMessage(overallAttendance.percentage)}
            </Text>
            <Text style={styles.statsText}>
              {overallAttendance.attended} / {overallAttendance.total} classes attended
            </Text>
          </Card>

          {/* Stats Row */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="book" size={18} color="#4F46E5" />
              </View>
              <Text style={styles.statNumber}>{subjects.length}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#F0FDFA' }]}>
                <Ionicons name="checkmark-circle" size={18} color="#14B8A6" />
              </View>
              <Text style={styles.statNumber}>{overallAttendance.attended}</Text>
              <Text style={styles.statLabel}>Present</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="calendar" size={18} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>{overallAttendance.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>

          {/* Announcements */}
          {announcements.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Announcements</Text>
              </View>
              {announcements.slice(0, 5).map((ann) => (
                <View key={ann.id} style={styles.annCard}>
                  <View style={styles.annHeader}>
                    <View style={styles.annDot} />
                    <Text style={styles.annSubject}>{ann.subjects?.subject_code}</Text>
                    <Text style={styles.annTime}>{format(new Date(ann.created_at), 'MMM d')}</Text>
                  </View>
                  <Text style={styles.annTitle}>{ann.title}</Text>
                  <Text style={styles.annContent} numberOfLines={2}>{ann.content}</Text>
                </View>
              ))}
            </>
          )}

          {/* Subjects */}
          <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
            <Text style={styles.sectionTitle}>My Subjects</Text>
          </View>
          {subjects.map((subject, index) => (
            <View key={subject.id} style={styles.subjectCard}>
              <View style={styles.subjectTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{subject.subject_name}</Text>
                  <View style={styles.subjectMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{subject.faculty_name || 'Faculty'}</Text>
                    </View>
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
          ))}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollView: { flex: 1 },

  header: {
    paddingTop: Spacing.xl + 10,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl + 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeText: { fontSize: Typography.fontSize.sm, color: '#C7D2FE', fontWeight: '500', marginBottom: 2 },
  userName: { fontSize: Typography.fontSize.xxl, fontWeight: '700', color: Colors.white, letterSpacing: -0.5 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
  onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#34D399', borderWidth: 2, borderColor: '#4F46E5' },

  content: { paddingHorizontal: Spacing.lg - 4, marginTop: -Spacing.xxl },

  attendanceCard: { alignItems: 'center', paddingVertical: Spacing.lg, marginBottom: Spacing.lg, borderRadius: BorderRadius.xl },
  attendanceLabel: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: Colors.textSecondary, marginTop: Spacing.md, letterSpacing: 1 },
  motivationalText: { fontSize: Typography.fontSize.base, fontWeight: '500', color: Colors.textPrimary, marginTop: Spacing.xs },
  statsText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: 2 },

  statsGrid: { flexDirection: 'row', gap: Spacing.md - 4, marginBottom: Spacing.lg },
  statCard: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md, alignItems: 'center', ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9' },
  statIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statNumber: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: Typography.fontSize.xs, fontWeight: '500', color: Colors.textSecondary },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, paddingHorizontal: 2 },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary },

  // Announcements
  annCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md, marginBottom: Spacing.sm, ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9' },
  annHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  annDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginRight: 6 },
  annSubject: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: Colors.primary, flex: 1 },
  annTime: { fontSize: Typography.fontSize.xs, color: Colors.textLight },
  annTitle: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  annContent: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, lineHeight: 18 },

  // Subject cards
  subjectCard: { backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg - 4, marginBottom: Spacing.md, ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9' },
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
