/**
 * Manages reading of the store files.
 *
 * Each store is a file in JSON format and the idea is that stores can be
 * accessed and modified from the client applications.
 */
export interface LocalStoreModelGetter {
    getModelStore(uuid: string, onChangeListeners?: (() => Promise<unknown>)[]): ModelStore;
}


export interface ModelStore {
    getBuffer(): Promise<Buffer>;

    getString(): Promise<string>;

    getJson(): Promise<any>;

    setString(payload: string): Promise<void>;

    setJson(payload: any): Promise<void>;
}
