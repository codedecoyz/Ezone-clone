import { Ionicons } from '@expo/vector-icons';
import { addDays, format } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../../components/common/Button';
import EmptyState from '../../../components/common/EmptyState';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import type { AttendanceStatus } from '../../../lib/constants';
import { attendanceService } from '../../../services/attendanceService';
import { exportService } from '../../../services/exportService';
import { subjectService } from '../../../services/subjectService';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../styles/theme';
import type { Student, Subject } from '../../../types/database';

interface EnrolledStudent extends Student {
  full_name: string;
  email: string;
}

export default function MarkAttendanceScreen() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [attendanceData, setAttendanceData] = useState<Record<string, AttendanceStatus>>({});
  const [loading, setLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchSubjects();
      }
    }, [user?.id])
  );

  useEffect(() => {
    if (selectedSubject) {
      fetchStudentsAndAttendance();
    }
  }, [selectedSubject, selectedDate]);

  const fetchSubjects = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await subjectService.getFacultySubjects(user.id);
      if (error) throw new Error(error);
      if (data) setSubjects(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to fetch subjects');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsAndAttendance = async () => {
    if (!selectedSubject) return;
    setFetchingStudents(true);
    try {
      // 1. Get Enrolled Students
      const { data: studentsData, error: studentsError } = await subjectService.getEnrolledStudents(selectedSubject);
      if (studentsError) throw new Error(studentsError);

      const enrolledStudents = studentsData || [];
      setStudents(enrolledStudents);

      // 2. Get Existing Attendance for Date
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const { data: attendanceRecords, error: attendanceError } = await attendanceService.getAttendanceForDate(selectedSubject, dateStr);

      if (attendanceError) throw new Error(attendanceError);

      // 3. Merge Data
      const initialAttendance: Record<string, AttendanceStatus> = {};

      // Default to 'present' for all students if no record exists
      enrolledStudents.forEach(student => {
        initialAttendance[student.id] = 'present';
      });

      // Override with existing records
      if (attendanceRecords) {
        attendanceRecords.forEach((record: any) => {
          initialAttendance[record.student_id] = record.status;
        });
      }

      setAttendanceData(initialAttendance);

    } catch (error: any) {
      Alert.alert('Error', 'Failed to load class data');
      console.error(error);
    } finally {
      setFetchingStudents(false);
    }
  };

  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const markAll = (status: AttendanceStatus) => {
    const newData: Record<string, AttendanceStatus> = {};
    students.forEach(student => {
      newData[student.id] = status;
    });
    setAttendanceData(newData);
  };

  const handleSubmit = async () => {
    if (!selectedSubject || !user?.id) return;

    setSubmitting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      const recordsToSubmit = Object.entries(attendanceData).map(([studentId, status]) => ({
        student_id: studentId,
        subject_id: selectedSubject,
        date: dateStr,
        status,
        marked_by: user.id,
      }));

      const { error } = await attendanceService.markAttendance(recordsToSubmit);

      if (error) throw new Error(error);

      Alert.alert('Success', 'Attendance saved successfully');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to save attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleExport = async () => {
    if (!selectedSubject) return;

    const subject = subjects.find((s) => s.id === selectedSubject);
    if (!subject) return;

    setExporting(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const rows = students.map((student) => ({
        rollNumber: student.roll_number,
        studentName: student.full_name,
        status: attendanceData[student.id] || 'absent',
      }));

      const { success, error } = await exportService.exportAttendanceToExcel(
        subject.subject_name,
        subject.subject_code,
        dateStr,
        rows
      );

      if (!success) {
        Alert.alert('Export Failed', error || 'Could not export attendance');
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to export attendance');
    } finally {
      setExporting(false);
    }
  };

  const changeDate = (days: number) => {
    const newDate = addDays(selectedDate, days);
    setSelectedDate(newDate);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
      </View>

      {!selectedSubject ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Select Subject</Text>
          {subjects.length === 0 ? (
            <EmptyState title="No Subjects" message="You have no subjects assigned." />
          ) : (
            <View style={styles.grid}>
              {subjects.map((subject) => (
                <TouchableOpacity
                  key={subject.id}
                  style={styles.subjectCard}
                  onPress={() => setSelectedSubject(subject.id)}
                >
                  <Text style={styles.subjectCode}>{subject.subject_code}</Text>
                  <Text style={styles.subjectName}>{subject.subject_name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <View style={styles.mainContainer}>
          {/* Controls Bar */}
          <View style={styles.controlsBar}>
            <TouchableOpacity onPress={() => setSelectedSubject(null)} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={Colors.primary} />
            </TouchableOpacity>

            <View style={styles.dateControls}>
              <TouchableOpacity onPress={() => changeDate(-1)} style={styles.dateBtn}>
                <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
              <Text style={styles.dateText}>{format(selectedDate, 'EEE, MMM d')}</Text>
              <TouchableOpacity onPress={() => changeDate(1)} style={styles.dateBtn}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {fetchingStudents ? (
            <LoadingSpinner size="large" />
          ) : (
            <>
              <View style={styles.statsBar}>
                <View style={styles.statsInfo}>
                  <Text style={styles.statsLabel}>Total Students: {students.length}</Text>
                  <Text style={styles.statsLabel}>
                    Present: {Object.values(attendanceData).filter(s => s === 'present').length}
                  </Text>
                </View>
                <View style={styles.bulkActions}>
                  <TouchableOpacity onPress={() => markAll('present')} style={styles.bulkBtn}>
                    <Text style={styles.bulkBtnText}>All Present</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <ScrollView contentContainerStyle={styles.studentList}>
                {students.length === 0 ? (
                  <EmptyState title="No Students" message="No students enrolled in this subject." />
                ) : (
                  students.map((student) => (
                    <View key={student.id} style={styles.studentRow}>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{student.full_name}</Text>
                        <Text style={styles.studentRoll}>{student.roll_number}</Text>
                      </View>

                      <View style={styles.statusButtons}>
                        {(['present', 'absent', 'late', 'excused'] as const).map((status) => {
                          const statusStyleMap = {
                            present: styles.statusBtnPresent,
                            absent: styles.statusBtnAbsent,
                            late: styles.statusBtnLate,
                            excused: styles.statusBtnExcused,
                          };

                          return (
                            <TouchableOpacity
                              key={status}
                              style={[
                                styles.statusBtn,
                                attendanceData[student.id] === status && statusStyleMap[status]
                              ]}
                              onPress={() => handleStatusChange(student.id, status)}
                            >
                              <Text style={[
                                styles.statusBtnText,
                                attendanceData[student.id] === status && styles.statusBtnTextSelected
                              ]}>
                                {status.charAt(0).toUpperCase()}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.footerButtons}>
                  <Button
                    title="Save Attendance"
                    onPress={handleSubmit}
                    loading={submitting}
                    style={styles.saveBtn}
                  />
                  <TouchableOpacity
                    style={styles.exportBtn}
                    onPress={handleExport}
                    disabled={exporting}
                  >
                    <Ionicons name="download-outline" size={20} color={Colors.primary} />
                    <Text style={styles.exportBtnText}>{exporting ? 'Exporting...' : 'Excel'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: Typography.fontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  content: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
    color: Colors.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  subjectCard: {
    width: '47%',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Shadows.sm,
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
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  mainContainer: {
    flex: 1,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  dateControls: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  dateBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: {
    fontSize: Typography.fontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.background,
  },
  statsInfo: {
    flex: 1,
  },
  statsLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bulkBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.full,
  },
  bulkBtnText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: '600',
    color: Colors.white,
  },
  studentList: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  studentInfo: {
    flex: 1,
    marginRight: Spacing.sm,
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
  statusButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  statusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.textSecondary,
  },
  statusBtnTextSelected: {
    color: Colors.white,
  },
  statusBtnPresent: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  statusBtnAbsent: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  statusBtnLate: {
    backgroundColor: Colors.late,
    borderColor: Colors.late,
  },
  statusBtnExcused: {
    backgroundColor: Colors.excused,
    borderColor: Colors.excused,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  saveBtn: {
    flex: 1,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  exportBtnText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
});
