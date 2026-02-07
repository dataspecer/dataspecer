import { expect, test } from "vitest";
import fs from "fs";
import { buffer as streamBuffer } from "stream/consumers";
import { LocalStoreModel, ModelStore, ModelStoreBase } from "../../models/local-store-model.ts";
import { PackageImporter } from "../import.ts";
import { PackageImporterDeprecated } from "./deprecated-import-for-regression-testing copy.ts";
import { PackageExporterDeprecated } from "./deprecated-export-for-regression-testing.ts";
import { ResourceModelForFilesystemRepresentation } from "../export.ts";
import { LoadedPackage, BaseResource, Package } from "../../models/resource-model.ts";
import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
import { LocalStoreDescriptor } from "../../models/local-store-descriptor.ts";
import { PackageExporterNew } from "../export-new.ts";
import { AvailableExports } from "../export-actions.ts";
import { AvailableFilesystems, deepOmit } from "@dataspecer/git";
import { ResourceChangeType } from "../../models/resource-change-observer.ts";
import JSZip from "jszip";


type CommonDataForNodesForTest = {
    type: string;
    iri: string;
    userMetadata: {};
    modelStores: Record<string, ModelStore>;
    projectIri?: string;
    nodeResource: BaseResource;
}
type FileNodeForTest = {
    type: "file";
} & CommonDataForNodesForTest;
type DirectoryNodeForTest = {
    type: "dir";
    nodeResource: Package;
    children: Record<string, FilesystemNodeForTest>;
} & CommonDataForNodesForTest;
type FilesystemNodeForTest = DirectoryNodeForTest | FileNodeForTest;


class LocalStoreModelGetterForTest implements LocalStoreModel {
    private currentUuid: number = 0;        // We will just increment the number, so it is consistent between runs.
    private localStoreDescriptors: Record<string, LocalStoreDescriptor> = {};
    private availableStores: Record<string, string> = {};      // The uuid to the store, which is now in memory
    modelStores: Record<string, LocalStoreDescriptor> = {};

    async create(): Promise<LocalStoreDescriptor> {
        const id = (this.currentUuid++).toString();
        const descriptor: LocalStoreDescriptor = {
            type: "https://ofn.gov.cz/store-descriptor/backend-local",
            uuid: id,
        };
        this.availableStores[id] = "";
        this.localStoreDescriptors[id] = descriptor;
        return descriptor;
    }
    async remove(localStoreDescriptor: LocalStoreDescriptor): Promise<void> {
        delete this.localStoreDescriptors[localStoreDescriptor.uuid];
        delete this.availableStores[localStoreDescriptor.uuid];
    }
    getById(uuid: string): LocalStoreDescriptor {
        return this.localStoreDescriptors[uuid];
    }
    async get(id: string): Promise<Buffer | null> {
        return Buffer.from(this.availableStores[id]) ?? null;
    }
    async set(id: string, payload: string): Promise<void> {
        if (this.availableStores[id] === undefined) {
            throw new Error("Not existing store")
        }
        this.availableStores[id] = payload;
    }
    getModelStore(uuid: string, onChangeListeners?: (() => Promise<unknown>)[]): ModelStore {
        return new ModelStoreBase(uuid, this, onChangeListeners);
    }
}

class ResourceModelForTest implements ResourceModelForFilesystemRepresentation {
    // Note that projectIri did not exist in the old import, so we just set it to undefined everywhere.

    private readonly HARDSET_TIME = new Date(1970, 0, 1, 10, 30, 0, 0);

    private iriToAbsoluteIriPathMap: Record<string, string> = {};
    private inMemoryFilesystem: Record<string, FilesystemNodeForTest> = {};
    getInMemoryFilesystem(): Record<string, FilesystemNodeForTest> {
        return this.inMemoryFilesystem;
    }

    // ResourceModelForExport Interface
    readonly storeModel: LocalStoreModelGetterForTest = new LocalStoreModelGetterForTest();

    private findSubResources(packageNode: DirectoryNodeForTest): BaseResource[] {
        // Internal method for testing to create the LoadedPackage object, that is fiend the SubResoruces
        const subResources: BaseResource[] = [];
        for (const [id, child] of Object.entries(packageNode.children)) {
            subResources.push(child.nodeResource);
        }
        return subResources;
    }
    async getPackage(iri: string, deep?: boolean): Promise<LoadedPackage | null> {
        const packageNode = this.inMemoryFilesystem[iri];
        if (packageNode.type !== "dir") {
            return null;
        }
        else {
            const subResources: BaseResource[] = this.findSubResources(packageNode);
            const loadedPackage: LoadedPackage = {
                ...packageNode.nodeResource,
                subResources,
            }
            return loadedPackage;
        }
    }

    async getResource(iri: string): Promise<BaseResource | null> {
        return this.inMemoryFilesystem[iri]?.nodeResource ?? null;
    }

    async updateResourceMetadata(iri: string, userMetadata: {}, mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined): Promise<void> {
        const oldUserMetadata = this.inMemoryFilesystem[iri].nodeResource.userMetadata ?? {};
        this.inMemoryFilesystem[iri].nodeResource.userMetadata = {
            ...oldUserMetadata,
            ...userMetadata,
        };
    }

    async updateModificationTime(
        iri: string, updatedModel: string | null, updateReason: ResourceChangeType,
        shouldModifyHasUncommittedChanges: boolean, shouldNotifyListeners: boolean,
        mergeStateUUIDsToIgnoreInUpdating?: string[]
    ): Promise<void> {
        const nextDay = new Date(this.inMemoryFilesystem[iri].nodeResource.metadata.modificationDate!);
        nextDay.setDate(nextDay.getDate() + 1);
        this.inMemoryFilesystem[iri].nodeResource.metadata.modificationDate = nextDay;
    }


    // ResourceModelForImport Interface
    async createPackage(
        parentIri: string | null,
        iri: string,
        userMetadata: {},
        projectIri?: string | undefined
    ): Promise<void> {
        const pckg: Package = {
            iri,
            types: [LOCAL_PACKAGE],
            userMetadata,
            metadata: {
                modificationDate: this.HARDSET_TIME,
                creationDate: this.HARDSET_TIME,
            },
            linkedGitRepositoryURL: "",
            projectIri: projectIri ?? "",
            branch: "",
            representsBranchHead: false,
            lastCommitHash: "",
            activeMergeStateCount: 0,
            hasUncommittedChanges: false,
            dataStores: {}
        };
        const dirNode: DirectoryNodeForTest = {
            type: "dir",
            iri: iri,
            children: {},
            userMetadata,
            projectIri,
            modelStores: {},
            nodeResource: pckg,
        };

        if (parentIri === null || parentIri === "http://dataspecer.com/packages/local-root") {
            this.inMemoryFilesystem[iri] = dirNode;
        }
        else {
            this.inMemoryFilesystem[iri] = dirNode;
            (this.inMemoryFilesystem[parentIri] as DirectoryNodeForTest).children[iri] = dirNode;
        }
    }


    async createResource(
        parentIri: string | null,
        iri: string,
        type: string,
        userMetadata: {},
        projectIri?: string | undefined,
        mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined
    ): Promise<void> {
        const resource: BaseResource = {
            iri,
            types: [type],
            userMetadata,
            metadata: {
                modificationDate: this.HARDSET_TIME,
                creationDate: this.HARDSET_TIME,
            },
            linkedGitRepositoryURL: "",
            projectIri: projectIri ?? "",
            branch: "",
            representsBranchHead: false,
            lastCommitHash: "",
            activeMergeStateCount: 0,
            hasUncommittedChanges: false,
            dataStores: {},
        };
        const resourceNode: FileNodeForTest = {
            type: "file",
            iri,
            modelStores: {},
            userMetadata,
            projectIri,
            nodeResource: resource,
        }
        if (parentIri === null || parentIri === "http://dataspecer.com/packages/local-root") {
            this.inMemoryFilesystem[iri] = resourceNode;
        }
        else {
            this.inMemoryFilesystem[iri] = resourceNode;
            (this.inMemoryFilesystem[parentIri] as DirectoryNodeForTest).children[iri] = resourceNode;
        }
    }


    async getOrCreateResourceModelStore(iri: string, storeName?: string, mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined): Promise<ModelStore> {
        storeName ??= "model";
        if (this.inMemoryFilesystem[iri].modelStores[storeName] !== undefined) {
            return this.inMemoryFilesystem[iri].modelStores[storeName];
        }
        else {
            const storeHandle = await this.storeModel.create();
            const modelStore: ModelStore = this.storeModel.getModelStore(storeHandle.uuid);
            this.inMemoryFilesystem[iri].modelStores[storeName] = modelStore;
            this.inMemoryFilesystem[iri].nodeResource.dataStores[storeName] = storeHandle.uuid;
            return modelStore;
        }
    }


    deleteModelStore(iri: string, storeName?: string, mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined): Promise<void> {
        throw new Error("Method not implemented.");
    }
}

function createResourceModelForTesting(): ResourceModelForFilesystemRepresentation {
    const resourceModelForTesting: ResourceModelForFilesystemRepresentation = new ResourceModelForTest();
    return resourceModelForTesting;
}

test("Test DS backend", () => {
    expect("a").toBe("a");
});

// test("Test import of 2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip", async () => {
//     const readStream = fs.createReadStream("./test-data/2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip");
//     const buffer: Buffer = await streamBuffer(readStream);

//     const resourceModelForTestingOld = createResourceModelForTesting();
//     const oldImportHandler = new PackageImporterDeprecated(resourceModelForTestingOld);
//     const importResultFromOld = await oldImportHandler.doImport(buffer);

//     const resourceModelForTestingNew = createResourceModelForTesting();
//     const newImportHandler = new PackageImporter(resourceModelForTestingNew);
//     const importResultFromNew = await newImportHandler.doImport(buffer, false);

//     const oldResourceModelToCompare = deepOmit(resourceModelForTestingOld, "projectIri");
//     const newResourceModelToCompare = deepOmit(resourceModelForTestingNew, "projectIri");
//     expect(oldResourceModelToCompare).toStrictEqual(newResourceModelToCompare);
//     expect(importResultFromOld).toStrictEqual(importResultFromNew);
// });

// test("Test import of 2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip - test export", async () => {
//     const readStream = fs.createReadStream("./test-data/2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip");
//     const buffer: Buffer = await streamBuffer(readStream);

//     const resourceModelForTestingOld = createResourceModelForTesting();
//     const oldImportHandler = new PackageImporterDeprecated(resourceModelForTestingOld);
//     const importResultFromOld = await oldImportHandler.doImport(buffer);

//     const resourceModelForTestingNew = createResourceModelForTesting();
//     const newImportHandler = new PackageImporter(resourceModelForTestingNew);
//     const importResultFromNew = await newImportHandler.doImport(buffer, false);

//     const oldResourceModelToCompare = deepOmit(resourceModelForTestingOld, "projectIri");
//     const newResourceModelToCompare = deepOmit(resourceModelForTestingNew, "projectIri");
//     expect(oldResourceModelToCompare).toStrictEqual(newResourceModelToCompare);
//     expect(importResultFromOld).toStrictEqual(importResultFromNew);


//     const oldExportHandler = new PackageExporterDeprecated(resourceModelForTestingOld);
//     const oldExportResult = await oldExportHandler.doExport(importResultFromOld[0]);

//     const newExportHandler = new PackageExporterNew();
//     const newExportResult = await newExportHandler.doExportFromIRI(
//         importResultFromNew[0], "", "", AvailableFilesystems.DS_Filesystem, AvailableExports.Zip,
//         "json", resourceModelForTestingNew, null);


//     // const oldExportResultAsJSON = JSON.parse(oldExportResult.toString("utf-8"));
//     // const newExportResultAsJSON = JSON.parse(newExportResult!.toString("utf-8"));
//     // const oldExportResultToCompare = deepOmit(oldExportResultAsJSON, "projectIri");
//     // const newExportResultToCompare = deepOmit(newExportResultAsJSON!, "projectIri");
//     // console.info({oldExportResult, newExportResult, oldExportResultToCompare, newExportResultToCompare, oldExportResultAsJSON, newExportResultAsJSON})
//     // expect(oldExportResultToCompare).toStrictEqual(newExportResultToCompare);

//     const oldZip = await JSZip.loadAsync(oldExportResult);
//     const newZip = await JSZip.loadAsync(newExportResult!);
//     await compareZips(oldZip, newZip);
// });

// async function compareZips(oldZip: JSZip, newZip: JSZip) {
//     let index = 0;
//     for (const [oldRelativePath, oldZipEntry] of Object.entries(oldZip.files)) {
//         console.info(index++);
//         const newZipEntry = newZip.files[oldRelativePath];
//         if (newZipEntry === undefined) {
//             throw new Error("Entry does not exist: " + oldRelativePath);
//         }
//         const oldContent = await oldZipEntry.async("nodebuffer");
//         const newContent = await newZipEntry.async("nodebuffer");
//         const oldContentAsText = oldContent.toString("utf-8");
//         const newContentAsText = newContent.toString("utf-8");
//         if (oldContentAsText === newContentAsText && oldContentAsText === "") {
//             // Directory
//             // console.info("Skipping: ", oldRelativePath);
//             continue;
//         }
//         // console.info("Not Skipping: ", oldRelativePath);
//         const oldContentAsJson = JSON.parse(oldContentAsText);
//         const newContentAsJson = JSON.parse(newContentAsText);
//         const oldContentToCompare = deepOmit(oldContentAsJson, "projectIri");
//         delete oldContentToCompare._exportedAt
//         delete oldContentToCompare._exportedBy
//         const newContentToCompare = deepOmit(newContentAsJson, "projectIri");
//         delete newContentToCompare._exportedAt
//         delete newContentToCompare._exportedBy
//         expect(oldContentToCompare).toStrictEqual(newContentToCompare);

//         // console.info({oldContentToCompare, newContentToCompare});
//         // console.info({COUNT: Object.keys(oldZip.files).length});
//         // console.info({old: Object.keys(oldZip.files)});
//         // console.info({new: Object.keys(newZip.files)});
//     }
//     expect(Object.keys(oldZip.files).length).toBe(Object.keys(newZip.files).length);
// }

