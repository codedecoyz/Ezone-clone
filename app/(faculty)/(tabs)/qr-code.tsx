import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import { attendanceService } from '../../../services/attendanceService';
import { qrService } from '../../../services/qrService';
import { subjectService } from '../../../services/subjectService';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../styles/theme';
import type { Subject } from '../../../types/database';
import type { ScannedStudent } from '../../../types/models';

interface EnrolledStudentStatus {
  id: string;
  name: string;
  roll_number: string;
  marked: boolean;
  status?: string;
}

export default function QRCodeScreen() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [qrSession, setQrSession] = useState<{ token: string; validUntil: string } | null>(null);
  const [scannedStudents, setScannedStudents] = useState<ScannedStudent[]>([]);
  const [allStudents, setAllStudents] = useState<EnrolledStudentStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Poll for scans when session is active
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (qrSession && selectedSubject) {
      fetchAllStudentStatus(); // Initial fetch
      interval = setInterval(fetchAllStudentStatus, 3000); // Poll every 3 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [qrSession]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchSubjects();
      }
      return () => { };
    }, [user?.id])
  );

  const fetchSubjects = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await subjectService.getFacultySubjects(user.id);
      if (error) throw new Error(error);
      if (data) setSubjects(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch subjects');
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllStudentStatus = async () => {
    if (!selectedSubject) return;
    try {
      const dateStr = format(new Date(), 'yyyy-MM-dd');

      // Get all enrolled students
      const { data: enrolled } = await subjectService.getEnrolledStudents(selectedSubject);

      // Get today's attendance for this subject
      const { data: attendance } = await attendanceService.getAttendanceForDate(selectedSubject, dateStr);

      const markedIds = new Set((attendance || []).map((r: any) => r.student_id));

      const studentList: EnrolledStudentStatus[] = (enrolled || []).map((s: any) => ({
        id: s.id,
        name: s.full_name,
        roll_number: s.roll_number,
        marked: markedIds.has(s.id),
        status: (attendance || []).find((a: any) => a.student_id === s.id)?.status,
      }));

      // Sort: marked first, then unmarked
      studentList.sort((a, b) => {
        if (a.marked && !b.marked) return -1;
        if (!a.marked && b.marked) return 1;
        return a.roll_number.localeCompare(b.roll_number);
      });

      setAllStudents(studentList);
    } catch (err) {
      console.error('Error fetching student status:', err);
    }
  };

  const handleGenerateQR = async () => {
    if (!selectedSubject || !user?.id) return;

    setGenerating(true);
    try {
      const date = format(new Date(), 'yyyy-MM-dd');
      const { data, error } = await qrService.generateQRSession(user.id, selectedSubject, date);

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      if (data) {
        setQrSession({
          token: data.session_token,
          validUntil: data.valid_until,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to generate QR code');
    } finally {
      setGenerating(false);
    }
  };

  const handleStopSession = () => {
    Alert.alert(
      'Stop Session',
      'Are you sure you want to stop the attendance session? Students will no longer be able to scan.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: () => {
            setQrSession(null);
            setScannedStudents([]);
            setAllStudents([]);
            setSelectedSubject(null);
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchSubjects();
  };

  const markedCount = allStudents.filter(s => s.marked).length;
  const totalCount = allStudents.length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <LoadingSpinner size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.headerTitle}>QR Attendance</Text>

        {!qrSession ? (
          <>
            <Text style={styles.sectionTitle}>Select Subject</Text>
            {subjects.length === 0 ? (
              <EmptyState
                title="No Subjects Found"
                message="You haven't been assigned any subjects yet."
              />
            ) : (
              <View style={styles.grid}>
                {subjects.map((subject) => (
                  <TouchableOpacity
                    key={subject.id}
                    style={[
                      styles.subjectCard,
                      selectedSubject === subject.id && styles.subjectCardSelected
                    ]}
                    onPress={() => setSelectedSubject(subject.id)}
                  >
                    <Text style={[
                      styles.subjectCode,
                      selectedSubject === subject.id && styles.textSelected
                    ]}>{subject.subject_code}</Text>
                    <Text style={[
                      styles.subjectName,
                      selectedSubject === subject.id && styles.textSelected
                    ]} numberOfLines={2}>{subject.subject_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.actionContainer}>
              <Button
                title="Generate QR Code"
                onPress={handleGenerateQR}
                disabled={!selectedSubject}
                loading={generating}
                fullWidth
              />
            </View>
          </>
        ) : (
          <View style={styles.sessionContainer}>
            <View style={styles.qrCard}>
              <Text style={styles.sessionTitle}>Scan to Mark Attendance</Text>
              <Text style={styles.sessionSubtitle}>
                Subject: {subjects.find(s => s.id === selectedSubject)?.subject_name}
              </Text>

              <View style={styles.qrWrapper}>
                <QRCode
                  value={qrSession.token}
                  size={200}
                  color={Colors.black}
                  backgroundColor={Colors.white}
                />
              </View>

              <Text style={styles.expiryText}>
                Valid until {format(new Date(qrSession.validUntil), 'hh:mm a')}
              </Text>

              <TouchableOpacity style={styles.regenerateBtn} onPress={handleGenerateQR} disabled={generating}>
                <Ionicons name="refresh" size={16} color={Colors.primary} />
                <Text style={styles.regenerateBtnText}>
                  {generating ? 'Generating...' : 'Generate New QR'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Stats bar */}
            <View style={styles.statsBar}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{markedCount}</Text>
                <Text style={styles.statLabel}>Present</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalCount - markedCount}</Text>
                <Text style={styles.statLabel}>Waiting</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{totalCount}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
            </View>

            {/* All students list */}
            <View style={styles.scannedList}>
              <Text style={styles.listTitle}>Students ({markedCount}/{totalCount})</Text>
              {allStudents.length === 0 ? (
                <Text style={styles.emptyListText}>Loading students...</Text>
              ) : (
                allStudents.map((student) => (
                  <View key={student.id} style={styles.studentItem}>
                    <View style={styles.studentInfoRow}>
                      <Ionicons
                        name={student.marked ? 'checkmark-circle' : 'time-outline'}
                        size={20}
                        color={student.marked ? Colors.success : Colors.textSecondary}
                        style={{ marginRight: 8 }}
                      />
                      <View>
                        <Text style={styles.studentName}>{student.name}</Text>
                        <Text style={styles.studentRoll}>{student.roll_number}</Text>
                      </View>
                    </View>
                    <View style={[
                      styles.statusBadge,
                      student.marked
                        ? (student.status === 'late' ? styles.statusLate : styles.statusPresent)
                        : styles.statusWaiting
                    ]}>
                      <Text style={[
                        styles.statusText,
                        !student.marked && styles.statusTextWaiting
                      ]}>
                        {student.marked ? (student.status || 'PRESENT').toUpperCase() : 'WAITING'}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Button
              title="End Session"
              onPress={handleStopSession}
              variant="outline"
              style={styles.stopButton}
              fullWidth
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  subjectCard: {
    width: '47%',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.sm,
  },
  subjectCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  subjectCode: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.5,
  },
  subjectName: {
    fontSize: Typography.fontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  textSelected: {
    color: Colors.white,
  },
  actionContainer: {
    marginTop: 'auto',
  },
  sessionContainer: {
    alignItems: 'center',
  },
  qrCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    width: '100%',
    ...Shadows.md,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sessionTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  sessionSubtitle: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  qrWrapper: {
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
  },
  expiryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.error,
  },
  scannedList: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  listTitle: {
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  emptyListText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  studentName: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  studentRoll: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusPresent: {
    backgroundColor: Colors.success + '15',
  },
  statusLate: {
    backgroundColor: Colors.late + '15',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  stopButton: {
    borderColor: Colors.error,
  },
  regenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: '#EEF2FF',
  },
  regenerateBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.fontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  studentInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusWaiting: {
    backgroundColor: '#F1F5F9',
  },
  statusTextWaiting: {
    color: Colors.textSecondary,
  },
});
