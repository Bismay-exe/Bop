import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';

export function HomeHeader() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Ionicons name="headset" size={28} color={Colors.textPrimary} style={styles.icon} />
        <Text style={styles.title}>Bop</Text>
      </View>
      <TouchableOpacity onPress={() => router.push('/settings')} style={styles.settingsBtn}>
        <Ionicons name="settings-sharp" size={26} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: Spacing.sm,
  },
  title: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
  },
  settingsBtn: {
    padding: Spacing.xs,
  },
});
