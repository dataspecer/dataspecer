import { UpdateModelDataMethod } from "@/dialog/diff-editor-dialog";
import _ from "lodash";
import { Check, Loader, Minus, MoveLeft, MoveRight, Plus, X } from "lucide-react";
import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { NodeApi, NodeRendererProps, Tree, TreeApi, } from "react-arborist";
import { ComparisonData, CreateDatastoreFilesystemNodesInfo, DatastoreComparison, DatastoreInfo, DiffTree, EditableType, FilesystemNode, getDatastoreInfoOfGivenDatastoreType, MergeState, OldNewFilesystemNode, ResourceComparison } from "@dataspecer/git";
import { DiffEditorEditIcon } from "./crossed-out-icon";
import { AddToCreatedDatastoresAndAddToCacheMethodType, AddToRemovedDatastoresAndAddToCacheMethodType, DatastoreInfosCache, DatastoreInfosForModel, EntriesAffectedByCreateType } from "@/hooks/use-diff-editor-dialog-props";


type DataSourceRenderType = "datastore" | "directory" | "file";
type RenderTree = RenderNode[];
type RenderNode = {
  id: string;
  name: string;
  status: RenderStatus;
  dataSourceType: DataSourceRenderType;
  children?: RenderNode[];
  datastores: RenderNode[];
  fullDatastoreInfoInOriginalTree: DatastoreInfo | null;
  fullDatastoreInfoInModifiedTree: DatastoreInfo | null;
  /**
   * If is right now in conflict. To check if it can be part of conflict that is it either was or is right now, check {@link canBeInConflict}.
   */
  nowInConflictCount: number;
  canBeInCoflictCount: number;
  treeType: TreeType;
  isInEditableTree: boolean;
  /**
   * Is null for the datastores
   */
  resourceComparison: ResourceComparison | null;
};
type RenderNodeWithAdditionalData = RenderNode & {
  datastoreInfoInCache: DatastoreInfosForModel | null,
  updateModelData: UpdateModelDataMethod;
  shouldShowConflicts: boolean;
  allConficts: ComparisonData[];
  setConflictsToBeResolvedOnSave: (value: React.SetStateAction<ComparisonData[]>) => void;
  isNewlyCreated: boolean;
  addToCreatedDatastores: AddToCreatedDatastoresAndAddToCacheMethodType;
  isNewlyRemoved: boolean;
  setRemovedDatastores: (value: React.SetStateAction<DatastoreInfo[]>) => void;
  setRemovedDatastoresAndLoadIntoCache: AddToRemovedDatastoresAndAddToCacheMethodType;
  shouldBeHighlighted: boolean;
  setShouldBeHighlighted: (value: React.SetStateAction<boolean>) => void;
  removedTreePaths: string[];
  setRemovedTreePaths: (value: React.SetStateAction<string[]>) => void;
  isCurrentlyAllowedChangeOfModels: boolean;
  setIsCurrentlyAllowedChangeOfModels: React.Dispatch<React.SetStateAction<boolean>>;
  conflictsToBeResolvedOnSaveInThisComponent: ComparisonData[];
};

type RenderStatus = "same" | "modified" | "created" | "removed";
type TreeType = "old" | "new";

function createTreeRepresentationsForRendering(
  allConflicts: ComparisonData[],
  unreslovedConflicts: ComparisonData[],
  diffTree: DiffTree,
  editableTree: EditableType
): { oldRenderTree: RenderTree, newRenderTree: RenderTree } {
  const oldRenderTree = createTreeRepresentationForRendering(allConflicts, unreslovedConflicts, diffTree, "old", editableTree);
  const newRenderTree = createTreeRepresentationForRendering(allConflicts, unreslovedConflicts, diffTree, "new", editableTree);
  return { oldRenderTree, newRenderTree };
}

type DatastoreRenderRepresentationsData = {
  datastoresRenderRepresentations: RenderTree,
  /**
   * True if there exists at least one node in the {@link datastoresRenderRepresentations}, which is in conflict
   */
  datastoresWithConflictCount: number,
  /**
   * Same as {@link hasDatastoreWithConflict}, but it does not have to be in conflict right now.
   */
  totalDatastoresWithConflictCount: number,
};

function checkIfIsInEditableTree(treeToExtract: TreeType, editableTree: EditableType) {
  const convertedEditableToTreeType: TreeType = editableTree === "mergeFrom" ? "old" : "new";
  return treeToExtract === convertedEditableToTreeType;
}

function extractFirstNonEmptyFieldFromComparison(comparison: OldNewFilesystemNode | null, comparisonFieldToExtract: keyof FilesystemNode) {
  if (comparison === null) {
    return null;
  }
  return (comparison.old?.[comparisonFieldToExtract] ?? comparison.new?.[comparisonFieldToExtract]);
}

function createIdForDatastoreRenderNode(datastoreComparison: Omit<DatastoreComparison, "datastoreComparisonResult">, treeToExtract: TreeType) {
  // It should be projectIris - so we can swap between the two trees easily by removing the treeToExtract suffix - TODO RadStr: However we might remove the left tree since it is useless
   // Note that at least one is not empty that is why we can type it to string
  return extractFirstNonEmptyFieldFromComparison(datastoreComparison, "projectIrisTreePath") as string + datastoreComparison.affectedDataStore.fullName + "-" + treeToExtract;
}

function createDatastoresRenderRepresentations(
  allConflicts: ComparisonData[],
  unresolvedConflicts: ComparisonData[],
  datastoreComparisons: DatastoreComparison[],
  treeToExtract: TreeType,
  editableTree: EditableType,
): DatastoreRenderRepresentationsData {
  const datastoresRenderRepresentations: RenderTree = [];
  let datastoresWithConflictCount: number = 0;
  let totalDatastoresWithConflictCount: number = 0;

  for (const datastoreComparison of datastoreComparisons) {
    let status: RenderStatus;

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

    const fullDatastoreInfoInOriginalTree = datastoreComparison.old === null ?
      null :
      getDatastoreInfoOfGivenDatastoreType(datastoreComparison.old, datastoreComparison.affectedDataStore.type) ?? null;

    const fullDatastoreInfoInModifiedTree = datastoreComparison.new === null ?
      null :
      getDatastoreInfoOfGivenDatastoreType(datastoreComparison.new, datastoreComparison.affectedDataStore.type) ?? null;

    const isNowInConflict = unresolvedConflicts.findIndex(conflict => conflict.affectedDataStore.fullPath === datastoreComparison.affectedDataStore.fullPath) !== -1;
    if (isNowInConflict) {
      datastoresWithConflictCount++;
    }

    // The ternary operator is just optimization, searching allConflicts is always enough
    const canBeInCoflict = isNowInConflict ? isNowInConflict : allConflicts.findIndex(conflict => conflict.affectedDataStore.fullPath === datastoreComparison.affectedDataStore.fullPath) !== -1;
    if (canBeInCoflict) {
      totalDatastoresWithConflictCount++;
    }

    const datastoreRenderNode: RenderNode = {
      id: createIdForDatastoreRenderNode(datastoreComparison, treeToExtract),
      name: datastoreComparison.affectedDataStore.type,
      dataSourceType: "datastore",
      status,
      datastores: [],

      fullDatastoreInfoInOriginalTree,
      fullDatastoreInfoInModifiedTree,
      nowInConflictCount: isNowInConflict ? 1 : 0,
      canBeInCoflictCount: canBeInCoflict ? 1 : 0,
      treeType: treeToExtract,
      isInEditableTree: checkIfIsInEditableTree(treeToExtract, editableTree),
      resourceComparison: null,
    };
    datastoresRenderRepresentations.push(datastoreRenderNode);
  }

  return { datastoresRenderRepresentations, datastoresWithConflictCount, totalDatastoresWithConflictCount };
}

function createIdForFilesystemRenderNode(resourceComparison: ResourceComparison, treeToExtract: TreeType) {
  // As for {@link createIdForDatastoreRenderNode} has to be projectIri to easily swap between trees.
  // Note that at least one is not empty that is why we can type it to string
  return extractFirstNonEmptyFieldFromComparison(resourceComparison?.resources ?? null, "projectIrisTreePath") as string + "-" + treeToExtract;
}


function extractTreePathFromNodeId(id: string) {
  return id.slice(0, -"-new".length);
}

function extractTreePathFromNode(node: NodeApi<RenderNodeWithAdditionalData>) {
  return extractTreePathFromNodeId(node.data.id);
}

// Datastores first, then files (resources), then directories (packages)
const renderTreeChildrenSortMap: Record<DataSourceRenderType, number> = {
  datastore: 0,
  file: 1,
  directory: 2,
};

function createTreeRepresentationForRendering(
  allConflicts: ComparisonData[],
  unresolvedConflicts: ComparisonData[],
  diffTree: DiffTree,
  treeToExtract: TreeType,
  editableTree: EditableType,
): RenderTree {
  const renderTree: RenderTree = [];

  for (const [name, node] of Object.entries(diffTree)) {
    const children = createTreeRepresentationForRendering(allConflicts, unresolvedConflicts, node.childrenDiffTree, treeToExtract, editableTree);
    const {
      datastoresRenderRepresentations,
      datastoresWithConflictCount,
      totalDatastoresWithConflictCount
    } = createDatastoresRenderRepresentations(allConflicts, unresolvedConflicts, node.datastoreComparisons, treeToExtract, editableTree);

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
          throw new Error(`Either invalid data or programmer error, unknown diff type: ${node.resourceComparisonResult}`);
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

    let nowInConflictCountInExpandableChildren = 0;
    let totalConflictCountInExpandableChildren = 0;
    for (const child of children) {
      nowInConflictCountInExpandableChildren += child.nowInConflictCount;
      totalConflictCountInExpandableChildren += child.canBeInCoflictCount;
    }

    const renderNodeChildren = datastoresRenderRepresentations
      .concat(children)
      .sort((a: RenderNode, b: RenderNode) => {
        // Datastores first, then files (resources), then directories (packages)
        return renderTreeChildrenSortMap[a.dataSourceType] - renderTreeChildrenSortMap[b.dataSourceType];
      });

    const renderNode: RenderNode = {
      id: createIdForFilesystemRenderNode(node, treeToExtract),
      name: name,
      status,
      dataSourceType: (node.resources.old?.type ?? node.resources.new?.type)!,
      datastores: datastoresRenderRepresentations,
      children: renderNodeChildren,
      fullDatastoreInfoInModifiedTree: null,
      fullDatastoreInfoInOriginalTree: null,
      nowInConflictCount: datastoresWithConflictCount + nowInConflictCountInExpandableChildren,
      canBeInCoflictCount: totalDatastoresWithConflictCount + totalConflictCountInExpandableChildren,
      treeType: treeToExtract,
      isInEditableTree: checkIfIsInEditableTree(treeToExtract, editableTree),
      resourceComparison: node,
    };
    renderTree.push(renderNode);
  }
  return renderTree;
}

const findConflictForNode = (nodeToResolve: RenderNodeWithAdditionalData) => {
  const conflictToBeResolved = nodeToResolve.allConficts.find(conflict => {
    return conflict.affectedDataStore.fullPath === nodeToResolve.fullDatastoreInfoInModifiedTree?.fullPath ||
      conflict.affectedDataStore.fullPath === nodeToResolve.fullDatastoreInfoInOriginalTree?.fullPath;
  });
  return conflictToBeResolved ?? null;
}

const onClickResolveConflict = (
  event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  nodeToResolve: NodeApi<RenderNodeWithAdditionalData>,
) => {
  event.stopPropagation();

  if (nodeToResolve.data.dataSourceType === "directory" || nodeToResolve.data.dataSourceType === "file") {
    nodeToResolve.children?.forEach(child => {
      const isInConflict = child.data.nowInConflictCount > 0;
      if (isInConflict) {
        onClickResolveConflict(event, child);
      }
    });
    return;
  }


  const conflictToBeResolved = findConflictForNode(nodeToResolve.data);
  if (conflictToBeResolved === null) {
    console.error("This is most-likely programmer error or corrupted data, the conflict to be resolved, could not be found.");
    return;
  }
  updateConflictsToBeResolvedOnSave(nodeToResolve.data.setConflictsToBeResolvedOnSave, conflictToBeResolved);
  let recursiveNode: NodeApi<RenderNodeWithAdditionalData> | null = nodeToResolve;
  while (recursiveNode?.parent !== null) {
    recursiveNode.data.nowInConflictCount--;
    recursiveNode = recursiveNode.parent;
  }
}

const onClickUnresolveConflict = (
  event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  nodeToUnresolve: NodeApi<RenderNodeWithAdditionalData>,
) => {
  event.stopPropagation();
  const conflictToBeUnresolved = findConflictForNode(nodeToUnresolve.data);

  if (conflictToBeUnresolved === null) {
    console.error("This is most-likely programmer error or corrupted data, the conflict to be resolved, could not be found.");
    return;
  }

  updateConflictsToBeResolvedOnSaveByRemoval(nodeToUnresolve.data.setConflictsToBeResolvedOnSave, conflictToBeUnresolved);
  let recursiveNode: NodeApi<RenderNodeWithAdditionalData> | null = nodeToUnresolve;
  // Note that we are checking for parent. That is because there is artificial root created by the rendering library.
  while (recursiveNode?.parent !== null) {
    recursiveNode.data.nowInConflictCount++;
    recursiveNode = recursiveNode.parent;
  }
}


const getAllChildrenRecursively = (node: NodeApi<RenderNodeWithAdditionalData> | null): NodeApi<RenderNodeWithAdditionalData>[]  => {
  const children: NodeApi<RenderNodeWithAdditionalData>[] = [];
  getAllChildrenRecursivelyInternal(node, children);
  return children;
}

const getAllChildrenRecursivelyInternal = (node: NodeApi<RenderNodeWithAdditionalData> | null, children: NodeApi<RenderNodeWithAdditionalData>[]) => {
  if (node === null) {
    return;
  }

  for (const child of node.children ?? []) {
    children.push(child);
    getAllChildrenRecursivelyInternal(child, children);
  }
}

const onClickRemoveDatastore = (
  event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  filesystemNodeContainingDatastoreToRemove: RenderNodeWithAdditionalData | undefined,
  nodeToResolve: NodeApi<RenderNodeWithAdditionalData>,
) => {
  event.stopPropagation();
  if (nodeToResolve.data.fullDatastoreInfoInModifiedTree?.type === "meta") {
    const parent = nodeToResolve.parent;
    const allNodesInSubTree = getAllChildrenRecursively(parent);
    const filesystemNodeTreePathsInSubTree = allNodesInSubTree
      .filter(node => (node.children ?? []).length > 0)
      .map(node => extractFirstNonEmptyFieldFromComparison(node.data.resourceComparison?.resources ?? null, "projectIrisTreePath") as string);
    const datastoresInSubTree = allNodesInSubTree
      .filter(node => (node.children ?? []).length === 0)
      .map(datastore => datastore.data.fullDatastoreInfoInModifiedTree!);

    console.info({filesystemNodeTreePathsInSubTree, datastoresInSubTree});

    nodeToResolve.data.setRemovedDatastores(prev => [...prev, ...datastoresInSubTree]);
    const resourceToRemoveDatastoreFrom = filesystemNodeContainingDatastoreToRemove?.resourceComparison?.resources?.new ?? null;
    nodeToResolve.data.setRemovedDatastoresAndLoadIntoCache(resourceToRemoveDatastoreFrom?.projectIrisTreePath!, nodeToResolve.data.fullDatastoreInfoInModifiedTree!, null, false);
    if (parent !== null) {
      nodeToResolve.data.setRemovedTreePaths(prev => {
        const newRemovedTreePaths = [
          ...prev,
          extractFirstNonEmptyFieldFromComparison(parent.data.resourceComparison?.resources ?? null, "projectIrisTreePath") as string,
          ...filesystemNodeTreePathsInSubTree
        ];
        return newRemovedTreePaths;
      });
    }
  }
  else {
    const resourceToRemoveDatastoreFrom = filesystemNodeContainingDatastoreToRemove?.resourceComparison?.resources?.new ?? null;
    const metaFromResourceToRemoveFrom = resourceToRemoveDatastoreFrom === null ? null : getDatastoreInfoOfGivenDatastoreType(resourceToRemoveDatastoreFrom, "meta");
    nodeToResolve.data.setRemovedDatastoresAndLoadIntoCache(resourceToRemoveDatastoreFrom?.projectIrisTreePath!, nodeToResolve.data.fullDatastoreInfoInModifiedTree!, metaFromResourceToRemoveFrom, true);
  }
  alert(`Remove datastore for ${nodeToResolve.data.name}`);
}

const onClickCreateDatastore = (
  event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  filesystemNodeContainingDatastoreToCreate: RenderNodeWithAdditionalData | undefined,
  datastoreToCreate: RenderNodeWithAdditionalData,
) => {
  event.stopPropagation();
  const oldResource = filesystemNodeContainingDatastoreToCreate?.resourceComparison?.resources?.old ?? null;
  const oldMetaDatastoreInfo = oldResource === null ? null : getDatastoreInfoOfGivenDatastoreType(oldResource, "meta");
  const newResource = filesystemNodeContainingDatastoreToCreate?.resourceComparison?.resources?.new ?? null;
  const newMetaDatastoreInfo = newResource === null ? null : getDatastoreInfoOfGivenDatastoreType(newResource, "meta");
  // If the new one already exists, then do not add it.
  const metadataDatastoreToAddToCreatedDatastores = newMetaDatastoreInfo !== null ? null : oldMetaDatastoreInfo;
  datastoreToCreate.addToCreatedDatastores(oldResource?.projectIrisTreePath!, datastoreToCreate.fullDatastoreInfoInOriginalTree!, metadataDatastoreToAddToCreatedDatastores);
  alert(`Create datastore for ${datastoreToCreate.name}`);
}

const handleMouseHoverHighlightingForNode = (node: NodeApi<RenderNodeWithAdditionalData>, shouldSetHighlightingOn: boolean) => {
  let recursiveNode = node;
  // Note that we are checking for parent. That is because there is artificial root created by the rendering library.
  while (recursiveNode?.parent !== null) {
    recursiveNode.data.setShouldBeHighlighted(shouldSetHighlightingOn);
    recursiveNode = recursiveNode.parent;
  }
  for (const child of node.children ?? []) {
    if (child.data.dataSourceType === "datastore") {
      child.data.setShouldBeHighlighted(shouldSetHighlightingOn);
    }
  }
}


function StyledNode({
  node,
  style,
  dragHandle,
}: NodeRendererProps<RenderNodeWithAdditionalData>) {
  let color: "black" | "blue" | "green" | "red" = "black";
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

  let icon: string = "";

  const isCurrentlyInConflict = node.data.nowInConflictCount > 0;
  icon = isCurrentlyInConflict ? "⚠️" : "";   // Always show the conflict mark
  icon = (node.data.isInEditableTree && node.data.conflictsToBeResolvedOnSaveInThisComponent.find(resolvedConflict => node.data.id === createIdForDatastoreRenderNode(resolvedConflict, node.data.treeType))) ? "✅" : icon;
  if (node.data.dataSourceType == "datastore") {
    icon += "📄";
  }
  else if (node.data.dataSourceType === "directory") {
    icon += "📂";
  }
  else if (node.data.dataSourceType === "file") {
    icon += "📚";
  }
  else {
    throw new Error(`Programmer error, using unknown data source type: ${node.data.dataSourceType}`);
  }

  let backgroundColor: string | undefined = undefined;
  if (node.isSelected) {
    backgroundColor = "#a2a2a5ff";
  }
  else if (node.data.shouldBeHighlighted) {
    backgroundColor = "#afb3c5ff";
  }

  const styledNode = (
    <>
      <div
        key={node.data.id}
        className="relative group px-3 hover:bg-gray-50 focus-within:bg-gray-50 whitespace-nowrap"
      >
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
            background: backgroundColor,
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
          onClick={async (e) => {
            e.stopPropagation();
            if (!node.data.isCurrentlyAllowedChangeOfModels) {
              return;
            }
            node.data.setIsCurrentlyAllowedChangeOfModels(false);

            if (isExpandable) {
              node.toggle();
            }
            else {
              node.focus();
              node.select();
              const parent = node.parent?.data.resourceComparison?.resources ?? null;
              const parentTreePath = extractFirstNonEmptyFieldFromComparison(parent, "projectIrisTreePath") as string;
              await node.data.updateModelData(
                parentTreePath,
                node.data.fullDatastoreInfoInOriginalTree, node.data.fullDatastoreInfoInModifiedTree,
                (parent?.old ?? null) === null ? null : getDatastoreInfoOfGivenDatastoreType(parent!.old!, "meta"),
                (parent?.new ?? null) === null ? null : getDatastoreInfoOfGivenDatastoreType(parent!.new!, "meta"),
                true, true, false);
            }
            node.data.setIsCurrentlyAllowedChangeOfModels(true);
          }}
          onMouseOver={(_e) => {
            handleMouseHoverHighlightingForNode(node, true);
          }}
          onMouseLeave={(_e) => {
            handleMouseHoverHighlightingForNode(node, false);
          }}
        >
          {/* TODO RadStr: No the current editing does not matter. We want user to care about the final result and not about the fact the currently edited some stuff in the session */}
          {/* TODO RadStr: Well we kinda does, but it is difficult to show */}

          {<p className={`font-bold pt-1 pr-1 text-xs ${node.data.isNewlyCreated ? "visible": "invisible w-0 h-0"}`} style={{color: "green"}}>Newly C</p>}
          {<p className={`font-bold pt-1 pr-1 text-xs ${node.data.isNewlyRemoved ? "visible" : "invisible w-0 h-0"}`} style={{color: "red"}}>Newly D</p>}
          {<p className={`font-bold pt-1 pr-1 text-xs ${node.data.datastoreInfoInCache !== null ? "visible": "invisible w-0 h-0"}`}>📥</p>}
          {<p className={`font-bold pt-1 pr-1 text-xs ${color === "green" ? "visible": "invisible w-0 h-0"}`} style={{color}}>C</p>}
          {<p className={`font-bold pt-1 pr-1 text-xs ${color === "blue" ? "visible" : "invisible w-0 h-0"}`} style={{color}}>M</p>}
          {<p className={`font-bold pt-1 pr-1 text-xs ${color === "red" ? "visible" : "invisible w-0 h-0"}`} style={{color}}>D</p>}
          {icon}
          <span className={textClassName}>{node.data.name}</span>
            {/* The buttons on hover */}
            <div
              style={{ right: "0px", background: backgroundColor }}
              className="absolute text-black top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto"
              >

              {
              isExpandable ?
                !isCurrentlyInConflict ?
                  null :
                  <button title="Mark as resolved" className="hover:bg-gray-400 text-sm" onClick={(e) => onClickResolveConflict(e, node)}>
                    <Check className="h-6 w-6"/>
                  </button> :
                <>
                  {
                  !isCurrentlyInConflict ?
                    null :
                    <button title="Mark as resolved" className="hover:bg-gray-400 text-sm" onClick={(e) => onClickResolveConflict(e, node)}>
                      <Check className="h-6 w-6"/>
                    </button>
                  }
                  {
                  node.data.canBeInCoflictCount !== 0 && !isCurrentlyInConflict ?
                    <button title="Mark as unresolved" className="hover:bg-gray-400 text-sm" onClick={(e) => onClickUnresolveConflict(e, node)}>
                      <X className="h-6 w-6"/>
                    </button> :
                    null
                  }
                  {
                  node.data.status === "modified" ?
                    <button title="Replace by other version" className="hover:bg-gray-400 text-sm" onClick={(e) => {e.stopPropagation(); alert("move")}}>
                      { node.data.treeType === "new" ? <MoveRight className="h-6 w-6"/> : <MoveLeft className="h-6 w-6"/> }
                    </button> :
                    null
                  }
                  {
                  (node.data.status === "same") ?
                    <div className="h-6 w-6"/> :    // Not null because we want to keep the button positioning
                    null
                  }
                  {
                  node.data.status === "removed" ?
                    <button title="Create datastore" className="hover:bg-gray-400 text-sm" onClick={(e) => onClickCreateDatastore(e, node.parent?.data, node.data)}>
                      <Plus className="h-6 w-6"/>
                    </button> :
                    null
                  }
                  {
                  node.data.status === "created" ?
                    <button title="Remove datastore" className="hover:bg-gray-400 text-sm" onClick={(e) => onClickRemoveDatastore(e, node.parent?.data, node)}>
                      <Minus className="h-6 w-6"/>
                    </button> :
                    null
                  }
                </>
            }
          </div>
        </div>
      </div>
    </>);

  return styledNode;
}


// @ts-ignore TODO RadStr Checked: idk maybe no longer needed? We fetch the whole diff tree instead. Maybe still useful, we will see after I am done.
async function fetchTreeData(rootIri: string) {
  try {
    const fetchResult = await fetch(`${import.meta.env.VITE_BACKEND}/dataspecer-package-tree?iri=${rootIri}`, {
      method: "GET",
    });
    const fetchResultAsJson = await fetchResult.json();
    return fetchResultAsJson;
  }
  catch(error) {
    console.error(`Error when fetching data tree data for diff (for iri: ${rootIri}). The error: ${error}`);
    throw error;
  }
}


// @ts-ignore TODO RadStr Checked: Not used currently, but it was useful at one point
const getOtherTreeType = (tree: TreeType) => tree === "old" ? "new" : "old";

const createStyledNode = (
  props: NodeRendererProps<RenderNode>,
  updateModelData: UpdateModelDataMethod,
  datastoreInfosForCacheEntries: DatastoreInfosCache,
  shouldShowConflicts: boolean,
  allConficts: ComparisonData[],
  setConflictsToBeResolvedOnSave: (value: React.SetStateAction<ComparisonData[]>) => void,
  createdFilesystemNodesAsArray: CreateDatastoreFilesystemNodesInfo[],
  createdDatastores: DatastoreInfo[],
  addToCreatedDatastores: AddToCreatedDatastoresAndAddToCacheMethodType,
  removedDatastores: DatastoreInfo[],
  setRemovedDatastores: (value: React.SetStateAction<DatastoreInfo[]>) => void,
  setRemovedDatastoresAndLoadIntoCache: AddToRemovedDatastoresAndAddToCacheMethodType,
  removedTreePaths: string[],
  setRemovedTreePaths: (value: React.SetStateAction<string[]>) => void,
  isCurrentlyAllowedChangeOfModelsUseState: [boolean, React.Dispatch<React.SetStateAction<boolean>>],
  conflictsToBeResolvedOnSaveInThisComponent: ComparisonData[],
) => {
  const extendedProps: NodeRendererProps<RenderNodeWithAdditionalData> = props as any;
  const currentNodeTreePath = extractTreePathFromNode(extendedProps.node);
  extendedProps.node.data.updateModelData = updateModelData;
  extendedProps.node.data.shouldShowConflicts = shouldShowConflicts;
  extendedProps.node.data.allConficts = allConficts;
  extendedProps.node.data.setConflictsToBeResolvedOnSave = setConflictsToBeResolvedOnSave;
  extendedProps.node.data.isNewlyCreated = createdDatastores.find(createdDatastore => createdDatastore.fullPath === extendedProps.node.data.fullDatastoreInfoInOriginalTree?.fullPath) !== undefined;
  extendedProps.node.data.isNewlyCreated ||= createdFilesystemNodesAsArray
    .find(filesystemNode => {
      return filesystemNode.projectIrisTreePath === currentNodeTreePath;
    }) !== undefined;
  extendedProps.node.data.addToCreatedDatastores = addToCreatedDatastores;
  extendedProps.node.data.isNewlyRemoved = removedDatastores.find(removedDatastore => removedDatastore.fullPath === extendedProps.node.data.fullDatastoreInfoInModifiedTree?.fullPath) !== undefined;
  extendedProps.node.data.setRemovedDatastores = setRemovedDatastores;
  extendedProps.node.data.setRemovedDatastoresAndLoadIntoCache = setRemovedDatastoresAndLoadIntoCache;
  extendedProps.node.data.removedTreePaths = removedTreePaths;
  extendedProps.node.data.setRemovedTreePaths = setRemovedTreePaths;
  extendedProps.node.data.isNewlyRemoved ||= removedTreePaths
    .find(treePath => {
      return treePath === currentNodeTreePath;
    }) !== undefined;

  const [shouldBeHighlighted, setShouldBeHighlighted] = useState<boolean>(false);
  extendedProps.node.data.shouldBeHighlighted = shouldBeHighlighted;
  extendedProps.node.data.setShouldBeHighlighted = setShouldBeHighlighted;
  extendedProps.node.data.isCurrentlyAllowedChangeOfModels = isCurrentlyAllowedChangeOfModelsUseState[0];
  extendedProps.node.data.setIsCurrentlyAllowedChangeOfModels = isCurrentlyAllowedChangeOfModelsUseState[1];
  extendedProps.node.data.conflictsToBeResolvedOnSaveInThisComponent = conflictsToBeResolvedOnSaveInThisComponent;

  const datastoreType = extendedProps.node.data.fullDatastoreInfoInModifiedTree?.type ?? extendedProps.node.data.fullDatastoreInfoInOriginalTree?.type ?? null;
  // TODO RadStr: Debug print
  console.info({ds: extendedProps.node.data.datastores, comp: extendedProps.node.data.resourceComparison, id: extendedProps.node.data.id})
  const pathToResource: string = extractFirstNonEmptyFieldFromComparison(extendedProps.node.parent?.data.resourceComparison?.resources ?? null, "projectIrisTreePath") as string;
  extendedProps.node.data.datastoreInfoInCache = datastoreType === null ?
    null :
    datastoreInfosForCacheEntries?.[pathToResource]?.[datastoreType] ?? null;
  // TODO RadStr: Debug print
  console.info({datastoreInfosForCacheEntries, currentNodeTreePath, datastoreType: datastoreType, pathToResource, "CC": extendedProps.node.data.datastoreInfoInCache, parent: extendedProps.node.parent?.data});

  return <StyledNode {...extendedProps} />;
}

const updateConflictsToBeResolvedOnSave = (
  setConflictsToBeResolvedOnSave: (value: React.SetStateAction<ComparisonData[]>) => void,
  ...newlyAdded: ComparisonData[]
) => {
  setConflictsToBeResolvedOnSave(oldValues => {
    return [
      ...oldValues,
      ...newlyAdded,
    ];
  });
};

const updateConflictsToBeResolvedOnSaveByRemoval = (
  setConflictsToBeResolvedOnSave: (value: React.SetStateAction<ComparisonData[]>) => void,
  ...newlyRemoved: ComparisonData[]
) => {
  setConflictsToBeResolvedOnSave(oldValues => {
    const filtered = oldValues
      .filter(value => newlyRemoved
        .findIndex(toRemove => value.affectedDataStore.fullPath === toRemove.affectedDataStore.fullPath) === -1);
    return [...filtered];
  });
};

function filterOutNonConflicts(renderTree: RenderTree | undefined) {
  if (renderTree === undefined) {
    return undefined;
  }

  const filteredTree = [...renderTree.filter(node => node.nowInConflictCount).map(node => ({...node}))];
  for (const filteredNode of filteredTree) {
    filteredNode.children = filterOutNonConflicts(filteredNode.children);
  }

  return [...filteredTree.map(node => ({...node}))];
}

/**
 * Finds the given conflict in tree and all its parents
 */
function findGivenConflictInTree(conflict: ComparisonData, tree: RenderTree) {
  const visitedNodes: RenderNode[] = [];
  if (findGivenConflictInTreeInternal(conflict, tree, visitedNodes)) {
    return visitedNodes;
  }
  return [];
}

/**
 * @returns true if matched
 */
function findGivenConflictInTreeInternal(conflict: ComparisonData, tree: RenderTree, visitedNodes: RenderNode[]): boolean {
  for (const node of tree) {
    visitedNodes.push(node);
    const relevantDatastore = node.datastores.find(datastore => datastore.name === conflict.affectedDataStore.type);
    if (relevantDatastore?.fullDatastoreInfoInModifiedTree?.fullPath === conflict.affectedDataStore.fullPath ||
        relevantDatastore?.fullDatastoreInfoInOriginalTree?.fullPath === conflict.affectedDataStore.fullPath) {
      // We found it
      visitedNodes.push(relevantDatastore)
      return true;
    }

    // Check children maybe it is there
    if (findGivenConflictInTreeInternal(conflict, node.children ?? [], visitedNodes)) {
      return true;
    }
    visitedNodes.pop();
  }


  return false;
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
  updateModelData: UpdateModelDataMethod,
  datastoreInfosForCacheEntries: DatastoreInfosCache,
  isLoadingTreeStructure: boolean,
  setIsLoadingTreeStructure: (value: SetStateAction<boolean>) => void,
  mergeStateFromBackend: MergeState | null,
  conflictsToBeResolvedOnSaveFromParent: ComparisonData[],
  setConflictsToBeResolvedOnSave: Dispatch<SetStateAction<ComparisonData[]>>,
  createdFilesystemNodes: Record<string, EntriesAffectedByCreateType>,
  createdDatastores: DatastoreInfo[],
  addToCreatedDatastores: AddToCreatedDatastoresAndAddToCacheMethodType,
  removedDatastores: DatastoreInfo[],
  setRemovedDatastores: Dispatch<SetStateAction<DatastoreInfo[]>>,
  setRemovedDatastoresAndLoadIntoCache: AddToRemovedDatastoresAndAddToCacheMethodType,
  removedTreePaths: string[],
  setRemovedTreePaths: Dispatch<SetStateAction<string[]>>,
}) => {
  const {
    createdDatastores, addToCreatedDatastores,
    removedDatastores, setRemovedDatastores, setRemovedDatastoresAndLoadIntoCache,
    setConflictsToBeResolvedOnSave, createdFilesystemNodes,
    removedTreePaths, setRemovedTreePaths,
    updateModelData, mergeStateFromBackend
  } = props;
  const createdFilesystemNodesAsArray = Object.values(createdFilesystemNodes).map(filesystemNode => filesystemNode.createdFilesystemNodes).flat();

  const isCurrentlyAllowedChangeOfModelsUseState = useState<boolean>(true);

  const [diffTree, setDiffTree] = useState<DiffTree>();
  const [oldRenderTree, setOldRenderTree] = useState<RenderTree>();
  const [newRenderTree, setNewRenderTree] = useState<RenderTree>();

  const [diffTreeNodeCount, setDiffTreeNodeCount] = useState<number>(0);
  const oldTreeRef = useRef<TreeApi<RenderNode>>(null);
  const newTreeRef = useRef<TreeApi<RenderNode>>(null);

  /**
   * Not the best design decision, but we somehow want to allow to modify the conflicts to be resolved from multiple components
   * And we want to correctly update visualization based on that
   */
  const [conflictsToBeResolvedOnSaveInThisComponent, setConflictsToBeResolvedOnSaveInThisComponent] = useState<ComparisonData[]>([]);
  // Actually based on ChatGPT response
  const setConfictsToBeResolvedForBoth = useCallback((): React.Dispatch<React.SetStateAction<ComparisonData[]>> => {
    return (valueOrUpdater) => {
      // The order matters, however I really expected the order to be the opposite
      setConflictsToBeResolvedOnSave(valueOrUpdater);
      setConflictsToBeResolvedOnSaveInThisComponent(valueOrUpdater);
    };
  }, [setConflictsToBeResolvedOnSaveInThisComponent, props.setConflictsToBeResolvedOnSave]);

  useEffect(() => {
    const newlyUnresolvedConflicts = conflictsToBeResolvedOnSaveInThisComponent.filter(conflict => !props.conflictsToBeResolvedOnSaveFromParent.includes(conflict));
    for (const newlyUnresolvedConflict of newlyUnresolvedConflicts) {
      if (oldRenderTree !== undefined) {
        const nodesRelatedToConflict = findGivenConflictInTree(newlyUnresolvedConflict, oldRenderTree);
        for (const nodeRelatedToConflict of nodesRelatedToConflict) {
          nodeRelatedToConflict.nowInConflictCount++;
        }
      }
      // Same but for the new render tree
      if (newRenderTree !== undefined) {
        const nodesRelatedToConflict = findGivenConflictInTree(newlyUnresolvedConflict, newRenderTree);
        for (const nodeRelatedToConflict of nodesRelatedToConflict) {
          nodeRelatedToConflict.nowInConflictCount++;
        }
      }
    }
    setConflictsToBeResolvedOnSaveInThisComponent(props.conflictsToBeResolvedOnSaveFromParent);
  }, [props.conflictsToBeResolvedOnSaveFromParent]);


  const isProgrammaticFocus = useRef(false);
  const programmaticUnselectTheStopTree = useRef<TreeType | null>(null);

  const [shouldOnlyShowConflicts, setShouldShowOnlyConflicts] = useState<boolean>(false);

  // useEffect(() => {
  //   for (const conflict of props.conflictRemovalsFromParentComponent) {
  //     oldRenderTree?.find(node => node.id === conflict.oldVersion)
  //   }
  //     conflict
  //   }
  // }, [props.conflictRemovalsFromParentComponent]);

  const [_oldRenderTreeDataToRender, setOldRenderTreeDataToRender] = useState<RenderTree>();
  useEffect(() => {
    const treeToRender = !shouldOnlyShowConflicts ? oldRenderTree : filterOutNonConflicts(oldRenderTree);
    setOldRenderTreeDataToRender(treeToRender)
  }, [oldRenderTree, shouldOnlyShowConflicts])

  const [newRenderTreeDataToRender, setNewRenderTreeDataToRender] = useState<RenderTree>();
  useEffect(() => {
    const treeToRender = !shouldOnlyShowConflicts ? newRenderTree : filterOutNonConflicts(newRenderTree);
    setNewRenderTreeDataToRender(treeToRender)
  }, [newRenderTree, shouldOnlyShowConflicts])

  const handleShowConflictsCheckboxChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setShouldShowOnlyConflicts(event.target.checked);
  };


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
    const otherId = extractTreePathFromNodeId(id) + otherTreeType;
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
    const otherId = extractTreePathFromNodeId(id) + otherTreeType;
    const otherNode = otherTree?.get(otherId);
    isProgrammaticFocus.current = true;



    console.info("NODE INFO, isFocused and then isSelected: ", node.isFocused, node.isSelectedStart, node.isSelected, node.isSelectedEnd);    // TODO RadStr: Debug
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

      if (mergeStateFromBackend === null) {
        return;
      }
      const fetchedDiffTree = mergeStateFromBackend.diffTreeData!.diffTree;
      const fetchedDiffTreeSize = mergeStateFromBackend.diffTreeData!.diffTreeSize;
      // TODO RadStr: Probably also add the option to make resource again in conflict ... but will it anyone ever use though?
      const fetchedUnresolvedConflicts = mergeStateFromBackend.unresolvedConflicts ?? [];
      const fetchedConflicts = mergeStateFromBackend.conflicts ?? [];
      setDiffTree(fetchedDiffTree);
      setDiffTreeNodeCount(fetchedDiffTreeSize);
      console.info({ fetchedDiffTree });

      const { oldRenderTree: computedOldRenderTree, newRenderTree: computedNewRenderTree } = createTreeRepresentationsForRendering(fetchedConflicts, fetchedUnresolvedConflicts, fetchedDiffTree, mergeStateFromBackend.editable);
      console.info({ computedOldRenderTree, computedNewRenderTree } );     // TODO RadStr DEBUG: Debug print
      setOldRenderTree(computedOldRenderTree);
      setNewRenderTree(computedNewRenderTree);

      props.setIsLoadingTreeStructure(false);
    }
    fetchTrees();
  }, [props.mergeStateFromBackend]);

  useEffect(() => {
    const activeElement = document.activeElement as HTMLElement | null;
    // This is needed otherwise the Tree gets focus and shows black rectangle around it
    // (Disabling outline in css/tailwind did not work)
    activeElement?.blur();
  }, [diffTree]);

  console.info({ diffTree, oldRenderTree, newRenderTree });

  const treeRowHeightMultiplier = diffTreeNodeCount + 2;    // We have to add a little because there is some padding

  return (
    <div className="h-full">
      <div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={shouldOnlyShowConflicts}
            onChange={handleShowConflictsCheckboxChange}
            className="w-4 h-4"
          />
          {/* TODO RadStr Later: Localization */}
          <span>{shouldOnlyShowConflicts ? "Showing only conflicts" : "Showing all"}</span>
        </label>
      </div>
      <div className="flex gap-1 overflow-x-auto overflow-y-auto h-full">
        {/* <div className="flex-1 border border-stone-200 h-full" style={{height: treeRowHeight*treeRowHeightMultiplier}}>
          <h3><DiffEditorCrossedOutEditIcon/></h3>
          {
            renderTreeWithLoading(props.isLoadingTreeStructure,
              <Tree children={(nodeProps) => createStyledNode(nodeProps, updateModelData, props.datastoreInfosForCacheEntries, shouldOnlyShowConflicts, mergeStateFromBackend?.conflicts ?? [], setConfictsToBeResolvedForBoth(), createdFilesystemNodesAsArray, createdDatastores, addToCreatedDatastores, removedDatastores, setRemovedDatastores, removedTreePaths, setRemovedTreePaths, isCurrentlyAllowedChangeOfModelsUseState, conflictsToBeResolvedOnSaveInThisComponent)}
                ref={oldTreeRef} data={oldRenderTreeDataToRender}
                onSelect={(nodes) => onNodesSelect(nodes, "old")}
                onFocus={(node) => onNodeFocus(node, "old")}
                onToggle={(id: string) => onNodeToggle(id, "old")}
                rowHeight={treeRowHeight} height={treeRowHeight*treeRowHeightMultiplier} openByDefault disableDrag>
              </Tree>)
          }
        </div> */}
        <div className="flex-1 border border-stone-200 h-full" style={{height: treeRowHeight*treeRowHeightMultiplier}}>
          <h3><DiffEditorEditIcon/></h3>
          {
            renderTreeWithLoading(props.isLoadingTreeStructure,
              <Tree children={(nodeProps) => createStyledNode(nodeProps, updateModelData, props.datastoreInfosForCacheEntries, shouldOnlyShowConflicts, mergeStateFromBackend?.conflicts ?? [], setConfictsToBeResolvedForBoth(), createdFilesystemNodesAsArray, createdDatastores, addToCreatedDatastores, removedDatastores, setRemovedDatastores, setRemovedDatastoresAndLoadIntoCache, removedTreePaths, setRemovedTreePaths, isCurrentlyAllowedChangeOfModelsUseState, conflictsToBeResolvedOnSaveInThisComponent)}
                className="!overflow-x-hidden relative"
                ref={newTreeRef} data={newRenderTreeDataToRender} width={"100%"}
                onSelect={(nodes) => onNodesSelect(nodes, "new")}
                onFocus={(node) => onNodeFocus(node, "new")}
                onToggle={(id: string) => onNodeToggle(id, "new")}
                rowHeight={treeRowHeight} height={treeRowHeight*treeRowHeightMultiplier} openByDefault disableDrag>
              </Tree>)
          }
        </div>
      </div>
    </div>
  );
}


function renderTreeWithLoading(
  isLoadingTreeStructure: boolean,
  treeComponent: React.ReactElement,
) {
  return isLoadingTreeStructure ? <Loader className="mr-2 h-4 w-4 animate-spin" /> :
    <div>
      {treeComponent}
    </div>;
};