import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../../constants';
import Pill from '../../components/ui/Pill';
import HomeIcon from '../../assets/icons/home.svg';
import SearchIcon from '../../assets/icons/music-search.svg';
import LibraryIcon from '../../assets/icons/library.svg';
import SettingsIcon from '../../assets/icons/save-ribbon-outline.svg';

function CustomTabBar({ state, descriptors, navigation }: any) {
  // Routes: home, search, library, settings
  // The user requested: Home, Library, Settings on the left. Search on the right.
  const insets = useSafeAreaInsets();
  const miniPlayerHeight = 72 + insets.bottom;

  const leftRoutes = state.routes.filter((r: any) => r.name !== 'search');
  const rightRoute = state.routes.find((r: any) => r.name === 'search');
  const isSearchFocused = rightRoute ? (state.index === state.routes.findIndex((r: any) => r.key === rightRoute.key)) : false;

  return (
    <View style={[styles.tabBarContainer, { bottom: Spacing.md }]}>
      <View style={styles.leftPills}>
        {leftRoutes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === state.routes.findIndex((r: any) => r.key === route.key);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const routeIcons = {
            index: HomeIcon,
            library: LibraryIcon,
            settings: SettingsIcon,
          };

          // Icons mapping
          const Icon =
            routeIcons[route.name as keyof typeof routeIcons];

          return (
            <Pill
              key={route.key}
              icon={<Icon width={20} height={20} color={Colors.background} />}
              label={isFocused ? options.title : undefined}
              onPress={onPress}
              style={[styles.pill, isFocused && styles.pillActive]}
            />
          );
        })}
      </View>

      {rightRoute && (
        <View style={styles.rightPill}>
          <Pill
            icon={<SearchIcon width={20} height={20} color={Colors.background} />}
            label={isSearchFocused ? "Search" : undefined}
            onPress={() => navigation.navigate('search')}
            style={[styles.pill, isSearchFocused && styles.pillActive]}
          />
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: {
          backgroundColor: Colors.background,
        }
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: Spacing.xl,
    right: Spacing.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  leftPills: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rightPill: {
    // any specific styling for right pill
  },
  pill: {
    backgroundColor: '#222',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pillActive: {
    backgroundColor: '#222',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  }
});
