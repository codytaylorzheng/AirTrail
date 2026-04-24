import { env } from '$env/static/private';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

class UploadManager {
    #uploadLocation = env.UPLOAD_LOCATION || '/tmp';
    #isCloud = false;
    #isReady = false;

    async init(): Promise<void> {
        this.#isCloud = this.#uploadLocation.startsWith('http');

        if (this.#isCloud) {
            this.#isReady = true;
            console.log(`[UploadManager] Cloud mode: ${this.#uploadLocation}`);
            return;
        }

        try {
            if (!fs.existsSync(this.#uploadLocation)) {
                fs.mkdirSync(this.#uploadLocation, { recursive: true });
            }
            this.#isReady = true;
            console.log(`[UploadManager] Local mode: ${this.#uploadLocation}`);
        } catch (err) {
            console.error(`[UploadManager] Init failed: ${err}`);
        }
    }

    get isReady() { return this.#isReady; }
    get isCloud() { return this.#isCloud; }
    
    getFilePath(relativePath: string): string {
        if (this.#isCloud) return `${this.#uploadLocation}/${relativePath}`;
        return path.join(this.#uploadLocation, relativePath);
    }

    async saveFile(relativePath: string, data: Buffer | Uint8Array): Promise<boolean> {
        if (!this.#isReady) return false;
        if (this.#isCloud) return true; // Handled by Supabase directly

        const fullPath = path.join(this.#uploadLocation, relativePath);
        fs.mkdirSync(path.dirname(fullPath), { recursive: true });
        fs.writeFileSync(fullPath, data);
        return true;
    }
}

export const uploadManager = new UploadManager();