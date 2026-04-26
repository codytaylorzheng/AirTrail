import { env } from "$env/dynamic/private";

// Exports for your Supabase logic
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.svg', '.webp'];
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// This "Stub" prevents the [MISSING_EXPORT] errors in hooks, sync, etc.
class StubUploadManager {
    isReady = true;
    async init() { return; }
    async saveFile() { 
        console.warn("Local saveFile called, but we are using Supabase now.");
        return true; 
    }
    async deleteFile() { return true; }
}

export const uploadManager = new StubUploadManager();