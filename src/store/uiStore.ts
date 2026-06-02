import { create } from 'zustand';

interface UIStore {
  playerExpanded: boolean;
  activeBottomSheet: string | null;
  setPlayerExpanded: (value: boolean) => void;
  openBottomSheet: (id: string) => void;
  closeBottomSheet: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  playerExpanded: false,
  activeBottomSheet: null,
  setPlayerExpanded: (value) => set({ playerExpanded: value }),
  openBottomSheet: (id) => set({ activeBottomSheet: id }),
  closeBottomSheet: () => set({ activeBottomSheet: null }),
}));
