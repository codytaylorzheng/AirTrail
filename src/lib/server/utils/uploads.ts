import { env } from '$env/static/private';
import * as fs from 'node:fs';
import * as path from 'node:path';

export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/svg+xml',
  'image/webp',
];
export const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.svg', '.webp'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

class UploadManager {
  #uploadLocation: string | null = null;
  #isConfigured: boolean = false;
  #isReady: boolean = false;
  #isCloud: boolean = false;

  async init(): Promise<void> {
    this.#uploadLocation = env.UPLOAD_LOCATION || null;
    this.#isConfigured = !!this.#uploadLocation;

    // Check if we are using a remote URL (Supabase) or local path
    this.#isCloud = !!(this.#uploadLocation?.startsWith('http'));

    if (this.#isCloud) {
      this.#isReady = true;
      console.log(`Upload manager configured for Cloud Storage: ${this.#uploadLocation}`);
      return;
    }

    try {
      if (!this.#uploadLocation) {
        console.warn('UPLOAD_LOCATION is not defined. Local uploads will fail.');
        return;
      }

      // Ensure directory exists for local development
      if (!fs.existsSync(this.#uploadLocation)) {
        fs.mkdirSync(this.#uploadLocation, { recursive: true });
      }

      // Check read/write permissions for local disk
      const testFile = path.join(this.#uploadLocation, '.write_test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);

      this.#isReady = true;
      console.log(`Upload location configured locally: ${this.#uploadLocation}`);
    } catch (err) {
      console.error(`Upload manager failed to initialize local path: ${err}`);
      this.#isReady = false;
    }
  }

  get isConfigured(): boolean {
    return this.#isConfigured;
  }

  get isReady(): boolean {
    return this.#isReady;
  }

  get isCloud(): boolean {
    return this.#isCloud;
  }

  get uploadLocation(): string | null {
    return this.#uploadLocation;
  }

  getFilePath(relativePath: string): string | null {
    if (!this.#uploadLocation) return null;
    if (this.#isCloud) return `${this.#uploadLocation}/${relativePath}`;
    return path.join(this.#uploadLocation, relativePath);
  }

  async saveFile(
    relativePath: string,
    data: Buffer | Uint8Array,
  ): Promise<boolean> {
    if (!this.#isReady || !this.#uploadLocation) return false;

    // If cloud, we skip local fs write (Handled by Supabase SDK in actions)
    if (this.#isCloud) return true;

    const fullPath = path.join(this.#uploadLocation, relativePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(fullPath, data);
    return true;
  }

  async deleteFile(relativePath: string): Promise<boolean> {
    if (!this.#isReady || !this.#uploadLocation || this.#isCloud) return false;

    const fullPath = path.join(this.#uploadLocation, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  fileExists(relativePath: string): boolean {
    if (!this.#uploadLocation) return false;
    if (this.#isCloud) return false; // Cannot easily check URL existence synchronously
    return fs.existsSync(path.join(this.#uploadLocation, relativePath));
  }
}

export const uploadManager = new UploadManager();
