import { promises as fs } from "node:fs";
import path from "node:path";
import { Injectable } from "@nestjs/common";

/**
 * Storage boundary for CV files.
 *
 * The production target is Cloudflare R2 (private bucket). Until R2 credentials
 * are configured this adapter stores files locally and reports itself as
 * "local-fake". Every record keeps its `storageProvider` so a later migration
 * can move objects without changing the API contract.
 */
export abstract class FileStorage {
  abstract readonly provider: string;
  abstract put(key: string, bytes: Buffer): Promise<void>;
  abstract get(key: string): Promise<Buffer>;
  abstract delete(key: string): Promise<void>;
}

@Injectable()
export class LocalFileStorage extends FileStorage {
  readonly provider = "local-fake";
  private readonly root = path.join(process.cwd(), "uploads");

  private resolveKey(key: string): string {
    const target = path.resolve(this.root, key);
    if (!target.startsWith(path.resolve(this.root) + path.sep)) {
      throw new Error("Invalid storage key");
    }
    return target;
  }

  async put(key: string, bytes: Buffer): Promise<void> {
    const target = this.resolveKey(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolveKey(key));
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(this.resolveKey(key)).catch(() => undefined);
  }
}
