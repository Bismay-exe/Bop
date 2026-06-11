import { Image } from 'expo-image';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors, Radius, Shadow } from '../../constants';

interface Props {
  uri?: string;
  size: number;
  style?: ViewStyle;
  sharedTransitionTag?: string;
  disableTransition?: boolean;
}

import { useState, useEffect } from 'react';

export default function ArtworkView({ uri, size, style, sharedTransitionTag, disableTransition }: Props) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [uri]);

  const source = uri && !hasError ? { uri } : require('../../../assets/images/defaultArtwork.png');

  return (
    <Animated.View 
      sharedTransitionTag={sharedTransitionTag}
      style={[styles.container, { width: size, height: size }, style]}
    >
      <Image 
        source={source} 
        style={styles.image} 
        contentFit="cover" 
        transition={disableTransition ? 0 : 200}
        onError={() => setHasError(true)}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
    ...Shadow.card,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
