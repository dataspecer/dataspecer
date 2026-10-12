import type { StoreModel } from "./store-model.ts";

/** Stores documents in memory for the lifetime of this instance. */
export class InMemoryStoreModel implements StoreModel {
  private readonly documents = new Map<string, string>();

  async remove(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async get(id: string): Promise<Buffer | null> {
    const content = this.documents.get(id);
    return content === undefined ? null : Buffer.from(content);
  }

  async set(id: string, payload: string): Promise<void> {
    this.documents.set(id, payload);
  }
}
