import { readFile, rm, writeFile } from "fs/promises";
import path from "path";

/**
 * Low level "database" of string documents.
 * I do not know why I store it in files instead of a real database.
 */
export class LocalStoreModel {
  private readonly storage: string;

  constructor(storage: string) {
    this.storage = storage;
  }

  async remove(uuid: string): Promise<void> {
    const path = this.getStorePath(uuid);
    if (path) {
      try {
        await rm(path, { force: true });
      } catch (e) {}
    }
  }

  /**
   * Returns the content of the store
   * @internal used only by MemoryStoreHandle
   * @param id
   */
  async get(id: string): Promise<Buffer | null> {
    const path = this.getStorePath(id);
    if (path) {
      try {
        return await readFile(path);
      } catch (e) {}
    }
    return null;
  }

  async set(id: string, payload: string) {
    const path = this.getStorePath(id);
    if (path) {
      try {
        return await writeFile(path, payload);
      } catch (e) {}
    }
  }

  private getStorePath(unsafeId: string): string | null {
    if (!/^[a-zA-Z0-9-]+$/.test(unsafeId)) {
      return null;
    } else {
      return path.join(this.storage, unsafeId);
    }
  }
}
