import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { LoadingSpinner } from '../../../components/common/LoadingSpinner';
import { useAuth } from '../../../contexts/AuthContext';
import { assignmentService } from '../../../services/assignmentService';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../styles/theme';

export default function MarksScreen() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [marks, setMarks] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadData();
            return () => { };
        }, [user?.id])
    );

    const loadData = async () => {
        if (!user?.id) return;
        try {
            const { data } = await assignmentService.getStudentMarks(user.id);
            if (data) setMarks(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    if (loading) return <LoadingSpinner fullScreen />;

    // Group marks by subject
    const grouped: { [key: string]: { subjectCode: string; subjectName: string; items: any[] } } = {};
    marks.forEach((m) => {
        const subCode = m.assignments?.subjects?.subject_code || 'Unknown';
        const subName = m.assignments?.subjects?.subject_name || '';
        if (!grouped[subCode]) grouped[subCode] = { subjectCode: subCode, subjectName: subName, items: [] };
        grouped[subCode].items.push(m);
    });

    const subjectColors = ['#4F46E5', '#14B8A6', '#F59E0B', '#EF4444', '#8B5CF6'];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerBar}>
                <Text style={styles.headerTitle}>My Marks</Text>
                <Text style={styles.headerSubtitle}>Assignment scores & grades</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
            >
                {Object.keys(grouped).length === 0 ? (
                    <View style={styles.emptyBox}>
                        <Ionicons name="school-outline" size={48} color={Colors.textLight} />
                        <Text style={styles.emptyTitle}>No marks yet</Text>
                        <Text style={styles.emptySubtitle}>Your assignment marks will appear here</Text>
                    </View>
                ) : (
                    Object.entries(grouped).map(([code, group], gIdx) => {
                        const total = group.items.reduce((s, m) => s + (m.assignments?.total_marks || 0), 0);
                        const obtained = group.items.reduce((s, m) => s + (parseFloat(m.marks_obtained) || 0), 0);
                        const pct = total > 0 ? Math.round((obtained / total) * 100) : 0;
                        const color = subjectColors[gIdx % subjectColors.length];

                        return (
                            <View key={code} style={styles.subjectGroup}>
                                <View style={styles.subjectHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.subjectCode}>{code}</Text>
                                        <Text style={styles.subjectName}>{group.subjectName}</Text>
                                    </View>
                                    <View style={[styles.percentBadge, { backgroundColor: color + '15' }]}>
                                        <Text style={[styles.percentText, { color }]}>{pct}%</Text>
                                    </View>
                                </View>

                                {/* Overall bar */}
                                <View style={styles.overallBar}>
                                    <Text style={styles.overallLabel}>{obtained}/{total} marks</Text>
                                    <View style={styles.progressTrack}>
                                        <View style={[styles.progressFill, { width: `${Math.max(2, pct)}%`, backgroundColor: color }]} />
                                    </View>
                                </View>

                                {/* Individual assignments */}
                                {group.items.map((m: any) => (
                                    <View key={m.id} style={styles.markRow}>
                                        <View style={styles.markIcon}>
                                            <Ionicons name="document-text" size={16} color={color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.markTitle}>{m.assignments?.title}</Text>
                                            {m.remarks && <Text style={styles.markRemarks}>{m.remarks}</Text>}
                                        </View>
                                        <View style={styles.markScore}>
                                            <Text style={styles.markScoreText}>
                                                {m.marks_obtained}<Text style={styles.markScoreTotal}>/{m.assignments?.total_marks}</Text>
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        );
                    })
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

    subjectGroup: {
        backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg - 4,
        marginBottom: Spacing.md, ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9',
    },
    subjectHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
    subjectCode: { fontSize: Typography.fontSize.xs, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
    subjectName: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
    percentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: BorderRadius.full },
    percentText: { fontSize: Typography.fontSize.sm, fontWeight: '700' },

    overallBar: { marginBottom: Spacing.md },
    overallLabel: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginBottom: 4 },
    progressTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: 6, borderRadius: 3 },

    markRow: {
        flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm,
        borderTopWidth: 1, borderTopColor: '#F8FAFC',
    },
    markIcon: {
        width: 32, height: 32, borderRadius: 8, backgroundColor: '#F8FAFC',
        alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm,
    },
    markTitle: { fontSize: Typography.fontSize.base, fontWeight: '500', color: Colors.textPrimary },
    markRemarks: { fontSize: Typography.fontSize.xs, color: Colors.textSecondary, marginTop: 1 },
    markScore: { alignItems: 'flex-end' },
    markScoreText: { fontSize: Typography.fontSize.md, fontWeight: '700', color: Colors.textPrimary },
    markScoreTotal: { fontSize: Typography.fontSize.sm, fontWeight: '400', color: Colors.textSecondary },
});
