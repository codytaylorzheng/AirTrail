import { env } from "$env/dynamic/private";

// Exported constants for your API routes
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.svg', '.webp'];
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Optional: A helper to check if Supabase env vars are set
export const isSupabaseConfigured = !!(env.PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);