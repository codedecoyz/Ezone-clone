import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from '../common/Card';
import { Colors, Spacing, Typography, BorderRadius } from '../../styles/theme';
import { getAttendanceColor } from '../../lib/utils';

interface SubjectCardProps {
  subjectName: string;
  subjectCode: string;
  studentsCount?: number;
  schedule?: string;
  attendancePercentage: number;
  facultyName?: string;
  onPress?: () => void;
}

export function SubjectCard({
  subjectName,
  subjectCode,
  studentsCount,
  schedule,
  attendancePercentage,
  facultyName,
  onPress,
}: SubjectCardProps) {
  const attendanceColor = getAttendanceColor(attendancePercentage);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {subjectName}
            </Text>
            {facultyName && (
              <Text style={styles.facultyName} numberOfLines={1}>
                {facultyName}
              </Text>
            )}
          </View>
          <View style={[styles.badge, { backgroundColor: Colors.primaryLight }]}>
            <Text style={styles.badgeText}>{subjectCode}</Text>
          </View>
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          {studentsCount !== undefined && (
            <View style={styles.infoItem}>
              <Ionicons name="people-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText}>{studentsCount} students</Text>
            </View>
          )}
          {schedule && (
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.infoText} numberOfLines={1}>
                {schedule}
              </Text>
            </View>
          )}
        </View>

        {/* Attendance */}
        <View style={styles.attendanceContainer}>
          <View style={styles.attendanceHeader}>
            <Text style={styles.attendanceLabel}>Attendance</Text>
            <Text style={[styles.attendancePercentage, { color: attendanceColor }]}>
              {attendancePercentage}%
            </Text>
          </View>
          <View style={styles.progressBarContainer}>
            <LinearGradient
              colors={[attendanceColor, attendanceColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressBar, { width: `${attendancePercentage}%` }]}
            />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.fontSize.md,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs / 2,
    fontWeight: '600',
  },
  facultyName: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs / 2,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.white,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs / 2,
  },
  attendanceContainer: {
    marginTop: Spacing.xs,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  attendanceLabel: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  attendancePercentage: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.bold,
    fontWeight: '700',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 10,
  },
});

export default SubjectCard;
