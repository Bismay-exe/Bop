import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '../../constants';
import { ArtistGroup } from '../../hooks/useLibrary';

interface ArtistCardProps {
  artist: ArtistGroup;
  onPress: (artist: ArtistGroup) => void;
}

function ArtistCardComponent({ artist, onPress }: ArtistCardProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={() => onPress(artist)}>
      <View style={styles.iconContainer}>
        <Ionicons name="person-outline" size={24} color={Colors.textSecondary} />
      </View>
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {artist.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {artist.songs.length} {artist.songs.length === 1 ? 'song' : 'songs'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.divider} />
    </TouchableOpacity>
  );
}

export const ArtistCard = React.memo(ArtistCardComponent, (prev, next) => {
  return prev.artist.name === next.artist.name && prev.artist.songs.length === next.artist.songs.length;
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceHover,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: 'center',
  },
  title: {
    ...Typography.body,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
});
