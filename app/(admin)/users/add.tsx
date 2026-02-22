import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { Button, SegmentedButtons, TextInput, Title, useTheme } from 'react-native-paper';
import { supabase } from '../../../lib/supabase';

export default function AddUser() {
  const theme = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState('student');
  const [formData, setFormData] = useState({
    email: '',
    password: 'password123', // Default for ease
    fullName: '',
    // Student specific
    rollNumber: '',
    department: 'Computer Science',
    semester: '1',
    // Faculty specific
    employeeId: '',
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.fullName) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      // call the postgres function create_test_user we made (if mapped to rpc)
      // OR since we might not have exposed it, we'll try to insert to auth.users if we are admin
      // user. 
      // ACTUALLY, strict RLS usually prevents client-side 'auth.users' insert.
      // We will assume the RPC 'create_test_user' is available OR we are just inserting to 'users' table 
      // and letting triggers handle it (if configured), OR we need that RPC.
      // Let's assume we exposed 'create_test_user' as an RPC function in our previous SQL step.
      // Wait, I created 'create_test_user' as SECURITY DEFINER but didn't explicitly grant it to anon/authenticated.
      // But Admin should be authenticated. I need to make sure I run the SQL to create the function.
      
      const { data, error } = await supabase.rpc('create_test_user', {
        p_email: formData.email,
        p_password: formData.password,
        p_role: role,
        p_full_name: formData.fullName
      });

      if (error) throw error;
      
      const userId = data; // The returned UUID

      // Now insert into specific role tables
      if (role === 'student') {
        const { error: studentError } = await supabase.from('students').insert({
          id: userId,
          roll_number: formData.rollNumber,
          enrollment_year: new Date().getFullYear(),
          semester: parseInt(formData.semester),
          department: formData.department,
        });
        if (studentError) throw studentError;
      } else if (role === 'faculty') {
        const { error: facultyError } = await supabase.from('faculty').insert({
          id: userId,
          employee_id: formData.employeeId,
          department: formData.department,
        });
        if (facultyError) throw facultyError;
      }

      Alert.alert('Success', 'User created successfully');
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Title style={styles.title}>Add New User</Title>
      
      <SegmentedButtons
        value={role}
        onValueChange={setRole}
        buttons={[
          { value: 'student', label: 'Student' },
          { value: 'faculty', label: 'Faculty' },
          { value: 'admin', label: 'Admin' },
        ]}
        style={styles.segmentedButton}
      />

      <TextInput
        label="Email"
        value={formData.email}
        onChangeText={(text) => handleChange('email', text)}
        mode="outlined"
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        label="Password"
        value={formData.password}
        onChangeText={(text) => handleChange('password', text)}
        mode="outlined"
        secureTextEntry
        style={styles.input}
      />

      <TextInput
        label="Full Name"
        value={formData.fullName}
        onChangeText={(text) => handleChange('fullName', text)}
        mode="outlined"
        style={styles.input}
      />

      {role === 'student' && (
        <>
          <TextInput
            label="Roll Number"
            value={formData.rollNumber}
            onChangeText={(text) => handleChange('rollNumber', text)}
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
        </>
      )}

      {role === 'faculty' && (
        <TextInput
          label="Employee ID"
          value={formData.employeeId}
          onChangeText={(text) => handleChange('employeeId', text)}
          mode="outlined"
          style={styles.input}
        />
      )}
      
      {(role === 'student' || role === 'faculty') && (
        <TextInput
          label="Department"
          value={formData.department}
          onChangeText={(text) => handleChange('department', text)}
          mode="outlined"
          style={styles.input}
        />
      )}

      <Button 
        mode="contained" 
        onPress={handleSubmit} 
        loading={loading}
        style={styles.button}
      >
        Create User
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
  segmentedButton: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 10,
    marginBottom: 30,
  },
});
