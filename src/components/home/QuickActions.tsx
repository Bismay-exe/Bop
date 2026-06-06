import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing } from '../../constants';

const ACTIONS = [
  { id: 'favorites', icon: 'heart', route: '/library/favorites' },
  { id: 'downloads', icon: 'download', route: '/library/folders' }, // Placeholder for downloads
  { id: 'playlists', icon: 'musical-notes', route: '/library/playlists' },
  { id: 'artists', icon: 'person', route: '/library/artists' },
  { id: 'albums', icon: 'disc', route: '/library/albums' },
] as const;

export function QuickActions() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {ACTIONS.map((action) => (
          <TouchableOpacity
            key={action.id}
            style={styles.actionBtn}
            onPress={() => router.push(action.route as any)}
            activeOpacity={0.7}
          >
            <Ionicons name={action.icon as any} size={28} color={Colors.textPrimary} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.md, // Needs React Native 0.71+ for gap in flex
  },
  actionBtn: {
    width: 75,
    height: 75,
    borderRadius: Radius.lg,
    backgroundColor: '#00000015',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
