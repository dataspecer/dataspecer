import { Dispatch, RefObject, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as monaco from 'monaco-editor';
import {
  AvailableFilesystems,
  ClientFilesystem,
  ComparisonData,
  convertDatastoreContentBasedOnFormat,
  DatastoreInfo,
  EditableType,
  MergeResolverStrategy,
  MergeState,
  stringifyDatastoreContentBasedOnFormat,
  getEditableValue,
  getEditableAndNonEditableValue,
  CreateDatastoreFilesystemNodesInfo,
  ResourceComparison,
  getDefaultValueForFormat,
  stringifyShareableMetadataInfoFromDatastoreContent,
  getDatastoreInfoOfGivenDatastoreType,
  FilesystemNode,
  convertDatastoreContentForInputFormatToOutputFormat,
  setEditableValue,
  ExportShareableMetadataType,
  getDiffNodeFromDiffTree,
  createDatastoreWithReplacedIris,
  DiffTree,
} from "@dataspecer/git";
import { finalizeMergeState, saveMergeState } from "@/utils/merge-state-fetch-methods";
import { fetchMergeState } from "@/dialog/open-merge-state";
import { BetterModalProps } from "@/lib/better-modal";


type FullTreePath = string;
type ModelName = string;

type CacheContentMap = Record<FullTreePath, Record<ModelName, string>>;

type DatastoreInfosCache = Record<FullTreePath, Record<ModelName, {mergeFrom: DatastoreInfo | null, mergeTo: DatastoreInfo | null}>>;
type FormatsCache = Record<FullTreePath, Record<ModelName, string>>;

/**
 * Creates copy of {@link oldCache} and changes (or adds if not present) {@link newValue} at {@link datastoreToChange}
 */
function createNewContentCache(
  oldCache: CacheContentMap,
  treePathToNodeContainingDatastore: string,
  datastoreType: string,
  newValue: string
) {
  const newCache = {
    ...oldCache,
    [treePathToNodeContainingDatastore]: {
      ...(oldCache[treePathToNodeContainingDatastore] ?? {}),
      [datastoreType]: newValue,
    },
  };

  return newCache;
}

function isDatastorePresentInCache(cache: CacheContentMap, treePathToFilesystemNode: string, datastoreType: string | null): boolean {
  if (datastoreType === null) {
    return false;
  }
  return getDatastoreInCache(cache, treePathToFilesystemNode, datastoreType) !== undefined;
}

function getDatastoreInCache(cache: CacheContentMap, treePathToFilesystemNode: string, datastoreType: string) {
  return cache[treePathToFilesystemNode]?.[datastoreType];
}

function getDatastoreInCacheAsObject(
  primaryCacheToCheck: CacheContentMap,
  secondaryCacheToCheck: CacheContentMap,
  treePathToFilesystemNode: string,
  datastoreInfo: DatastoreInfo,
  removedDatastores: DatastoreInfo[],
): any {
  const contentAsString = findValueInCache(datastoreInfo.fullPath, treePathToFilesystemNode, datastoreInfo.type, datastoreInfo.format, removedDatastores, [primaryCacheToCheck, secondaryCacheToCheck]);
  return convertDatastoreContentBasedOnFormat(contentAsString, datastoreInfo.format, true);
}

const convertDataAndUpdateCacheContentEntry = (
  convertedCacheSetter: (value: SetStateAction<CacheContentMap>) => void,
  treePathToNodeContainingDatastore: string,
  datastoreType: string,
  newValue: string,
  format: string,
) => {
  console.info("RadStr Debug: Debug");     // TODO RadStr Debug: Debug
  console.info({newValue});     // TODO RadStr Debug: Debug
  const convertedNewValue = convertDatastoreContentBasedOnFormat(newValue, format, true);
  const stringifiedConvertedNewValue = stringifyDatastoreContentBasedOnFormat(convertedNewValue, format, true);
  updateCacheContentEntry(convertedCacheSetter, treePathToNodeContainingDatastore, datastoreType, stringifiedConvertedNewValue);
}

const updateCacheContentEntry = (
  cacheSetter: (value: SetStateAction<CacheContentMap>) => void,
  treePathToNodeContainingDatastore: string,
  datastoreType: string,
  newValue: string,
) => {
  cacheSetter(prevState => {
    return createNewContentCache(prevState, treePathToNodeContainingDatastore, datastoreType, newValue);
  });
}


function getEditorsInOriginalOrder(
  diffEditorRef: RefObject<{editor: monaco.editor.IStandaloneDiffEditor} | undefined>,
  editable: EditableType,
): { mergeFromEditor: monaco.editor.IStandaloneCodeEditor | null, mergeToEditor: monaco.editor.IStandaloneCodeEditor | null } {
  // TODO RadStr: Don't know if it can ever be undefined, so for now just ?, but in future change the type to string only and use !. instead of ?.
  const diffEditor = diffEditorRef.current?.editor;
  if (editable === "mergeFrom") {
    return {
      mergeFromEditor: diffEditor?.getModifiedEditor() ?? null,
      mergeToEditor: diffEditor?.getOriginalEditor() ?? null,
    };
  }
  else {
    return {
      mergeFromEditor: diffEditor?.getOriginalEditor() ?? null,
      mergeToEditor: diffEditor?.getModifiedEditor() ?? null,
    };
  }
}

/**
 * Checks the {@link cachesToCheck}. If the first one matches returns the relevant value in cache.
 *  If it is other it just returns default value or if it is datastore of "meta" type returns the shareable part
 */
function findValueInCache(
  fullDatastorePath: string | null,
  nodeTreePath: string,
  datastoreType: string | null,
  activeFormat: string | null,
  removedDatastores: DatastoreInfo[],
  cachesToCheck: CacheContentMap[],
): string {
  const isRemoved = removedDatastores.find(removedDatastore => removedDatastore.fullPath === fullDatastorePath) !== undefined;
  if (isRemoved) {
    return getDefaultValueForFormat(activeFormat);
  }

  if (datastoreType === null) {
    return getDefaultValueForFormat(activeFormat);
  }
  const cacheWithValue = cachesToCheck.find(cacheToCheck => cacheToCheck[nodeTreePath]?.[datastoreType] !== undefined);
  if (cacheWithValue === undefined) {
    return getDefaultValueForFormat(activeFormat);
  }

  const cacheContent = cacheWithValue[nodeTreePath][datastoreType];
  if (cacheWithValue === cachesToCheck[0]) {
    // If it is the primary or not meta, just return it
    return cacheWithValue[nodeTreePath][datastoreType];
  }
  else {
    if (datastoreType === "meta") {
      // If meta and not primary then pick the relevant stuff
      return stringifyShareableMetadataInfoFromDatastoreContent(cacheContent, activeFormat);
    }
    else {
      return getDefaultValueForFormat(activeFormat);
    }
  }
}


export type EntriesAffectedByCreateType = {
  firstExistingParentIri: string | null;
  createdFilesystemNodes: CreateDatastoreFilesystemNodesInfo[];
}

export type TextDiffEditorBetterModalProps = TextDiffEditorDialogProps & BetterModalProps<{
  newResourceContent: string | undefined,
}>;

type TextDiffEditorDialogProps = {
  initialMergeFromResourceIri: string,
  initialMergeToResourceIri: string,
  editable: EditableType,
}

type TextDiffEditorHookProps = Omit<TextDiffEditorBetterModalProps, "isOpen">;
type MergeFromMergeToStrings = { mergeFrom: string | null, mergeTo: string | null };

/**
 * Only the mappings of metas (respectively filesystem nodes). We do not need other datastores iris.
 */
type IriMappings = {
  iriToProjectIriMap: Record<string, string>;
  projectIriToIriMap: Record<string, MergeFromMergeToStrings>;
  iriMappingForNonEditableToEditable: Record<string, string | null>;
  projectIriToDiffNodeMap: Record<string, ResourceComparison>;
};

function createIriMappings(
  diffTree: DiffTree,
  editable: EditableType,

  iriToProjectIriMap: Record<string, string>,
  projectIriToIriMap: Record<string, MergeFromMergeToStrings>,
  iriMappingForNonEditableToEditable: Record<string, string | null>,
  projectIriToDiffNodeMap: Record<string, ResourceComparison>,
) {
  for (const diffNode of Object.values(diffTree ?? {})) {
    const { old: mergeFromResource, new: mergeToResource } = diffNode.resources;
    const projectIri = mergeFromResource?.metadata.projectIri ?? mergeToResource?.metadata.projectIri;
    if (projectIri === undefined) {
      throw new Error(`The diff node inside diff tree does not have defined neither old and neither new resource for some reason: ${diffNode}`);
    }
    projectIriToDiffNodeMap[projectIri] = diffNode;

    const mapValue: MergeFromMergeToStrings = {
      mergeFrom: mergeFromResource?.metadata.iri ?? null,
      mergeTo: mergeToResource?.metadata.iri ?? null,
    };

    mapValue.mergeFrom ??= (projectIriToIriMap[projectIri]?.mergeFrom ?? null);
    mapValue.mergeTo ??= (projectIriToIriMap[projectIri]?.mergeTo ?? null);
    projectIriToIriMap[projectIri] = mapValue;
    if (mapValue.mergeFrom !== null) {
      iriToProjectIriMap[mapValue.mergeFrom] = projectIri;
    }
    if (mapValue.mergeTo !== null) {
      iriToProjectIriMap[mapValue.mergeTo] = projectIri;
    }

    const { nonEditable: key, editable: value } = getEditableAndNonEditableValue(editable, mapValue.mergeFrom, mapValue.mergeTo);
    if (key !== null) {
      iriMappingForNonEditableToEditable[key] = value;
    }

    createIriMappings(diffNode.childrenDiffTree, editable, iriToProjectIriMap, projectIriToIriMap, iriMappingForNonEditableToEditable, projectIriToDiffNodeMap);
  }
}



async function onCascadeUpdateForCreatedDatastores(
  nodeTreePath: string,
  examinedMergeState: MergeState | null,
  editable: EditableType,
  datastoreCausingTheUpdate: DatastoreInfo | null,
  updateModelDataOnCreate: (treePathToNodeContaingDatastore: string, givenMergeFromDatastoreInfo: DatastoreInfo | null, givenMergeToDatastoreInfo: DatastoreInfo | null) => Promise<void>,
  setCreatedDatastores: Dispatch<SetStateAction<DatastoreInfo[]>>,
  setCreatedFilesystemNodes: Dispatch<SetStateAction<Record<string, EntriesAffectedByCreateType>>>,
  createdFilesystemNodesAsArray: CreateDatastoreFilesystemNodesInfo[],
) {
  let firstExistingParentIri: string | null = null;

  const createdFilesystemNodesInTreePath: CreateDatastoreFilesystemNodesInfo[] = [];
  let hasChildrenToCreate = true;
  let currentNodeTreePath = nodeTreePath;
  let visitedFirstNodeToCreate = false;
  let parentDiffNode: ResourceComparison | undefined;
  let parentNode: FilesystemNode | null = null;
  let parentDiffTree = examinedMergeState!.diffTreeData!.diffTree;
  while (hasChildrenToCreate) {
    const treePathSeparatorIndex = currentNodeTreePath.indexOf("/");
    let currentIri: string;
    if (treePathSeparatorIndex === -1) {
      hasChildrenToCreate = false;
      currentIri = currentNodeTreePath;
      currentNodeTreePath = "";
    }
    else {
      currentIri = currentNodeTreePath.substring(0, treePathSeparatorIndex);
      currentNodeTreePath = currentNodeTreePath.substring(treePathSeparatorIndex + 1);
    }

    const currentDiffNode = parentDiffTree?.[currentIri];

    if (currentDiffNode === undefined) {
      throw new Error(`The parent of node does not exist for some reason: ${currentNodeTreePath}, in which we ended up from ${nodeTreePath}`);
    }
    if (currentDiffNode.resourceComparisonResult === "exists-in-old") {
      // Using the ! on existingResouce, since the value is relevant only when the old (non-editable) value exists
      const { nonEditable: existingResource } = getEditableAndNonEditableValue(editable, currentDiffNode?.resources.old, currentDiffNode?.resources.new);
      const metadataInfo = getDatastoreInfoOfGivenDatastoreType(existingResource!, "meta")!;

      // TODO RadStr DEBUG: Debug prints
      console.info({ lastTreePathSeparatorIndex: treePathSeparatorIndex, len: currentNodeTreePath.length, currentIri, currentNodeTreePath, nodeTreePath, currentNode: currentDiffNode, difftree: examinedMergeState?.diffTreeData?.diffTree }); // TODO RadStr DEBUG: Debug print
      console.info({ metadataAsJSON: metadataInfo, PATH_FOR_METADATA: existingResource!.irisTreePath! }); // TODO RadStr DEBUG: Debug print

      const isFilesystemNodeNotYetAdded = createdFilesystemNodesAsArray.find(alreadyCreated => alreadyCreated.projectIrisTreePath === existingResource!.irisTreePath) === undefined;
      if (isFilesystemNodeNotYetAdded) {
        visitedFirstNodeToCreate = true;
        if (parentNode === null) {
          toast.error("Fatal Merge error, check console");
          throw new Error("We can not (at least currently) have 2 roots. That is both packages have to have one common root.");
        }

        const mergeFromMetadataInfo = (currentDiffNode?.resources.old === undefined || currentDiffNode?.resources.old === null) ? null : getDatastoreInfoOfGivenDatastoreType(currentDiffNode?.resources.old, "meta");
        const mergeToMetadataInfo = (currentDiffNode?.resources.new === undefined || currentDiffNode?.resources.new === null) ? null : getDatastoreInfoOfGivenDatastoreType(currentDiffNode?.resources.new, "meta");
        console.info({mergeFromMetadataInfo, mergeToMetadataInfo});     // TODO RadStr DEBUG: Debug print
        await updateModelDataOnCreate(existingResource!.irisTreePath, mergeFromMetadataInfo, mergeToMetadataInfo);
        setCreatedDatastores(prev => [...prev, metadataInfo]);

        const newFilesystemNodeToCreate: CreateDatastoreFilesystemNodesInfo = {
          parentProjectIri: parentNode.metadata.projectIri,
          projectIrisTreePath: existingResource!.projectIrisTreePath,
          userMetadataDatastoreInfo: metadataInfo,
        };
        createdFilesystemNodesInTreePath.push(newFilesystemNodeToCreate);
        createdFilesystemNodesAsArray.push(newFilesystemNodeToCreate);
        alert(`onCascadeUpdateForCreatedDatastores: ${existingResource!.irisTreePath}`);
        parentNode = existingResource;
      }
    }
    else {
      if (currentDiffNode.resourceComparisonResult === "exists-in-both") {
        const { nonEditable: existingResource } = getEditableAndNonEditableValue(editable, currentDiffNode?.resources.old, currentDiffNode?.resources.new);
        parentNode = existingResource;
      }
      if (visitedFirstNodeToCreate) { // We are after the node to create
        hasChildrenToCreate = false;
      }
    }
    parentDiffNode = currentDiffNode;
    parentDiffTree = parentDiffNode?.childrenDiffTree;

    if (!visitedFirstNodeToCreate) {
      // The value has to be string since we have not yet visited node which does not exists in the editable tree (otherwise the condition if would not pass)
      firstExistingParentIri = getEditableValue(editable, currentDiffNode?.resources.old?.metadata.iri, currentDiffNode?.resources.new?.metadata.iri)!;
    }
  }
  setCreatedFilesystemNodes(prev => ({
    ...prev,
    [datastoreCausingTheUpdate!.fullPath]: {
      firstExistingParentIri: firstExistingParentIri,
      createdFilesystemNodes: createdFilesystemNodesInTreePath,
    }
  }));
}


// Note that the hook is not useful for anything else than the diff editor dialog, but since it is quite large I put it into separate file
export const useDiffEditorDialogProps = ({editable, initialMergeFromResourceIri, initialMergeToResourceIri, resolve}: TextDiffEditorHookProps) => {
  const monacoEditor = useRef<{editor: monaco.editor.IStandaloneDiffEditor}>(undefined);


  // Set once in the useEffect
  const [examinedMergeState, setExaminedMergeState] = useState<MergeState | null>(null);
  const [conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave] = useState<ComparisonData[]>([]);
  // Maps the full path of the datastore to be created to the iris, which are inside the datastore and need replacing.
  const createdDatastoresToIrisNeedingReplacementMap = useRef<Record<string, string[]>>({});
  const [createdDatastores, setCreatedDatastores] = useState<DatastoreInfo[]>([]);
  const [createdFilesystemNodes, setCreatedFilesystemNodes] = useState<Record<string, EntriesAffectedByCreateType>>({});
  const currentlyInAsyncUpdateOfCreatedFilesystemNodes = useRef<boolean>(false);
  const createdDatastoresInPreviousIteration = useRef<DatastoreInfo[]>([]);
  // Removed datastores are a bit simpler to solve - basically. Removal of Meta = removal of all datastores together with filesystem node (recursively), but that is handled in directory diff editor.
  const [removedDatastores, setRemovedDatastores] = useState<DatastoreInfo[]>([]);
  const [removedTreePaths, setRemovedTreePaths] = useState<string[]>([]);

  const [activeTreePathToNodeContainingDatastore, setActiveTreePathToNodeContainingDatastore] = useState<string>("");
  const [formatsForCacheEntries, setFormatsForCacheEntries] = useState<FormatsCache>({});
  const [datastoreInfosForCacheEntries, setDatastoreInfosForCacheEntries] = useState<DatastoreInfosCache>({});
  const [convertedCacheForMergeFromContent, setConvertedCacheForMergeFromContent] = useState<CacheContentMap>({});
  const [convertedCacheForMergeToContent, setConvertedCacheForMergeToContent] = useState<CacheContentMap>({});
  const [mergeFromDatastoreInfo, setMergeFromDatastoreInfo] = useState<DatastoreInfo | null>(null);
  const [mergeToDatastoreInfo, setMergeToDatastoreInfo] = useState<DatastoreInfo | null>(null);
  const [mergeFromSvg, setMergeFromSvg] = useState<any | "">("");
  const [mergeToSvg, setMergeToSvg] = useState<any | "">("");

  const [comparisonTabType, setComparisonTabType] = useState<"image-compare" | "text-compare">("text-compare");
  // Internal state used to track that cache was explictly updated
  const [cacheExplicitUpdateTracker, setCacheExplicitUpdateTracker] = useState<number>(0);

  // When loading the specific file (or rather model) data from backend
  const [isLoadingTextData, setIsLoadingTextData] = useState<boolean>(true);
  // When loading the directory structure from backend
  // Note that the value itself is not set neither here it is passed to the child class
  const [isLoadingTreeStructure, setIsLoadingTreeStructure] = useState<boolean>(true);

  const { iriToProjectIriMap, projectIriToIriMap: _projectIriToIriMap, iriMappingForNonEditableToEditable, projectIriToDiffNodeMap } = useMemo<IriMappings>(() => {
    const iriToProjectIriMapStorage: Record<string, string> = {};
    const projectIriToIriMapStorage: Record<string, MergeFromMergeToStrings> = {};
    const iriMappingForNonEditableToEditableStorage: Record<string, string | null> = {};
    const projectIriToDiffNodeMapStorage: Record<string, ResourceComparison> = {};

    createIriMappings(
      examinedMergeState?.diffTreeData?.diffTree!, editable,
      iriToProjectIriMapStorage, projectIriToIriMapStorage, iriMappingForNonEditableToEditableStorage, projectIriToDiffNodeMapStorage);

    return {
      iriToProjectIriMap: iriToProjectIriMapStorage,
      projectIriToIriMap: projectIriToIriMapStorage,
      iriMappingForNonEditableToEditable: iriMappingForNonEditableToEditableStorage,
      projectIriToDiffNodeMap: projectIriToDiffNodeMapStorage,
    };
  }, [examinedMergeState]);


  const activeDatastoreType = mergeToDatastoreInfo?.type ?? mergeFromDatastoreInfo?.type ?? null;
  const activeFormat = activeDatastoreType === null ? "" : formatsForCacheEntries[activeTreePathToNodeContainingDatastore]?.[activeDatastoreType] ?? "";
  const activeMergeFromContentConverted = findValueInCache(mergeFromDatastoreInfo?.fullPath ?? null, activeTreePathToNodeContainingDatastore, activeDatastoreType, activeFormat, removedDatastores, [convertedCacheForMergeFromContent, convertedCacheForMergeToContent]);
  const activeMergeToContentConverted = findValueInCache(mergeToDatastoreInfo?.fullPath ?? null, activeTreePathToNodeContainingDatastore, activeDatastoreType, activeFormat, removedDatastores, [convertedCacheForMergeToContent, convertedCacheForMergeFromContent]);

  const resetUseStates = () => {
    setExaminedMergeState(null);
    setConflictsToBeResolvedOnSave([]);
    setCreatedDatastores([]);
    setCreatedFilesystemNodes({});
    createdDatastoresInPreviousIteration.current = [];
    createdDatastoresToIrisNeedingReplacementMap.current = {};
    setRemovedDatastores([]);
    setActiveTreePathToNodeContainingDatastore("");
    setFormatsForCacheEntries({});
    setDatastoreInfosForCacheEntries({});
    setConvertedCacheForMergeFromContent({});
    setConvertedCacheForMergeToContent({});
    setMergeFromDatastoreInfo(null);
    setMergeToDatastoreInfo(null);
    setMergeFromSvg("");
    setMergeToSvg("");
    setComparisonTabType("text-compare");
    setIsLoadingTextData(true);
    setIsLoadingTreeStructure(true);
    setCacheExplicitUpdateTracker(0);
  };

  const reloadMergeState = async () => {
    setIsLoadingTextData(true);
    resetUseStates();
    const fetchedMergeState = await fetchMergeState(initialMergeFromResourceIri, initialMergeToResourceIri, true);
    setExaminedMergeState(fetchedMergeState);
  };

  useEffect(() => {
    reloadMergeState();
  }, []);


  useEffect(() => {
    if (comparisonTabType !== "image-compare") {
      return;
    }

    if (mergeFromDatastoreInfo?.type === "svg") {
      setMergeFromSvg(convertDatastoreContentBasedOnFormat(activeMergeFromContentConverted, activeFormat, true)?.svg ?? "");
    }
    else {
      setMergeFromSvg("");
    }
    if (mergeToDatastoreInfo?.type === "svg") {
      setMergeToSvg(convertDatastoreContentBasedOnFormat(activeMergeToContentConverted, activeFormat, true)?.svg ?? "");
    }
    else {
      setMergeToSvg("");
    }
  }, [comparisonTabType, mergeFromDatastoreInfo, mergeToDatastoreInfo]);


  useEffect(() => {
    const newlyCreatedDatastores = createdDatastores
      .filter(createdDatastore =>
        createdDatastoresInPreviousIteration.current
          .find(previouslyCreatedDatastore => previouslyCreatedDatastore.fullPath === createdDatastore.fullPath) === undefined);

    console.info({newlyCreatedDatastores, createdDatastores, createdDatastoresInPreviousIteration});

    // Define async function, since useCallback does not support it
    const handleCreatedFilesystemNodesUpdate = async () => {
      if (currentlyInAsyncUpdateOfCreatedFilesystemNodes.current) {
        return;
      }
      currentlyInAsyncUpdateOfCreatedFilesystemNodes.current = true;
      const createdFilesystemNodesAsArray = Object.values(createdFilesystemNodes).map(filesystemNode => filesystemNode.createdFilesystemNodes).flat();

      for (const [nodeTreePath, datastoreInfoMap] of Object.entries(datastoreInfosForCacheEntries)) {
        for (const [modelName, datastoreInfo] of Object.entries(datastoreInfoMap)) {
          if (modelName !== "meta") {
            continue;
          }

          const { nonEditable: datastoreCausingTheUpdate } = getEditableAndNonEditableValue(editable, datastoreInfo.mergeFrom, datastoreInfo.mergeTo);
          console.info({newlyCreatedDatastores, datastoreCausingTheUpdate});
          alert(`Handling update2`);

          // Skip if iti s not newly created
          if (newlyCreatedDatastores.find(createdDatastore => createdDatastore.fullPath === datastoreCausingTheUpdate?.fullPath) === undefined) {
            continue;
          }
          await onCascadeUpdateForCreatedDatastores(
            nodeTreePath, examinedMergeState, editable, datastoreCausingTheUpdate,
            updateModelDataOnCreate, setCreatedDatastores, setCreatedFilesystemNodes, createdFilesystemNodesAsArray);
          console.info({convertedCacheForMergeFromContent, convertedCacheForMergeToContent});
        }
      }
      currentlyInAsyncUpdateOfCreatedFilesystemNodes.current = false;
    }
    // Call the async function
    handleCreatedFilesystemNodesUpdate();
    createdDatastoresInPreviousIteration.current = createdDatastores;
  }, [createdDatastores]);


   /**
   * @param metadataDatastoreInfoToCreate We need the meta file to correctly create the parent filesystem node of datastore if it does not exist.
   */
  const addToCreatedDatastoresAndAddToCache = async (
    irisTreePathForDatastoreParent: string,
    datastoreInfoToCreate: DatastoreInfo,
    metadataDatastoreInfoToCreate: DatastoreInfo | null,
  ) => {
    await updateModelDataOnCreate(irisTreePathForDatastoreParent, datastoreInfoToCreate, null);
    if (metadataDatastoreInfoToCreate !== null && datastoreInfoToCreate != metadataDatastoreInfoToCreate) {
      await updateModelDataOnCreate(irisTreePathForDatastoreParent, metadataDatastoreInfoToCreate, null);
    }
    setCreatedDatastores(prev => {
      const newDatastores = [...prev, datastoreInfoToCreate];
      if (metadataDatastoreInfoToCreate !== null &&
        newDatastores.find(datastore => datastore.fullPath === metadataDatastoreInfoToCreate.fullPath) === undefined &&
        (datastoreInfosForCacheEntries[metadataDatastoreInfoToCreate.fullPath]?.mergeTo ?? null) === null) {
          // TODO RadStr: The mergeTo is not right I think - I will have to fix this everywhere where it occurs. Use only the editable/non-editable
        // If It is not null and not present in the datastores to be and also it was not yet created.
        newDatastores.push(metadataDatastoreInfoToCreate);
      }
      return newDatastores;
    });
  };


  /**
   * Updates models related data. If {@link shouldChangeActiveModel} is true Changes current active model, that is modifies states to reflect that.
   *  If {@link useCache} is set to true then tries to use cache (if the datastore is present it uses the cache, otherwise updates the cache by fetching from backend),
   *   if set to false, then always fetches from backend and updates cache
   * @param shouldChangeActiveModel - if true then we use the given datastore infos to set active model. If false then this method behaves as a possible updater of cache ({@link useCache} should be also false then.)
   * @param shouldCopyIfMissing if false then if the editable is missing we don't set it and it will be the default value, otherwise the copy of the other variant will be used as the cache content for the editable.
   */
  const updateModelData = async (
    treePathToNodeContainingDatastore: string,
    newMergeFromDatastoreInfo: DatastoreInfo | null,
    newMergeToDatastoreInfo: DatastoreInfo | null,
    useCache: boolean,
    shouldChangeActiveModel: boolean,
    shouldCopyIfMissing: boolean,
  ) => {
    if (newMergeFromDatastoreInfo === null && newMergeToDatastoreInfo === null) {
      if (!shouldChangeActiveModel) {
        return;
      }
      // TOOD RadStr: Not sure about this special case, but I think this should be the correct way to handle it
      setMergeFromDatastoreInfo(null);
      setMergeToDatastoreInfo(null);
      setActiveTreePathToNodeContainingDatastore(treePathToNodeContainingDatastore);
      return;
    }

    setIsLoadingTextData(true);
    // Note that it must be always string because of the if guard for both nulls at the start of method
    const newDatastoreType = (newMergeFromDatastoreInfo?.type ?? newMergeToDatastoreInfo?.type) as string;
    const oldDatastoreType: string | null = activeDatastoreType;

    // Pick the format in the classic filesystem. If the datastore does not exist (it was deleted datastore), then pick format from the other one. If none present pick text
    const newFormat = (
      examinedMergeState?.filesystemTypeMergeFrom === AvailableFilesystems.ClassicFilesystem ?
        (newMergeFromDatastoreInfo?.format ?? newMergeToDatastoreInfo?.format) :
        (newMergeToDatastoreInfo?.format ?? newMergeFromDatastoreInfo?.format)
      ) ?? "text";
    setFormatsForCacheEntries((prev) => ({
      ...prev,
      [treePathToNodeContainingDatastore]: {
        ...prev[treePathToNodeContainingDatastore],
        [newDatastoreType]: newFormat,
      }
    }));

    setDatastoreInfosForCacheEntries(prev => ({
      ...prev,
      [treePathToNodeContainingDatastore]: {
        ...prev[treePathToNodeContainingDatastore],
        [newDatastoreType]: {mergeFrom: newMergeFromDatastoreInfo, mergeTo: newMergeToDatastoreInfo},
      }
    }));

    if (mergeFromDatastoreInfo?.fullPath !== newMergeFromDatastoreInfo?.fullPath || mergeToDatastoreInfo?.fullPath !== newMergeToDatastoreInfo?.fullPath) {
      // Switched to different datastore
      if (newMergeFromDatastoreInfo?.type === "svg" || newMergeToDatastoreInfo?.type === "svg") {
        setComparisonTabType("image-compare");
      }
      else {
        setComparisonTabType("text-compare");
      }
    }

    const editors = getEditorsInOriginalOrder(monacoEditor, editable);

    if (oldDatastoreType !== null && shouldChangeActiveModel) {
      // Put the values currently present in the editor into cache (that is those editor values, before we switched). Note that we always put them there, even if the datastore does not exist
      //  (meaning it was removed), that is because we want to store the changes. We are doing that only locally and only send them if the user actually adds them explicitly
      const currentMergeFromContentInEditor = editors.mergeFromEditor?.getValue()!;
      convertDataAndUpdateCacheContentEntry(setConvertedCacheForMergeFromContent,
        activeTreePathToNodeContainingDatastore, oldDatastoreType, currentMergeFromContentInEditor, newFormat);

      const currentMergeToContentInEditor = editors.mergeToEditor?.getValue()!;
      convertDataAndUpdateCacheContentEntry(setConvertedCacheForMergeToContent,
        activeTreePathToNodeContainingDatastore, oldDatastoreType, currentMergeToContentInEditor, newFormat);
    }

    const isMergeFromDataResourceInCache = isDatastorePresentInCache(convertedCacheForMergeFromContent, treePathToNodeContainingDatastore, newDatastoreType);
    const isMergeToDataResourceInCache = isDatastorePresentInCache(convertedCacheForMergeToContent, treePathToNodeContainingDatastore, newDatastoreType);
    if (!(useCache && (isMergeFromDataResourceInCache || isMergeToDataResourceInCache))) {
      // Update cache values
      const newMergeFromDataAsText = await ClientFilesystem.getDatastoreContentDirectly(newMergeFromDatastoreInfo, false, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeFrom ?? null);
      const newMergeToDataAsText = await ClientFilesystem.getDatastoreContentDirectly(newMergeToDatastoreInfo, false, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeTo ?? null);

      console.info({newMergeFromDataResourceNameInfo: newMergeFromDatastoreInfo, newMergeToDataResourceNameInfo: newMergeToDatastoreInfo});

      // The order matters since we create copies - we have to first set the non-empty one. So we can create copy (actually since we allow only editing of one, the order is kind of given)
      const cacheSetOrder: EditableType[] = [];
      if (newMergeFromDatastoreInfo === null) {
        cacheSetOrder.push("mergeTo", "mergeFrom");
      }
      else {
        cacheSetOrder.push("mergeFrom", "mergeTo");
      }

      let otherDatastoreEntry: any = null;
      for (const [index, cacheToSet] of cacheSetOrder.entries()) {
        let dataAsText: any;
        let currentDatastoreInfo: DatastoreInfo | null;
        let otherDatastoreInfo: DatastoreInfo | null;
        let cacheContentSetter;
        if (cacheToSet === "mergeFrom") {
          currentDatastoreInfo = newMergeFromDatastoreInfo;
          otherDatastoreInfo = index === 0 ? null : newMergeToDatastoreInfo;
          dataAsText = newMergeFromDataAsText;
          cacheContentSetter = setConvertedCacheForMergeFromContent;
        }
        else {
          currentDatastoreInfo = newMergeToDatastoreInfo;
          otherDatastoreInfo = index === 0 ? null : newMergeFromDatastoreInfo;
          dataAsText = newMergeToDataAsText;
          cacheContentSetter = setConvertedCacheForMergeToContent;
        }
        otherDatastoreEntry = await updateCacheEntryForModelUpdate(
          dataAsText, currentDatastoreInfo, otherDatastoreInfo, otherDatastoreEntry,
          treePathToNodeContainingDatastore, newFormat, newDatastoreType, shouldCopyIfMissing, cacheContentSetter);
      }
    }

    if (shouldChangeActiveModel) {
      setActiveTreePathToNodeContainingDatastore(treePathToNodeContainingDatastore);
      setMergeFromDatastoreInfo(newMergeFromDatastoreInfo);
      setMergeToDatastoreInfo(newMergeToDatastoreInfo);
    }

    setIsLoadingTextData(false);
  }

  const updateCacheEntryForModelUpdate = async (
    dataToInsertAsText: string | null,
    datastoreInfo: DatastoreInfo | null,
    otherDatastoreInfo: DatastoreInfo | null,
    otherDatastoreEntry: any,
    treePathToNodeContainingDatastore: string,
    newFormat: string,
    newDatastoreType: string,
    shouldCopyIfMissing: boolean,
    setConvertedCacheContent: (value: SetStateAction<CacheContentMap>) => void,
  ) => {
    let valueToStoreToCacheAsObject: any;
    if (dataToInsertAsText !== null && datastoreInfo !== null) {
      valueToStoreToCacheAsObject = convertDatastoreContentBasedOnFormat(dataToInsertAsText, datastoreInfo.format, true);
      const stringifiedCacheValue = stringifyDatastoreContentBasedOnFormat(valueToStoreToCacheAsObject, newFormat, true);
      convertDataAndUpdateCacheContentEntry(setConvertedCacheContent,
        treePathToNodeContainingDatastore, newDatastoreType, stringifiedCacheValue, newFormat);
    }
    else {
      if (datastoreInfo === null && otherDatastoreInfo !== null && shouldCopyIfMissing && createdDatastoresToIrisNeedingReplacementMap.current[otherDatastoreInfo.fullPath] === undefined) {
        alert("Replacing iris inside cache");     // TODO RadStr: Debug alert
        const { datastoreWithReplacedIris, missingIrisInNew } = createDatastoreWithReplacedIris(otherDatastoreEntry, iriMappingForNonEditableToEditable);
        valueToStoreToCacheAsObject = datastoreWithReplacedIris;
        createdDatastoresToIrisNeedingReplacementMap.current[otherDatastoreInfo.fullPath] = missingIrisInNew;
        const stringifiedCacheValueToStore = stringifyDatastoreContentBasedOnFormat(valueToStoreToCacheAsObject, newFormat, true);
        updateCacheContentEntry(setConvertedCacheContent, treePathToNodeContainingDatastore, newDatastoreType, stringifiedCacheValueToStore);

        for (const missingIriInNew of missingIrisInNew) {
          const missingProjectIri = iriToProjectIriMap[missingIriInNew];
          if (missingProjectIri === undefined) {
            throw new Error(`The iri ${missingIriInNew} has no project iri. Therefore it can not be replaced in the edited filesystem`);
          }
          const diffNode = projectIriToDiffNodeMap[missingProjectIri];
          if (diffNode.resources.old === null) {
            throw new Error(`${missingIriInNew} has no resource stored inside the diff tree.`);
          }

          const missingMetadataToCreate: DatastoreInfo | null = getDatastoreInfoOfGivenDatastoreType(diffNode.resources.old, "meta");
          if (missingMetadataToCreate === null) {
            throw new Error(`${missingIriInNew} has no meta datastore file.`);
          }
          await addToCreatedDatastoresAndAddToCache(missingProjectIri, missingMetadataToCreate, null);
        }
      }
    }

    return valueToStoreToCacheAsObject;
  }


  const reloadModelsDataFromBackend = async () => {
    if (mergeFromDatastoreInfo !== null || mergeToDatastoreInfo !== null) {
      await updateModelData(activeTreePathToNodeContainingDatastore, mergeFromDatastoreInfo, mergeToDatastoreInfo, false, true, false);
    }
  };


  const saveChangesToCache = async () => {
    if (mergeFromDatastoreInfo !== null || mergeToDatastoreInfo !== null) {
      await updateModelData(activeTreePathToNodeContainingDatastore, mergeFromDatastoreInfo, mergeToDatastoreInfo, true, true, false);
    }
  };


  const updateModelDataOnCreate = async (
    treePathToNodeContainigDatastore: string,
    givenMergeFromDatastoreInfo: DatastoreInfo | null,
    givenMergeToDatastoreInfo: DatastoreInfo | null
  ) => {
    await updateModelData(treePathToNodeContainigDatastore, givenMergeFromDatastoreInfo, givenMergeToDatastoreInfo, false, false, true);
  }


  const applyAutomaticMergeStateResolver = (mergeStrategy: MergeResolverStrategy) => {
    const datastoreInfoForEditable = getEditableValue(editable, mergeFromDatastoreInfo, mergeToDatastoreInfo);
    if (datastoreInfoForEditable === null) {
      return;
    }

    const setCacheToTextContentForEditable = getEditableValue(editable, setConvertedCacheForMergeFromContent, setConvertedCacheForMergeToContent);
    const activeMergeContents = getEditableAndNonEditableValue(editable, activeMergeFromContentConverted, activeMergeToContentConverted);

    const mergeResolveResult = mergeStrategy.resolve(activeMergeContents.nonEditable, activeMergeContents.editable);
    updateCacheContentEntry(setCacheToTextContentForEditable, activeTreePathToNodeContainingDatastore, datastoreInfoForEditable.type, mergeResolveResult);
  };

  const closeWithSuccess = () => {
    const editedNewVersion = monacoEditor.current?.editor.getModifiedEditor()?.getValue();
    resolve({ newResourceContent: editedNewVersion });
  };

  // Not really clean, but can't think of anything better new. We want to update the cache and then use the values. we use useEffect depending on version number state to solve this issue.
  // Other solution could be to use ref next to the state tracking cache, or some other combinations, but I don't see them being too much better than this one
  const saveEverything = async () => {
    await saveChangesToCache();
    setCacheExplicitUpdateTracker(prev => prev + 1);
  };
  useEffect(() => {
    if (cacheExplicitUpdateTracker === 0) {
      // Skip initial load
      return;
    }

    const saveToBackend = async () => {
      await saveFileChanges();
      if (examinedMergeState !== null) {
        await saveMergeState(examinedMergeState, conflictsToBeResolvedOnSave);
      }
      closeWithSuccess();
    };
    saveToBackend();
  }, [cacheExplicitUpdateTracker]);


  const unresolveToBeResolvedConflict = (comparisonData: ComparisonData) => {
    setConflictsToBeResolvedOnSave(prev => {
      return prev.filter(iteratedComparison => iteratedComparison !== comparisonData);
    });
  };

  console.info({convertedCacheForMergeFromContent, convertedCacheForMergeToContent});

  const saveFileChanges = async () => {
    const { editable: editableCacheContents, nonEditable: nonEditableCacheContents } = getEditableAndNonEditableValue(editable, convertedCacheForMergeFromContent, convertedCacheForMergeToContent);
    const editableFilesystem = getEditableValue(editable, examinedMergeState?.filesystemTypeMergeFrom, examinedMergeState?.filesystemTypeMergeTo) ?? null;
    await saveCreatedFilesystemNodesToBackend(editableCacheContents, nonEditableCacheContents, editableFilesystem);

    const fetchedMergeState = await fetchMergeState(initialMergeFromResourceIri, initialMergeToResourceIri, true);
    if (!fetchedMergeState?.isUpToDate) {
      // TODO RadStr: ... What to do with this? ... Probably just throw error. However the issue is that we already updated the filesystem nodes. So we can not fully revert the action.
      // .... TODO RadStr: ... Actually just rewrite it - when we work in parallel in cme it is also the last one wins ... we would have to write the DS commits and I really was not feeling up to the task
      // ..... also the commits would be just single commits - basically any time user stores to backend we say that is commit and that's it. Basically it is just forced history. It would help us in some places - like here
      //  but yeah as I said the project already got way more complicated than it should have, so it is better to just ship this. I mean the implementation of DS commits is not that complicated after all, it is just once again ton of thinking and ton of code.

      alert("It was not up to date");
    }
    setExaminedMergeState(fetchedMergeState);
    const newIriMappingForNonEditableToEditableStorage = {};
    createIriMappings(fetchedMergeState?.diffTreeData?.diffTree!, editable, {}, {}, newIriMappingForNonEditableToEditableStorage, {});


    let filesystemNodeParentIri: string | null = null;

    for (const [nodeTreePath, datastoreInfoMap] of Object.entries(datastoreInfosForCacheEntries)) {
      if (removedTreePaths.includes(nodeTreePath)) {
        await ClientFilesystem.removeFilesystemNodeDirectly(nodeTreePath, import.meta.env.VITE_BACKEND, editableFilesystem);
        continue;
      }

      // Set the filesystemNodeParentIri
      const diffTreeNode = getDiffNodeFromDiffTree(fetchedMergeState!.diffTreeData!.diffTree, nodeTreePath);
      const filesystemNodeWithMetaMergeTo = diffTreeNode?.datastoreComparisons.find(datastoreComparison => datastoreComparison.affectedDataStore.type === "meta")?.new ?? null;
      if (filesystemNodeWithMetaMergeTo === null) {
        filesystemNodeParentIri = null;
      }
      else {
        const metaMergeTo = getDatastoreInfoOfGivenDatastoreType(filesystemNodeWithMetaMergeTo, "meta");
        console.info({datastoreInfoMap, datastoreInfosForCacheEntries, diffTreeNode, metaMergeTo, diffTree: fetchedMergeState!.diffTreeData!.diffTree});    // TODO RadStr DEBUG: Debug
        filesystemNodeParentIri = metaMergeTo === null ?
          null :
          getDatastoreInCacheAsObject(editableCacheContents, nonEditableCacheContents, nodeTreePath, metaMergeTo, removedDatastores).iri;
      }

      for (const [modelName, datastoreInfo] of Object.entries(datastoreInfoMap)) {
        const {
          editable: datastoreInfoForEditable,
          nonEditable: datastoreInfoForNonEditable
        } = getEditableAndNonEditableValue(editable, datastoreInfo.mergeFrom, datastoreInfo.mergeTo);

        if (modelName === "meta") {
          // Metas are already created by the filesystem nodes. Unless it has iri, which needs replacing, then we replace it (that is the if fails)
          if (datastoreInfoForNonEditable !== null &&
              createdDatastores.includes(datastoreInfoForNonEditable) &&
              createdDatastoresToIrisNeedingReplacementMap.current[datastoreInfoForNonEditable.fullPath] === undefined) {
            continue;
          }
        }

        // Handle Remove
        let removedDatastore: DatastoreInfo | undefined;
        if ((removedDatastore = removedDatastores.find(datastore => datastore.fullPath === datastoreInfoForEditable?.fullPath)) !== undefined) {
          alert("Handling remove");
          const diffTreeNode = getDiffNodeFromDiffTree(fetchedMergeState!.diffTreeData!.diffTree, nodeTreePath);
          if (diffTreeNode === null) {
            throw new Error(`The node (${nodeTreePath}) to remove does not exist inside diffTree`);
          }
          const relevantResource: FilesystemNode = getEditableValue(editable, diffTreeNode.resources.old, diffTreeNode.resources.new)!;
          const datastoreParentIri = relevantResource.metadata.iri;
          alert("Handling remove2");
          await ClientFilesystem.removeDatastoreDirectly(datastoreParentIri, removedDatastore, import.meta.env.VITE_BACKEND, editableFilesystem, false);
          continue;
        }

        const format = formatsForCacheEntries[nodeTreePath][modelName];
        const newValue = editableCacheContents?.[nodeTreePath]?.[modelName] ?? getDefaultValueForFormat(format);
        let newValueAsJSON = convertDatastoreContentForInputFormatToOutputFormat(newValue, format, "json", true);
        if (datastoreInfoForNonEditable !== null && createdDatastoresToIrisNeedingReplacementMap.current[datastoreInfoForNonEditable.fullPath] !== undefined) {
          // Repair the iris ... The relevant meta files to which we will replace iris should be already created.
          const { datastoreWithReplacedIris, missingIrisInNew } = createDatastoreWithReplacedIris(newValueAsJSON, newIriMappingForNonEditableToEditableStorage);
          if (missingIrisInNew.length > 0) {
            throw new Error("For some reason we still have not created meta files in the editable filesystem, which behave as replacement for pointed to from the old filesystem");
          }

          newValueAsJSON = datastoreWithReplacedIris;
        }
        if (datastoreInfoForEditable !== null) {
          // Just update, it does exist
          await ClientFilesystem.updateDatastoreContentDirectly(datastoreInfoForEditable, newValueAsJSON, editableFilesystem, import.meta.env.VITE_BACKEND);
        }
        else {
          // Create new one.
          await ClientFilesystem.createDatastoreDirectly(filesystemNodeParentIri, newValueAsJSON, editableFilesystem, datastoreInfoForNonEditable, import.meta.env.VITE_BACKEND);
          continue;
        }
        await reloadModelsDataFromBackend();
      }
    }


    setCreatedDatastores([]);
    setRemovedDatastores([]);
    setRemovedTreePaths([]);
    setCreatedFilesystemNodes({});
    createdDatastoresToIrisNeedingReplacementMap.current = {};

    // // Remove all listeners first
    // const mergeToEditor = monacoEditor.current?.editor.getMergeToEditor();
    // // mergeToEditor?.dispose();
  };

  const saveCreatedFilesystemNodesToBackend = async (
    editableCacheContents: CacheContentMap,
    nonEditableCacheContents: CacheContentMap,
    editableFilesystem: AvailableFilesystems | null,
  ): Promise<void> => {
    // TODO RadStr: Set Not used ... I have to think about it a bit - when exactly I need to (not) update the metas in the code after this
    const createdMetas: Set<string> = new Set();

    for (const [_, filesystemNodesBatchToCreate] of Object.entries(createdFilesystemNodes)) {
      const filesystemNodesBatchMetadata: ExportShareableMetadataType[] = [];

      for (const filesystemNodeToCreate of filesystemNodesBatchToCreate.createdFilesystemNodes) {
        createdMetas.add(filesystemNodeToCreate.projectIrisTreePath);
        console.info({editableCacheContents, "treePath": filesystemNodeToCreate.projectIrisTreePath, "userMetadataDatastoreInfo": filesystemNodeToCreate.userMetadataDatastoreInfo})
        const filesystemNodeMetadata = getDatastoreInCacheAsObject(editableCacheContents, nonEditableCacheContents, filesystemNodeToCreate.projectIrisTreePath, filesystemNodeToCreate.userMetadataDatastoreInfo, removedDatastores);
        filesystemNodesBatchMetadata.push(filesystemNodeMetadata);
      }

      if (filesystemNodesBatchToCreate.firstExistingParentIri === null) {
        toast.error("Fatal Merge error, check console");
        throw new Error("We can not (at least currently) have 2 roots. That is both packages have to have one common root.");
      }

      alert("Before CREATED IRIS");

      const createdIris = await ClientFilesystem.createFilesystemNodesDirectly(
        filesystemNodesBatchMetadata, filesystemNodesBatchToCreate.firstExistingParentIri,
        editableFilesystem, import.meta.env.VITE_BACKEND);

      alert("CREATED IRIS");
      console.info({createdIris});


      for (let i = 0; i < createdIris.length; i++) {
        const currentIri = createdIris[i];
        const otherDatastoreInfo = filesystemNodesBatchToCreate.createdFilesystemNodes[i].userMetadataDatastoreInfo;

        const type = otherDatastoreInfo.type;
        const format = "json";
        const afterPrefix = `.${type}.${format}`;
        const createdDatastoreInfo: DatastoreInfo = {
          fullName: `${currentIri}${afterPrefix}`,     // TODO RadStr: I would put the fullName away or rather put the creation into separate method
          afterPrefix,
          type,
          name: currentIri,
          format,
          fullPath: currentIri,
        };

        console.info("Before");
        console.info({datastoreInfosForCacheEntries, currentIri});
        const projectIrisTreePathForCreatedNode = filesystemNodesBatchToCreate.createdFilesystemNodes[i].projectIrisTreePath;
        console.info(datastoreInfosForCacheEntries[projectIrisTreePathForCreatedNode][type]);
        setEditableValue(editable, datastoreInfosForCacheEntries[projectIrisTreePathForCreatedNode][type], createdDatastoreInfo);
        console.info("After");
        console.info(datastoreInfosForCacheEntries[projectIrisTreePathForCreatedNode][type]);
      }
    }
  };

  const finalizeMergeStateHandler = async () => {
    const isSuccessfullyFinalized = await finalizeMergeState(examinedMergeState?.uuid);
    if (isSuccessfullyFinalized) {
      closeWithSuccess();
    }
  };

  return {
    monacoEditor,
    examinedMergeState, setExaminedMergeState,
    conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave,
    removedDatastores, setRemovedDatastores,
    createdDatastoresToIrisNeedingReplacementMap,
    createdDatastores, setCreatedDatastores, addToCreatedDatastoresAndAddToCache,
    createdFilesystemNodes, setCreatedFilesystemNodes,
    removedTreePaths, setRemovedTreePaths,
    activeTreePathToNodeContainingDatastore, setActiveTreePathToNodeContainingDatastore,
    formatsForCacheEntries, setFormatsForCacheEntries,
    datastoreInfosForCacheEntries, setDatastoreInfosForCacheEntries,
    convertedCacheForMergeFromContent, setConvertedCacheForMergeFromContent,
    convertedCacheForMergeToContent, setConvertedCacheForMergeToContent,
    mergeFromDatastoreInfo, setMergeFromDatastoreInfo,
    mergeToDatastoreInfo, setMergeToDatastoreInfo,
    mergeFromSvg, setMergeFromSvg,
    mergeToSvg, setMergeToSvg,
    comparisonTabType, setComparisonTabType,
    isLoadingTextData, setIsLoadingTextData,
    isLoadingTreeStructure, setIsLoadingTreeStructure,
    activeMergeFromContentConverted,
    activeMergeToContentConverted,
    activeDatastoreType,
    activeFormat,

    resetUseStates,
    reloadMergeState,
    updateModelData,
    updateModelDataOnCreate,
    saveChangesToCache,
    reloadModelsDataFromBackend,
    closeWithSuccess,
    applyAutomaticMergeStateResolver,
    saveEverything,
    unresolveToBeResolvedConflict,
    finalizeMergeStateHandler,
  };
}
