import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { Button, TextInput, Title, useTheme } from 'react-native-paper'; // Dropdown would be good for faculty selection, but Input for now
import { supabase } from '../../../lib/supabase';

// Simple Dropdown substitute if needed, or just use ID/Email entry for faculty
// For better UX, we should fetch faculty list.

export default function AddSubject() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subjectCode: '',
    subjectName: '',
    semester: '',
    department: 'Computer Science',
    facultyEmail: '', // Using email to find faculty ID
    schedule: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.subjectCode || !formData.subjectName || !formData.semester || !formData.facultyEmail) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // 1. Find faculty ID from email
      const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', formData.facultyEmail)
      .eq('role', 'faculty')
      .single();

      if (userError || !userData) {
        throw new Error('Faculty not found with this email');
      }

      const facultyId = userData.id;

      // 2. Insert subject
      const { error: subjectError } = await supabase.from('subjects').insert({
        subject_code: formData.subjectCode,
        subject_name: formData.subjectName,
        semester: parseInt(formData.semester),
        department: formData.department,
        faculty_id: facultyId,
        schedule: formData.schedule,
      });

      if (subjectError) throw subjectError;

      Alert.alert('Success', 'Subject created successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Add New Subject</Title>
      
      <TextInput
        label="Subject Code"
        value={formData.subjectCode}
        onChangeText={(text) => handleChange('subjectCode', text)}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Subject Name"
        value={formData.subjectName}
        onChangeText={(text) => handleChange('subjectName', text)}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Semester"
        value={formData.semester}
        onChangeText={(text) => handleChange('semester', text)}
        mode="outlined"
        keyboardType="numeric"
        style={styles.input}
      />

      <TextInput
        label="Department"
        value={formData.department}
        onChangeText={(text) => handleChange('department', text)}
        mode="outlined"
        style={styles.input}
      />

      <TextInput
        label="Faculty Email"
        value={formData.facultyEmail}
        onChangeText={(text) => handleChange('facultyEmail', text)}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="Enter faculty email to assign"
        style={styles.input}
      />

      <TextInput
        label="Schedule"
        value={formData.schedule}
        onChangeText={(text) => handleChange('schedule', text)}
        mode="outlined"
        placeholder="e.g. Mon 10:00 AM"
        style={styles.input}
      />

      <Button 
        mode="contained" 
        onPress={handleSubmit} 
        loading={loading}
        style={styles.button}
      >
        Create Subject
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 10,
    marginBottom: 30,
  },
});
