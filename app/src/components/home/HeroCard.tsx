import { LinearGradient } from 'expo-linear-gradient';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PauseIcon from '../../assets/icons/pause.svg';
import PlayIcon from '../../assets/icons/play.svg';
import { Colors, Radius, Spacing, Typography } from '../../constants';
import { useRecentlyPlayed } from '../../hooks/useLibrary';
import { usePlayer } from '../../hooks/usePlayer';
import { replaceQueueAndPlay, togglePlayback } from '../../services/TrackPlayerService';
import { useLibraryStore } from '../../store/libraryStore';
import ProgressBar from '../player/ProgressBar';

export function HeroCard() {
  const recentlyPlayed = useRecentlyPlayed();
  const songs = useLibraryStore((s) => s.songs);
  const { currentTrack, playbackState } = usePlayer();
  const isPlaying = playbackState === 'playing';

  // Show active track if playing/paused in current session, else fallback to recent
  const song = currentTrack || (recentlyPlayed.length > 0 ? recentlyPlayed[0] : (songs.length > 0 ? songs[0] : null));

  if (!song) return null;

  const handlePlay = async () => {
    if (currentTrack && currentTrack.id === song.id) {
      await togglePlayback();
    } else {
      await replaceQueueAndPlay([song], 0);
    }
  };

  const imageSource = song.artwork
    ? { uri: song.artwork }
    : require('../../../assets/images/defaultArtwork.png'); // Fallback placeholder

  return (
    <View style={styles.outerContainer}>
      <TouchableOpacity style={styles.container} activeOpacity={0.8} onPress={handlePlay}>
        <Image source={imageSource} style={styles.imageBackground} />

        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,1)']}
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
              {isPlaying && currentTrack?.id === song.id ? (
                <PauseIcon width={24} height={24} color={Colors.textPrimary} />
              ) : (
                <View style={{ paddingLeft: 4 }}>
                  <PlayIcon width={24} height={24} color={Colors.textPrimary} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            <ProgressBar variant="mini" />
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
    marginBottom: Spacing.lg,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.md,
  },
  title: {
    fontFamily: 'Semibold',
    fontSize: 24,
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
  progressContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.lg,
    right: Spacing.lg,
  },
});
