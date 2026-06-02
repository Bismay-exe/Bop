import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Playlist } from '../../types';
import { Colors, Typography, Spacing, Radius } from '../../constants';
import { Ionicons } from '@expo/vector-icons';

interface PlaylistCardProps {
  playlist: Playlist;
  onPress: (playlist: Playlist) => void;
  onLongPress?: (playlist: Playlist) => void;
}

function PlaylistCardComponent({ playlist, onPress, onLongPress }: PlaylistCardProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(playlist)}
      onLongPress={onLongPress ? () => onLongPress(playlist) : undefined}
      delayLongPress={250}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="list" size={24} color={Colors.textSecondary} />
      </View>
      <View style={styles.details}>
        <Text style={styles.title} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {playlist.songIds.length} {playlist.songIds.length === 1 ? 'song' : 'songs'}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.moreButton}
        onPress={onLongPress ? () => onLongPress(playlist) : undefined}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export const PlaylistCard = React.memo(PlaylistCardComponent, (prev, next) => {
  return prev.playlist.id === next.playlist.id &&
         prev.playlist.name === next.playlist.name &&
         prev.playlist.songIds.length === next.playlist.songIds.length;
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
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
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  moreButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
});
