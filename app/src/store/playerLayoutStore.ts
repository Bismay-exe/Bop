import { create } from 'zustand';

interface LayoutMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface PlayerLayoutState {
  miniArtwork: LayoutMetrics | null;
  expandedArtwork: LayoutMetrics | null;
  miniTitle: LayoutMetrics | null;
  expandedTitle: LayoutMetrics | null;
  miniArtist: LayoutMetrics | null;
  expandedArtist: LayoutMetrics | null;
  setMetrics: (key: keyof Omit<PlayerLayoutState, 'setMetrics'>, metrics: LayoutMetrics) => void;
}

export const usePlayerLayoutStore = create<PlayerLayoutState>((set) => ({
  miniArtwork: null,
  expandedArtwork: null,
  miniTitle: null,
  expandedTitle: null,
  miniArtist: null,
  expandedArtist: null,
  setMetrics: (key, metrics) => set((state) => {
    if (state[key] !== null) return state; // Lock it in! Don't overwrite during animation
    return { ...state, [key]: metrics };
  }),
}));
