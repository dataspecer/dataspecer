import { readFile, rm, writeFile } from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from 'uuid';
import { LocalStoreDescriptor } from "./local-store-descriptor.ts";


/**
 * Manages reading of the store files.
 *
 * Each store is a file in JSON format and the idea is that stores can be
 * accessed and modified from the client applications.
 */
export interface LocalStoreModelGetter {
    getModelStore(uuid: string, onChangeListeners?: (() => Promise<unknown>)[]): ModelStore;
}

/**
 * Manages creating, reading, updating and deleting of the store files.
 *
 * Each store is a file in JSON format and the idea is that stores can be
 * accessed and modified from the client applications.
 */
export interface LocalStoreModel extends LocalStoreModelGetter {
    /**
     * Creates a new empty store and returns its handle.
     *
     * Please note that the store does not contain any schema. The schema needs
     * to be created separately.
     */
    create(): Promise<LocalStoreDescriptor>;

    /**
     * Removes store identified by the given handle.
     * @param localStoreDescriptor
     */
    remove(localStoreDescriptor: LocalStoreDescriptor): Promise<void>;

    /**
     * Returns already existing store identified by its uuid.
     * @param uuid Internal store identifier
     */
    getById(uuid: string): LocalStoreDescriptor;

    /**
     * Returns the content of the store
     * @internal used only by MemoryStoreHandle
     * @param id
     */
    get(id: string): Promise<Buffer | null>;

    set(id: string, payload: string): Promise<void>;
}

export class LocalStoreModelBase implements LocalStoreModel {
    private readonly storage: string;

    constructor(storage: string) {
        this.storage = storage;
    }


    async create(): Promise<LocalStoreDescriptor> {
        const name = uuidv4();
        await writeFile(this.getStorePath(name) as string, "{\"operations\":[],\"resources\":{}}");
        return new LocalStoreDescriptor(name);
    }


    async remove(localStoreDescriptor: LocalStoreDescriptor): Promise<void> {
        const path = this.getStorePath(localStoreDescriptor.uuid);
        if (path) {
            try {
                await rm(path, {force: true});
            } catch (e) {
                // EMPTY
            }
        }
    }


    getById(uuid: string): LocalStoreDescriptor {
        return new LocalStoreDescriptor(uuid);
    }


    getModelStore(uuid: string, onChangeListeners: (() => Promise<unknown>)[] = []): ModelStore {
        return new ModelStoreBase(uuid, this, onChangeListeners);
    }


    async get(id: string): Promise<Buffer | null> {
        const path = this.getStorePath(id);
        if (path) {
            try {
                return await readFile(path);
            } catch (e) {
                // EMPTY
            }
        }
        return null;
    }

    async set(id: string, payload: string): Promise<void> {
        const path = this.getStorePath(id);
        if (path) {
            try {
                return await writeFile(path, payload);
            } catch (e) {
                // EMPTY
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

export interface ModelStore {
    getBuffer(): Promise<Buffer>;

    getString(): Promise<string>;

    getJson(): Promise<any>;

    setString(payload: string): Promise<void>;

    setJson(payload: any): Promise<void>;
}

export class ModelStoreBase implements ModelStore {
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

    private async notifyChangeListeners() {
        for (const listener of this.onChangeListeners) {
            await listener();
        }
    }
}
