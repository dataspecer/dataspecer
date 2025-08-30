
// TODO RadStr: Move all these types into package - they are the same on backend

import { DataResourceNameInfo, ChangeActiveModelMethod } from "@/dialog/diff-editor-dialog";
import { packageService } from "@/package";
import _ from "lodash";
import { Loader } from "lucide-react";
import React, { SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { NodeApi, NodeRendererProps, Tree, TreeApi, } from "react-arborist";


// TODO RadStr: Again move into common pakcage, it is also used as type on backend
export enum AvailableFilesystems {
  DS_Filesystem = "ds-filesystem",
  ClassicFilesystem = "classic-filesystem",
}


// TODO RadStr: Move elsewhere in code. Used both in backend and DiffTree dialog
export type ComparisonData = {
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
}


// TODO RadStr: Put to package, used both in backend and DiffTree dialog
type EditableType = "mergeFrom" | "mergeTo";


// TODO RadStr: Put into package, used both in backend and in client in the difftree dialog
export interface MergeState {
  uuid: string;

  lastCommitHashMergeTo: string;
  rootFullPathToMetaMergeTo: string;
  rootIriMergeTo: string;
  filesystemTypeMergeTo: AvailableFilesystems;

  lastCommitHashMergeFrom: string;
  rootFullPathToMetaMergeFrom: string;
  rootIriMergeFrom: string;
  filesystemTypeMergeFrom: AvailableFilesystems;

  editable: EditableType;

  lastCommonCommitHash: string;

  changedInEditable?: ComparisonData[];
  removedInEditable?: ComparisonData[];
  createdInEditable?: ComparisonData[];
  conflicts?: ComparisonData[];
  conflictCount: number,

  diffTreeData?: {
    diffTree: DiffTree,
    diffTreeSize: number;   // TODO RadStr: Maybe not needed can just compute on client from diffTree
  };
}


/**
 * Contains all info about datastore - including format, type and the path where it can be found.
 * @example Prefix = 12; FullName = 12345; afterPrefix = 345
 */
export type DatastoreInfo = {
  /**
   * Is the full name. But it does not necessary have to be exist in the filesystem. It is the name.type.format
   */
  fullName: string;

  /**
   * is the part of {@link fullName} after the prefix. That is usually the .type.format
   */
  afterPrefix: string;

  /**
   * Is the type - for example "model", or "meta"
   */
  type: string;       // TODO RadStr: Maybe rename to model?

  /**
   * Is the name of the datastore. It does not contain the format or the type. It is simply the name.
   */
  name: string;

  /**
   * Is the format of the datastore. Can be "json" or "yaml", etc., null if unknown.
   */
  format: string | null;

  /**
   * Is the fullpath to the datastore. This is the value to use to get the content of the datastore from the filesystem.
   */
  fullPath: string;
}

/**
 * Mapping the path to the data structure, which can be easily exported.
 * @deprecated TODO RadStr: just write out the type explicitly
 */
export type ExportDictionary = Record<string, DatastructureToExport>;


export type MetadataCacheType = {
  iri?: string;
  [key: string]: any;
};

// TODO RadStr: Also when it comes to to the fullpath - use the /, don't use filesystem specific separators (that is path.sep)
type DatastructureToExport = {
  name: string,   // TODO RadStr: The name is the same as the key in the FilesystemMappingType
  metadataCache: MetadataCacheType,
  datastores: DatastoreInfo[],     // Could be Record<string, string> ... however I am not sure if there can not technically exist two or more datastores of same type (TODO RadStr:)
  parent: DirectoryNode | null,
  fullTreePath: string,   // TODO RadStr: We can get it recursively, if we need to (by visiting parents and concating the names). So we don't have to store it.
  extraData?: object  // TODO RadStr: Maybe use later.
};


export type FileNode = {
  type: "file";
} & DatastructureToExport;

export type DirectoryNode = {
  type: "directory";
  content: FilesystemMappingType;
} & DatastructureToExport;


export type FilesystemNode = FileNode | DirectoryNode;

export type FilesystemMappingType = Record<string, FilesystemNode>;

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

// TODO RadStr: Modified part of code from backend - we are already doing there the finding of changed nodes, however there we just look for changes, so try to modify it to create diff tree

// TODO RadStr: The diff tree is not existing on backend
type DiffTree = Record<string, ResourceComparison>;
// TODO RadStr: FilesystemAbstraction is leaner here and different then on backend, however the final form is yet to be decided on.
interface FilesystemAbstraction {
  getDatastoreContent(resourceWithDatastore: FilesystemNode, datastoreInfo: DatastoreInfo, shouldConvertToDatastoreFormat: boolean): Promise<any>;
}


export function getDatastoreInfoOfGivenDatastoreType(filesystemNode: FilesystemNode, type: string) {
  const relevantDatastore = filesystemNode.datastores.find(datastore => datastore.type === type);
  return relevantDatastore;
}

// TODO RadStr: Also new type, which does not exist on backend
type ResourceComparisonResult = "exists-in-both" | "exists-in-new" | "exists-in-old";
// TODO RadStr: Also new type, which does not exist on backend
type CreatedRemovedModified = "unknown" | "same" | "modified" | "created-in-new" | "removed-in-new";


// TODO RadStr: Also new type, which does not exist on backend
type ResourceComparison = {
  resource: FilesystemNode;
  resourceComparisonResult: ResourceComparisonResult;
  datastoreComparisons: DatastoreComparison[];
  childrenDiffTree: DiffTree;     // Empty if the type of resource is file
}


// TODO RadStr: Changed compared to the backend - there it was named Comparison data and had different field
export type DatastoreComparison = {
  datastoreComparisonResult: CreatedRemovedModified;
  oldVersion: FilesystemNode | null;
  affectedDataStore: DatastoreInfo;
  newVersion: FilesystemNode | null;
}

async function fetchMergeState(rootIriMergeFrom: string, rootIriMergeTo: string): Promise<MergeState> {
  try {
    const queryParams = `rootIriMergeFrom=${rootIriMergeFrom}&rootIriMergeTo=${rootIriMergeTo}&includeDiffData=true`;
    const fetchResult = await fetch(`${import.meta.env.VITE_BACKEND}/git/get-merge-state?${queryParams}`, {
      method: "GET",
    });
    console.info("fetched data", fetchResult);   // TODO RadStr: Debug
    const fetchResultAsJson = await fetchResult.json();
    console.info("fetched data as json", fetchResultAsJson);   // TODO RadStr: Debug

    return fetchResultAsJson;
  }
  catch(error) {
    console.error(`Error when fetching diff tree (for iris: ${rootIriMergeFrom} and ${rootIriMergeTo}). The error: ${error}`);
    throw error;
  }
}


/**
 * @returns The difftree and the total number of nodes in the difftree
*/
// @ts-ignore TODO RadStr: For now ignore, but we will move it into package
async function compareFiletrees(
  filesystem1: FilesystemAbstraction,
  treeRoot1Name: string,
  treeRoot1: DirectoryNode,
  globalFilesystemMapping1: Record<string, FilesystemNode>,
  filesystem2: FilesystemAbstraction,
  treeRoot2Name: string,
  treeRoot2: DirectoryNode,
  globalFilesystemMapping2: Record<string, FilesystemNode>,
): Promise<[DiffTree, number]> {
  const comparisonResult: DiffTree = {};

  const comparisonResultSize = await compareFiletreesInternal(filesystem1, treeRoot1Name, treeRoot1, globalFilesystemMapping1,
                                                              filesystem2, treeRoot2Name, treeRoot2, globalFilesystemMapping2,
                                                              comparisonResult);
  return [comparisonResult, comparisonResultSize];
}

// TODO RadStr: Use objects instead of passing in separate values
/**
 * Compares the {@link directory1} to {@link directory2}. That is the {@link result} will contain
 *  the removed entries from {@link directory1} compared to {@link directory2} and same for changed.
 *  The created ones will be those present in {@link directory2}, but not in {@link directory1}.
 *
 * @returns The number of nodes stored inside the {@link result} (that is the difftree) computed in the method call.
 */
async function compareFiletreesInternal(
  filesystem1: FilesystemAbstraction,
  // @ts-ignore TODO RadStr: For now ts ignore
  directory1Name: string,
  directory1: DirectoryNode | undefined,
  globalFilesystemMapping1: Record<string, FilesystemNode>,
  filesystem2: FilesystemAbstraction,
  // @ts-ignore TODO RadStr: For now ts ignore
  treeRoot2Name: string,
  directory2: DirectoryNode | undefined,
  globalFilesystemMapping2: Record<string, FilesystemNode>,
  result: DiffTree,
): Promise<number> {
  let resultSize: number = 0;

  for (const [nodeName, nodeValue] of Object.entries(directory1?.content ?? {})) {
    resultSize++;

    const node2Value = directory2?.content[nodeName];
    if (node2Value !== undefined && nodeValue.type !== node2Value.type) { // They are not of same type and both exists
      console.error("Tree comparison error - Compared entries have the same name however they are of different type. One is file, while the other is directory");
      throw new Error("Tree comparison error - Compared entries have the same name however they are of different type. One is file, while the other is directory");
    }

    const resourceComparisonResult: ResourceComparisonResult = node2Value === undefined ? "exists-in-old" : "exists-in-both";
    const currentlyProcessedDiffFilesystemNode: ResourceComparison = {
      childrenDiffTree: {},
      datastoreComparisons: [],
      resource: nodeValue,
      resourceComparisonResult,
    };
    result[nodeName] = currentlyProcessedDiffFilesystemNode;

    // Recursively process "subdirectories"
    if (nodeValue.type === "directory") {
      const subtreeSize = await compareFiletreesInternal(filesystem1, nodeName, nodeValue, globalFilesystemMapping1,
                                                          filesystem2, nodeName, node2Value as (DirectoryNode | undefined), globalFilesystemMapping2,
                                                          currentlyProcessedDiffFilesystemNode.childrenDiffTree);
      resultSize += subtreeSize;
    }

    const processedDatastoresInSecondTree: Set<DatastoreInfo> = new Set();
    for (const datastore1 of nodeValue.datastores) {
      resultSize++;

      const node2Datastore = node2Value === undefined ? undefined : getDatastoreInfoOfGivenDatastoreType(node2Value, datastore1.type);
      if (node2Datastore !== undefined) {
        processedDatastoresInSecondTree.add(node2Datastore);

        if (await areDatastoresDifferent(filesystem1, nodeValue, filesystem2, node2Value as FileNode, datastore1)) {
          const changed: DatastoreComparison = {
            oldVersion: nodeValue,
            newVersion: node2Value ?? null,
            affectedDataStore: datastore1,
            datastoreComparisonResult: "modified",
          };
          currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(changed);
        }
        else {
          const same: DatastoreComparison = {
            oldVersion: nodeValue,
            newVersion: node2Value ?? null,
            affectedDataStore: datastore1,
            datastoreComparisonResult: "same",
          };
          currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(same);
        }
      }
      else {
        const removed: DatastoreComparison = {
          oldVersion: nodeValue,
          newVersion: null,
          affectedDataStore: datastore1,
          datastoreComparisonResult: "removed-in-new"
        };
        currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(removed);
      }
    }

    // Add those datastores which are present only in the second tree
    for (const datastore2 of node2Value?.datastores ?? []) {
      if (!processedDatastoresInSecondTree.has(datastore2)) {
        const created: DatastoreComparison = {
          oldVersion: null,
          newVersion: node2Value!,
          affectedDataStore: datastore2,
          datastoreComparisonResult: "created-in-new"
        };
        currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(created);
        resultSize++;
      }
    }
  }

  // Find the filesystem nodes which are present only in the 2nd tree
  for (const [nodeName, nodeValue] of Object.entries(directory2?.content ?? {})) {
    if (result[nodeName] !== undefined) {
      continue;
    }

    resultSize++;
    const resourceComparisonResult: ResourceComparisonResult = "exists-in-new";
    const currentlyProcessedDiffFilesystemNode: ResourceComparison = {
      childrenDiffTree: {},
      datastoreComparisons: [],
      resource: nodeValue,
      resourceComparisonResult,
    };
    result[nodeName] = currentlyProcessedDiffFilesystemNode;

    if (nodeValue.type === "directory") {
      const subtreeSize = await compareFiletreesInternal(filesystem1, nodeName, undefined, globalFilesystemMapping1,
                                                          filesystem2, nodeName, nodeValue, globalFilesystemMapping2,
                                                          currentlyProcessedDiffFilesystemNode.childrenDiffTree);
      resultSize += subtreeSize;
    }

    for (const datastore of nodeValue.datastores) {
      // The datastore is not present, since the parent filesystem node does not exist, then it means that all of the datastores are not present neither
      const created: DatastoreComparison = {
        datastoreComparisonResult: "created-in-new",
        oldVersion: null,
        newVersion: nodeValue,
        affectedDataStore: datastore,
      };
      currentlyProcessedDiffFilesystemNode.datastoreComparisons.push(created);
      resultSize++;
    }
  }

  return resultSize;
}

async function areDatastoresDifferent(
  filesystem1: FilesystemAbstraction,
  entry1: FilesystemNode,      // TODO RadStr: Maybe I don't need the entry itself? ... I probably dont when using path, but when using full name I do
  filesystem2: FilesystemAbstraction,
  entry2: FilesystemNode,      // TODO RadStr: Maybe I don't need the entry itself?
  datastore: DatastoreInfo
): Promise<boolean> {
  // TODO RadStr: For now just assume, that there is always change
  const content1 = await filesystem1.getDatastoreContent(entry1, datastore, true);
  const content2 = await filesystem2.getDatastoreContent(entry2, datastore, true);

  console.info({content1, content2});    // TODO RadStr: DEBUG Print

  return !_.isEqual(content1, content2);
}


////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

// TODO RadStr: Fix the types

type DataSourceRenderType = "datastore" | "directory" | "file";
type RenderTree = RenderNode[];
type RenderNode = {
  id: string;
  name: string;
  status: RenderStatus;
  dataSourceType: DataSourceRenderType,
  children?: RenderNode[];
  datastores: RenderNode[];
  originalDataResourceNameInfo: DataResourceNameInfo,
  modifiedDataResourceNameInfo: DataResourceNameInfo,
  reactElementToRender?: React.ReactNode,
  isReactElementToRenderRenderedAsSelected?: boolean,
  fullDatastoreInfoInOriginalTree: DatastoreInfo | null,      // TODO RadStr: For now keep together with the ResourceName stuff - but in te end only DatastoreInfo will be enough
  fullDatastoreInfoInModifiedTree: DatastoreInfo | null,
};
type RenderNodeWithAdditionalMethods = RenderNode & { changeActiveModel: ChangeActiveModelMethod };

type RenderStatus = "same" | "modified" | "created" | "removed";
type TreeType = "old" | "new";

// @ts-ignore TODO RadStr: For now
function createTreeRepresentationsForRendering(diffTree: DiffTree): { oldRenderTree: RenderTree, newRenderTree: RenderTree } {
  const oldRenderTree = createTreeRepresentationForRendering(diffTree, "old");
  const newRenderTree = createTreeRepresentationForRendering(diffTree, "new");
  return { oldRenderTree, newRenderTree };
}


function createDatastoresRenderRepresentations(datastoreComparisons: DatastoreComparison[], treeToExtract: TreeType): RenderTree {
  const datastoresRenderRepresentations: RenderTree = [];

  for (const datastoreComparison of datastoreComparisons) {
    let status: RenderStatus;
    // TODO RadStr: As said before, maybe I will still rewrite it using paths instead of 2-level identifiers
    // let fullPathInOldTree = datastoreComparison.oldVersion === null ? null : (getDatastoreInfoOfGivenDatastoreType(datastoreComparison.oldVersion, datastoreComparison.affectedDataStore.type)?.fullPath ?? null);
    // let fullPathInNewTree = datastoreComparison.newVersion === null ? null : (getDatastoreInfoOfGivenDatastoreType(datastoreComparison.newVersion, datastoreComparison.affectedDataStore.type)?.fullPath ?? null);

    if (datastoreComparison.datastoreComparisonResult === "modified") {
      status = "modified"
    }
    else if (datastoreComparison.datastoreComparisonResult === "same") {
      status = "same";
    }
    else if (datastoreComparison.datastoreComparisonResult === "unknown") {
      throw new Error("TODO RadStr: Not implemented yet");
    }
    else {
      if (treeToExtract === "old") {
        if (datastoreComparison.datastoreComparisonResult === "created-in-new") {
          status = "removed";
        }
        else if (datastoreComparison.datastoreComparisonResult === "removed-in-new") {
          status = "created";
        }
        else {
          throw new Error("TODO RadStr: Not implemented yet");
        }
      }
      else if (treeToExtract === "new") {
        if (datastoreComparison.datastoreComparisonResult === "created-in-new") {
          status = "created";
        }
        else if (datastoreComparison.datastoreComparisonResult === "removed-in-new") {
          status = "removed";
        }
        else {
          throw new Error("TODO RadStr: Not implemented yet");
        }
      }
      else {
        throw new Error("Programmer or data error");
      }
    }
    let oldIri: string | null;
    let newIri: string | null;
    if (datastoreComparison.oldVersion === null) {
      oldIri = null;
    }
    else {
      // TODO RadStr: because of the metadataCache ... this is why I want to use the paths instead.
      if(datastoreComparison.oldVersion?.metadataCache.iri === undefined) {
        throw new Error(`One of datastore source resource has not defined iri in cache for old resource: ${datastoreComparison.oldVersion}`);
      }

      oldIri = datastoreComparison.oldVersion?.metadataCache.iri;
    }
    if (datastoreComparison.newVersion === null) {
      newIri = null;
    }
    else {
      if(datastoreComparison.newVersion?.metadataCache.iri === undefined) {
        throw new Error(`One of datastore source resource has not defined iri in cache for new resource: ${datastoreComparison.newVersion}`);
      }

      newIri = datastoreComparison.newVersion?.metadataCache.iri;
    }

    const fullDatastoreInfoInOriginalTree = datastoreComparison.oldVersion === null ?
      null :
      getDatastoreInfoOfGivenDatastoreType(datastoreComparison.oldVersion, datastoreComparison.affectedDataStore.type) ?? null;

    const fullDatastoreInfoInModifiedTree = datastoreComparison.newVersion === null ?
      null :
      getDatastoreInfoOfGivenDatastoreType(datastoreComparison.newVersion, datastoreComparison.affectedDataStore.type) ?? null;

    const datastoreRenderNode: RenderNode = {
      id: (datastoreComparison?.newVersion?.fullTreePath ?? datastoreComparison?.oldVersion?.fullTreePath ?? "unknown") + datastoreComparison.affectedDataStore.fullName + "-" + treeToExtract,
      name: datastoreComparison.affectedDataStore.fullName,
      dataSourceType: "datastore",
      status,
      datastores: [],
      // TODO RadStr: ... Accessing the iri in cache, this is why I want to use the paths instead
      originalDataResourceNameInfo: { resourceIri: oldIri ?? "", modelName: datastoreComparison.affectedDataStore.type },
      modifiedDataResourceNameInfo: { resourceIri: newIri ?? "", modelName: datastoreComparison.affectedDataStore.type },

      fullDatastoreInfoInOriginalTree,
      fullDatastoreInfoInModifiedTree,
    };
    datastoresRenderRepresentations.push(datastoreRenderNode);
  }

  return datastoresRenderRepresentations;
}

function createTreeRepresentationForRendering(diffTree: DiffTree, treeToExtract: TreeType): RenderTree {
  const renderTree: RenderTree = [];

  for (const [name, node] of Object.entries(diffTree)) {
    const children = createTreeRepresentationForRendering(node.childrenDiffTree, treeToExtract);
    const datastoresRenderRepresentations = createDatastoresRenderRepresentations(node.datastoreComparisons, treeToExtract);

    let status: RenderStatus;
    if (node.resourceComparisonResult === "exists-in-both") {
      status = "same";      // TODO RadStr: Should be decided based on content
    }
    else {
      if (treeToExtract === "old") {
        if (node.resourceComparisonResult === "exists-in-new") {
          status = "removed";
        }
        else if (node.resourceComparisonResult === "exists-in-old") {
          status = "created";
        }
        else {
          throw new Error(`Either invalid data or programmer error, unknown diff type: ${node.resourceComparisonResult}`)
        }
      }
      else {
        if (node.resourceComparisonResult === "exists-in-new") {
          status = "created";
        }
        else if (node.resourceComparisonResult === "exists-in-old") {
          status = "removed";
        }
        else {
          throw new Error(`Either invalid data or programmer error, unknown diff type: ${node.resourceComparisonResult}`);
        }
      }
    }

    console.info("id:", node.resource.fullTreePath + "-" + treeToExtract);

    const renderNode: RenderNode = {
      id: node.resource.fullTreePath + "-" + treeToExtract,
      name: name,
      status,
      dataSourceType: node.resource.type,
      datastores: datastoresRenderRepresentations,
      children: children.concat(datastoresRenderRepresentations),
      originalDataResourceNameInfo: { resourceIri: "Empty since we fetch only datastores", modelName: "Empty since we fetch only datastores" },
      modifiedDataResourceNameInfo: { resourceIri: "Empty since we fetch only datastores", modelName: "Empty since we fetch only datastores" },
      fullDatastoreInfoInModifiedTree: null,
      fullDatastoreInfoInOriginalTree: null,
      // TODO RadStr: The path as mentioned above
      // fullPathInOldTree: "Empty since we fetch only datastores",
      // fullPathInNewTree: "Empty since we fetch only datastores",
    };
    renderTree.push(renderNode);
  }
  return renderTree;
}

function StyledNode({
  node,
  style,
  dragHandle,
}: NodeRendererProps<RenderNodeWithAdditionalMethods>) {
  let color = "black";
  let resourceExists: boolean = true;

  if (node.data.status === "modified") {
    color = "blue";
  }
  else if (node.data.status === "created") {
    color = "green";
  }
  else if (node.data.status === "removed") {
    color = "red";
    resourceExists = false;
  }

  const isExpandable = node.data.dataSourceType !== "datastore";
  const textClassName = resourceExists ? "" : "line-through";

  let icon: string;
  if (node.data.dataSourceType == "datastore") {
    icon = "📄";
  }
  else if (node.data.dataSourceType === "directory") {
    icon = "📂";
  }
  else if (node.data.dataSourceType === "file") {
    icon = "📚";
  }
  else {
    throw new Error(`Programmer error, using unknown data source type: ${node.data.dataSourceType}`);
  }

  const styledNode = (
    <div
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        // To match the height of rows, otherwise there are vertical spaces between nodes,
        // which is problem because if we click in the space,
        // the upper node is selected - which can be non-leaf and we do not want that
        height: `${treeRowHeight}px`,
        width: 600,   // TODO RadStr: Ugly hack to not have text over multiple lines (can't think of any other EASY fix - non-easy fix would be set the width based on longest element or set rowHeight based on over how many lines it goes over)
        color,
        cursor: isExpandable ? "pointer" : "default",
        background: node.isSelected ? "#a2a2a5ff" : undefined,
      }}
      ref={dragHandle}
      // TODO RadStr: Remove- Probably no longer needed. It was fixed by explicitly setting node height to the row height.
      // onFocusCapture={(e) => {
      //   if (isExpandable) {
      //     e.stopPropagation();
      //   }
      // }}
      // onFocus={(e) => {
      //   if (isExpandable) {
      //     e.stopPropagation();
      //   }
      // }}
      onClick={(e) => {
        e.stopPropagation();
        if (isExpandable) {
          node.toggle();
        }
        else {
          node.focus();
          node.select();

          // TODO RadStr: ... the paths as mentioned above
          // if (node.data.fullPathInOldTree === null) {
          //   throw new Error("The path to the datastore is empty - old version");
          // }
          // else if (node.data.fullPathInNewTree === null) {
          //   throw new Error("The path to the datastore is empty - new version");
          // }

          // TODO RadStr: The ! is just for debug for now !!!!!
          node.data.changeActiveModel(node.data.fullDatastoreInfoInOriginalTree!, node.data.fullDatastoreInfoInModifiedTree!, true);
        }
      }}
    >
      {icon}
      <span className={textClassName}>{node.data.name}</span>
    </div>
  );

  // TODO RadStr: Remove this react element optimization
  node.data.reactElementToRender = styledNode;
  node.data.isReactElementToRenderRenderedAsSelected = node.isSelected;
  return styledNode;
}


// @ts-ignore TODO RadStr: idk maybe no longer needed? We fetch the whole diff tree instead.
async function fetchTreeData(rootIri: string) {
  try {
    const fetchResult = await fetch(`${import.meta.env.VITE_BACKEND}/dataspecer-package-tree?iri=${rootIri}`, {
      method: "GET",
    });
    console.info("fetched data", fetchResult);   // TODO RadStr: Debug
    const fetchResultAsJson = await fetchResult.json();
    console.info("fetched data as json", fetchResultAsJson);   // TODO RadStr: Debug

    return fetchResultAsJson;
  }
  catch(error) {
    console.error(`Error when fetching data tree data for diff (for iri: ${rootIri}). The error: ${error}`);
    throw error;
  }
}

/**
 * TODO RadStr: for now mock-up implmentation
 */
// @ts-ignore TODO RadStr: Will probably use later - since we need to fetch the data from backend (as we do in the cache)
class FilesystemAbstractionMockupImplmentation implements FilesystemAbstraction {
  // async getDatastoreContent(filesystem: AvailableFilesystems, datastoreInfo: DatastoreInfo, shouldConvertToDatastoreFormat: boolean): Promise<any> {      // TODO RadStr: The correct version
  async getDatastoreContent(resourceWithDatastore: FilesystemNode, datastoreInfo: DatastoreInfo, _shouldConvertToDatastoreFormat: boolean): Promise<any> {
    if (resourceWithDatastore.metadataCache.iri === undefined) {
      throw new Error(`The iri in cache is not set for the resource ${resourceWithDatastore}`);
    }
    const jsonData = await packageService.getResourceJsonData(resourceWithDatastore.metadataCache.iri, datastoreInfo.type);
    console.info({jsonData});
    return jsonData;

    // const pathToDatastore = datastoreInfo.fullPath;
    // const format = datastoreInfo.format;
    // const type = datastoreInfo.type;
    // const filesystem = filesystem;
    // try {
    //   const fetchResult = await fetch(`${import.meta.env.VITE_BACKEND}/get-datastore-content?pathToDatastore=${pathToDatastore}&format=${format}&type=${type}&filesystem=${filesystem}&shouldConvertToDatastoreFormat=${shouldConvertToDatastoreFormat}`, {
    //     method: "GET",
    //   });
    //   console.info("fetched data", fetchResult);   // TODO RadStr: Debug
    //   return fetchResult;
    //   // const fetchResultAsJson = await fetchResult.json();
    //   // console.info("fetched data as json", fetchResultAsJson);   // TODO RadStr: Debug

    //   // return fetchResultAsJson;
    // }
    // catch(error) {
    //   console.error(`Error when fetching data tree data for diff (for iri: ${pathToDatastore}). The error: ${error}`);
    //   throw error;
    // }
  }
}

// @ts-ignore TODO RadStr: Remove I guess, but it was useful
const getOtherTreeType = (tree: TreeType) => tree === "old" ? "new" : "old";

const createStyledNode = (props: NodeRendererProps<RenderNode>, changeActiveModelData: ChangeActiveModelMethod) => {
  // TODO RadStr: Don't do this can possibly introduce problems and actually does not improve performance - just remove
  // const nodeData = props.node.data;
  // if (useCachedStyledNode && props.node.data.reactElementToRender !== undefined && (nodeData.isReactElementToRenderRenderedAsSelected === props.node.isSelected)) {
  //   const cachedReactElementToRender = nodeData.reactElementToRender;
  //   return cachedReactElementToRender;
  // }

  const extendedProps: NodeRendererProps<RenderNodeWithAdditionalMethods> = props as any;
  extendedProps.node.data.changeActiveModel = changeActiveModelData;
  return <StyledNode {...extendedProps} />;
}

const treeRowHeight = 30;

// TODO RadStr: Probably put into separate file from the diff tree creation
/**
 * Handles the rendering and actions of the diff tree. That is 2 trees. On left there is the "original" version, on right the "modified".
 * Unfortunately I think that the performance is not the best. And it is related to number of nodes. For small number of nodes the
 *  animation of showing that node is selected is almost instant, however the performance gets gradually worse until like I would say 30 nodes (probably when nodes fill whole screen).
 *  After that the performance does not seem to get worse. This means that it is probably related to the library rather than bad programming.
 */
export const DiffTreeVisualization = (props: {
  originalDataResourceNameInfo: DataResourceNameInfo,
  modifiedDataResourceNameInfo: DataResourceNameInfo,
  changeActiveModel: ChangeActiveModelMethod,
  isLoadingTreeStructure: boolean,
  setIsLoadingTreeStructure: (value: SetStateAction<boolean>) => void,
}) => {
  const [diffTree, setDiffTree] = useState<DiffTree>();
  const [oldRenderTree, setOldRenderTree] = useState<RenderTree>();
  const [newRenderTree, setNewRenderTree] = useState<RenderTree>();
  const [diffTreeNodeCount, setDiffTreeNodeCount] = useState<number>(0);
  const oldTreeRef = useRef<TreeApi<RenderNode>>(null);
  const newTreeRef = useRef<TreeApi<RenderNode>>(null);

  const isProgrammaticFocus = useRef(false);
  const programmaticUnselectTheStopTree = useRef<TreeType | null>(null);

  const changeActiveModel = props.changeActiveModel;

  const onNodeToggle = useCallback((id: string, treeType: TreeType) => {
    let tree: TreeApi<RenderNode> | null;
    let otherTree: TreeApi<RenderNode> | null;
    let otherTreeType: string;
    if (treeType === "old") {
      tree = oldTreeRef.current;
      otherTree = newTreeRef.current;
      otherTreeType = "new";
    }
    else {
      tree = newTreeRef.current;
      otherTree = oldTreeRef.current;
      otherTreeType = "old";
    }

    const isOpen = tree?.get(id)?.isOpen;
    const otherId = id.substring(0, id.length - "old".length) + otherTreeType;
    if (isOpen) {
      otherTree?.open(otherId);
    }
    else {
      otherTree?.close(otherId);
    }
  }, [oldTreeRef, newTreeRef]);

  /**
   * Handles the selects/focuses
   */
  const onNodeFocus = useCallback((node: NodeApi<RenderNode>, treeType: TreeType) => {
    if (!node.isSelected) {
      return;
    }

    if (isProgrammaticFocus.current) {
      return;
    }

    let otherTree: TreeApi<RenderNode> | null;
    let otherTreeType: TreeType;
    if (treeType === "old") {
      otherTree = newTreeRef.current;
      otherTreeType = "new";
    }
    else {
      otherTree = oldTreeRef.current;
      otherTreeType = "old";
    }

    const id = node.id;
    const otherId = id.substring(0, id.length - "old".length) + otherTreeType;
    const otherNode = otherTree?.get(otherId);
    isProgrammaticFocus.current = true;



    console.info("NODE INFO, isFocused and then isSelected: ", node.isFocused, node.isSelectedStart, node.isSelected, node.isSelectedEnd)
    if (node.isSelected) {
      isProgrammaticFocus.current = true;
      node.focus();
      node.select();
      otherNode?.focus();
      otherNode?.select();
    }
    isProgrammaticFocus.current = false;
  }, [oldTreeRef, newTreeRef]);


  /**
   * Handles the unselects/unfocuses (when user does not click on any node)
   */
  const onNodesSelect = useCallback((nodes: NodeApi<RenderNode>[], treeType: TreeType) => {
    if (nodes.length !== 0) {
      return;
    }

    let otherTree: TreeApi<RenderNode> | null;
    let otherTreeType: TreeType;
    if (treeType === "old") {
      otherTree = newTreeRef.current;
      otherTreeType = "new";
    }
    else {
      otherTree = oldTreeRef.current;
      otherTreeType = "old";
    }

    if (programmaticUnselectTheStopTree.current === treeType) {
      return;
    }
    programmaticUnselectTheStopTree.current = otherTreeType;

    otherTree?.deselectAll();
    programmaticUnselectTheStopTree.current = null;
  }, [oldTreeRef, newTreeRef]);

  useEffect(() => {
    const fetchTrees = async () => {
      props.setIsLoadingTreeStructure(true);

      const fetchedMergeState = await fetchMergeState(props.originalDataResourceNameInfo.resourceIri, props.modifiedDataResourceNameInfo.resourceIri);
      const fetchedDiffTree = fetchedMergeState.diffTreeData!.diffTree;
      const fetchedDiffTreeSize = fetchedMergeState.diffTreeData!.diffTreeSize;
      setDiffTree(fetchedDiffTree);
      setDiffTreeNodeCount(fetchedDiffTreeSize);
      console.info({ fetchedDiffTree });

      const { oldRenderTree: computedOldRenderTree, newRenderTree: computedNewRenderTree } = createTreeRepresentationsForRendering(fetchedDiffTree);
      console.info({ computedOldRenderTree, computedNewRenderTree } );     // TODO RadStr: Deug print
      setOldRenderTree(computedOldRenderTree);
      setNewRenderTree(computedNewRenderTree);



      // TODO RadStr: Old version ... remove after the diff editor is finished
      // const fetchedOldFilesystemMap = await fetchTreeData(props.originalDataResourceNameInfo.resourceIri);
      // const fetchedNewFilesystemMap = await fetchTreeData(props.modifiedDataResourceNameInfo.resourceIri);
      // console.info({ fetchedOldFilesystemMap, fetchedNewFilesystemMap });       // TODO RadStr: Debug print

      // const root1 = fetchedOldFilesystemMap[""];
      // const root2 = fetchedNewFilesystemMap[""];

      // const filesystemMockup = new FilesystemAbstractionMockupImplmentation();
      // const [computedDiffTree, computedDiffTreeSize] = await compareFiletrees(filesystemMockup, root1.name, root1, fetchedOldFilesystemMap,
      //                                                           filesystemMockup, root2.name, root2, fetchedNewFilesystemMap);
      // setDiffTree(computedDiffTree);
      // setDiffTreeNodeCount(computedDiffTreeSize);
      // console.info({computedDiffTree});

      // const { oldRenderTree: computedOldRenderTree, newRenderTree: computedNewRenderTree } = createTreeRepresentationsForRendering(computedDiffTree);
      // console.info({ computedOldRenderTree, computedNewRenderTree } );     // TODO RadStr: Deug print
      // setOldRenderTree(computedOldRenderTree);
      // setNewRenderTree(computedNewRenderTree);

      props.setIsLoadingTreeStructure(false);
    }
    fetchTrees();
  }, []);

  useEffect(() => {
    const activeElement = document.activeElement as HTMLElement | null;
    // This is needed otherwise the Tree gets focus and shows black rectangle around it
    // (Disabling outline in css/tailwind did not work)
    activeElement?.blur();
  }, [diffTree]);   // TODO RadStr: Use the reference to filesystem or something

  console.info({ diffTree, oldRenderTree, newRenderTree });

  const treeRowHeightMultiplier = diffTreeNodeCount + 2;    // We have to add a little because there is some padding

  return (
    <div className="flex gap-1 h-full">
      <div className="flex-1 border border-stone-200 h-full" style={{height: treeRowHeight*treeRowHeightMultiplier}}>
        <h3>Old:</h3>
        {
          renderTreeWithLoading(props.isLoadingTreeStructure,
            <Tree children={(props) => createStyledNode(props, changeActiveModel)}
                  ref={oldTreeRef} data={oldRenderTree} width={"100%"}
                  onSelect={(nodes) => onNodesSelect(nodes, "old")}
                  onFocus={(node) => onNodeFocus(node, "old")}
                  onToggle={(id: string) => onNodeToggle(id, "old")}
                  rowHeight={treeRowHeight} height={treeRowHeight*treeRowHeightMultiplier} openByDefault>
              {/* TODO RadStr: Remove the StyledNode from here ... it is the same as putting it in children prop */}
              {/* {StyledNode} */}
            </Tree>)
        }
      </div>
      <div className="flex-1 border border-stone-200 h-full" style={{height: treeRowHeight*treeRowHeightMultiplier}}>
        <h3>New:</h3>
        {
          renderTreeWithLoading(props.isLoadingTreeStructure,
            <Tree children={(props) => createStyledNode(props, changeActiveModel)}
                  ref={newTreeRef} data={newRenderTree} width={"100%"}
                  onSelect={(nodes) => onNodesSelect(nodes, "new")}
                  onFocus={(node) => onNodeFocus(node, "new")}
                  onToggle={(id: string) => onNodeToggle(id, "new")}
                  rowHeight={treeRowHeight} height={treeRowHeight*treeRowHeightMultiplier} openByDefault>
              {/* TODO RadStr: Remove the StyledNode from here ... it is the same as putting it in children prop */}
              {/* {StyledNode} */}
            </Tree>)
        }
      </div>
    </div>
  );
}


function renderTreeWithLoading(isLoadingTreeStructure: boolean, treeComponent: React.ReactElement) {
  return isLoadingTreeStructure ?
    <Loader className="mr-2 h-4 w-4 animate-spin" /> :
    <div>
      {treeComponent}
    </div>;
  };