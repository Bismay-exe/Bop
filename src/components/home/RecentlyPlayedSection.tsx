import { StyleSheet, Text, View, ScrollView, Dimensions } from 'react-native';
import { Colors, Spacing, Typography } from '../../constants';
import { useRecentlyPlayed } from '../../hooks/useLibrary';
import { replaceQueueAndPlay } from '../../services/TrackPlayerService';
import { CompactSongCard } from './CompactSongCard';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = width * 0.85;

export function RecentlyPlayedSection() {
  const recentlyPlayed = useRecentlyPlayed();

  if (recentlyPlayed.length === 0) return null;

  // Maximum 4 columns * 4 rows = 16 songs
  const songsToDisplay = recentlyPlayed.slice(0, 16);

  const columns = [];
  for (let i = 0; i < songsToDisplay.length; i += 4) {
    columns.push(songsToDisplay.slice(i, i + 4));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Recently Played</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={COLUMN_WIDTH + Spacing.md}
        decelerationRate="fast"
        contentContainerStyle={styles.scrollContent}
      >
        {columns.map((column, colIndex) => (
          <View key={`col-${colIndex}`} style={styles.column}>
            {column.map((song) => (
              <CompactSongCard
                key={song.id}
                song={song}
                onPress={() => replaceQueueAndPlay(recentlyPlayed, recentlyPlayed.findIndex(s => s.id === song.id))}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.title,
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
  },
  column: {
    width: COLUMN_WIDTH,
    marginRight: Spacing.md,
  },
});
