/** Storage of string documents identified by an id. */
export interface StoreModel {
  /** Removes a document, if present. */
  remove(id: string): Promise<void>;
  /** Returns the document content, or null if absent. */
  get(id: string): Promise<Buffer | null>;
  /** Creates or overwrites a document. */
  set(id: string, payload: string): Promise<void>;
}
