import { ChangeActiveModelMethod } from "@/dialog/diff-editor-dialog";
import _ from "lodash";
import { Check, Loader, MoveRight, X } from "lucide-react";
import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from "react";
import { NodeApi, NodeRendererProps, Tree, TreeApi, } from "react-arborist";
import { ComparisonData, DatastoreComparison, DatastoreInfo, DiffTree, getDatastoreInfoOfGivenDatastoreType, MergeState } from "@dataspecer/git";


type DataSourceRenderType = "datastore" | "directory" | "file";
type RenderTree = RenderNode[];
type RenderNode = {
  id: string;
  name: string;
  status: RenderStatus;
  dataSourceType: DataSourceRenderType,
  children?: RenderNode[];
  datastores: RenderNode[];
  reactElementToRender?: React.ReactNode,
  isReactElementToRenderRenderedAsSelected?: boolean,
  fullDatastoreInfoInOriginalTree: DatastoreInfo | null,      // TODO RadStr: For now keep together with the ResourceName stuff - but in te end only DatastoreInfo will be enough
  fullDatastoreInfoInModifiedTree: DatastoreInfo | null,
  /**
   * If is right now in conflict. To check if it can be part of conflict that is it either was or is right now, check {@link canBeInConflict}.
   */
  isNowInConflict: boolean,
  canBeInCoflict: boolean,
  treeType: TreeType,
};
type RenderNodeWithAdditionalData = RenderNode & {
  changeActiveModel: ChangeActiveModelMethod,
  shouldShowConflicts: boolean,
  rightOffsetForRowButtons: number,
  allConficts: ComparisonData[],
  setConflictsToBeResolvedOnSave: (value: React.SetStateAction<ComparisonData[]>) => void,
};

type RenderStatus = "same" | "modified" | "created" | "removed";
type TreeType = "old" | "new";

// @ts-ignore TODO RadStr: For now
function createTreeRepresentationsForRendering(
  allConflicts: ComparisonData[],
  unreslovedConflicts: ComparisonData[],
  diffTree: DiffTree,
): { oldRenderTree: RenderTree, newRenderTree: RenderTree } {
  const oldRenderTree = createTreeRepresentationForRendering(allConflicts, unreslovedConflicts, diffTree, "old");
  const newRenderTree = createTreeRepresentationForRendering(allConflicts, unreslovedConflicts, diffTree, "new");
  return { oldRenderTree, newRenderTree };
}

type DatastoreRenderRepresentationsData = {
  datastoresRenderRepresentations: RenderTree,
  /**
   * True if there exists at least one node in the {@link datastoresRenderRepresentations}, which is in conflict
   */
  hasDatastoreWithConflict: boolean,
  /**
   * Same as {@link hasDatastoreWithConflict}, but it does not have to be in conflict right now.
   */
  canHaveDatastoreWithConflict: boolean,
};

function createDatastoresRenderRepresentations(
  allConflicts: ComparisonData[],
  unresolvedConflicts: ComparisonData[],
  datastoreComparisons: DatastoreComparison[],
  treeToExtract: TreeType
): DatastoreRenderRepresentationsData {
  const datastoresRenderRepresentations: RenderTree = [];
  let hasDatastoreWithConflict: boolean = false;
  let canHaveDatastoreWithConflict: boolean = false;

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

    const fullDatastoreInfoInOriginalTree = datastoreComparison.oldVersion === null ?
      null :
      getDatastoreInfoOfGivenDatastoreType(datastoreComparison.oldVersion, datastoreComparison.affectedDataStore.type) ?? null;

    const fullDatastoreInfoInModifiedTree = datastoreComparison.newVersion === null ?
      null :
      getDatastoreInfoOfGivenDatastoreType(datastoreComparison.newVersion, datastoreComparison.affectedDataStore.type) ?? null;

    const isNowInConflict = unresolvedConflicts.findIndex(conflict => conflict.affectedDataStore.fullPath === datastoreComparison.affectedDataStore.fullPath) !== -1;
    if (isNowInConflict) {
      hasDatastoreWithConflict = true;
    }

    // The ternary operator is just optimization, searching allConflicts is always enough
    const canBeInCoflict = isNowInConflict ? isNowInConflict : allConflicts.findIndex(conflict => conflict.affectedDataStore.fullPath === datastoreComparison.affectedDataStore.fullPath) !== -1;
    if (canBeInCoflict) {
      canHaveDatastoreWithConflict = true;
    }

    const datastoreRenderNode: RenderNode = {
      id: (datastoreComparison?.newVersion?.fullTreePath ?? datastoreComparison?.oldVersion?.fullTreePath ?? "unknown") + datastoreComparison.affectedDataStore.fullName + "-" + treeToExtract,
      name: datastoreComparison.affectedDataStore.fullName,
      dataSourceType: "datastore",
      status,
      datastores: [],

      fullDatastoreInfoInOriginalTree,
      fullDatastoreInfoInModifiedTree,
      isNowInConflict,
      canBeInCoflict,
      treeType: treeToExtract,
    };
    datastoresRenderRepresentations.push(datastoreRenderNode);
  }

  return { datastoresRenderRepresentations, hasDatastoreWithConflict, canHaveDatastoreWithConflict };
}

function createTreeRepresentationForRendering(
  allConflicts: ComparisonData[],
  unresolvedConflicts: ComparisonData[],
  diffTree: DiffTree,
  treeToExtract: TreeType
): RenderTree {
  const renderTree: RenderTree = [];

  for (const [name, node] of Object.entries(diffTree)) {
    const children = createTreeRepresentationForRendering(allConflicts, unresolvedConflicts, node.childrenDiffTree, treeToExtract);
    const {
      datastoresRenderRepresentations,
      hasDatastoreWithConflict,
      canHaveDatastoreWithConflict,
    } = createDatastoresRenderRepresentations(allConflicts, unresolvedConflicts, node.datastoreComparisons, treeToExtract);

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
      fullDatastoreInfoInModifiedTree: null,
      fullDatastoreInfoInOriginalTree: null,
      // TODO RadStr: The path as mentioned above
      // fullPathInOldTree: "Empty since we fetch only datastores",
      // fullPathInNewTree: "Empty since we fetch only datastores",
      isNowInConflict: hasDatastoreWithConflict,
      canBeInCoflict: canHaveDatastoreWithConflict,
      treeType: treeToExtract,
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
  nodeToResolve: RenderNodeWithAdditionalData,
) => {
  event.stopPropagation();


  const conflictToBeResolved = findConflictForNode(nodeToResolve);

  if (conflictToBeResolved === null) {
    console.error("This is most-likely programmer error or corrupted data, the conflict to be resolved, could not be found.");
    return;
  }
  nodeToResolve.isNowInConflict = false;
  updateConflictsToBeResolvedOnSave(nodeToResolve.setConflictsToBeResolvedOnSave, conflictToBeResolved);
}

const onClickUnresolveConflict = (
  event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
  nodeToResolve: RenderNodeWithAdditionalData,
) => {
  event.stopPropagation();
  const conflictToBeUnresolved = findConflictForNode(nodeToResolve);

  if (conflictToBeUnresolved === null) {
    console.error("This is most-likely programmer error or corrupted data, the conflict to be resolved, could not be found.");
    return;
  }

  updateConflictsToBeResolvedOnSaveByRemoval(nodeToResolve.setConflictsToBeResolvedOnSave, conflictToBeUnresolved);
  nodeToResolve.isNowInConflict = true;
}


function StyledNode({
  node,
  style,
  dragHandle,
}: NodeRendererProps<RenderNodeWithAdditionalData>) {
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

  let icon: string = "";
  if (node.data.shouldShowConflicts) {
    icon = node.data.isNowInConflict ? "⚠️" : "";
  }
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

  const styledNode = (<>
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
        <div
          style={{ left: `${Math.max(node.data.rightOffsetForRowButtons, 0) + 8}px` }}
          className="absolute text-black top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-150 pointer-events-none group-hover:pointer-events-auto group-focus-within:pointer-events-auto bg-white/70 p-1 rounded"
        >
          {
          node.data.treeType === "old" || !node.data.canBeInCoflict || isExpandable ?
            null :
            <>
              {
              !node.data.isNowInConflict ?
                <div className="h-6 w-6"/> :  // Not null because we want to keep the button positioning
                <button title="Mark as resolved" className="mt-2 hover:bg-gray-400 text-sm" onClick={(e) => onClickResolveConflict(e, node.data)}>
                  <Check className="h-6 w-6"/>
                </button>
              }
              <button title="Mark as unresolved" className="mt-2 hover:bg-gray-400 text-sm" onClick={(e) => onClickUnresolveConflict(e, node.data)}>
                <X className="h-6 w-6"/>
              </button>
              <button title="Replace by other version" className="mt-2 hover:bg-gray-400 text-sm" onClick={(e) => {e.stopPropagation(); alert("delte")}}>
                <MoveRight className="h-6 w-6"/>
              </button>
            </>
          }
        </div>
      </div>
    </div>
  </>);

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


// @ts-ignore TODO RadStr: Remove I guess, but it was useful
const getOtherTreeType = (tree: TreeType) => tree === "old" ? "new" : "old";

const createStyledNode = (
  props: NodeRendererProps<RenderNode>,
  changeActiveModelData: ChangeActiveModelMethod,
  shouldShowConflicts: boolean,
  rightOffsetForRowButtons: number,
  allConficts: ComparisonData[],
  setConflictsToBeResolvedOnSave: (value: React.SetStateAction<ComparisonData[]>) => void,
) => {
  // TODO RadStr: Don't do this can possibly introduce problems and actually does not improve performance - just remove
  // const nodeData = props.node.data;
  // if (useCachedStyledNode && props.node.data.reactElementToRender !== undefined && (nodeData.isReactElementToRenderRenderedAsSelected === props.node.isSelected)) {
  //   const cachedReactElementToRender = nodeData.reactElementToRender;
  //   return cachedReactElementToRender;
  // }

  const extendedProps: NodeRendererProps<RenderNodeWithAdditionalData> = props as any;
  extendedProps.node.data.changeActiveModel = changeActiveModelData;
  extendedProps.node.data.shouldShowConflicts = shouldShowConflicts;
  extendedProps.node.data.rightOffsetForRowButtons = rightOffsetForRowButtons;
  extendedProps.node.data.allConficts = allConficts;
  extendedProps.node.data.setConflictsToBeResolvedOnSave = setConflictsToBeResolvedOnSave;
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

const treeRowHeight = 30;

// TODO RadStr: Probably put into separate file from the diff tree creation
/**
 * Handles the rendering and actions of the diff tree. That is 2 trees. On left there is the "original" version, on right the "modified".
 * Unfortunately I think that the performance is not the best. And it is related to number of nodes. For small number of nodes the
 *  animation of showing that node is selected is almost instant, however the performance gets gradually worse until like I would say 30 nodes (probably when nodes fill whole screen).
 *  After that the performance does not seem to get worse. This means that it is probably related to the library rather than bad programming.
 */
export const DiffTreeVisualization = (props: {
  changeActiveModel: ChangeActiveModelMethod,
  isLoadingTreeStructure: boolean,
  setIsLoadingTreeStructure: (value: SetStateAction<boolean>) => void,
  mergeStateFromBackend: MergeState | null,
  setConflictsToBeResolvedOnSave: Dispatch<SetStateAction<ComparisonData[]>>,
}) => {
  const setConflictsToBeResolvedOnSave = props.setConflictsToBeResolvedOnSave;
  const mergeStateFromBackend: MergeState | null = props.mergeStateFromBackend;

  const [diffTree, setDiffTree] = useState<DiffTree>();
  const [oldRenderTree, setOldRenderTree] = useState<RenderTree>();
  const [newRenderTree, setNewRenderTree] = useState<RenderTree>();
  const [diffTreeNodeCount, setDiffTreeNodeCount] = useState<number>(0);
  const oldTreeRef = useRef<TreeApi<RenderNode>>(null);
  const newTreeRef = useRef<TreeApi<RenderNode>>(null);

  // This exists because we want to show buttons on row hover.
  // However we could just use static offset from the right instead from left,
  // that being said I will keep it like this since I may need it and it works now, so possible TODO:
  const [rightOffsetForRowButtons, setRightOffsetForRowButtons] = useState<number>(0);

  const isProgrammaticFocus = useRef(false);
  const programmaticUnselectTheStopTree = useRef<TreeType | null>(null);

  const [shouldShowConflicts, setShouldShowConflicts] = useState<boolean>(false);

  const handleShowConflictsCheckboxChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    setShouldShowConflicts(event.target.checked);
  };

  const changeActiveModel = props.changeActiveModel;

  const treeWrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Generated by ChatGPT
    if (!treeWrapperRef.current) return;

    const observer = new ResizeObserver(entries => {
      for (let entry of entries) {
        setRightOffsetForRowButtons(entry.contentRect.width - 84);
      }
    });

    observer.observe(treeWrapperRef.current);
    return () => observer.disconnect();
  }, []);

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

      const fetchedMergeState = mergeStateFromBackend;      // TODO RadStr: This is just rename for the old code, that is remove this line of code later
      if (fetchedMergeState === null) {
        return;
      }
      const fetchedDiffTree = fetchedMergeState.diffTreeData!.diffTree;
      const fetchedDiffTreeSize = fetchedMergeState.diffTreeData!.diffTreeSize;
      // TODO RadStr: Probably also add the option to make resource again in conflict ... but will it anyone ever use though?
      const fetchedUnresolvedConflicts = fetchedMergeState.unresolvedConflicts ?? [];
      const fetchedConflicts = fetchedMergeState.conflicts ?? [];
      setDiffTree(fetchedDiffTree);
      setDiffTreeNodeCount(fetchedDiffTreeSize);
      console.info({ fetchedDiffTree });

      const { oldRenderTree: computedOldRenderTree, newRenderTree: computedNewRenderTree } = createTreeRepresentationsForRendering(fetchedConflicts, fetchedUnresolvedConflicts, fetchedDiffTree);
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
  }, [props.mergeStateFromBackend]);

  useEffect(() => {
    const activeElement = document.activeElement as HTMLElement | null;
    // This is needed otherwise the Tree gets focus and shows black rectangle around it
    // (Disabling outline in css/tailwind did not work)
    activeElement?.blur();
  }, [diffTree]);   // TODO RadStr: Use the reference to filesystem or something

  console.info({ diffTree, oldRenderTree, newRenderTree });

  const treeRowHeightMultiplier = diffTreeNodeCount + 2;    // We have to add a little because there is some padding

  return (
    <div className="h-full">
    <div>
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={shouldShowConflicts}
          onChange={handleShowConflictsCheckboxChange}
          className="w-4 h-4"
        />
        {/* TODO RadStr: Localization */}
        <span>{shouldShowConflicts ? "Showing conflicts" : "Not showing conflicts"}</span>
      </label>
    </div>
    <div className="flex gap-1 h-full">
      <div className="flex-1 border border-stone-200 h-full" style={{height: treeRowHeight*treeRowHeightMultiplier}}>
        <h3>Old:</h3>
        {
          renderTreeWithLoading(props.isLoadingTreeStructure,
            <Tree children={(props) => createStyledNode(props, changeActiveModel, shouldShowConflicts, rightOffsetForRowButtons, mergeStateFromBackend?.conflicts ?? [], setConflictsToBeResolvedOnSave)}
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
      <div ref={treeWrapperRef} className="flex-1 border border-stone-200 h-full" style={{height: treeRowHeight*treeRowHeightMultiplier}}>
        <h3>New:</h3>
        {
          renderTreeWithLoading(props.isLoadingTreeStructure,
            <Tree children={(props) => createStyledNode(props, changeActiveModel, shouldShowConflicts, rightOffsetForRowButtons, mergeStateFromBackend?.conflicts ?? [], setConflictsToBeResolvedOnSave)}
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