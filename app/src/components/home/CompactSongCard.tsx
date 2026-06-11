import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Song } from '../../types';

interface Props {
  song: Song;
  onPress: () => void;
}

export function CompactSongCard({ song, onPress }: Props) {
  const imageSource = song.artwork 
    ? { uri: song.artwork } 
    : require('../../../assets/images/defaultArtwork.png'); // Fallback

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7} onPress={onPress}>
      <Image source={imageSource} style={styles.artwork} contentFit="cover" />
      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={1}>{song.title}</Text>
        <Text style={styles.artist} numberOfLines={1}>{song.artist}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  artwork: {
    width: 60,
    height: 60,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
  },
  textContainer: {
    flex: 1,
    marginLeft: Spacing.sm,
    justifyContent: 'center',
  },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  artist: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
