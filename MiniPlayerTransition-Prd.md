# Player Transition Architecture PRD

## Overview

This document defines the architecture and animation system for the bop app's premium player transition experience.

The goal is to achieve a modern, spatially coherent transition system similar to high-end music apps, where the MiniPlayer transforms into the Expanded Player instead of traditional screen navigation.

This is NOT a normal route transition.

The player experience must feel like:

- One continuous surface
- One persistent player layer
- Stateful transformation
- Spatial continuity between collapsed and expanded states

---

# Core UX Goals

## MiniPlayer → Expanded Player

When the user taps the MiniPlayer:

- The current screen (Home/Library/Search) must compress upward from the bottom until completely hidden.
- The screen must NOT slide upward.
- The screen must NOT remain visible at the top.
- The compression effect must happen via animated container height reduction.
- The MiniPlayer itself expands into the full player.
- Artwork transitions smoothly into its expanded position.
- Song title and artist text must physically animate to their final positions.
- Controls fade/slide in AFTER the player expansion begins.
- No fade-to-black background transitions.
- No modal-style navigation animations.

---

## Expanded Player → Queue

Queue should NOT be a normal pushed route.

Queue behaves as a secondary surface layered above the player.

When queue opens:

- Queue sheet slides upward from bottom.
- Artwork shrinks into compact queue header position.
- Song title and artist animate upward into queue header.
- Queue list slides independently from bottom.
- Player remains underneath.

---

# Critical Architectural Decision

## The Player Is NOT A Route

DO NOT implement the expanded player using:

- router.push('/player')
- Stack screen transitions
- Modal presentation
- React Navigation shared element packages

The entire player system must instead exist as a persistent animated layer mounted ABOVE the tab navigator.

---

# Required Root Layout Structure

```tsx
<Root>
  <AnimatedTabsContainer />

  <PersistentPlayerLayer />

  <QueueSheet />
</Root>
```

---

# Navigation Philosophy

## Incorrect Approach

```tsx
router.push("/player");
```

This creates disconnected navigation transitions.

---

## Correct Approach

The player expands by changing global UI state.

Example:

```tsx
uiStore.setPlayerExpanded(true);
```

The UI transforms itself instead of navigating.

---

# Required Technologies

## Core Stack

- react-native-reanimated
- react-native-gesture-handler
- Expo Router (navigation only)

---

# Animation Architecture

## Single Shared Progress Value

All transitions must derive from one shared animation progress value.

Example:

```ts
playerExpandProgress: 0 → 1
```

This progress value controls:

- Home container compression
- MiniPlayer expansion
- Border radius morphing
- Artwork transition
- Text transitions
- Controls reveal
- Queue transitions

This prevents desynchronized animations.

---

# Home Screen Compression System

## Correct Behavior

The Home/Library screen must compress upward by reducing visible height.

The screen does NOT translate upward.

The screen does NOT remain partially visible.

---

## Required Implementation

Tabs must be wrapped inside an animated container.

Example:

```tsx
<Animated.View
  style={{
    height: animatedHeight,
    overflow: "hidden",
  }}
>
  <Tabs />
</Animated.View>
```

---

## Animation Behavior

```ts
height: screenHeight → 0
```

The collapse must originate from the bottom.

The top edge remains fixed.

---

# MiniPlayer Architecture

## MiniPlayer Is Persistent

MiniPlayer must exist ABOVE the tab screens.

It must NOT belong to:

- Home screen
- Library screen
- Search screen

MiniPlayer exists globally.

---

# Expanded Player Architecture

## Expanded Player Is Same Surface

Expanded player is NOT a separate screen.

It is the expanded state of the persistent player layer.

The MiniPlayer container transforms into the expanded player.

---

# Shared Element Transition Rules

## Artwork Transition

Artwork must use Reanimated shared transitions.

MiniPlayer artwork:

```tsx
sharedTransitionTag = "artwork";
```

Expanded player artwork:

```tsx
sharedTransitionTag = "artwork";
```

This allows:

- Size interpolation
- Position interpolation
- Border radius interpolation

---

## Title Transition

Song title must independently animate using shared transitions.

MiniPlayer title:

```tsx
sharedTransitionTag = "title";
```

Expanded player title:

```tsx
sharedTransitionTag = "title";
```

The title must physically move to its new position.

NO fading.

---

## Artist Transition

Artist text must ALSO independently animate.

MiniPlayer artist:

```tsx
sharedTransitionTag = "artist";
```

Expanded player artist:

```tsx
sharedTransitionTag = "artist";
```

---

# IMPORTANT TEXT TRANSITION RULE

DO NOT animate:

```tsx
<title + artist>
```

inside a shared parent container.

Each text element must animate independently.

Otherwise:

- alignment glitches occur
- scaling becomes ugly
- interpolation breaks

---

# Controls Reveal Animation

Playback controls must NOT participate in shared transitions.

Controls should:

- Fade in
- Slide upward slightly
- Appear after expansion begins

Recommended:

```ts
opacity;
translateY;
```

with delayed timing.

---

# Progress Bar Behavior

Progress bar should:

- Fade/slide in
- NOT morph from MiniPlayer progress bar

MiniPlayer progress and Player progress are separate visual systems.

---

# Border Radius Morphing

MiniPlayer container radius must interpolate into player radius.

Example:

```ts
28 → 0
```

This creates the feeling of one surface expanding.

---

# Queue Architecture

Queue must be implemented as a layered sheet.

NOT:

```tsx
router.push("/queue");
```

Queue exists above player layer.

---

# Queue Layout Structure

```tsx
<PlayerLayer />

<AnimatedQueueSheet />
```

---

# Queue Animation Requirements

Queue sheet:

- Slides upward from bottom
- Uses independent animation progress

Artwork:

- Shrinks into compact queue header

Text:

- Moves upward into queue header positions

Queue list:

- Slides independently from bottom

---

# Responsiveness Requirements

## Compact Height Handling

Expanded player must adapt to split-screen and compact-height devices.

Controls are sacred and must NEVER leave screen bounds.

Artwork must sacrifice size first.

---

## Correct Priority

1. Controls stay visible
2. Metadata stays visible
3. Artwork shrinks
4. Pills compress or hide

---

# Explicit Non-Goals

DO NOT implement:

- Default stack transitions
- Fade-to-black transitions
- Separate Player route navigation
- Full-screen modal push animations
- Shared transitions on every component
- Simultaneous chaotic animations

---

# Animation Philosophy

The app should feel like:

- One living interface
- One transforming surface
- Physically continuous UI

NOT:

- Separate disconnected screens
- Traditional app navigation

---

# Recommended Build Order

## Phase 1

Implement:

- Persistent player layer
- Expand/collapse container
- Home compression
- Border radius interpolation

NO shared elements yet.

---

## Phase 2

Add:

- Artwork shared transition

---

## Phase 3

Add:

- Title shared transition
- Artist shared transition

---

## Phase 4

Add:

- Controls reveal animations
- Progress animations
- Gradient interpolation

---

## Phase 5

Add:

- Queue sheet system
- Queue header transitions

---

# Final UX Goal

The user should never feel like they are:

- Opening screens
- Navigating pages
- Switching contexts

Instead, the UI should feel like:

"The music player continuously transforms between states."

# Persistent Global Layer Architecture

The MiniPlayer must behave similarly to the app's bottom navigation bar.

Meaning:

- It exists globally across all screens.
- It is mounted once at the root layout level.
- It persists between Home, Library, Search, and future screens.
- It does NOT remount during navigation.
- It must remain visually continuous across the entire app.

The Player system should therefore be structured like:

```tsx
<RootLayout>
  <AnimatedTabsContainer />

  <BottomNavbar />

  <PersistentMiniPlayer />

  <ExpandedPlayerLayer />

  <QueueSheet />
</RootLayout>
```

The Expanded Player is NOT a separate navigation destination.

Instead:

- The MiniPlayer transforms into the Expanded Player.
- The Expanded Player transforms back into the MiniPlayer.
- Both are different visual states of the SAME persistent player layer.

This architecture is mandatory for achieving:

- True shared element transitions
- Spatial continuity
- Persistent playback UI
- Premium expansion animations
- Smooth queue transitions
- Non-disconnected player interactions

DO NOT implement the player as a traditional routed screen.
