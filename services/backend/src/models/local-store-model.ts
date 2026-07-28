import { readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from 'uuid';

type StoreDescriptor = {
    uuid: string;
};

/**
 * Manages creating, reading, updating and deleting of the store files.
 *
 * Each store is a file in JSON format and the idea is that stores can be
 * accessed and modified from the client applications.
 */
export class LocalStoreModel {
    private readonly storage: string;

    constructor(storage: string) {
        this.storage = storage;
    }

    /**
     * Creates a new empty store and returns its handle.
     *
     * Please note that the store does not contain any schema. The schema needs
     * to be created separately.
     */
    async create(): Promise<StoreDescriptor> {
        const uuid = uuidv4();
        await writeFile(this.getStorePath(uuid) as string, "{\"operations\":[],\"resources\":{}}");
        return {uuid};
    }

    /**
     * Removes store identified by the given handle.
     * @param localStoreDescriptor
     */
    async remove(localStoreDescriptor: StoreDescriptor): Promise<void> {
        const path = this.getStorePath(localStoreDescriptor.uuid);
        if (path) {
            try {
                await rm(path, {force: true});
            } catch (e) {
            }
        }
    }

    /**
     * Returns already existing store identified by its uuid.
     * @param uuid Internal store identifier
     */
    getById(uuid: string): StoreDescriptor {
        return {uuid};
    }

    getModelStore(uuid: string, onChangeListeners: (() => Promise<unknown>)[] = []): ModelStore {
        return new ModelStore(uuid, this, onChangeListeners);
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
            } catch (e) {
            }
        }
        return null;
    }

    async set(id: string, payload: string) {
        const path = this.getStorePath(id);
        if (path) {
            try {
                return await writeFile(path, payload);
            } catch (e) {
            }
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

export class ModelStore {
    private readonly uuid: string;
    private readonly storeModel: LocalStoreModel;
    private readonly onChangeListeners: (() => Promise<unknown>)[];

    constructor(uuid: string, storeModel: LocalStoreModel, onChangeListeners: (() => Promise<unknown>)[] = []) {
        this.uuid = uuid;
        this.storeModel = storeModel;
        this.onChangeListeners = onChangeListeners;
    }

    async getBuffer(): Promise<Buffer> {
        return this.storeModel.get(this.uuid) as Promise<Buffer>;
    }

    async getString(): Promise<string> {
        return this.getBuffer().then(buffer => buffer?.toString());
    }

    async getJson(): Promise<any> {
        return this.getString().then(str => JSON.parse(str));
    }

    async setString(payload: string): Promise<void> {
        await this.notifyChangeListeners();
        return this.storeModel.set(this.uuid, payload);
    }

    async setJson(payload: any): Promise<void> {
        return this.setString(JSON.stringify(payload));
    }

    async notifyChangeListeners() {
        for (const listener of this.onChangeListeners) {
            await listener();
        }
    }
}
