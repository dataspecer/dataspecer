import { expect, test } from "vitest";

test("Empty test", () => {
    expect(true).toStrictEqual(true);
}, 500000);




// // We have to create our own resource model, so we do not contaminate the filesystem or database. And also so we can easily test the results
// // The implementation is just simple map, which tries to mirror how does Dataspecer store data into database and filesystel (Local Data Store)

// import { expect, test } from "vitest";
// import fs from "fs";
// import { buffer as streamBuffer } from "stream/consumers";
// import { PackageImporter } from "../import.ts";
// import { PackageExporterDeprecated } from "./deprecated-export-for-regression-testing.ts";
// import { LOCAL_PACKAGE } from "@dataspecer/core-v2/model/known-models";
// import { LocalStoreDescriptor } from "../../models/local-store-descriptor.ts";
// import { AvailableFilesystems, createRootFilesystemNodeLocation, deepOmit } from "@dataspecer/git";
// import JSZip from "jszip";
// import { ResourceToFindWhenReplacingIri, StorageApiForIriReplacement } from "../../utils/iri-replace-util.ts";
// import { AvailableExports, BaseResource, DsFsConstructorParams, FilesystemFactoryMethodParams, LoadedPackage, LocalStoreModelGetter, ModelStore, Package, PackageExporterBase, PackageExporterByResourceType, PackageExporterNew, ResourceChangeType, ResourceModelForFilesystemRepresentation } from "@dataspecer/git-node";
// import { PackageImporterDeprecated } from "./deprecated-import-for-regression-testing.ts";
// import { ModelStoreBase } from "../../models/local-store-model.ts";
// import { createFilesystemFactoryParamsObject } from "../../utils/filesystem-helpers.ts";


// type CommonDataForNodesForTest = {
//     type: string;
//     iri: string;
//     userMetadata: {};
//     modelStores: Record<string, ModelStore>;
//     projectIri?: string;
//     nodeResource: BaseResource;
// }
// type FileNodeForTest = {
//     type: "file";
// } & CommonDataForNodesForTest;
// type DirectoryNodeForTest = {
//     type: "dir";
//     nodeResource: Package;
//     children: Record<string, FilesystemNodeForTest>;
// } & CommonDataForNodesForTest;
// type FilesystemNodeForTest = DirectoryNodeForTest | FileNodeForTest;


// class LocalStoreModelGetterForTest implements LocalStoreModelGetter {
//     private currentUuid: number = 0;        // We will just increment the number, so it is consistent between runs.
//     private localStoreDescriptors: Record<string, LocalStoreDescriptor> = {};
//     private availableStores: Record<string, string> = {};      // The uuid to the store, which is now in memory
//     modelStores: Record<string, LocalStoreDescriptor> = {};

//     async create(): Promise<LocalStoreDescriptor> {
//         const id = (this.currentUuid++).toString();
//         const descriptor: LocalStoreDescriptor = {
//             type: "https://ofn.gov.cz/store-descriptor/backend-local",
//             uuid: id,
//         };
//         this.availableStores[id] = "";
//         this.localStoreDescriptors[id] = descriptor;
//         return descriptor;
//     }
//     async remove(localStoreDescriptor: LocalStoreDescriptor): Promise<void> {
//         delete this.localStoreDescriptors[localStoreDescriptor.uuid];
//         delete this.availableStores[localStoreDescriptor.uuid];
//     }
//     getById(uuid: string): LocalStoreDescriptor {
//         return this.localStoreDescriptors[uuid];
//     }
//     async get(id: string): Promise<Buffer | null> {
//         return Buffer.from(this.availableStores[id]) ?? null;
//     }
//     async set(id: string, payload: string): Promise<void> {
//         if (this.availableStores[id] === undefined) {
//             throw new Error("Not existing store")
//         }
//         this.availableStores[id] = payload;
//     }
//     getModelStore(uuid: string, onChangeListeners?: (() => Promise<unknown>)[]): ModelStore {
//         return new ModelStoreBase(uuid, this, onChangeListeners);
//     }
// }

// class ResourceModelForTest implements ResourceModelForFilesystemRepresentation, StorageApiForIriReplacement {
//     // Note that projectIri did not exist in the old import, so we just set it to undefined everywhere.

//     private readonly HARDSET_TIME = new Date(1970, 0, 1, 10, 30, 0, 0);

//     private iriToAbsoluteIriPathMap: Record<string, string> = {};
//     private inMemoryFilesystem: Record<string, FilesystemNodeForTest> = {};
//     getInMemoryFilesystem(): Record<string, FilesystemNodeForTest> {
//         return this.inMemoryFilesystem;
//     }

//     // ResourceModelForExport Interface
//     readonly storeModel: LocalStoreModelGetterForTest = new LocalStoreModelGetterForTest();

//     private findSubResources(packageNode: DirectoryNodeForTest): BaseResource[] {
//         // Internal method for testing to create the LoadedPackage object, that is fiend the SubResoruces
//         const subResources: BaseResource[] = [];
//         for (const [id, child] of Object.entries(packageNode.children)) {
//             subResources.push(child.nodeResource);
//         }
//         return subResources;
//     }
//     async getPackage(iri: string, deep?: boolean): Promise<LoadedPackage | null> {
//         const packageNode = this.inMemoryFilesystem[iri];
//         if (packageNode.type !== "dir") {
//             return null;
//         }
//         else {
//             const subResources: BaseResource[] = this.findSubResources(packageNode);
//             const loadedPackage: LoadedPackage = {
//                 ...packageNode.nodeResource,
//                 subResources,
//             }
//             return loadedPackage;
//         }
//     }

//     async getResource(iri: string): Promise<BaseResource | null> {
//         return this.inMemoryFilesystem[iri]?.nodeResource ?? null;
//     }

//     async updateResourceMetadata(iri: string, userMetadata: {}, mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined): Promise<void> {
//         const oldUserMetadata = this.inMemoryFilesystem[iri].nodeResource.userMetadata ?? {};
//         this.inMemoryFilesystem[iri].nodeResource.userMetadata = {
//             ...oldUserMetadata,
//             ...userMetadata,
//         };
//     }

//     async updateModificationTime(
//         iri: string, updatedModel: string | null, updateReason: ResourceChangeType,
//         shouldModifyHasUncommittedChanges: boolean, shouldNotifyListeners: boolean,
//         mergeStateUUIDsToIgnoreInUpdating?: string[]
//     ): Promise<void> {
//         const nextDay = new Date(this.inMemoryFilesystem[iri].nodeResource.metadata.modificationDate!);
//         nextDay.setDate(nextDay.getDate() + 1);
//         this.inMemoryFilesystem[iri].nodeResource.metadata.modificationDate = nextDay;
//     }


//     // ResourceModelForImport Interface
//     async createPackage(
//         parentIri: string | null,
//         iri: string,
//         userMetadata: {},
//         projectIri?: string | undefined
//     ): Promise<void> {
//         const pckg: Package = {
//             iri,
//             types: [LOCAL_PACKAGE],
//             userMetadata,
//             metadata: {
//                 modificationDate: this.HARDSET_TIME,
//                 creationDate: this.HARDSET_TIME,
//             },
//             linkedGitRepositoryURL: "",
//             projectIri: projectIri ?? "",
//             branch: "",
//             representsBranchHead: false,
//             lastCommitHash: "",
//             activeMergeStateCount: 0,
//             hasUncommittedChanges: false,
//             dataStores: {}
//         };
//         const dirNode: DirectoryNodeForTest = {
//             type: "dir",
//             iri: iri,
//             children: {},
//             userMetadata,
//             projectIri,
//             modelStores: {},
//             nodeResource: pckg,
//         };

//         if (parentIri === null || parentIri === "http://dataspecer.com/packages/local-root") {
//             this.inMemoryFilesystem[iri] = dirNode;
//         }
//         else {
//             this.inMemoryFilesystem[iri] = dirNode;
//             (this.inMemoryFilesystem[parentIri] as DirectoryNodeForTest).children[iri] = dirNode;
//         }
//     }


//     async createResource(
//         parentIri: string | null,
//         iri: string,
//         type: string,
//         userMetadata: {},
//         projectIri?: string | undefined,
//         mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined
//     ): Promise<void> {
//         const resource: BaseResource = {
//             iri,
//             types: [type],
//             userMetadata,
//             metadata: {
//                 modificationDate: this.HARDSET_TIME,
//                 creationDate: this.HARDSET_TIME,
//             },
//             linkedGitRepositoryURL: "",
//             projectIri: projectIri ?? "",
//             branch: "",
//             representsBranchHead: false,
//             lastCommitHash: "",
//             activeMergeStateCount: 0,
//             hasUncommittedChanges: false,
//             dataStores: {},
//         };
//         const resourceNode: FileNodeForTest = {
//             type: "file",
//             iri,
//             modelStores: {},
//             userMetadata,
//             projectIri,
//             nodeResource: resource,
//         }
//         if (parentIri === null || parentIri === "http://dataspecer.com/packages/local-root") {
//             this.inMemoryFilesystem[iri] = resourceNode;
//         }
//         else {
//             this.inMemoryFilesystem[iri] = resourceNode;
//             (this.inMemoryFilesystem[parentIri] as DirectoryNodeForTest).children[iri] = resourceNode;
//         }
//     }


//     async getOrCreateResourceModelStore(iri: string, storeName?: string, mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined): Promise<ModelStore> {
//         storeName ??= "model";
//         if (this.inMemoryFilesystem[iri].modelStores[storeName] !== undefined) {
//             return this.inMemoryFilesystem[iri].modelStores[storeName];
//         }
//         else {
//             const storeHandle = await this.storeModel.create();
//             const modelStore: ModelStore = this.storeModel.getModelStore(storeHandle.uuid);
//             this.inMemoryFilesystem[iri].modelStores[storeName] = modelStore;
//             this.inMemoryFilesystem[iri].nodeResource.dataStores[storeName] = storeHandle.uuid;
//             return modelStore;
//         }
//     }


//     deleteModelStore(iri: string, storeName?: string, mergeStateUUIDsToIgnoreInUpdating?: string[] | undefined): Promise<void> {
//         throw new Error("Method not implemented.");
//     }

//     async findResource(iri: string): Promise<ResourceToFindWhenReplacingIri | null> {
//         const resourceToReturn: ResourceToFindWhenReplacingIri = {
//             iri: iri,
//             dataStoreId: JSON.stringify(this.inMemoryFilesystem[iri].nodeResource.dataStores),
//             userMetadata: JSON.stringify(this.inMemoryFilesystem[iri].nodeResource.userMetadata),
//         }
//         return resourceToReturn;
//     }
//     async updateResource(iri: string, newUserMetadata: string): Promise<void> {
//         this.inMemoryFilesystem[iri].nodeResource.userMetadata = JSON.parse(newUserMetadata);
//     }
// }

// function createResourceModelForTesting(): ResourceModelForTest {
//     const resourceModelForTesting: ResourceModelForTest = new ResourceModelForTest();
//     return resourceModelForTesting;
// }

// test("Test import of 2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip", async () => {
//     const readStream = fs.createReadStream("./test-data/2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip");
//     const buffer: Buffer = await streamBuffer(readStream);

//     const resourceModelForTestingOld = createResourceModelForTesting();
//     const oldImportHandler = new PackageImporterDeprecated(resourceModelForTestingOld);
//     const importResultFromOld = await oldImportHandler.doImport(buffer);

//     const resourceModelForTestingNew = createResourceModelForTesting();
//     const newImportHandler = new PackageImporter(resourceModelForTestingNew, resourceModelForTestingNew.storeModel, resourceModelForTestingNew);
//     const importResultFromNew = await newImportHandler.doImport(buffer, false);

//     const oldResourceModelToCompare = deepOmit(resourceModelForTestingOld, "projectIri");
//     const newResourceModelToCompare = deepOmit(resourceModelForTestingNew, "projectIri");
//     expect(oldResourceModelToCompare).toStrictEqual(newResourceModelToCompare);
//     expect(importResultFromOld).toStrictEqual(importResultFromNew);
// });

// test("simple-vocab-no-subpackages.zip - test import/export", async () => {
//     await handleImportExportTest("./test-data/simple-vocab-no-subpackages.zip", true, IriMappingToRun.None);
// }, 500000);

// test("simple-vocab-no-subpackages.zip - test import/export/import/export - old export", async () => {
//     await handleImportExportImportTest("./test-data/simple-vocab-no-subpackages.zip", new PackageExporterNew(), true, IriMappingToRun.None);
// }, 500000);

// test("simple-vocab-no-subpackages.zip - test import/export/import/export - new export", async () => {
//     await handleImportExportImportTest("./test-data/simple-vocab-no-subpackages.zip", new PackageExporterByResourceType(), true, IriMappingToRun.None);
// }, 500000);

// ///////////

// test("Test import of 2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip - test import/export", async () => {
//     await handleImportExportTest("./test-data/2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip", true, IriMappingToRun.None)
// }, 500000);

// test("Test import of 2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip - test import/export/import/export - old export", async () => {
//     await handleImportExportImportTest("./test-data/2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip", new PackageExporterNew(), true, IriMappingToRun.None)
// }, 500000);

// test("Test import of 2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip - test import/export/import/export - new export", async () => {
//     await handleImportExportImportTest("./test-data/2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip", new PackageExporterByResourceType(), true, IriMappingToRun.None)
// }, 500000);

// ////////////
// // These are specific, because they contain https://..local-root..., which results in new iri, due to existence of /
// // For this reason we cannot simple compare them side by side (when sorted by filename) but we had to implement the
// // independent comparison

// test("JAKL_CCMM_AP-backup.zip - test import/export", async () => {
//     await handleImportExportTest("./test-data/JAKL_CCMM_AP-backup.zip", false, IriMappingToRun.None)
// }, 500000);

// test("JAKL_CCMM_AP-backup.zip - test import/export/import/export - old export", async () => {
//     await handleImportExportImportTest("./test-data/JAKL_CCMM_AP-backup.zip", new PackageExporterNew(), false, IriMappingToRun.None)
// }, 500000);

// test("JAKL_CCMM_AP-backup.zip - test import/export/import/export - new export", async () => {
//     await handleImportExportImportTest("./test-data/JAKL_CCMM_AP-backup.zip", new PackageExporterByResourceType(), false, IriMappingToRun.None)
// }, 500000);

// /////////////

// test("Czech Core Metadata Model-backup.zip - test import/export", async () => {
//     await handleImportExportTest("./test-data/Czech Core Metadata Model-backup.zip", true, IriMappingToRun.None)
// }, 500000);

// test("Czech Core Metadata Model-backup.zip - test import/export/import/export - old export", async () => {
//     await handleImportExportImportTest("./test-data/Czech Core Metadata Model-backup.zip", new PackageExporterNew(), true, IriMappingToRun.None)
// }, 500000);

// test("Czech Core Metadata Model-backup.zip - test import/export/import/export - new export", async () => {
//     await handleImportExportImportTest("./test-data/Czech Core Metadata Model-backup.zip", new PackageExporterByResourceType(), true, IriMappingToRun.None)
// }, 500000);

// /////////////


// test("Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip - test import/export", async () => {
//     await handleImportExportTest("./test-data/Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip", true, IriMappingToRun.None)
// }, 500000);

// test("Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip - test import/export/import/export - old export", async () => {
//     await handleImportExportImportTest("./test-data/Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip", new PackageExporterNew(), true, IriMappingToRun.None)
// }, 500000);

// test("Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip - test import/export/import/export - new export", async () => {
//     await handleImportExportImportTest("./test-data/Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip", new PackageExporterByResourceType(), true, IriMappingToRun.None)
// }, 500000);

// /////////////////
// /////////////////
// // Also test the iri to iri mapping - it tests the assumption that we find all iris that we should find

// test("simple-vocab-no-subpackages.zip - test import/export - with IriToIri mapping during export test", async () => {
//     await handleImportExportTest("./test-data/simple-vocab-no-subpackages.zip", true, IriMappingToRun.IriToIri);
// }, 500000);

// test("simple-vocab-no-subpackages.zip - test import/export/import/export - old export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/simple-vocab-no-subpackages.zip", new PackageExporterNew(), true, IriMappingToRun.IriToIri);
// }, 500000);

// test("simple-vocab-no-subpackages.zip - test import/export/import/export - new export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/simple-vocab-no-subpackages.zip", new PackageExporterByResourceType(), true, IriMappingToRun.IriToIri);
// }, 500000);

// ///////////

// test("Test import of 2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip - test import/export - with IriToIri mapping during export test", async () => {
//     await handleImportExportTest("./test-data/2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip", true, IriMappingToRun.IriToIri)
// }, 500000);

// test("Test import of 2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip - test import/export/import/export - old export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip", new PackageExporterNew(), true, IriMappingToRun.IriToIri)
// }, 500000);

// test("Test import of 2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip - test import/export/import/export - new export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/2023 Sb., o dlouhodobem řizeni informačnich systemů veřejne spravy-backup(7).zip", new PackageExporterByResourceType(), true, IriMappingToRun.IriToIri)
// }, 500000);

// // ////////////
// // // These are specific, because they contain https://..local-root..., which results in new iri, due to existence of /
// // // For this reason we cannot simple compare them side by side (when sorted by filename) but we had to implement the
// // // independent comparison ... this also means that we can test the iri to project iri mappings, sicne they differ

// test("JAKL_CCMM_AP-backup.zip - test import/export - with IriToIri mapping during export test", async () => {
//     await handleImportExportTest("./test-data/JAKL_CCMM_AP-backup.zip", false, IriMappingToRun.IriToIri)
// }, 500000);

// test("JAKL_CCMM_AP-backup.zip - test import/export/import/export - old export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/JAKL_CCMM_AP-backup.zip", new PackageExporterNew(), false, IriMappingToRun.IriToIri)
// }, 500000);

// test("JAKL_CCMM_AP-backup.zip - test import/export/import/export - new export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/JAKL_CCMM_AP-backup.zip", new PackageExporterByResourceType(), false, IriMappingToRun.IriToIri)
// }, 500000);

// test("JAKL_CCMM_AP-backup.zip - test import/export/import/export - old export - with IriToProjectIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/JAKL_CCMM_AP-backup.zip", new PackageExporterNew(), false, IriMappingToRun.IriToProjectIri)
// }, 500000);

// test("JAKL_CCMM_AP-backup.zip - test import/export/import/export - new export - with IriToProjectIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/JAKL_CCMM_AP-backup.zip", new PackageExporterByResourceType(), false, IriMappingToRun.IriToProjectIri)
// }, 500000);

// /////////////

// test("Czech Core Metadata Model-backup.zip - test import/export - with IriToIri mapping during export test", async () => {
//     await handleImportExportTest("./test-data/Czech Core Metadata Model-backup.zip", true, IriMappingToRun.IriToIri)
// }, 500000);

// test("Czech Core Metadata Model-backup.zip - test import/export/import/export - old export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/Czech Core Metadata Model-backup.zip", new PackageExporterNew(), true, IriMappingToRun.IriToIri)
// }, 500000);

// test("Czech Core Metadata Model-backup.zip - test import/export/import/export - new export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/Czech Core Metadata Model-backup.zip", new PackageExporterByResourceType(), true, IriMappingToRun.IriToIri)
// }, 500000);

// // /////////////


// test("Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip - test import/export - with IriToIri mapping during export test", async () => {
//     await handleImportExportTest("./test-data/Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip", true, IriMappingToRun.IriToIri)
// }, 500000);

// test("Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip - test import/export/import/export - old export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip", new PackageExporterNew(), true, IriMappingToRun.IriToIri)
// }, 500000);

// test("Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip - test import/export/import/export - new export - with IriToIri mapping during export test", async () => {
//     await handleImportExportImportTest("./test-data/Data Specification Vocabulary - Default Application Profile (DSV-DAP)-backup.zip", new PackageExporterByResourceType(), true, IriMappingToRun.IriToIri)
// }, 500000);


// enum IriMappingToRun {
//     None,
//     IriToIri,
//     IriToProjectIri,
//     ProjectIriToIri,
// };

// function getReverseIriMappingToRun(iriMappingToRun: IriMappingToRun): IriMappingToRun {
//     switch(iriMappingToRun) {
//         case IriMappingToRun.None: return IriMappingToRun.None;
//         case IriMappingToRun.IriToIri: return IriMappingToRun.IriToIri;
//         case IriMappingToRun.IriToProjectIri: return IriMappingToRun.ProjectIriToIri;
//         case IriMappingToRun.ProjectIriToIri: return IriMappingToRun.IriToProjectIri;
//     }
// }

// function getIriMapForIriMappingToRun(iriMaps: IriMaps, iriMappingToRun: IriMappingToRun): Record<string, string> | undefined {
//     switch(iriMappingToRun) {
//         case IriMappingToRun.None: return undefined
//         case IriMappingToRun.IriToIri: return iriMaps.iriToIriMap;
//         case IriMappingToRun.IriToProjectIri: return iriMaps.iriToProjectIriMap;
//         case IriMappingToRun.ProjectIriToIri: return iriMaps.projectIriToIriMap;
//     }
// }


// type IriMaps = {
//     iriToProjectIriMap: Record<string, string>;
//     projectIriToIriMap: Record<string, string>;
//     iriToIriMap: Record<string, string>;
// }

// function createIriMaps(resourceModelForTest: ResourceModelForTest): IriMaps {
//     const iriToProjectIriMap: Record<string, string> = {};
//     const projectIriToIriMap: Record<string, string> = {};
//     const iriToIriMap: Record<string, string> = {};
//     const inMemoryFs = resourceModelForTest.getInMemoryFilesystem();
//     for (const [iri, filesystemNode] of Object.entries(inMemoryFs)) {
//         iriToIriMap[iri] = iri;
//         iriToProjectIriMap[iri] = filesystemNode.projectIri!;
//         projectIriToIriMap[filesystemNode.projectIri!] = iri;
//     }
//     return {
//         iriToIriMap,
//         iriToProjectIriMap,
//         projectIriToIriMap,
//     };
// }


// async function importAndExportWithoutExportComparison(
//     pathToZip: string,
//     newExportHandler: PackageExporterBase,
//     iriMappingToRun: IriMappingToRun
// ) {
//     const readStream = fs.createReadStream(pathToZip);
//     const buffer: Buffer = await streamBuffer(readStream);
//     return importAndExportWithoutExportComparisonFromBuffer(buffer, buffer, newExportHandler, iriMappingToRun);
// }

// async function importAndExportWithoutExportComparisonFromBuffer(
//     buffer1: Buffer<ArrayBufferLike>,
//     buffer2: Buffer<ArrayBufferLike>,
//     newExportHandler: PackageExporterBase,
//     iriMappingToRun: IriMappingToRun,
//     iriMaps?: IriMaps,
// ) {
//     const resourceModelForTestingOld = createResourceModelForTesting();
//     const oldImportHandler = new PackageImporterDeprecated(resourceModelForTestingOld);
//     const importResultFromOld = await oldImportHandler.doImport(buffer1);

//     const resourceModelForTestingNew = createResourceModelForTesting();
//     const newImportHandler = new PackageImporter(resourceModelForTestingNew, resourceModelForTestingNew.storeModel, resourceModelForTestingNew);
//     const importResultFromNew = await newImportHandler.doImport(buffer2, false);

//     const oldResourceModelToCompare = deepOmit(resourceModelForTestingOld, "projectIri");
//     const newResourceModelToCompare = deepOmit(resourceModelForTestingNew, "projectIri");
//     if (iriMappingToRun === IriMappingToRun.None || iriMappingToRun === IriMappingToRun.IriToIri) {
//         expect(oldResourceModelToCompare).toStrictEqual(newResourceModelToCompare);
//         expect(importResultFromOld).toStrictEqual(importResultFromNew);
//     }

//     if (iriMaps === undefined) {
//         iriMaps = createIriMaps(resourceModelForTestingNew);
//     }


//     const oldExportHandler = new PackageExporterDeprecated(resourceModelForTestingOld);
//     const oldExportResult = await oldExportHandler.doExport(importResultFromOld[0]);

//     const dsFsConstructorParams: DsFsConstructorParams = createFilesystemFactoryParamsObject(resourceModelForTestingNew);
//     const filesystemExportParams: FilesystemFactoryMethodParams = {
//         ...dsFsConstructorParams,
//         roots: [createRootFilesystemNodeLocation(importResultFromNew[0], "")],
//         gitIgnore: null,
//     };

//     const testIriMapToRun = getIriMapForIriMappingToRun(iriMaps, iriMappingToRun);
//     const shouldRunTestVariant = iriMappingToRun !== IriMappingToRun.None;

//     const newExportResult = await newExportHandler.doExportFromIRI(
//         filesystemExportParams, "", AvailableFilesystems.DS_Filesystem, AvailableExports.Zip,
//         "json", false, true, testIriMapToRun, shouldRunTestVariant);

//     return {
//         iriMaps,
//         oldExportResult,
//         newExportResult,
//     };
// }

// async function handleImportExportTest(pathToZip: string, shouldDoStrictComparison: boolean, iriMappingToRun: IriMappingToRun) {
//     const {
//         oldExportResult,
//         newExportResult
//     } = await importAndExportWithoutExportComparison(pathToZip, new PackageExporterNew(), iriMappingToRun);

//     const oldZip = await JSZip.loadAsync(oldExportResult);
//     const newZip = await JSZip.loadAsync(newExportResult!);
//     if (shouldDoStrictComparison) {
//         await compareZips(oldZip, newZip);
//     }
//     else {
//         await compareZipsIriIndependent(oldZip, newZip);
//     }
// }


// async function handleImportExportImportTest(
//     pathToZip: string,
//     newExporterToUseInFirstExport: PackageExporterBase,
//     shouldDoStrictComparison: boolean,
//     iriMappingToRun: IriMappingToRun,
// ) {
//     const { oldExportResult, newExportResult, iriMaps } = await importAndExportWithoutExportComparison(pathToZip, newExporterToUseInFirstExport, iriMappingToRun);
//     const reverseIriMappingToRun = getReverseIriMappingToRun(iriMappingToRun);
//     const {
//         oldExportResult: oldExportResultRoundTwo,
//         newExportResult: newExportResultRoundTwo,
//     } = await importAndExportWithoutExportComparisonFromBuffer(oldExportResult, newExportResult!, new PackageExporterNew(), reverseIriMappingToRun, iriMaps);
//     const oldZip = await JSZip.loadAsync(oldExportResultRoundTwo);
//     const newZip = await JSZip.loadAsync(newExportResultRoundTwo!);
//     if (shouldDoStrictComparison) {
//         await compareZips(oldZip, newZip);
//     }
//     else {
//         await compareZipsIriIndependent(oldZip, newZip);
//     }
// }


// /**
//  * Does not properly handle the change of IRIs if exporting some iri containing https://...local-root ... otherwise it works
//  */
// async function compareZips(oldZip: JSZip, newZip: JSZip) {
//     let index = 0;

//     // We have to sort them. For some reason they are in different order (that being said the order does not matter for correctness just for testing)
//     const oldZipSortedArray = Object.entries(oldZip.files).sort();
//     const sortedOldZipFiles = Object.fromEntries(oldZipSortedArray);
//     const newZipSortedArray = Object.entries(newZip.files).sort();
//     const sortedNewZipFiles = Object.fromEntries(newZipSortedArray);
//     // TODO RadStr Debug: Debug print
//     // Object.entries(sortedOldZipFiles).forEach(e => console.info(e[1].name));
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // Object.entries(sortedNewZipFiles).forEach(e => console.info(e[1].name));

//     expect(Object.entries(oldZip.files).length).toStrictEqual(Object.entries(newZip.files).length);

//     for (const [oldRelativePath, oldZipEntry] of Object.entries(sortedOldZipFiles)) {
//         const newZipEntry = Object.values(sortedNewZipFiles)[index++];
//         if (newZipEntry === undefined) {
//             throw new Error("Entry does not exist: " + oldRelativePath);
//         }

//         const oldContent = await oldZipEntry.async("nodebuffer");
//         const newContent = await newZipEntry.async("nodebuffer");
//         const oldContentAsText = oldContent.toString("utf-8");
//         const newContentAsText = newContent.toString("utf-8");
//         if (oldContentAsText === newContentAsText && oldContentAsText === "") {
//             // Directory
//             continue;
//         }
//         const oldContentAsJson = JSON.parse(oldContentAsText);
//         const newContentAsJson = JSON.parse(newContentAsText);
//         const oldContentToCompare = deepOmit(oldContentAsJson, "projectIri");
//         delete oldContentToCompare._exportedAt;
//         delete oldContentToCompare._exportedBy;

//         const newContentToCompare = deepOmit(newContentAsJson, "projectIri");
//         delete newContentToCompare._exportedAt;
//         delete newContentToCompare._exportedBy;
//         expect(oldContentToCompare).toStrictEqual(newContentToCompare);
//         expect(oldZipEntry.name).toStrictEqual(newZipEntry.name);
//     }
// }




// /**
//  * Iri Independent variant of the {@link compareZips}.
//  *  Because export with iri that contains https://..local-root..., is speicfic since it results in new iri, due to existence of /
//  *  For this reason we cannot simple compare them side by side (when sorted by filename) but we had to implement the iri maps using metas.
//  * @param oldZip
//  * @param newZip
//  */
// async function compareZipsIriIndependent(oldZip: JSZip, newZip: JSZip) {
//     // We have to sort them. For some reason they are in different order (that being said the order does not matter for correctness just for testing)
//     const oldZipSortedArray = Object.entries(oldZip.files).sort();
//     const sortedOldZipFiles = Object.fromEntries(oldZipSortedArray);
//     const newZipSortedArray = Object.entries(newZip.files).sort();
//     const sortedNewZipFiles = Object.fromEntries(newZipSortedArray);
//     // TODO RadStr Debug: Debug print
//     // Object.entries(sortedOldZipFiles).forEach(e => console.info(e[1].name));
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // console.info("----------------------------------------------");
//     // Object.entries(sortedNewZipFiles).forEach(e => console.info(e[1].name));

//     expect(Object.entries(oldZip.files).length).toStrictEqual(Object.entries(newZip.files).length);


//     const oldContent: Record<string, Record<string, any>> = await getIriToDatastoreMap(sortedOldZipFiles);
//     const newContent: Record<string, Record<string, any>> = await getIriToDatastoreMap(sortedNewZipFiles);

//     expect(Object.keys(oldContent).length).toStrictEqual(Object.keys(newContent).length);

//     for (const [iri, datastoreMap] of Object.entries(oldContent)) {
//         const datastoreMapInNew = newContent[iri];
//         if (datastoreMapInNew === undefined) {
//             throw new Error(`${iri} does not exist in the new datastore map`);
//         }
//         expect(Object.values(datastoreMap).length).toStrictEqual(Object.values(datastoreMapInNew).length);

//         for (const [datastoreName, datastoreValue] of Object.entries(datastoreMap)) {
//             const datastoreValueInNew = datastoreMapInNew[datastoreName];
//             if (datastoreValueInNew === undefined) {
//                 throw new Error(`${datastoreName} is not existing datastore in the new datastore map`);
//             }
//             expect(datastoreValue).toStrictEqual(datastoreValueInNew);
//         }
//     }
// }


// async function getIriToDatastoreMap(sortedZipFiles: { [k: string]: JSZip.JSZipObject }): Promise<Record<string, Record<string, any>>> {
//     const iriToDatastoresMap: Record<string, Record<string, any>> = {};
//     let currentIri: string | null = null;
//     for (const [relativePath, zipEntry] of Object.entries(sortedZipFiles)) {
//         const content = await zipEntry.async("nodebuffer");
//         const contentAsText = content.toString("utf-8");
//         if (contentAsText === contentAsText && contentAsText === "") {
//             // Directory
//             continue;
//         }
//         const contentAsJson = JSON.parse(contentAsText);

//         if (zipEntry.name.endsWith(".meta.json")) {
//             const iri = contentAsJson?.iri;
//             if (iri === undefined) {
//                 expect(true).toStrictEqual(false);
//             }
//             currentIri = iri;
//         }

//         if (currentIri === null) {
//             throw new Error(".meta was not first")
//         }
//         // Strip it of unique fields and in case of projectIri of new field
//         const contentAsJsonForComparison = deepOmit(contentAsJson, "projectIri");
//         delete contentAsJsonForComparison._exportedAt;
//         delete contentAsJsonForComparison._exportedBy;

//         const jsonTextStart = zipEntry.name.lastIndexOf(".json");
//         const stringBeforeJsonSuffix = zipEntry.name.substring(0, jsonTextStart);
//         const startOfType = stringBeforeJsonSuffix.lastIndexOf(".") + 1
//         iriToDatastoresMap[currentIri] = {
//             [zipEntry.name.substring(startOfType)]: contentAsJsonForComparison,
//         };
//     }

//     return iriToDatastoresMap;
// }
