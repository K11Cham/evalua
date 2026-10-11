import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { mkdir } from 'fs/promises';

export interface StoredDocument {
  documentId: string;
  storagePath: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  checksum: string;
}

export interface StorageConfig {
  type: 'local' | 's3';
  localPath?: string;
  s3Config?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
}

export class DocumentStorage {
  private config: StorageConfig;

  constructor(config: StorageConfig) {
    this.config = config;
  }

  /**
   * Store a document buffer and return metadata
   */
  async storeDocument(
    buffer: Buffer,
    originalFilename: string,
    mimeType: string
  ): Promise<StoredDocument> {
    const documentId = crypto.randomUUID();
    const checksum = this.calculateChecksum(buffer);

    if (this.config.type === 'local') {
      return this.storeLocal(buffer, documentId, originalFilename, mimeType, checksum);
    } else if (this.config.type === 's3') {
      throw new Error('S3 storage not yet implemented');
    } else {
      throw new Error(`Unsupported storage type: ${this.config.type}`);
    }
  }

  /**
   * Retrieve a document buffer
   */
  async getDocument(storagePath: string): Promise<Buffer> {
    if (this.config.type === 'local') {
      return this.getLocal(storagePath);
    } else if (this.config.type === 's3') {
      throw new Error('S3 storage not yet implemented');
    } else {
      throw new Error(`Unsupported storage type: ${this.config.type}`);
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(storagePath: string): Promise<void> {
    if (this.config.type === 'local') {
      return this.deleteLocal(storagePath);
    } else if (this.config.type === 's3') {
      throw new Error('S3 storage not yet implemented');
    } else {
      throw new Error(`Unsupported storage type: ${this.config.type}`);
    }
  }

  /**
   * Check if a document exists
   */
  async documentExists(storagePath: string): Promise<boolean> {
    if (this.config.type === 'local') {
      return this.existsLocal(storagePath);
    } else if (this.config.type === 's3') {
      throw new Error('S3 storage not yet implemented');
    } else {
      throw new Error(`Unsupported storage type: ${this.config.type}`);
    }
  }

  // Local storage methods

  private async storeLocal(
    buffer: Buffer,
    documentId: string,
    originalFilename: string,
    mimeType: string,
    checksum: string
  ): Promise<StoredDocument> {
    const storagePath = this.config.localPath || './uploads';
    const fullPath = path.join(storagePath, documentId);

    // Ensure directory exists
    await mkdir(storagePath, { recursive: true });

    // Write file
    await fs.writeFile(fullPath, buffer);

    return {
      documentId,
      storagePath: fullPath,
      originalFilename,
      fileSize: buffer.length,
      mimeType,
      checksum,
    };
  }

  private async getLocal(storagePath: string): Promise<Buffer> {
    return await fs.readFile(storagePath);
  }

  private async deleteLocal(storagePath: string): Promise<void> {
    await fs.unlink(storagePath);
  }

  private async existsLocal(storagePath: string): Promise<boolean> {
    try {
      await fs.access(storagePath);
      return true;
    } catch {
      return false;
    }
  }

  // Utility methods

  private calculateChecksum(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

// Create singleton instance
let storageInstance: DocumentStorage | null = null;

export function getDocumentStorage(): DocumentStorage {
  if (!storageInstance) {
    const storageType = (process.env.STORAGE_TYPE as 'local' | 's3') || 'local';
    const config: StorageConfig = {
      type: storageType,
    };

    if (storageType === 'local') {
      config.localPath = process.env.STORAGE_PATH || './uploads';
    } else if (storageType === 's3') {
      config.s3Config = {
        bucket: process.env.S3_BUCKET || '',
        region: process.env.S3_REGION || '',
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      };
    }

    storageInstance = new DocumentStorage(config);
  }

  return storageInstance;
}
