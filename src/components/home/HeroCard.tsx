import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants';
import { useRecentlyPlayed } from '../../hooks/useLibrary';
import { replaceQueueAndPlay } from '../../services/TrackPlayerService';
import { useLibraryStore } from '../../store/libraryStore';

export function HeroCard() {
  const recentlyPlayed = useRecentlyPlayed();
  const songs = useLibraryStore((s) => s.songs);

  // Fallback to the first song in the library if there's no play history yet
  const song = recentlyPlayed.length > 0 ? recentlyPlayed[0] : (songs.length > 0 ? songs[0] : null);

  if (!song) return null;

  const handlePlay = async () => {
    await replaceQueueAndPlay([song], 0);
  };

  const imageSource = song.artwork
    ? { uri: song.artwork }
    : require('../../../assets/images/defaultArtwork.png'); // Fallback placeholder

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity style={styles.container} activeOpacity={0.8} onPress={handlePlay}>
        <Image source={imageSource} style={styles.imageBackground} />

        <LinearGradient
          colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.content}>
          <Text style={styles.headerText}>Continue Listening</Text>

          <View style={styles.bottomRow}>
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
              <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
            </View>

            <TouchableOpacity style={styles.playButton} onPress={handlePlay}>
              <Ionicons name="play" size={24} color={Colors.textPrimary} style={{ marginLeft: 3 }} />
            </TouchableOpacity>
          </View>

          {/* Progress bar placeholder */}
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  container: {
    height: 240,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
  },
  imageBackground: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: 'space-between',
  },
  headerText: {
    ...Typography.body,
    color: '#FFFFFF',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    ...Typography.displayMedium,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  artist: {
    ...Typography.bodyMedium,
    color: 'rgba(255,255,255,0.8)',
  },
  playButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  progressFill: {
    width: '40%', // Placeholder progress
    height: '100%',
    backgroundColor: '#FFA500', // Assuming a brand accent color or just orange for now
    borderRadius: 2,
  },
});
