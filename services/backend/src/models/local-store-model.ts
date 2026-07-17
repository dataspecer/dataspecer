import { readFile, rm, writeFile } from "fs/promises";
import path from "path";

/**
 * Low level storage of string documents, each identified by an id, kept as
 * individual files in a single directory. Holds the contents of resource data
 * stores, see the ResourceModel.
 */
export class LocalStoreModel {
  private readonly storage: string;

  constructor(storage: string) {
    this.storage = storage;
  }

  /**
   * Removes the document. Does nothing if the document does not exist.
   */
  async remove(id: string): Promise<void> {
    await rm(this.getStorePath(id), { force: true });
  }

  /**
   * Returns the content of the document, or null if it does not exist.
   */
  async get(id: string): Promise<Buffer | null> {
    try {
      return await readFile(this.getStorePath(id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  /**
   * Creates or overwrites the document with the given content.
   */
  async set(id: string, payload: string): Promise<void> {
    await writeFile(this.getStorePath(id), payload);
  }

  private getStorePath(unsafeId: string): string {
    // The id becomes a file name, so restrict it to safe characters to
    // prevent path traversal.
    if (!/^[a-zA-Z0-9-]+$/.test(unsafeId)) {
      throw new Error(`Invalid store id "${unsafeId}".`);
    }
    return path.join(this.storage, unsafeId);
  }
}
