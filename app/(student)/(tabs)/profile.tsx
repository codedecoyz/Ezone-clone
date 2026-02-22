import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { BorderRadius, Colors, Shadows, Spacing, Typography } from '../../../styles/theme';

export default function StudentProfile() {
  const { user, signOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await signOut(); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <LinearGradient colors={['#4F46E5', '#4338CA']} style={styles.avatarCircle}>
            <Ionicons name="person" size={40} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.profileName}>{user?.full_name}</Text>
          <Text style={styles.profileRole}>Student</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="person-outline" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{user?.full_name}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="mail-outline" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="school-outline" size={18} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>Student</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerSection: { alignItems: 'center', paddingTop: Spacing.xl + 10, paddingBottom: Spacing.lg },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md },
  profileName: { fontSize: Typography.fontSize.xl, fontWeight: '700', color: Colors.textPrimary },
  profileRole: { fontSize: Typography.fontSize.sm, fontWeight: '500', color: Colors.textSecondary, marginTop: 2 },

  content: { paddingHorizontal: Spacing.lg },

  infoCard: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl, padding: Spacing.lg - 4,
    ...Shadows.sm, borderWidth: 1, borderColor: '#F1F5F9', marginBottom: Spacing.lg,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm },
  infoIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  infoLabel: { fontSize: Typography.fontSize.xs, fontWeight: '500', color: Colors.textSecondary },
  infoValue: { fontSize: Typography.fontSize.base, fontWeight: '600', color: Colors.textPrimary, marginTop: 1 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: Spacing.xs },

  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.md,
    borderWidth: 1, borderColor: '#FEE2E2', ...Shadows.sm,
  },
  logoutText: { fontSize: Typography.fontSize.md, fontWeight: '600', color: Colors.error },
});
