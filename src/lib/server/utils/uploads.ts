import { env } from "$env/dynamic/private";
import * as fs from 'node:fs';
import * as path from 'node:path';

// These must be exported for the +server.ts file to see them
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.svg', '.webp'];
export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

class UploadManager {
    #uploadLocation = env.UPLOAD_LOCATION || '/tmp';
    #isReady = false;

    async init(): Promise<void> {
        try {
            // Ensure the directory exists
            if (!fs.existsSync(this.#uploadLocation)) {
                fs.mkdirSync(this.#uploadLocation, { recursive: true });
            }
            this.#isReady = true;
            console.log(`[UploadManager] Storage initialized at: ${this.#uploadLocation}`);
        } catch (err) {
            console.error(`[UploadManager] Failed to initialize storage: ${err}`);
            this.#isReady = false;
        }
    }

    get isReady(): boolean {
        return this.#isReady;
    }

    async saveFile(relativePath: string, data: Buffer | Uint8Array): Promise<boolean> {
        if (!this.#isReady) await this.init();
        
        try {
            const fullPath = path.join(this.#uploadLocation, relativePath);
            const dir = path.dirname(fullPath);

            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(fullPath, data);
            return true;
        } catch (err) {
            console.error(`[UploadManager] Save error: ${err}`);
            return false;
        }
    }

    async deleteFile(relativePath: string): Promise<boolean> {
        try {
            const fullPath = path.join(this.#uploadLocation, relativePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                return true;
            }
            return false;
        } catch (err) {
            console.error(`[UploadManager] Delete error: ${err}`);
            return false;
        }
    }
}

export const uploadManager = new UploadManager();