import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { FAB, List, Searchbar, useTheme } from 'react-native-paper';
import { supabase } from '../../../lib/supabase';

export default function SubjectsList() {
  const theme = useTheme();
  const router = useRouter();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  async function fetchSubjects() {
    const { data, error } = await supabase
      .from('subjects')
      .select(`
        *,
        faculty:faculty_id (
          users (full_name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subjects:', error);
    } else {
      setSubjects(data || []);
    }
  }

  const onChangeSearch = (query: string) => setSearchQuery(query);

  const filteredSubjects = subjects.filter(subject => 
    subject.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    subject.subject_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Searchbar
        placeholder="Search subjects"
        onChangeText={onChangeSearch}
        value={searchQuery}
        style={styles.searchBar}
      />

      <FlatList
        data={filteredSubjects}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <List.Item
            title={`${item.subject_code} - ${item.subject_name}`}
            description={`Faculty: ${item.faculty?.users?.full_name || 'Unassigned'} | Sem: ${item.semester}`}
            left={props => <List.Icon {...props} icon="book" />}
            onPress={() => console.log('View subject', item.id)}
          />
        )}
      />

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => router.push('/(admin)/subjects/add')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  searchBar: {
    marginBottom: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
