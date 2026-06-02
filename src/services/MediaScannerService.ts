import { syncMediaLibrary, requestMediaPermissions } from './media/scanner';

// Wrapper to avoid breaking existing imports across the app
export const scanLocalMusic = syncMediaLibrary;
export { requestMediaPermissions };
