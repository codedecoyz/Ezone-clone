import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { subjectService } from '../../../services/subjectService';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../styles/theme';

export default function FacultyDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSubjects: 0,
    totalStudents: 0,
    todayClasses: 0,
  });

  // Announcement modal
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementContent, setAnnouncementContent] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    try {
      const { data } = await subjectService.getFacultySubjects(user.id);
      if (data) {
        setSubjects(data);
        const totalStudents = data.reduce((sum: number, s: any) => sum + (s.students_count || 0), 0);
        setStats({ totalSubjects: data.length, totalStudents, todayClasses: 0 });
      }

      const { data: anns } = await announcementService.getFacultyAnnouncements(user.id);
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

  const handlePostAnnouncement = async () => {
    if (!selectedSubjectId || !announcementTitle.trim() || !announcementContent.trim() || !user?.id) return;
    setPosting(true);
    try {
      const { error } = await announcementService.createAnnouncement(
        selectedSubjectId, user.id, announcementTitle.trim(), announcementContent.trim()
      );
      if (error) throw new Error(error);
      setShowAnnouncementModal(false);
      setAnnouncementTitle('');
      setAnnouncementContent('');
      setSelectedSubjectId(null);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to post announcement');
    } finally {
      setPosting(false);
    }
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
          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="book" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.statNumber}>{stats.totalSubjects}</Text>
              <Text style={styles.statLabel}>Subjects</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#F0FDFA' }]}>
                <Ionicons name="people" size={20} color="#14B8A6" />
              </View>
              <Text style={styles.statNumber}>{stats.totalStudents}</Text>
              <Text style={styles.statLabel}>Students</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}>
                <Ionicons name="calendar" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statNumber}>{stats.todayClasses}</Text>
              <Text style={styles.statLabel}>Today</Text>
            </View>
          </View>

          {/* My Subjects */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Subjects</Text>
          </View>

          {subjects.map((subject, index) => (
            <View key={subject.id} style={styles.subjectCard}>
              <View style={styles.subjectTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjectName}>{subject.subject_name}</Text>
                  <View style={styles.subjectMeta}>
                    <View style={styles.metaItem}>
                      <Ionicons name="people-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{subject.students_count || 0} students</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={13} color={Colors.textSecondary} />
                      <Text style={styles.metaText}>{subject.schedule || 'N/A'}</Text>
                    </View>
                  </View>
                </View>
                <View style={[styles.codeBadge, { backgroundColor: (subjectColors[index % subjectColors.length]) + '15' }]}>
                  <Text style={[styles.codeText, { color: subjectColors[index % subjectColors.length] }]}>{subject.subject_code}</Text>
                </View>
              </View>
              <View style={styles.attendanceBar}>
                <View style={styles.attendanceBarHeader}>
                  <Text style={styles.attendanceBarLabel}>Attendance</Text>
                  <Text style={[
                    styles.attendanceBarValue,
                    { color: (subject.average_attendance || 0) >= 75 ? Colors.success : Colors.error }
                  ]}>{Math.round(subject.average_attendance || 0)}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[
                    styles.progressFill,
                    {
                      width: `${Math.max(2, subject.average_attendance || 0)}%`,
                      backgroundColor: (subject.average_attendance || 0) >= 75 ? Colors.success : Colors.error
                    }
                  ]} />
                </View>
              </View>
            </View>
          ))}

          {/* Recent Announcements */}
          <View style={[styles.sectionHeader, { marginTop: Spacing.lg }]}>
            <Text style={styles.sectionTitle}>Recent Announcements</Text>
            <TouchableOpacity onPress={() => setShowAnnouncementModal(true)}>
              <Text style={styles.addLink}>+ New</Text>
            </TouchableOpacity>
          </View>

          {announcements.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="megaphone-outline" size={32} color={Colors.textLight} />
              <Text style={styles.emptyText}>No announcements yet</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAnnouncementModal(true)}>
                <Text style={styles.emptyButtonText}>Post one</Text>
              </TouchableOpacity>
            </View>
          ) : (
            announcements.slice(0, 5).map((ann) => (
              <View key={ann.id} style={styles.announcementCard}>
                <View style={styles.annHeader}>
                  <View style={styles.annDot} />
                  <Text style={styles.annSubject}>{ann.subjects?.subject_code}</Text>
                  <Text style={styles.annTime}>{format(new Date(ann.created_at), 'MMM d')}</Text>
                </View>
                <Text style={styles.annTitle}>{ann.title}</Text>
                <Text style={styles.annContent} numberOfLines={2}>{ann.content}</Text>
              </View>
            ))
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAnnouncementModal(true)}>
        <Ionicons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>

      {/* Announcement Modal */}
      <Modal visible={showAnnouncementModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Post Announcement</Text>
              <TouchableOpacity onPress={() => setShowAnnouncementModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectPicker}>
              {subjects.map((s) => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.subjectChip, selectedSubjectId === s.id && styles.subjectChipActive]}
                  onPress={() => setSelectedSubjectId(s.id)}
                >
                  <Text style={[styles.subjectChipText, selectedSubjectId === s.id && styles.subjectChipTextActive]}>{s.subject_code}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={announcementTitle}
              onChangeText={setAnnouncementTitle}
              placeholder="Announcement title"
              placeholderTextColor={Colors.textLight}
            />

            <Text style={styles.inputLabel}>Content</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={announcementContent}
              onChangeText={setAnnouncementContent}
              placeholder="Write your announcement..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.postButton, (!selectedSubjectId || !announcementTitle.trim()) && styles.postButtonDisabled]}
              onPress={handlePostAnnouncement}
              disabled={posting || !selectedSubjectId || !announcementTitle.trim()}
            >
              <Text style={styles.postButtonText}>{posting ? 'Posting...' : 'Post Announcement'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  // Stats
  statsGrid: { flexDirection: 'row', gap: Spacing.md - 4, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.md,
    alignItems: 'center', ...Shadows.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  statNumber: { fontSize: Typography.fontSize.xxl, fontWeight: '700', color: Colors.textPrimary },
  statLabel: { fontSize: Typography.fontSize.xs, fontWeight: '500', color: Colors.textSecondary },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, paddingHorizontal: 2 },
  sectionTitle: { fontSize: Typography.fontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  addLink: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.primary },

  // Subject cards
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
  attendanceBar: { marginTop: Spacing.md },
  attendanceBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  attendanceBarLabel: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: Colors.textLight },
  attendanceBarValue: { fontSize: Typography.fontSize.xs, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  // Announcements
  announcementCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9',
  },
  annHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  annDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary, marginRight: 6 },
  annSubject: { fontSize: Typography.fontSize.xs, fontWeight: '600', color: Colors.primary, flex: 1 },
  annTime: { fontSize: Typography.fontSize.xs, color: Colors.textLight },
  annTitle: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  annContent: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, lineHeight: 18 },

  // Empty
  emptyCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.xl,
    alignItems: 'center', ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9',
  },
  emptyText: { fontSize: Typography.fontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm },
  emptyButton: { marginTop: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.primaryLightest },
  emptyButtonText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.primary },

  // FAB
  fab: {
    position: 'absolute', bottom: 90, right: 20, width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.textPrimary, alignItems: 'center', justifyContent: 'center',
    ...Shadows.lg,
  },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: Colors.white, borderTopLeftRadius: BorderRadius.xxl, borderTopRightRadius: BorderRadius.xxl,
    padding: Spacing.lg, paddingBottom: Spacing.xxl + 10,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  modalTitle: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary },

  inputLabel: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: Spacing.md },
  input: {
    backgroundColor: '#F8FAFC', borderRadius: BorderRadius.md, padding: Spacing.md,
    fontSize: Typography.fontSize.base, color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  textArea: { height: 100, textAlignVertical: 'top' },

  subjectPicker: { flexDirection: 'row' },
  subjectChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
    backgroundColor: '#F1F5F9', marginRight: Spacing.sm,
  },
  subjectChipActive: { backgroundColor: Colors.primary },
  subjectChipText: { fontSize: Typography.fontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  subjectChipTextActive: { color: Colors.white },

  postButton: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg, padding: Spacing.md,
    alignItems: 'center', marginTop: Spacing.lg,
  },
  postButtonDisabled: { opacity: 0.5 },
  postButtonText: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.white },
});
