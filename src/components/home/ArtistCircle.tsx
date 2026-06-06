import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing } from '../../constants';

interface Props {
  name: string;
  artworkUri?: string;
  onPress: () => void;
}

export function ArtistCircle({ name, artworkUri, onPress }: Props) {
  const imageSource = artworkUri 
    ? { uri: artworkUri } 
    : require('../../../assets/images/defaultArtwork.png'); // Fallback

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.7} onPress={onPress}>
      <Image source={imageSource} style={styles.artwork} contentFit="cover" />
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 150,
  },
  artwork: {
    width: 150,
    height: 150,
    borderRadius: 75, // Circle
    backgroundColor: Colors.surface,
    marginBottom: Spacing.xs,
  },
  name: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
});
