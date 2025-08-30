import { asyncHandler } from "../utils/async-handler.ts";
import express from "express";
import { GitProvider, GitProviderEnum, GitProviderFactory } from "../git-providers/git-provider-api.ts";
import { GIT_RAD_STR_BOT_USERNAME, GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN } from "../git-never-commit.ts";
import fs from "fs";
import { simpleGit } from "simple-git";
import path from "path";
import { createResource, updateBlob, updateResourceMetadata } from "./resource.ts";
import { DirectoryNode, FileNode, FilesystemMappingType, FilesystemNode, FilesystemNodeLocation, DatastoreInfo } from "../export-import/export-import-data-api.ts";
import { AvailableFilesystems, createFilesystemMappingRoot, FilesystemAbstraction, FilesystemFactory } from "../export-import/filesystem-abstractions/filesystem-abstraction.ts";
import { isDatastoreForMetadata } from "../export-import/export-new.ts";
import { getDatastoreInfoOfGivenDatastoreType } from "../export-import/filesystem-abstractions/implementations/ds-filesystem.ts";
import _ from "lodash";
import { compareTrees, dsPathJoin } from "../utils/git-utils.ts";
import { GitHubProvider } from "../git-providers/git-provider-instances/github.ts";
import { mergeStateModel, resourceModel } from "../main.ts";
import { updateDSRepositoryByPullingGit } from "./pull-remote-repository.ts";
import { EditableType } from "../models/merge-state-model.ts";
import { WEBHOOK_PATH_PREFIX } from "../models/git-store-info.ts";


export const handleWebhook = asyncHandler(async (request: express.Request, response: express.Response) => {
  // console.info("Requested URL: ", request.originalUrl);
  // console.info("Webhook - Body: ", request.body);
  // console.info("Webhook - Body payload: ", request.body.payload);
  response.type("text/plain");      // TODO RadStr: Not sure if there is any good reason why was I doing this.

  const { gitProvider, webhookPayload } = GitProviderFactory.createGitProviderFromWebhookRequest(request);
  const dataForWebhookProcessing = await gitProvider.extractDataForWebhookProcessing(webhookPayload);
  if (dataForWebhookProcessing === null) {
    return;
  }
  const { commits, cloneURL, iri, branch } = dataForWebhookProcessing;

  console.info("dataForWebhookProcessing", dataForWebhookProcessing);

  const resource = await resourceModel.getPackage(iri);
  if (resource === null) {
    return;
  }

  const isCloneSuccess = await updateDSRepositoryByPullingGit(iri, gitProvider, branch, cloneURL, WEBHOOK_PATH_PREFIX, resource.lastCommitHash, commits.length);
  // Actually we don't need to answer based on response, since this comes from git provider, only think we might need is to notify users that there was update
  return;
});

/**
 * @deprecated The old version - TODO RadStr: Remove
 */
async function saveChangesInDirectoryToBackendOldVersion(directory: string, gitProvider: GitProvider) {
  if (directory.endsWith(".git")) {
    return;
  }

  const directoryContent = fs.readdirSync(directory, { withFileTypes: true });
  const specialFiles = {
    model: ".model.json",
    meta: ".meta.json",
  };

  const packageModelFile = directoryContent.find(file => file.name === specialFiles.model);
  const packageMetaFile = directoryContent.find(file => file.name === specialFiles.meta);

  const processedFiles: Record<string, boolean> = {};
  directoryContent.forEach(file => {
    processedFiles[file.name] = false;
  });


  for (const entry of directoryContent) {
    const fullPath = dsPathJoin(directory, entry.name);
    if (gitProvider.isGitProviderDirectory(fullPath)) {     // TODO RadStr: Maybe can be better integrated into the ignore file
      continue;
    }
    if (entry.isDirectory()) {
      processedFiles[entry.name] = true;
      await saveChangesInDirectoryToBackend(fullPath, gitProvider);
    }
    else {
      console.info("entry.name", entry);
      if(entry.name === "test") {
        const iri = await createResource("8724f51d-76b5-4ef4-83cc-a609d7e92020", "added-from-git-type", entry.name + "-resource", undefined);
        updateBlob(iri, "added-from-git-type", JSON.parse(fs.readFileSync(fullPath, "utf-8")));
        continue;
      }

      // Skip the files for the package itself
      if (Object.values(specialFiles).includes(entry.name)) {
        processedFiles[entry.name] = true;
        continue;
      }

      if (!entry.name.endsWith(specialFiles.meta)) {
        continue;
      }

      processedFiles[entry.name] = true;

      // TODO: Again should probably iterate through the modelStore entries or how is it named, but I would have to get the resource from the database first and check against it
      const nameWithoutSuffix = entry.name.substring(0, entry.name.lastIndexOf(specialFiles.meta));
      // Find the content for the model file.
      const modelFile = directoryContent.find(file => file.name.startsWith(nameWithoutSuffix));
      if (modelFile === undefined) {
        console.error("Missing model file");
        continue;
      }


      processedFiles[modelFile.name] = true;

      console.info("Processing file:", {nameWithoutSuffix, modelFile, processedFiles, entry});
      await updateResourceFullyOldVersion(entry, modelFile);

    }
  }

  console.info("Processing package", directory, directoryContent);
  await updateResourceFullyOldVersion(packageMetaFile, packageModelFile);

  // TODO: Should handle the not processedFiles
}


/**
 * This method handles the storing of directory content, which usually comes from git clone, back to the DS store.
 * That means:
 *  0) Don't do anything with not changed (or copy them if necessary - depends on implementation of versioning inside DS)
 *  1) Remove removed
 *  2) Change changed
 *  3) Create created
 *   a) If there is new file from Git, which has not .meta and .model, just put it as new model (under the name of the file) to the package - user can edit it under the edit model on package
 *   b) If it has both .meta and .model create completely new resource - that is there will be new entry inside the package shown in manager
 *   c) Either only .meta or .model - skip it. We could try to somehow solve it, but we would probably end up in invalid state by some sequence of actions, so it is better to just skip it.
 * TODO RadStr: This should however account for collisions
 */
async function saveChangesInDirectoryToBackend(directory: string, gitProvider: GitProvider) {
  if (directory.endsWith(".git")) {     // TODO RadStr: Maybe can be better integrated into the ignore file
    return;
  }
  if (gitProvider.isGitProviderDirectory(directory)) {     // TODO RadStr: Maybe can be better integrated into the ignore file
    return;
  }



  const _directoryContent = fs.readdirSync(directory, { withFileTypes: true });
  const filesInDirectory = _directoryContent.filter(entry => !entry.isDirectory());
  const subDirectories = _directoryContent.filter(entry => entry.isDirectory());
  const directoryContentNames = filesInDirectory.map(content => content.name).filter(name => !ignoredFilesFilter(name));
  const { prefixGroupings, invalidNames } = groupByPrefixDSSpecific(...directoryContentNames);

  if (invalidNames.length > 0) {
    // TODO RadStr: ... we need to process them anyways, since they might be valid files from git, so the error + TODO node is no longer valid
    for (const invalidName of invalidNames) {
      // TODO RadStr: The base name expects that the directory is the IRI, which might not be the case, the repo may have different name than the repository
      await createNewResourceUploadedFromGit(directory, path.basename(directory), invalidName);
    }

    // TODO RadStr: Remove
    // We just log the error and move on - TODO RadStr: Probably should log a bit better.
    // console.error("Some of the files don't have enough separators. That is they don't follow the format [name].[dataStoreId].[format]", { invalidNames });
  }

  for (const [prefix, valuesForPrefix] of Object.entries(prefixGroupings)) {
    const datastores = valuesForPrefix;
    await updateResourceFully(directory, prefix, datastores);
  }

  for (const subDirectory of subDirectories) {
    const fullPath = dsPathJoin(directory, subDirectory.name);
    await saveChangesInDirectoryToBackend(fullPath, gitProvider);
  }
}



/**
 * This method handles the storing of directory content, which usually comes from git clone, back to the DS store.
 * That means:
 *  0) Don't do anything with not changed (or copy them if necessary - depends on implementation of versioning inside DS)
 *  1) Remove removed
 *  2) Change changed
 *  3) Create created
 *   a) If there is new file from Git, which has not .meta and .model, just put it as new model (under the name of the file) to the package - user can edit it under the edit model on package
 *   b) If it has both .meta and .model create completely new resource - that is there will be new entry inside the package shown in manager
 *   c) Either only .meta or .model - skip it. We could try to somehow solve it, but we would probably end up in invalid state by some sequence of actions, so it is better to just skip it.
 * TODO RadStr: This should however account for collisions
 * @returns True if there were conflicts, false otherwise
 */
export async function saveChangesInDirectoryToBackendFinalVersion(
  directory: string,
  iri: string,
  gitProvider: GitProvider,
  shouldSetMetadataCache: boolean,
  dsLastCommitHash: string,
  gitLastCommitHash: string,
  commonCommitHash: string,
): Promise<boolean> {
  const rootLocation: FilesystemNodeLocation = {
    iri: iri,
    fullPath: directory,
    fullTreePath: "",
  };
  const gitFilesystem = await FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.ClassicFilesystem, gitProvider);
  const gitFakeRoot = gitFilesystem.getRoot();    // TODO RadStr: This is the fake root though. but that should not matter
  const rootDirectory = gitFakeRoot;              // TODO RadStr: Just backwards compatibility with code so I don't have to change much
  const rootDirectoryName = gitFakeRoot.name;

  const fakeRootOld = createFilesystemMappingRoot();
  const mapping: FilesystemMappingType = await createFileSystemMapping(fakeRootOld.content, fakeRootOld, directory, gitProvider, shouldSetMetadataCache);
  console.info("ROOT MAPPING:", mapping)
  // await saveChangesInDirectoryToBackendFinalVersionRecursive(mapping, directory, gitProvider);      // TODO RadStr: Maybe await is unnecessary

  const filesystemNodeEntries = Object.entries(mapping);
  if (!(filesystemNodeEntries.length === 1 && filesystemNodeEntries[0][1].type === "directory")) {
    console.error("The mapping does not have root directory or the root is not a directory");
    return false;
  }
  const [rootDirectoryNameOld, rootDirectoryOld] = filesystemNodeEntries[0];

  console.info("_.isEqual(rootDirectoryOld, gitRoot.content[0])", _.isEqual(rootDirectoryOld, gitFakeRoot.content[0]));



  // TODO RadStr: Remove the iri
  // const comparisonResult = compareFiletrees(rootDirectoryName, rootDirectory, rootDirectoryName, rootDirectory);
  // console.info({comparisonResult});

  // TODO RadStr: Following lines (Except the last one) are just for playing with filesystem implementations
  const dsFilesystem = await FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.DS_Filesystem, gitProvider);

  // TODO RadStr: Rename ... and update based on the conflicts resolution, like we do not want to update when there is conflict
  await saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(rootDirectoryName, rootDirectory, directory, gitProvider);      // TODO RadStr: Maybe await is unnecessary
  // TODO RadStr: [WIP] Connect it to the conflict database entry
  const dsFakeRoot = dsFilesystem.getRoot();
  const dsRoot = Object.values(dsFakeRoot.content)[0];
  const gitRoot = Object.values(gitFakeRoot.content)[0];
  const dsPathToRootMeta = getMetadataDatastoreFile(dsRoot.datastores)?.fullPath;
  const gitPathToRootMeta = getMetadataDatastoreFile(gitRoot.datastores)?.fullPath;
  if (dsPathToRootMeta === undefined) {
    throw new Error("The meta file for ds root is not present");
  }
  else if (gitPathToRootMeta === undefined) {
    throw new Error("The meta file for git root is not present");
  }

  const {
    diffTree,
    diffTreeSize,
    changed,
    conflicts,
    created,
    removed
  } = await compareTrees(
    dsFilesystem, dsFakeRoot, dsFilesystem.getGlobalFilesystemMap(),
    gitFilesystem, gitFakeRoot, gitFilesystem.getGlobalFilesystemMap());

  await mergeStateModel.clearTable();     // TODO RadStr: Debug

  const editable: EditableType = "mergeFrom";

  const mergeStateInput = {
    lastCommonCommitHash: commonCommitHash,
    editable,
    rootIriMergeFrom: dsRoot.metadataCache.iri ?? "",
    rootFullPathToMetaMergeFrom: dsPathToRootMeta,
    lastCommitHashMergeFrom: dsLastCommitHash,
    filesystemTypeMergeFrom: AvailableFilesystems.DS_Filesystem,
    //
    rootIriMergeTo: gitRoot.metadataCache.iri ?? "",
    rootFullPathToMetaMergeTo: gitPathToRootMeta,
    lastCommitHashMergeTo: gitLastCommitHash,
    filesystemTypeMergeTo: AvailableFilesystems.ClassicFilesystem,
    changedInEditable: changed,
    removedInEditable: removed,
    createdInEditable: created,
    conflicts: conflicts,
    diffTree,
    diffTreeSize,
  };

  // TODO RadStr: Just debug
  const mergeStateId = await mergeStateModel.createMergeState(mergeStateInput);
  console.info("Current merge state with:", await mergeStateModel.getMergeStateFromUUID(mergeStateId, true));
  console.info("Current merge state without:", await mergeStateModel.getMergeStateFromUUID(mergeStateId, false));
  resourceModel.updateIsSynchronizedWithRemote(iri, false);

  return conflicts.length > 0;


  // const rootLocation: FilesystemNodeLocation = {
  //   iri: iri,
  //   fullPath: directory,
  //   fullTreePath: "",
  // };
  // const gitFilesystem = await FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.ClassicFilesystem, gitProvider);
  // const gitRoot = gitFilesystem.getRoot();    // TODO RadStr: This is the fake root though. but that should not matter
  // const rootDirectory = gitRoot;              // TODO RadStr: Just backwards compatibility with code so I don't have to change much
  // const rootDirectoryName = gitRoot.name;

  // TODO RadStr: The old variant - what I am testing against
  // // const fakeRoot = createFilesystemMappingRoot();
  // // const mapping: FilesystemMappingType = await createFileSystemMapping(fakeRoot.content, fakeRoot, directory, gitProvider, shouldSetMetadataCache);
  // // console.info("ROOT MAPPING:", mapping)
  // // // await saveChangesInDirectoryToBackendFinalVersionRecursive(mapping, directory, gitProvider);      // TODO RadStr: Maybe await is unnecessary

  // // const filesystemNodeEntries = Object.entries(mapping);
  // // if (!(filesystemNodeEntries.length === 1 && filesystemNodeEntries[0][1].type === "directory")) {
  // //   console.error("The mapping does not have root directory or the root is not a directory");
  // //   return;
  // // }
  // // const [rootDirectoryName, rootDirectory] = filesystemNodeEntries[0];



  // // TODO RadStr: Remove the iri
  // // const comparisonResult = compareFiletrees(rootDirectoryName, rootDirectory, rootDirectoryName, rootDirectory);
  // // console.info({comparisonResult});

  // // TODO RadStr: Following lines (Except the last one) are just for playing with filesystem implementations
  // const dsFilesystem = await FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.DS_Filesystem, gitProvider);
  // const comparisonResult = compareFiletrees(rootDirectoryName, gitFilesystem.getRoot(), rootDirectoryName, dsFilesystem.getRoot());

  // console.info({comparisonResult, root1: gitFilesystem.getRoot(), root2: gitFilesystem.getRoot()});

  // await saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(rootDirectoryName, rootDirectory, directory, gitProvider);      // TODO RadStr: Maybe await is unnecessary
}

/**
 * @deprecated This is just for testing during development when migrating to new implementation
 */
export async function testMappingMethod() {
  const gitProvider = new GitHubProvider();
  const directory = "C:\\Users\\Radek\\ds-test-repo";
  const iri = "d9971d75-fd1a-4a45-b450-84ad33b7bd24";
  const shouldSetMetadataCache = true;
  const rootLocation: FilesystemNodeLocation = {
    iri: iri,
    fullPath: directory,
    fullTreePath: "",
  };
  const gitFilesystem = await FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.ClassicFilesystem, gitProvider);
  const gitRoot = gitFilesystem.getRoot();    // TODO RadStr: This is the fake root though. but that should not matter
  const rootDirectory = gitRoot;              // TODO RadStr: Just backwards compatibility with code so I don't have to change much
  const rootDirectoryName = gitRoot.name;

  const fakeRootOld = createFilesystemMappingRoot();
  const mapping: FilesystemMappingType = await createFileSystemMapping(fakeRootOld.content, fakeRootOld, directory, gitProvider, shouldSetMetadataCache);
  console.info("ROOT MAPPING:", mapping)
  // await saveChangesInDirectoryToBackendFinalVersionRecursive(mapping, directory, gitProvider);      // TODO RadStr: Maybe await is unnecessary

  // TODO RadStr: Just the old code
  const filesystemNodeEntries = Object.entries(mapping);
  if (!(filesystemNodeEntries.length === 1 && filesystemNodeEntries[0][1].type === "directory")) {
    console.error("The mapping does not have root directory or the root is not a directory");
    return;
  }
  const [rootDirectoryNameOld, rootDirectoryOld] = filesystemNodeEntries[0];
  console.info("_.isEqual(rootDirectoryOld, gitRoot.content[0])", _.isEqual(rootDirectoryOld, gitRoot.content[0]));



  // TODO RadStr: Remove the iri
  // const comparisonResult = compareFiletrees(rootDirectoryName, rootDirectory, rootDirectoryName, rootDirectory);
  // console.info({comparisonResult});

  // TODO RadStr: Following lines (Except the last one) are just for playing with filesystem implementations
  const dsFilesystem = await FilesystemFactory.createFileSystem([rootLocation], AvailableFilesystems.DS_Filesystem, gitProvider);
  const comparisonResult = await compareFiletrees(gitFilesystem, rootDirectoryName, gitFilesystem.getRoot(), dsFilesystem, rootDirectoryName, dsFilesystem.getRoot());

  console.info({comparisonResult, root1: gitFilesystem.getRoot(), root2: gitFilesystem.getRoot()});

  await saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(rootDirectoryName, rootDirectory, directory, gitProvider);      // TODO RadStr: Maybe await is unnecessary
}

async function saveChangesInDirectoryToBackendFinalVersionRecursive(mapping: FilesystemMappingType, directory: string, gitProvider: GitProvider) {
  // for (const [name, value] of Object.entries(mapping)) {
  //   // TODO RadStr: Name vs IRI
  //   await handleResourceUpdateFinalVersion(directory, name, value);

  //   if (value.type === "directory") {
  //     // TODO RadStr: Name vs IRI
  //     const newDirectory = dsPathJoin(directory, name);
  //     await saveChangesInDirectoryToBackendFinalVersionRecursive(value.content, newDirectory, gitProvider);   // TODO RadStr: Maybe await is unnecessary
  //   }
  // }

  ///////////////////////////
  ///////////////////////////

  console.info("RECURSIVE MAPPING", mapping);
  for (const [name, value] of Object.entries(mapping)) {
    // TODO RadStr: Name vs IRI
    await handleResourceUpdateFinalVersion(directory, name, value);

    if (value.type === "directory") {
      // TODO RadStr: Name vs IRI
      console.info("RECURSIVE RECURSIVE MAPPING", value.content);
      for (const [name2, value2] of Object.entries(value.content)) {

        if (value2.type === "directory") {
          const newDirectory = dsPathJoin(directory, name2);
          await saveChangesInDirectoryToBackendFinalVersionRecursive(value2.content, newDirectory, gitProvider);
        }
        else {
          await handleResourceUpdateFinalVersion(directory, name2, value2);
        }
      }
    }
  }
}

async function saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(
  currentlyProcessedDirectoryNodeName: string,
  currentlyProcessedDirectoryNode: DirectoryNode,
  directory: string,
  gitProvider: GitProvider
) {
  console.info("RECURSIVE MAPPING", currentlyProcessedDirectoryNode);
  await handleResourceUpdateFinalVersion(directory, currentlyProcessedDirectoryNodeName, currentlyProcessedDirectoryNode);

  for (const [name, value] of Object.entries(currentlyProcessedDirectoryNode.content)) {
    // TODO RadStr: Name vs IRI
    if(value.type === "directory") {
      const newDirectory = dsPathJoin(directory, name);
      await saveChangesInDirectoryToBackendFinalVersionRecursiveFinalFinal(name, value, newDirectory, gitProvider);
    }
    else {
      await handleResourceUpdateFinalVersion(directory, name, value);
    }
  }
}

// TODO RadStr: Move elsewhere in code. Used both in backend and DiffTree dialog
export type ComparisonData = {
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
}

type ComparisonResult = {
  changed: ComparisonData[],
  removed: ComparisonData[],
  created: ComparisonData[],
}


/**
 * @deprecated Already do it all when I am computing the diff tree
 */
async function compareFiletrees(
  filesystem1: FilesystemAbstraction,
  treeRoot1Name: string,
  treeRoot1: DirectoryNode,
  filesystem2: FilesystemAbstraction,
  treeRoot2Name: string,
  treeRoot2: DirectoryNode,
) {
  const comparisonResult: ComparisonResult = {
    changed: [],
    removed: [],
    created: []
  };

  await compareFiletreesInternal(filesystem1, treeRoot1Name, treeRoot1, filesystem2, treeRoot2Name, treeRoot2, comparisonResult);
  return comparisonResult;
}

// TODO RadStr: Use objects instead of passing in separate values
/**
 * Compares the {@link directory1} to {@link directory2}. That is the {@link result} will contain
 *  the removed entries from {@link directory1} compared to {@link directory2} and same for changed.
 *  The created ones will be those present in {@link directory2}, but not in {@link directory1}.
 */
async function compareFiletreesInternal(
  filesystem1: FilesystemAbstraction,
  directory1Name: string,
  directory1: DirectoryNode,
  filesystem2: FilesystemAbstraction,
  treeRoot2Name: string,
  directory2: DirectoryNode,
  result: ComparisonResult,
) {
  for (const [nodeName, nodeValue] of Object.entries(directory1.content)) {
    const node2Value = directory2.content[nodeName];
    if (node2Value !== undefined && nodeValue.type !== node2Value.type) { // They are not of same type and both exists
      console.error("Tree comparison error - Compared entries have the same name however they are of different type. One is file, while the other is directory");
      throw new Error("Tree comparison error - Compared entries have the same name however they are of different type. One is file, while the other is directory");
    }

    for (const datastore1 of nodeValue.datastores) {
      const node2Datastore = node2Value === undefined ? undefined : getDatastoreInfoOfGivenDatastoreType(node2Value, datastore1.type);
      if (node2Datastore !== undefined) {
        if (nodeValue.type === "directory") {
          await compareFiletreesInternal(filesystem1, nodeName, nodeValue, filesystem2, nodeName, node2Value as DirectoryNode, result);
        }
        else {
          if (await areDatastoresDifferent(filesystem1, nodeValue, filesystem2, node2Value as FileNode, datastore1)) {
            const changed: ComparisonData = {
              oldVersion: nodeValue,
              newVersion: node2Value,
              affectedDataStore: datastore1
            };

            result.changed.push(changed);
          }
        }
      }
      else {
        const removed: ComparisonData = {
          oldVersion: nodeValue,
          newVersion: null,
          affectedDataStore: datastore1
        };
        result.removed.push(removed);
      }
    }
    // TODO RadStr: Have to also go the way around like in the DiffTree, that is find the datastores2 not present in datastore1
  }

  for (const [entryName, entryValue] of Object.entries(directory2.content)) {
    for (const datastore of entryValue.datastores) {
      if (getDatastoreInfoOfGivenDatastoreType(directory1.content[entryName], datastore.type) === undefined) {
        const created: ComparisonData = {
          oldVersion: null,
          newVersion: entryValue,
          affectedDataStore: datastore,
        }
        result.created.push(created);
      }
    }
  }
}

async function areDatastoresDifferent(
  filesystem1: FilesystemAbstraction,
  entry1: FileNode,
  filesystem2: FilesystemAbstraction,
  entry2: FileNode,
  datastore: DatastoreInfo
): Promise<boolean> {
  // TODO RadStr: For now just assume, that there is always change
  const content1 = await filesystem1.getDatastoreContent(entry1.fullTreePath, datastore.type, true);
  const content2 = await filesystem2.getDatastoreContent(entry2.fullTreePath, datastore.type, true);

  console.info({content1, content2});    // TODO RadStr: DEBUG Print

  return !_.isEqual(content1, content2);
}

async function updateFilesystemBasedOnChanges(changes: ComparisonResult, filesystem: FilesystemAbstraction) {
  for (const removed of changes.removed) {
    filesystem.removeDatastore(removed.oldVersion!, removed.affectedDataStore.type, false);
  }
  for (const changed of changes.changed) {
    filesystem.changeDatastore(filesystem, changed, true);
  }

  const createdDirectories = changes.created.filter(created => created.newVersion?.type === "directory");
  const createdFiles = changes.created.filter(created => created.newVersion?.type === "file");
  for (const createdDirectory of createdDirectories) {    // First create the directories
    filesystem.createDatastore(filesystem, createdDirectory.newVersion!, createdDirectory.affectedDataStore);
  }

  for (const createdFile of createdFiles) {
    filesystem.createDatastore(filesystem, createdFile.newVersion!, createdFile.affectedDataStore);
  }
}

// TODO RadStr: Better name for the datastoreIdentifier maybe filesystemNodeIdentifier?
/**
 *
 * @returns Returns true if the given file has only the data without any other related files - no metadata, or anything.
 *  This happens when user adds new file from git without explicitly creating the .meta and .model file.
 */
function isFileAddedFromGit(datastoreIdentifier: string, datastores: DatastoreInfo[]): boolean {
  return datastores.length === 1 && datastoreIdentifier === datastores[0].fullName;
}

async function handleResourceUpdateFinalVersion(fullPathToDirectory: string, datastoreIdentifier: string, filesystemNode: FilesystemNode) {
  if (isFileAddedFromGit(datastoreIdentifier, filesystemNode.datastores)) {
    const parentIri = filesystemNode.parent?.metadataCache.iri;
    if (parentIri !== undefined) {
      await createNewResourceUploadedFromGit(fullPathToDirectory, parentIri, datastoreIdentifier);
    }
    else {
      console.error("Missing parent IRI, so we can not create");    // TODO RadStr: Not sure, this probably should not happen, I should always have the parentIri available
    }
    return;
  }

  const datastoreTypesToDatastores: Record<string, DatastoreInfo> = {};

  for (const datastore of filesystemNode.datastores) {
    datastoreTypesToDatastores[datastore.type] = datastore;

    // TODO RadStr: If just for debug
    if(filesystemNode.type === "directory") {
      console.info("Directroy");
    }

    const fullPathToDatastore = dsPathJoin(fullPathToDirectory, datastore.fullName);

    // TODO RadStr: Should check if it already exists, or if not it should be created
    if (isDatastoreForMetadata(datastore.type)) {
      // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
      const metaFileContent = JSON.parse(fs.readFileSync(fullPathToDatastore, "utf-8"));
      await updateResourceMetadata(datastoreIdentifier, metaFileContent!.userMetadata);
      continue;
    }
    else {
        // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
      const packageModelFileContent = JSON.parse(fs.readFileSync(fullPathToDatastore, "utf-8"));
      await updateBlob(datastoreIdentifier, datastore.type, packageModelFileContent);
    }
  }
}

// TODO RadStr: Move elsewhere
// TODO RadStr: Git provider also probably is not needed
/**
 * This method handles the storing of directory content, which usually comes from git clone, back to the DS store.
 * That means:
 *  0) Don't do anything with not changed (or copy them if necessary - depends on implementation of versioning inside DS)
 *  1) Remove removed
 *  2) Change changed
 *  3) Create created
 *   a) If there is new file from Git, which has not .meta and .model, just put it as new model (under the name of the file) to the package - user can edit it under the edit model on package
 *   b) If it has both .meta and .model create completely new resource - that is there will be new entry inside the package shown in manager
 *   c) Either only .meta or .model - skip it. We could try to somehow solve it, but we would probably end up in invalid state by some sequence of actions, so it is better to just skip it.
 * TODO RadStr: This should however account for collisions
 * @deprecated
 */
async function createFileSystemMapping(
  mapping: FilesystemMappingType,
  parentDirectoryNode: DirectoryNode | null,
  directory: string,
  gitProvider: GitProvider,
  shouldSetMetadataCache: boolean,
) {
  if (directory.endsWith(".git")) {     // TODO RadStr: Maybe can be better integrated into the ignore file
    return {};
  }
  if (gitProvider.isGitProviderDirectory(directory)) {     // TODO RadStr: Maybe can be better integrated into the ignore file
    return {};
  }

  const directoryBasename = path.basename(directory);

  const _directoryContent = fs.readdirSync(directory, { withFileTypes: true });
  const filesInDirectory = _directoryContent.filter(entry => !entry.isDirectory());
  const subDirectories = _directoryContent.filter(entry => entry.isDirectory());
  const directoryContentNames = filesInDirectory.map(content => content.name).filter(name => !ignoredFilesFilter(name));
  const { prefixGroupings, invalidNames } = groupByPrefixDSSpecific(...directoryContentNames);
  mapping[directoryBasename] = {
    name: directoryBasename,
    type: "directory",
    content: {},
    metadataCache: {},
    datastores: [],
    parent: parentDirectoryNode,
    fullTreePath: directory,
  };

  const parentDirectoryNodeForRecursion = mapping[directoryBasename] as DirectoryNode;
  const directoryContentContainer = parentDirectoryNodeForRecursion.content;

  if (invalidNames.length > 0) {    // TODO RadStr: For is enough, no need for if
    // TODO RadStr: ... we need to process them anyways, since they might be valid files from git, so the error + TODO node is no longer valid
    for (const invalidName of invalidNames) {
      const prefixName: DatastoreInfo = {
        fullName: invalidName,
        afterPrefix: invalidName,
        type: invalidName,
        name: invalidName,
        format: null,
        fullPath: dsPathJoin(directory, invalidName),
      };
      directoryContentContainer[invalidName] = {
        name: invalidName,
        type: "file",
        metadataCache: { iri: invalidName },
        // TODO RadStr: the old way
        // datastores: { model: dsPathJoin(directory, invalidName) },
        datastores: [prefixName],
        parent: mapping[directoryBasename],
        fullTreePath: dsPathJoin(directory, invalidName),
      };
    }

    // TODO RadStr: No longer valid - remove
    // We just log the error and move on - TODO RadStr: Probably should log a bit better.
    // console.error("Some of the files don't have enough separators. That is they don't follow the format [name].[dataStoreId].[format]", { invalidNames });
  }

  for (const [prefix, valuesForPrefix] of Object.entries(prefixGroupings)) {
    // TODO RadStr: Previously I tried using map - maybe will get back to it later

    // const datastores: Record<string, string> = {};
    // valuesForPrefix.forEach(datastore => {
    //   datastores[datastore.type] = dsPathJoin(directory, datastore.fullName);
    // });

    if (prefix === "") {    // Directory data
      mapping[directoryBasename].datastores = valuesForPrefix;
      const fullPath = directory + "/";    // We have to do it explictly, if we use path.join on empty string, it won't do anything with the result.
      setMetadataCache(mapping[directoryBasename], fullPath, shouldSetMetadataCache);
      continue;
    }

    const fullPath = dsPathJoin(directory, prefix);
    const fileNode: FilesystemNode = {
      name: prefix,
      type: "file",
      metadataCache: {},
      datastores: valuesForPrefix,
      parent: mapping[directoryBasename],
      fullTreePath: fullPath,
    };

    setMetadataCache(fileNode, fullPath, shouldSetMetadataCache);
    directoryContentContainer[prefix] = fileNode;
  }

  for (const subDirectory of subDirectories) {
    const fullPath = dsPathJoin(directory, subDirectory.name);
    await createFileSystemMapping(directoryContentContainer, parentDirectoryNodeForRecursion, fullPath, gitProvider, shouldSetMetadataCache);
  }

  return mapping;
}

function setMetadataCache(node: FilesystemNode, directory: string, shouldSetMetadataCache: boolean) {
  if (shouldSetMetadataCache) {
    const metadataDatastore = getMetadataDatastoreFile(node.datastores);
    if (metadataDatastore === undefined) {
      console.error("Metadata datastore is missing, that is there is no .meta file or its equivalent (depending on filesystem)", { node, directory, datastores: node.datastores });
      return;
    }
    const fullPath = `${directory}${metadataDatastore.afterPrefix}`;
    node.metadataCache = constructMetadataCache(fullPath, node.metadataCache);
  }
  // TODO RadStr: Maybe also do something if shouldSetMetadataCache === false
}

function constructMetadataCache(metadataFilePath: string, oldCache?: object) {
  oldCache ??= {};
  return {
    ...oldCache,
    ...readMetadataFile(metadataFilePath),
  };
}

function readMetadataFile(metadataFilePath: string) {
  const metadata = JSON.parse(fs.readFileSync(metadataFilePath, "utf-8"));
  return metadata;
}

function getMetadataDatastoreFile(datastores: DatastoreInfo[]): DatastoreInfo | undefined {
  return datastores.find(datastore => isDatastoreForMetadata(datastore.type));
}


// TODO RadStr: Maybe can be better integrated into the ignore file
function ignoredFilesFilter(file: string) {
  return file === "README.md";
}

/**
 * Takes the list of names in {@link names} and {@link prefixSeparator}, which you can think of as separator of prefix chunks, which can be joined to create longest prefix.
 * @returns Groups the {@link names} by longest prefix and the invalid names should be in this case probably things, which don't have a single {@link prefixSeparator}.
 *
 * @todo We are using groupByPrefix instead, which is simpler to implement and covers the current use-case
 * @deprecated See TODO
 *
 * @example The call of groupByLongestPrefix(".", "hello.svg.json", "hello.model.json", "hell.svg.json", "ahoj.model.json")
 *
 * Returns (not necessary in the following order)
 * {
 *  hello: [ { fullName: hello.svg.json, afterPrefix: .svg.json }, { fullName: hello.model.json, afterPrefix: .model.json } ],
 *  hell: [ { fullName: hell.svg.json, afterPrefix: .svg.json } ],
 *  ahoj: [ { fullName: ahoj.svg.json, afterPrefix: .svg.json } ],
 * }
 */
function groupByLongestPrefix(prefixSeparator: string, ...names: string[]): PrefixResult {
  throw new Error("Not implented, since it is overkill for current implementatio of DS resources.");
}


/**
 * TODO RadStr: Maybe should be in some utils.ts file instead
 * @deprecated Implementation moved to different file!!!
 * @returns The index of the {@link n}-th last {@link separator} in given {@link value}. -1 there is not enough separators.
 * @example name = "a.b.c.d", separator = ".", n = 3 returns 1
 */
function findNthlastSeparator(value: string, separator: string, n: number): number {
  let index = value.length + 1;
  for (let i = 0; i < n; i++) {
    index = value.lastIndexOf(separator, index - 1);
    if (index === -1) {
      return -1;
    }
  }

  return index;
}

/**
 * @returns The model and format from given {@link value}, which is of the following format. The * are there to separate "tokens".
 *
 * [anything]*separator*model*separator*format
 *  So the last two tokens created by {@link separator} are returned. If there is not enough separators the relevant values are null.
 * @example extractModelAndFormat(value="a.b.c.d.e.gh.meta.json", separator=".") returns {model = "meta", format = "json"}
 */
function extractModelAndFormat(value: string, separator: string): {model: string | null, format: string | null} {
  let index = value.length + 1;
  let previousIndex = -1;
  let model: string | null = null;
  let format: string | null = null;
  for (let i = 0; i < 2; i++) {
    previousIndex = index;
    index = value.lastIndexOf(separator, index - 1);
    if (index === -1) {
      return { model, format };
    }
    if (i === 0) {
      format = value.substring(index + 1);
    }
    else {
      model = value.substring(index + 1, previousIndex);
    }
  }

  return { model, format };
}

/**
 * @deprecated Implementation moved to different file!!!
 */
type PrefixResult = {
  prefixGroupings: Record<string, DatastoreInfo[]>,
  invalidNames: string[];
};

/**
 * This method takes {@link names}, remove the last {@link postfixCount} chunks, which starts with {@link prefixSeparator}.
 *
 * This method covers current use-case where the files have the following names [name].[dataStoreId].[format], (In the result the datastoreId is stored inside type property)
 *  where dataStoreId is for example "model" or "meta" and format is usually "json" (but in future may be "yaml" or "rdf") and name is currently the iri of resource.
 *  The "." is the {@link prefixSeparator}.
 *
 * TODO RadStr: Maybe should be in some utils.ts file instead, same for the other prefix methods.
 * @deprecated Implementation moved to different file - and CHANGED!!!!!!!!!
 * @returns Groups the {@link names} by same prefix. and invalid values, that is those which don't have at least {@link postfixCount} {@link prefixSeparator}s
 *
 * @example The call of groupByPrefix(".", 2, "hello.svg.json", "hello.model.json", "hell.svg.json", "ahoj.model.json")
 *
 * Returns (not necessary in the following order)
 * {
 *  hello: [ { fullName: hello.svg.json, afterPrefix: .svg.json, type: svg }, { fullName: hello.model.json, afterPrefix: .model.json, type: model } ],
 *  hell: [ { fullName: hell.svg.json, afterPrefix: .svg.json, type: svg } ],
 *  ahoj: [ { fullName: ahoj.svg.json, afterPrefix: .svg.json, type: svg } ],
 * }
 */
function groupByPrefix(prefixSeparator: string, postfixCount: number, ...names: string[]): PrefixResult {
  const invalidNames: string[] = [];
  const prefixGroupings: Record<string, DatastoreInfo[]> = {};
  names
    .forEach(name => {
      const index = findNthlastSeparator(name, prefixSeparator, postfixCount);
      if (index === -1) {
        invalidNames.push(name);
        return null;
      }
      const prefix = name.substring(0, index);

      if (prefixGroupings[prefix] === undefined) {
        prefixGroupings[prefix] = [];
      }

      const afterPrefix = name.substring(index);
      let type: string;
      if (postfixCount <= 1) {
        // TODO RadStr: Just fallback for errors, but should not really ever happen
        type = afterPrefix.substring(1);
      }
      else {
        const typeIndex = findNthlastSeparator(name, prefixSeparator, postfixCount - 1);
        type = name.substring(index, typeIndex);
      }

      const prefixName: DatastoreInfo = {
        fullName: name,
        afterPrefix,
        type,
        name: name,
        format: "TODO: RadStr no longer correct - use the different implementation",
        fullPath: "TODO: RadStr no longer correct - use the different implementation"
      };
      prefixGroupings[prefix].push(prefixName);
    });

  return {
    prefixGroupings,
    invalidNames
  };
}


/**
 * Just calls {@link groupByPrefix} with prefixSeparator === "." and postfixCount === 2
 * @deprecated Implementation moved to different file
 */
function groupByPrefixDSSpecific(...names: string[]): PrefixResult {
  return groupByPrefix(".", 2, ...names);
}

/**
 * @deprecated The old version, which could handle only the meta and model file
 */
async function updateResourceFullyOldVersion(metaFile: fs.Dirent | undefined, modelFile: fs.Dirent | undefined) {
  // TODO: Should check if the resource/blob exists, that is if it is actually update or create
  // TODO: I don't know why it says that we should use parentPath, when it is empty, unlike path???
  console.info("CONTENT:", metaFile, modelFile);
  const metaFullPath = dsPathJoin(metaFile?.path ?? "", metaFile?.name ?? "");
  const modelFullPath = dsPathJoin(modelFile?.path ?? "", modelFile?.name ?? "");

  console.info("FULL PATHS", metaFullPath, modelFullPath);

  // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
  const metaFileContent = metaFile === undefined ? null : JSON.parse(fs.readFileSync(metaFullPath, "utf-8"));

  // TODO: Can it actually take null/undefined in parameter or not? ... that is use ! or not
  // TODO: + The defaults should be better
  await updateResourceMetadata(metaFileContent!.iri, metaFileContent!.userMetadata);
  const packageModelFileContent = modelFile === undefined ? null : JSON.parse(fs.readFileSync(modelFullPath, "utf-8"));
  // TODO: Better name, not "model"
  await updateBlob(metaFileContent!.iri, "model", packageModelFileContent);
}

// TODO RadStr: jmeno - Oni to uplne nejsou datastores ... meta treba neni
// TODO RadStr: Document
async function updateResourceFully(fullPathToDirectory: string, datastoreIdentifier: string, datastores: DatastoreInfo[]) {
  const datastoreTypesToDatastores: Record<string, DatastoreInfo> = {};
  if (datastoreIdentifier.length === 0) {   // The directory files
    datastoreIdentifier = path.basename(fullPathToDirectory);
  }

  for (const datastore of datastores) {
    datastoreTypesToDatastores[datastore.type] = datastore;

    const fullPathToDatastore = dsPathJoin(fullPathToDirectory, datastore.fullName);

    // TODO RadStr: Should check if it already exists, or if not it should be created
    if (isDatastoreForMetadata(datastore.type)) {
      // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
      const metaFileContent = JSON.parse(fs.readFileSync(fullPathToDatastore, "utf-8"));
      await updateResourceMetadata(datastoreIdentifier, metaFileContent!.userMetadata);
      continue;
    }
    else {
      // TODO: Just for now - I don't know about used encodings, etc. - but this is just detail
      const packageModelFileContent = JSON.parse(fs.readFileSync(fullPathToDatastore, "utf-8"));
      await updateBlob(datastoreIdentifier, datastore.type, packageModelFileContent);
    }
  }
}

async function createNewResourceUploadedFromGit(fullPathToDirectory: string, parentIri: string, name: string) {
  // TODO RadStr: If I want to create separate file ... however there are issues, which stem from the fact that there becomes incosistency between DS filesystem (there is new .meta and .model file) and git system (only one file)

  // const iri = await createResource(parentIri, "added-from-git-type", name, {"label": {"cs": name}});
  // const fullPathToFile = dsPathJoin(fullPathToDirectory, name);
  // console.info("fullPathToFile:", fs.statSync(fullPathToFile));
  // const fileContent = fs.readFileSync(fullPathToFile, "utf-8");
  // console.info("TODO RadStr: fileContent", { fileContent });
  // await updateBlob(iri, "added-from-git-type-nname", fileContent);
  // await updateBlob(iri, "added-from-git-type-name", fileContent);

  // Trying to use as the model for the package, however by default we don't show the non-model stuff
  // ... This is better, we will end up only with one file. Only one issue is that we have to solve the problem when user decides to explicitly create .meta and .model
  //     in git, because he would like to have metadata for this file ... however what it means - it means that user removed the old file so we remove the resource
  //       and then added new .meta and .model file, so all we have to do is just handle the cases, where new .meta and .model file is added to the git
  const fullPathToFile = dsPathJoin(fullPathToDirectory, name);
  const fileContent = fs.readFileSync(fullPathToFile, "utf-8");
  await updateBlob(parentIri, name, fileContent);
}

/**
 * @deprecated TODO RadStr: Just debug method
 */
export const createRandomWebook = asyncHandler(async (request: express.Request, response: express.Response) => {
  const WEBHOOK_HANDLER_URL = "https://789d-2a00-1028-9192-49e6-17b-1f2d-ea59-1f4.ngrok-free.app/git/webhook-test2";
  const OWNER = GIT_RAD_STR_BOT_USERNAME;
  const REPO = "test-webhooks";

  // The token has to have commiting rights
  const webhookResponse = GitProviderFactory
    .createGitProvider(GitProviderEnum.GitHub)
    .createWebhook(GITHUB_RAD_STR_BOT_ABSOLUTE_CONTROL_TOKEN, OWNER, REPO, WEBHOOK_HANDLER_URL, ["push", "pull_request"]);

  const data = (await webhookResponse).json();
  console.log("Fetched webhook response: ", data);
});
