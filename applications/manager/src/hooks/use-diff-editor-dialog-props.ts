import { Dispatch, RefObject, SetStateAction, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as monaco from 'monaco-editor';
import {
  AvailableFilesystems,
  ClientFilesystem,
  DatastoreComparison,
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
  getDefaultValueForMissingDatastoreInDiffEditor,
  stringifyShareableMetadataInfoFromDatastoreContent,
  getDatastoreInfoOfGivenDatastoreType,
  FilesystemNode,
  convertDatastoreContentToOutputFormat,
  setEditableValue,
  ExportShareableMetadataType,
  getDiffNodeFromDiffTree,
  createDatastoreWithReplacedIris,
  DiffTree,
  ResourceDatastoreStripHandlerBase,
  getMergeFromAndMergeTo,
  DatastoreInfosCache,
} from "@dataspecer/git";
import { updateMergeState } from "@/utils/merge-state-backend-requests";
import { fetchMergeState } from "@/dialog/open-merge-state";
import { TextDiffEditorBetterModalProps, UpdateModelDataMethod } from "@/dialog/diff-editor-dialog";
import { MergeStateFinalizerDialog } from "@/dialog/merge-state-finalizer-dialogs";
import { useBetterModal } from "@/lib/better-modal";
import { requestLoadPackage } from "@/package";
import { ChooseActionForDiffEditorUnplannedChange, DiffEditorOutsideChangeChosenAction } from "@/dialog/outside-changes-to-diff-editor-action-dialog";
import { createCloseDialogObject, LoadingDialog } from "@/dialog/loading-dialog";
import { SAVING_DIFF_EDITOR_STATE_TO_BACKEND } from "@/utils/git-wait-times";


type FullTreePath = string;
type ModelName = string;

type CacheContentMap = Record<FullTreePath, Record<ModelName, string>>;

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

/**
 * @param useCopyAsMetaDefault If true then as default value for meta is returned new object, which contains the shared part of metadata, from the other cache
 */
function getDatastoreInCacheAsObject(
  primaryCacheToCheck: CacheContentMap,
  secondaryCacheToCheck: CacheContentMap,
  treePathToFilesystemNode: string,
  datastoreInfo: DatastoreInfo,
  removedDatastores: DatastoreInfo[],
  useCopyAsMetaDefault: boolean,
): any {
  const { value: contentAsString } = findValueInCache(
    datastoreInfo.fullPath, treePathToFilesystemNode, datastoreInfo.type, datastoreInfo.format,
    removedDatastores, [primaryCacheToCheck, secondaryCacheToCheck], useCopyAsMetaDefault);
  const convertedCacheValue = convertDatastoreContentBasedOnFormat(contentAsString, datastoreInfo.format, true, null);
  if (!convertedCacheValue.ok) {
    console.error("Should not happen, since we loaded the value from cache (or default value) and those should be valid.");
    throw new Error(convertedCacheValue.error);
  }
  return convertedCacheValue.value;
}

/**
 * Combination means that we combines the given {@link newValue} with the previous value and store it into cache.
 * That is the fields not present in the new value will be taken from the old one.
 * If the conversion fails, nothing happens.
 */
const convertDataAndUpdateCacheContentEntryAsCombination = (
  convertedCacheSetter: (value: SetStateAction<CacheContentMap>) => void,
  treePathToNodeContainingDatastore: string,
  datastoreType: string,
  newValue: string,
  format: string,
) => {
  console.info("RadStr Debug: Debug");      // TODO RadStr Debug: Debug
  console.info({newValue});                 // TODO RadStr Debug: Debug
  const convertedNewValue = convertDatastoreContentBasedOnFormat(newValue, format, true, null);
  if (!convertedNewValue.ok) {
    // We just return. This is the reason why we implemented this whole ConversionResult.
    return;
  }
  updateCacheContentEntryAsCombination(convertedCacheSetter, treePathToNodeContainingDatastore, datastoreType, convertedNewValue.value, format);
}

/**
 * Combines the given object {@link newValueAsJSON} with the previous value and stores it into cache
 */
const updateCacheContentEntryAsCombination = (
  cacheSetter: (value: SetStateAction<CacheContentMap>) => void,
  treePathToNodeContainingDatastore: string,
  datastoreType: string,
  newValueAsJSON: any,
  outputFormat: string,
) => {
  cacheSetter(prevState => {
    const previousValueAsString: string | undefined = prevState?.[treePathToNodeContainingDatastore]?.[datastoreType];
    if (newValueAsJSON === null) {
      return prevState;
    }

    let previousValueAsJSON: any;
    if(previousValueAsString === undefined) {
      previousValueAsJSON = {};
    }
    else {
      const previousValueConverted = convertDatastoreContentBasedOnFormat(previousValueAsString, outputFormat, true, null);
      if (!previousValueConverted.ok) {
        console.error("Taking the value from cache. Therefore, it should be valid. The previous value: " + previousValueAsString);
        throw new Error(previousValueConverted.error);
      }
      previousValueAsJSON = previousValueConverted.value;
    }
    const combinedValue = {
      ...previousValueAsJSON,
      ...newValueAsJSON,
    };
    const stringifiedConvertedCombinedValue = stringifyDatastoreContentBasedOnFormat(combinedValue, outputFormat, true);
    return createNewContentCache(prevState, treePathToNodeContainingDatastore, datastoreType, stringifiedConvertedCombinedValue);
  });
}

const updateCacheContentEntryByGivenString = (
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
  diffEditorRef: RefObject<{editor: monaco.editor.IStandaloneDiffEditor} | null>,
  editable: EditableType,
): { mergeFromEditor: monaco.editor.IStandaloneCodeEditor | null, mergeToEditor: monaco.editor.IStandaloneCodeEditor | null } {
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
 * @param useCopyAsMetaDefault If true then as default value for meta is returned new object, which contains the shared part of metadata, from the other cache
 */
function findValueInCache(
  fullDatastorePath: string | null,
  nodeTreePath: string,
  datastoreType: string | null,
  activeFormat: string | null,
  removedDatastores: DatastoreInfo[],
  cachesToCheck: CacheContentMap[],
  useCopyAsMetaDefault: boolean,
): { value: string, isDefault: boolean } {
  const isRemoved = removedDatastores.find(removedDatastore => removedDatastore.fullPath === fullDatastorePath) !== undefined;
  if (isRemoved) {
    return {
      value: getDefaultValueForMissingDatastoreInDiffEditor(),
      isDefault: true,
    };
  }

  if (datastoreType === null) {
    return {
      value: getDefaultValueForMissingDatastoreInDiffEditor(),
      isDefault: true,
    };
  }
  const cacheWithValue = cachesToCheck.find(cacheToCheck => cacheToCheck[nodeTreePath]?.[datastoreType] !== undefined);
  if (cacheWithValue === undefined) {
    return {
      value: getDefaultValueForMissingDatastoreInDiffEditor(),
      isDefault: true,
    };
  }

  const cacheContent = cacheWithValue[nodeTreePath][datastoreType];
  if (cacheWithValue === cachesToCheck[0]) {
    // If it is the primary or not meta, just return it
    return {
      value: cacheWithValue[nodeTreePath][datastoreType],
      isDefault: false,
    };
  }
  else {
    if (datastoreType === "meta") {
      // If meta and not primary then pick the relevant stuff
      return {
        value: useCopyAsMetaDefault ?
          stringifyShareableMetadataInfoFromDatastoreContent(cacheContent, activeFormat, null) :
          getDefaultValueForMissingDatastoreInDiffEditor(),
        isDefault: true,
      };
    }
    else {
      return {
        value: getDefaultValueForMissingDatastoreInDiffEditor(),
        isDefault: true,
      };
    }
  }
}


export type EntriesAffectedByCreateType = {
  firstExistingParentIri: string | null;
  createdFilesystemNodes: CreateDatastoreFilesystemNodesInfo[];
}

type TextDiffEditorHookProps = Omit<TextDiffEditorBetterModalProps, "isOpen">;
type MergeFromMergeToStrings = { mergeFrom: string | null, mergeTo: string | null };

/**
 * Only the mappings of metas (respectively filesystem nodes). We do not need other datastores iris.
 */
type IriMappings = {
  iriToProjectIriMap: Record<string, string>;
  projectIriToIriMap: Record<string, MergeFromMergeToStrings>;
  iriMappingFromNonEditableToEditable: Record<string, string | null>;
  projectIriToDiffNodeMap: Record<string, ResourceComparison>;
};

function createIriMappings(
  diffTree: DiffTree,
  editable: EditableType,

  iriToProjectIriMap: Record<string, string>,
  projectIriToIriMap: Record<string, MergeFromMergeToStrings>,
  iriMappingFromNonEditableToEditable: Record<string, string | null>,
  projectIriToDiffNodeMap: Record<string, ResourceComparison>,
) {
  for (const diffNode of Object.values(diffTree ?? {})) {
    const { old: oldResource, new: newResource } = diffNode.resources;
    const { mergeFrom: mergeFromResource, mergeTo: mergeToResource } = getMergeFromAndMergeTo(editable, oldResource, newResource);

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
      iriMappingFromNonEditableToEditable[key] = value;
    }

    createIriMappings(diffNode.childrenDiffTree, editable, iriToProjectIriMap, projectIriToIriMap, iriMappingFromNonEditableToEditable, projectIriToDiffNodeMap);
  }
}



async function onCascadeUpdateForCreatedDatastores(
  nodeTreePath: string,
  examinedMergeState: MergeState | null,
  editable: EditableType,
  datastoreCausingTheUpdate: DatastoreInfo | null,
  updateModelDataOnCreate: (projectIriTreePathToNodeContainingDatastore: string, givenMergeFromDatastoreInfo: DatastoreInfo | null, givenMergeToDatastoreInfo: DatastoreInfo | null) => Promise<void>,
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
      const existingResource = currentDiffNode?.resources.old;
      const metadataInfo = getDatastoreInfoOfGivenDatastoreType(existingResource!, "meta")!;

      // TODO RadStr DEBUG: Debug prints
      console.info({ lastTreePathSeparatorIndex: treePathSeparatorIndex, len: currentNodeTreePath.length, currentIri, currentNodeTreePath, nodeTreePath, currentNode: currentDiffNode, difftree: examinedMergeState?.diffTreeData?.diffTree }); // TODO RadStr DEBUG: Debug print
      console.info({ metadataAsJSON: metadataInfo, PATH_FOR_METADATA: existingResource!.irisTreePath! }); // TODO RadStr DEBUG: Debug print

      const isFilesystemNodeNotYetAdded = createdFilesystemNodesAsArray.find(alreadyCreated => alreadyCreated.projectIrisTreePath === existingResource!.irisTreePath) === undefined;
      if (isFilesystemNodeNotYetAdded) {
        visitedFirstNodeToCreate = true;
        if (parentNode === null) {
          toast.error("Fatal Merge error, check console", { "richColors": true });
          throw new Error("We can not (at least currently) have 2 roots. That is both packages have to have one common root.");
        }

        const { mergeFrom: mergeFromFilesystemNode, mergeTo: mergeToFilesystemNode } =  getMergeFromAndMergeTo(editable, currentDiffNode?.resources.old, currentDiffNode?.resources.new);
        const mergeFromMetadataInfo = (mergeFromFilesystemNode === undefined || mergeFromFilesystemNode === null) ? null : getDatastoreInfoOfGivenDatastoreType(mergeFromFilesystemNode, "meta");
        const mergeToMetadataInfo = (mergeToFilesystemNode === undefined || mergeToFilesystemNode === null) ? null : getDatastoreInfoOfGivenDatastoreType(mergeToFilesystemNode, "meta");
        console.info({mergeFromMetadataInfo, mergeToMetadataInfo});     // TODO RadStr DEBUG: Debug print
        await updateModelDataOnCreate(existingResource!.projectIrisTreePath, mergeFromMetadataInfo, mergeToMetadataInfo);
        setCreatedDatastores(prev => [...prev, metadataInfo]);

        const newFilesystemNodeToCreate: CreateDatastoreFilesystemNodesInfo = {
          parentProjectIri: parentNode.metadata.projectIri,
          projectIrisTreePath: existingResource!.projectIrisTreePath,
          userMetadataDatastoreInfo: metadataInfo,
        };
        createdFilesystemNodesInTreePath.push(newFilesystemNodeToCreate);
        createdFilesystemNodesAsArray.push(newFilesystemNodeToCreate);
        parentNode = existingResource;
      }
    }
    else {
      if (currentDiffNode.resourceComparisonResult === "exists-in-both") {
        const existingResource = currentDiffNode?.resources.old;
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
      firstExistingParentIri = currentDiffNode?.resources.new?.metadata.iri!;
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

export type AddToRemovedDatastoresAndAddToCacheMethodType = (
  projectIrisTreePathForDatastoreParent: string,
  datastoreInfoToRemove: DatastoreInfo,
  metadataDatastoreInfoToRemove: DatastoreInfo | null,
  shouldAddToRemovedDatastores: boolean,
) => Promise<void>;

export type AddToCreatedDatastoresAndAddToCacheMethodType = (
  projectIrisTreePathForDatastoreParent: string,
  datastoreInfoToCreate: DatastoreInfo,
  metadataDatastoreInfoToCreate: DatastoreInfo | null,
) => Promise<void>;

/**
 * Picks the correct format to show the data in.
 */
function pickFormat(
  mergeFromFilesystem: AvailableFilesystems | undefined,
  mergeFromDatastoreInfo: DatastoreInfo | null,
  mergeToDatastoreInfo: DatastoreInfo | null
) {
  const format = (
    mergeFromFilesystem === AvailableFilesystems.ClassicFilesystem ?
      (mergeFromDatastoreInfo?.format ?? mergeToDatastoreInfo?.format) :
      (mergeToDatastoreInfo?.format ?? mergeFromDatastoreInfo?.format)
    ) ?? "text";
  return format;
}

// Note that the hook is not useful for anything else than the diff editor dialog, but since it is quite large I put it into separate file
export const useDiffEditorDialogProps = ({editable, initialMergeFromRootMetaPath, initialMergeToRootMetaPath, resolve}: TextDiffEditorHookProps) => {
  const monacoEditor = useRef<{editor: monaco.editor.IStandaloneDiffEditor}>(null);
  const openModal = useBetterModal();


  // Set once in the useEffect
  const [examinedMergeState, setExaminedMergeState] = useState<MergeState | null>(null);
  const [conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave] = useState<DatastoreComparison[]>([]);
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
  const [convertedCacheContentForMergeFrom, setConvertedCacheContentForMergeFrom] = useState<CacheContentMap>({});
  const [convertedCacheContentForMergeTo, setConvertedCacheContentForMergeTo] = useState<CacheContentMap>({});
  const [mergeFromDatastoreInfo, setMergeFromDatastoreInfo] = useState<DatastoreInfo | null>(null);
  const [mergeToDatastoreInfo, setMergeToDatastoreInfo] = useState<DatastoreInfo | null>(null);
  const [mergeFromSvg, setMergeFromSvg] = useState<any | "">("");
  const [mergeToSvg, setMergeToSvg] = useState<any | "">("");

  const [comparisonTabType, setComparisonTabType] = useState<"image-compare" | "text-compare">("text-compare");
  // Internal state used to track that cache was explictly updated
  const [cacheExplicitUpdateTracker, setCacheExplicitUpdateTracker] = useState<number>(0);
  // Similarly - if true then we also perform the finalization when the updateTracker is bumped up
  const [shouldFinalize, setShouldFinalize] = useState<boolean>(false);

  // When loading the specific file (or rather model) data from backend
  const [isLoadingTextData, setIsLoadingTextData] = useState<boolean>(true);
  // When loading the directory structure from backend
  // Note that the value itself is not set neither here it is passed to the child class
  const [isLoadingTreeStructure, setIsLoadingTreeStructure] = useState<boolean>(true);

  const {
    iriToProjectIriMap,
    projectIriToIriMap: _projectIriToIriMap,
    iriMappingFromNonEditableToEditable, projectIriToDiffNodeMap
  } = useMemo<IriMappings>(() => {
    const iriToProjectIriMapStorage: Record<string, string> = {};
    const projectIriToIriMapStorage: Record<string, MergeFromMergeToStrings> = {};
    const iriMappingFromNonEditableToEditableStorage: Record<string, string | null> = {};
    const projectIriToDiffNodeMapStorage: Record<string, ResourceComparison> = {};

    createIriMappings(
      examinedMergeState?.diffTreeData?.diffTree!, editable,
      iriToProjectIriMapStorage, projectIriToIriMapStorage, iriMappingFromNonEditableToEditableStorage, projectIriToDiffNodeMapStorage);

    return {
      iriToProjectIriMap: iriToProjectIriMapStorage,
      projectIriToIriMap: projectIriToIriMapStorage,
      iriMappingFromNonEditableToEditable: iriMappingFromNonEditableToEditableStorage,
      projectIriToDiffNodeMap: projectIriToDiffNodeMapStorage,
    };
  }, [examinedMergeState]);

  const activeConflicts = useMemo(() => {
    const activeConflictsInternal = examinedMergeState?.conflicts
      ?.filter(conflict => conflictsToBeResolvedOnSave
        .find(otherConflict => conflict.affectedDataStore.fullPath === otherConflict.affectedDataStore.fullPath) === undefined
      );
    return activeConflictsInternal;
  }, [examinedMergeState, conflictsToBeResolvedOnSave]);


  const activeDatastoreType = mergeToDatastoreInfo?.type ?? mergeFromDatastoreInfo?.type ?? null;
  const activeFormat = activeDatastoreType === null ? "" : formatsForCacheEntries[activeTreePathToNodeContainingDatastore]?.[activeDatastoreType] ?? "";
  // We pass in false, because we want to show "null" or whatever the value will be for missing datastore
  const { value: activeMergeFromContentConverted } = findValueInCache(
    mergeFromDatastoreInfo?.fullPath ?? null, activeTreePathToNodeContainingDatastore, activeDatastoreType, activeFormat,
    removedDatastores, [convertedCacheContentForMergeFrom, convertedCacheContentForMergeTo], false);
  const { value: activeMergeToContentConverted } = findValueInCache(
    mergeToDatastoreInfo?.fullPath ?? null, activeTreePathToNodeContainingDatastore, activeDatastoreType, activeFormat,
    removedDatastores, [convertedCacheContentForMergeTo, convertedCacheContentForMergeFrom], false);

  const [showStrippedVersion, setShowStrippedVersion] = useState<boolean>(true);

  const { strippedMergeFromContent, strippedMergeToContent } = useMemo(() => {
    let strippedMergeFromContent: string;
    let strippedMergeToContent: string;
    const activeMetaFormat = formatsForCacheEntries[activeTreePathToNodeContainingDatastore]?.["meta"] ?? null;
    console.info({activeTreePathToNodeContainingDatastore, activeFormat, activeMetaFormat, formatsForCacheEntries});      // TODO RadStr Debug: Debug print
    if (showStrippedVersion && activeMetaFormat !== null && activeDatastoreType !== null) {
      const datastoresForMeta = datastoreInfosForCacheEntries[activeTreePathToNodeContainingDatastore]["meta"];
      const activeMeta = findValueInCache(
        datastoresForMeta.mergeTo?.fullPath ?? datastoresForMeta.mergeFrom?.fullPath ?? null,
        activeTreePathToNodeContainingDatastore,
        "meta",
        activeMetaFormat,
        removedDatastores,
        [convertedCacheContentForMergeTo, convertedCacheContentForMergeFrom],
        true
      );

      if (activeMeta.isDefault) {
        strippedMergeFromContent = activeMergeFromContentConverted;
        strippedMergeToContent = activeMergeToContentConverted;

        // TODO RadStr Critical:  ... this is copy paste ... it is here 4 times, therefore refactor.
        if (strippedMergeFromContent !== "null") {
          const strippedMergeFromContentAsObject = convertDatastoreContentBasedOnFormat(strippedMergeFromContent, activeFormat, true, null);
          if (!strippedMergeFromContentAsObject.ok) {
            throw new Error(strippedMergeFromContentAsObject.error);
          }
          // TODO RadStr Critical: What about the missing iris
          const {
            datastoreWithReplacedIris: strippedMergeFromContentAsObjectWithReplacements,
            missingIrisInNew: _missingIrisInMergeFrom
          } = createDatastoreWithReplacedIris(strippedMergeFromContentAsObject.value, iriToProjectIriMap);
          strippedMergeFromContent = stringifyDatastoreContentBasedOnFormat(strippedMergeFromContentAsObjectWithReplacements, activeFormat, true);
        }

        if (strippedMergeToContent !== "null") {
          const strippedMergeToContentAsObject = convertDatastoreContentBasedOnFormat(strippedMergeToContent, activeFormat, true, null);
          if (!strippedMergeToContentAsObject.ok) {
            throw new Error(strippedMergeToContentAsObject.error);
          }
          const {
            datastoreWithReplacedIris: strippedMergeToContentAsObjectWithReplacements,
            missingIrisInNew: _missingIrisInMergeTo
          } = createDatastoreWithReplacedIris(strippedMergeToContentAsObject.value, iriToProjectIriMap);
          strippedMergeToContent = stringifyDatastoreContentBasedOnFormat(strippedMergeToContentAsObjectWithReplacements, activeFormat, true);
        }


        return {
          strippedMergeFromContent,
          strippedMergeToContent,
        };
      }
      const activeMetaAsObject = convertDatastoreContentBasedOnFormat(activeMeta.value, activeMetaFormat, true, null);
      if (!activeMetaAsObject.ok) {
        // Probably just throw error, it should not happen. - TODO RadStr PR: If I am wrong then ideally we would show it as 'text' in the editor instead of 'json'/'yaml'
        throw new Error(activeMetaAsObject.error);
      }

      const activeResourceType = activeMetaAsObject.value.types[0];
      const resourceStripHandler = new ResourceDatastoreStripHandlerBase(activeResourceType);
      const resourceStripHandlerMethod = resourceStripHandler.createHandlerMethodForDatastoreType(activeDatastoreType);

      const activeDatastoreInfo = datastoreInfosForCacheEntries[activeTreePathToNodeContainingDatastore][activeDatastoreType];
      if (activeDatastoreInfo.mergeFrom !== null && activeMergeFromContentConverted != null) {
        const strippedResult = convertDatastoreContentToOutputFormat(activeMergeFromContentConverted, activeFormat, activeFormat, true, resourceStripHandlerMethod);
        if (!strippedResult.ok) {
          // TODO RadStr Critical: Do not know now, but probably the correct solution is to just keep the old value.
          strippedMergeFromContent = activeMergeFromContentConverted
        }
        else {
          strippedMergeFromContent = strippedResult.value;
        }
      }
      else {
        strippedMergeFromContent = activeMergeFromContentConverted;
      }

      if (activeDatastoreInfo.mergeTo !== null && activeMergeToContentConverted != null) {
        const strippedResult = convertDatastoreContentToOutputFormat(activeMergeToContentConverted, activeFormat, activeFormat, true, resourceStripHandlerMethod);
        if (!strippedResult.ok) {
          // TODO RadStr Critical: Do not know now, but probably the correct solution is to just keep the old value.
          strippedMergeToContent = activeMergeToContentConverted
        }
        else {
          strippedMergeToContent = strippedResult.value;
        }
      }
      else {
        strippedMergeToContent = activeMergeToContentConverted;
      }

      // TODO RadStr Debug: Debug print
      console.info({strippedMergeFromContent, strippedMergeToContent, activeMergeFromContentConverted, activeMergeToContentConverted, activeResourceType, activeMetaFormat});
    }
    else {
      strippedMergeFromContent = activeMergeFromContentConverted;
      strippedMergeToContent = activeMergeToContentConverted;
    }


    // TODO RadStr Critical: Looking at it from "code review", it might be unnecessary conversion, since we perform similar on before
    if (strippedMergeFromContent !== "null") {
      const strippedMergeFromContentAsObject = convertDatastoreContentBasedOnFormat(strippedMergeFromContent, activeFormat, true, null);
      if (!strippedMergeFromContentAsObject.ok) {
        return { strippedMergeFromContent, strippedMergeToContent };
        // throw new Error(strippedMergeFromContentAsObject.error);
      }
      const {
        datastoreWithReplacedIris: strippedMergeFromContentAsObjectWithReplacements,
        missingIrisInNew: _missingIrisInMergeFrom
      } = createDatastoreWithReplacedIris(strippedMergeFromContentAsObject.value, iriToProjectIriMap);
      strippedMergeFromContent = stringifyDatastoreContentBasedOnFormat(strippedMergeFromContentAsObjectWithReplacements, activeFormat, true);
    }

    if (strippedMergeToContent !== "null") {
      const strippedMergeToContentAsObject = convertDatastoreContentBasedOnFormat(strippedMergeToContent, activeFormat, true, null);
      if (!strippedMergeToContentAsObject.ok) {
        return { strippedMergeFromContent, strippedMergeToContent };
        // throw new Error(strippedMergeToContentAsObject.error);
      }
      const {
        datastoreWithReplacedIris: strippedMergeToContentAsObjectWithReplacements,
        missingIrisInNew: _missingIrisInMergeTo
      } = createDatastoreWithReplacedIris(strippedMergeToContentAsObject.value, iriToProjectIriMap);
      strippedMergeToContent = stringifyDatastoreContentBasedOnFormat(strippedMergeToContentAsObjectWithReplacements, activeFormat, true);
    }

    return { strippedMergeFromContent, strippedMergeToContent };
  }, [activeMergeFromContentConverted, activeMergeToContentConverted, showStrippedVersion]);


  // TODO RadStr Debug: Debug print
  // console.info({strippedMergeFromContent, strippedMergeToContent, activeMergeFromContentConverted, activeMergeToContentConverted});


  const resetUseStates = (shouldResetExaminedMergeState: boolean) => {
    if (shouldResetExaminedMergeState) {
      setIsLoadingTextData(true);
      setExaminedMergeState(null);
    }
    setConflictsToBeResolvedOnSave([]);
    setCreatedDatastores([]);
    setCreatedFilesystemNodes({});
    createdDatastoresInPreviousIteration.current = [];
    createdDatastoresToIrisNeedingReplacementMap.current = {};
    setRemovedDatastores([]);
    setActiveTreePathToNodeContainingDatastore("");
    setFormatsForCacheEntries({});
    setDatastoreInfosForCacheEntries({});
    setConvertedCacheContentForMergeFrom({});
    setConvertedCacheContentForMergeTo({});
    setMergeFromDatastoreInfo(null);
    setMergeToDatastoreInfo(null);
    setMergeFromSvg("");
    setMergeToSvg("");
    setComparisonTabType("text-compare");
    setIsLoadingTreeStructure(true);
    setCacheExplicitUpdateTracker(0);
  };

  const reloadMergeState = async (shouldForceDiffTreeReload: boolean, shouldShowLoading: boolean) => {
    if (shouldShowLoading) {
      setIsLoadingTextData(true);
    }

    const fetchedMergeState = await fetchMergeState(initialMergeFromRootMetaPath, initialMergeToRootMetaPath, true, true, shouldForceDiffTreeReload);
    resetUseStates(true);
    setExaminedMergeState(fetchedMergeState);
  };

  useEffect(() => {
    reloadMergeState(false, true);
  }, []);


  useEffect(() => {
    if (comparisonTabType !== "image-compare") {
      return;
    }

    const setSvgHelperMethod = (setSvg: (value: any) => void, dataFormat: string, convertedContent: string) => {
      const svgContent = convertDatastoreContentBasedOnFormat(convertedContent, dataFormat, true, null);
      if (!svgContent.ok) {
        // Don't know what should be done, but probably should be error. It means that it was wrongly modified before accessing the diff editor
        throw new Error(svgContent.error);
        // setSvg("");
      }
      else {
        setSvg(svgContent.value?.svg ?? "");
      }
    };

    if (mergeFromDatastoreInfo?.type === "svg") {
      setSvgHelperMethod(setMergeFromSvg, activeFormat, activeMergeFromContentConverted);
    }
    else {
      setMergeFromSvg("");
    }
    if (mergeToDatastoreInfo?.type === "svg") {
      setSvgHelperMethod(setMergeToSvg, activeFormat, activeMergeToContentConverted);
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

          // Skip if it is not newly created
          if (newlyCreatedDatastores.find(createdDatastore => createdDatastore.fullPath === datastoreCausingTheUpdate?.fullPath) === undefined) {
            continue;
          }
          await onCascadeUpdateForCreatedDatastores(
            nodeTreePath, examinedMergeState, editable, datastoreCausingTheUpdate,
            updateModelDataOnCreate, setCreatedDatastores, setCreatedFilesystemNodes, createdFilesystemNodesAsArray);
          console.info({convertedCacheContentForMergeFrom, convertedCacheContentForMergeTo});
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
    projectIrisTreePathForDatastoreParent: string,
    datastoreInfoToCreate: DatastoreInfo,
    metadataDatastoreInfoToCreate: DatastoreInfo | null,
  ) => {
    // Create meta first
    if (metadataDatastoreInfoToCreate !== null && datastoreInfoToCreate.type != "meta") {
      await updateModelDataOnCreate(projectIrisTreePathForDatastoreParent, metadataDatastoreInfoToCreate, null);
    }
    await updateModelDataOnCreate(projectIrisTreePathForDatastoreParent, datastoreInfoToCreate, null);
    setCreatedDatastores(prev => {
      const newDatastores = [...prev, datastoreInfoToCreate];
      if (metadataDatastoreInfoToCreate !== null &&
        newDatastores.find(datastore => datastore.fullPath === metadataDatastoreInfoToCreate.fullPath) === undefined &&
        (datastoreInfosForCacheEntries[metadataDatastoreInfoToCreate.fullPath]?.mergeTo ?? null) === null) {
        // TODO RadStr Critical: The mergeTo is not right I think - I will have to fix this everywhere where it occurs. Use only the editable/non-editable
        // If It is not null and not present in the datastores to be and also it was not yet created.
        newDatastores.push(metadataDatastoreInfoToCreate);
      }
      return newDatastores;
    });
  };

  /**
   * Just adds the {@link datastoreInfoToRemove} into the removedDatastores. And loads the datastore and its meta (if it exists) into cache.
   */
  const addToRemovedDatastoresAndAddToCache = async (
    projectIrisTreePathForDatastoreParent: string,
    datastoreInfoToRemove: DatastoreInfo,
    metadataDatastoreInfoToRemove: DatastoreInfo | null,
    shouldAddToRemovedDatastores: boolean,
  ) => {
    // Create meta first
    if (metadataDatastoreInfoToRemove !== null && datastoreInfoToRemove.type != "meta") {
      await updateModelDataInternal(projectIrisTreePathForDatastoreParent, null, metadataDatastoreInfoToRemove, false, false, true);
    }
    await updateModelDataInternal(projectIrisTreePathForDatastoreParent, null, datastoreInfoToRemove, false, false, true);
    if (shouldAddToRemovedDatastores) {
      setRemovedDatastores(prev => {
        const newDatastores = [...prev, datastoreInfoToRemove];
        return newDatastores;
      });
    }
  };


  /**
   * @todo TODO Radstr: I would rename the model in the name of method (note that there are more than 2 methods containing the word model) - probably omit it, or use some different word (note that if I do it I have to also fix it in the thesis text )
   * Calls the {@link updateModelDataInternal} for the meta and for the datastore. In this order!, check the {@link updateModelDataInternal} method for more info if necessary.
   */
  const updateModelData: UpdateModelDataMethod = async (
    treePathToNodeContainingDatastore: string,
    newMergeFromDatastoreInfo: DatastoreInfo | null,
    newMergeToDatastoreInfo: DatastoreInfo | null,
    mergeFromRelevantMetaDatastoreInfo: DatastoreInfo | null,
    mergeToRelevantMetaDatastoreInfo: DatastoreInfo | null,
    useCache: boolean,
    shouldChangeActiveModel: boolean,
    shouldCopyIfMissing: boolean,
  ): Promise<void> => {
    if (newMergeFromDatastoreInfo?.fullPath !== mergeFromRelevantMetaDatastoreInfo?.fullPath && newMergeToDatastoreInfo?.fullPath !== mergeToRelevantMetaDatastoreInfo?.fullPath) {
      // If both the values are not meta
      await updateModelDataInternal (
        treePathToNodeContainingDatastore,
        mergeFromRelevantMetaDatastoreInfo, mergeToRelevantMetaDatastoreInfo,
        true, false, false);      // TODO RadStr Critical: Maybe shouldCopyIfMissing should be true here?
    }
    await updateModelDataInternal (
      treePathToNodeContainingDatastore,
      newMergeFromDatastoreInfo, newMergeToDatastoreInfo,
      useCache, shouldChangeActiveModel, shouldCopyIfMissing);
  }

  /**
   * Internal method because, it is expected to always put the meta datastore into cache first, that is the {@link updateModelData} should be called
   * Updates models related data. If {@link shouldChangeActiveModel} is true Changes current active model, that is modifies states to reflect that.
   *  If {@link useCache} is set to true then tries to use cache (if the datastore is present it uses the cache, otherwise updates the cache by fetching from backend),
   *   if set to false, then always fetches from backend and updates cache
   * @param shouldChangeActiveModel - if true then we use the given datastore infos to set active model. If false then this method behaves as a possible updater of cache ({@link useCache} should be also false then.)
   * @param shouldCopyIfMissing if false then if the editable is missing we don't set it and it will be the default value, otherwise the copy of the other variant will be used as the cache content for the editable.
   */
  const updateModelDataInternal = async (
    projectIriTreePathToNodeContainingDatastore: string,
    newMergeFromDatastoreInfo: DatastoreInfo | null,
    newMergeToDatastoreInfo: DatastoreInfo | null,
    useCache: boolean,
    shouldChangeActiveModel: boolean,
    shouldCopyIfMissing: boolean,
  ) => {
    const activeTreePathBeforeUpdate = activeTreePathToNodeContainingDatastore;

    if (newMergeFromDatastoreInfo === null && newMergeToDatastoreInfo === null) {
      if (!shouldChangeActiveModel) {
        return;
      }
      // TOOD RadStr: Not sure about this special case, but I think this should be the correct way to handle it
      setMergeFromDatastoreInfo(null);
      setMergeToDatastoreInfo(null);
      setActiveTreePathToNodeContainingDatastore(projectIriTreePathToNodeContainingDatastore);
      return;
    }

    if (shouldChangeActiveModel) {
      setIsLoadingTextData(true);
    }
    // Note that it must be always string because of the if guard for both nulls at the start of method
    const newDatastoreType = (newMergeFromDatastoreInfo?.type ?? newMergeToDatastoreInfo?.type) as string;
    const oldDatastoreType: string | null = activeDatastoreType;
    const oldDatastoreFormat: string | null = activeFormat;     // TODO RadStr: Honestly I think that the code is fine, the main issue are the names
                                                                //              - it is not clear why I use old for active - like active and old does not come together name-wise

    // Pick the format in the classic filesystem. If the datastore does not exist (it was deleted datastore), then pick format from the other one. If none present pick text

    const newFormat = pickFormat(examinedMergeState?.filesystemTypeMergeFrom, newMergeFromDatastoreInfo, newMergeToDatastoreInfo);
    setFormatsForCacheEntries((prev) => ({
      ...prev,
      [projectIriTreePathToNodeContainingDatastore]: {
        ...prev[projectIriTreePathToNodeContainingDatastore],
        [newDatastoreType]: newFormat,
      }
    }));

    setDatastoreInfosForCacheEntries(prev => ({
      ...prev,
      [projectIriTreePathToNodeContainingDatastore]: {
        ...prev[projectIriTreePathToNodeContainingDatastore],
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


    if (oldDatastoreType !== null && shouldChangeActiveModel) {
      // Put the values currently present in the editor into cache (that is those editor values, before we switched). Note that we always put them there, even if the datastore does not exist
      //  (meaning it was removed), that is because we want to store the changes. We are doing that only locally and only send them if the user actually adds them explicitly

      // The editors should be always defined, however if for some unknown reason they are undefined we just skip the setting of the caches
      const editors = getEditorsInOriginalOrder(monacoEditor, editable);
      let currentMergeFromContentInEditor = editors.mergeFromEditor?.getValue();
      if (currentMergeFromContentInEditor !== undefined) {
        if (currentMergeFromContentInEditor === "") {
          currentMergeFromContentInEditor = getDefaultValueForMissingDatastoreInDiffEditor();
        }
        convertDataAndUpdateCacheContentEntryAsCombination(
          setConvertedCacheContentForMergeFrom,
          activeTreePathBeforeUpdate, oldDatastoreType,
          currentMergeFromContentInEditor, oldDatastoreFormat);
      }

      let currentMergeToContentInEditor = editors.mergeToEditor?.getValue();
      if (currentMergeToContentInEditor !== undefined) {
        if (currentMergeToContentInEditor === "") {
          currentMergeToContentInEditor = getDefaultValueForMissingDatastoreInDiffEditor();
        }
        convertDataAndUpdateCacheContentEntryAsCombination(
          setConvertedCacheContentForMergeTo,
          activeTreePathBeforeUpdate, oldDatastoreType,
          currentMergeToContentInEditor, oldDatastoreFormat);
      }
    }

    const isMergeFromDataResourceInCache = isDatastorePresentInCache(convertedCacheContentForMergeFrom, projectIriTreePathToNodeContainingDatastore, newDatastoreType);
    const isMergeToDataResourceInCache = isDatastorePresentInCache(convertedCacheContentForMergeTo, projectIriTreePathToNodeContainingDatastore, newDatastoreType);
    if (!(useCache && (isMergeFromDataResourceInCache || isMergeToDataResourceInCache))) {
      // Update cache values

      // TODO RadStr Debug: Debug print and alert
      console.info({ newMergeFromDatastoreInfo, newMergeToDatastoreInfo, examinedMergeState });
      // alert("Getting values:")
      const newMergeFromDataAsText = await ClientFilesystem.getDatastoreContentDirectly(newMergeFromDatastoreInfo, false, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeFrom ?? null);
      const newMergeToDataAsText = await ClientFilesystem.getDatastoreContentDirectly(newMergeToDatastoreInfo, false, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeTo ?? null);


      // TODO RadStr Debug: Debug print
      console.info({newMergeFromDataResourceNameInfo: newMergeFromDatastoreInfo, newMergeToDataResourceNameInfo: newMergeToDatastoreInfo});
      console.info({newMergeFromDataAsText, newMergeToDataAsText});


      await updateBothCacheEntries(
        newMergeFromDatastoreInfo, newMergeFromDataAsText, newMergeToDatastoreInfo, newMergeToDataAsText,
        projectIriTreePathToNodeContainingDatastore, newFormat, newDatastoreType, shouldCopyIfMissing);
    }

    if (shouldChangeActiveModel) {
      setActiveTreePathToNodeContainingDatastore(projectIriTreePathToNodeContainingDatastore);
      setMergeFromDatastoreInfo(newMergeFromDatastoreInfo);
      setMergeToDatastoreInfo(newMergeToDatastoreInfo);
    }

    if (shouldChangeActiveModel) {
      setIsLoadingTextData(false);
    }
  }

  /**
   * TODO RadStr Critical:  not really crtiical but this method gets all parameters on input. Only the called methods may need the react values
   */
  const updateBothCacheEntries = async (
    newMergeFromDatastoreInfo: DatastoreInfo | null,
    newMergeFromDataAsText: any,
    newMergeToDatastoreInfo: DatastoreInfo | null,
    newMergeToDataAsText: any,

    projectIriTreePathToNodeContainingDatastore: string,
    newFormat: string,
    newDatastoreType: string,
    shouldCopyIfMissing: boolean,
  ) => {
    // The order matters since we create copies -
    //  we have to first set the non-empty one. So we can create copy (actually since we allow only editing of one, the order is kind of given)
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
        cacheContentSetter = setConvertedCacheContentForMergeFrom;
      }
      else {
        currentDatastoreInfo = newMergeToDatastoreInfo;
        otherDatastoreInfo = index === 0 ? null : newMergeFromDatastoreInfo;
        dataAsText = newMergeToDataAsText;
        cacheContentSetter = setConvertedCacheContentForMergeTo;
      }
      otherDatastoreEntry = await updateCacheEntryBasedOnFetchedData(
        dataAsText, currentDatastoreInfo, otherDatastoreInfo, otherDatastoreEntry,
        projectIriTreePathToNodeContainingDatastore, newFormat, newDatastoreType, shouldCopyIfMissing, cacheContentSetter);
    }
  };

  /**
   * Called to update the cache based on fetched data
   */
  const updateCacheEntryBasedOnFetchedData = async (
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
      const convertedDataToInsert = convertDatastoreContentBasedOnFormat(dataToInsertAsText, datastoreInfo.format, true, null);
      if (!convertedDataToInsert.ok) {
        // TODO RadStr PR: Just throw error? Probably, since this means that the data on the backend are invalid.
        throw new Error(convertedDataToInsert.error);
      }
      valueToStoreToCacheAsObject = convertedDataToInsert.value;
      const stringifiedCacheValue = stringifyDatastoreContentBasedOnFormat(valueToStoreToCacheAsObject, newFormat, true);
      convertDataAndUpdateCacheContentEntryAsCombination(setConvertedCacheContent,
        treePathToNodeContainingDatastore, newDatastoreType, stringifiedCacheValue, newFormat);
    }
    else {
      if (datastoreInfo === null && otherDatastoreInfo !== null && shouldCopyIfMissing && createdDatastoresToIrisNeedingReplacementMap.current[otherDatastoreInfo.fullPath] === undefined) {
        // Ok now we take the mapping of non-editable to editable - this covers the case when we create new entries - because that comes from the old entries
        // with this mapping we can find what is missing in the new entry
        const { datastoreWithReplacedIris, missingIrisInNew } = createDatastoreWithReplacedIris(otherDatastoreEntry, iriMappingFromNonEditableToEditable);
        valueToStoreToCacheAsObject = datastoreWithReplacedIris;
        createdDatastoresToIrisNeedingReplacementMap.current[otherDatastoreInfo.fullPath] = missingIrisInNew;
        updateCacheContentEntryAsCombination(setConvertedCacheContent, treePathToNodeContainingDatastore, newDatastoreType, valueToStoreToCacheAsObject, newFormat);

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
          const fullProjectIrisTreePath = diffNode.resources.old.projectIrisTreePath;
          await addToCreatedDatastoresAndAddToCache(fullProjectIrisTreePath, missingMetadataToCreate, null);
        }
      }
    }

    return valueToStoreToCacheAsObject;
  }


  const reloadModelsDataFromBackend = async () => {
    if (mergeFromDatastoreInfo !== null || mergeToDatastoreInfo !== null) {
      await updateModelDataInternal(activeTreePathToNodeContainingDatastore, mergeFromDatastoreInfo, mergeToDatastoreInfo, false, true, false);
    }
  };


  const saveChangesToCache = async () => {
    if (mergeFromDatastoreInfo !== null || mergeToDatastoreInfo !== null) {
      await updateModelDataInternal(activeTreePathToNodeContainingDatastore, mergeFromDatastoreInfo, mergeToDatastoreInfo, true, true, false);
    }
  };


  const updateModelDataOnCreate = async (
    projectIriTreePathToNodeContainingDatastore: string,
    givenMergeFromDatastoreInfo: DatastoreInfo | null,
    givenMergeToDatastoreInfo: DatastoreInfo | null
  ) => {
    await updateModelDataInternal(projectIriTreePathToNodeContainingDatastore, givenMergeFromDatastoreInfo, givenMergeToDatastoreInfo, false, false, true);
  }


  const applyAutomaticMergeStateResolver = (mergeStrategy: MergeResolverStrategy) => {
    const datastoreInfoForEditable = getEditableValue(editable, mergeFromDatastoreInfo, mergeToDatastoreInfo);
    if (datastoreInfoForEditable === null) {
      return;
    }

    const setCacheToTextContentForEditable = getEditableValue(editable, setConvertedCacheContentForMergeFrom, setConvertedCacheContentForMergeTo);
    const activeMergeContents = getEditableAndNonEditableValue(editable, activeMergeFromContentConverted, activeMergeToContentConverted);

    const mergeResolveResult = mergeStrategy.resolve(activeMergeContents.nonEditable, activeMergeContents.editable, activeDatastoreType, activeFormat);
    updateCacheContentEntryByGivenString(setCacheToTextContentForEditable, activeTreePathToNodeContainingDatastore, datastoreInfoForEditable.type, mergeResolveResult);
  };

  const closeWithSuccess = () => {
    const editedNewVersion = monacoEditor.current?.editor.getModifiedEditor()?.getValue();
    resolve({ newResourceContent: editedNewVersion });
  };


  const finalizeMergeStateHandler = async () => {
    if (examinedMergeState === null) {
      return undefined;
    }
    setShouldFinalize(true);
    await saveEverything();
  };

  // Not really clean, but can't think of anything better new. We want to update the cache and then use the values. we use useEffect depending on version number state to solve this issue.
  // Other solution could be to use ref next to the state tracking cache, or some other combinations, but I don't see them being too much better than this one
  const saveEverything = async () => {
    // We first save the changes into the cache and then we store to the backend. Note that if the editor content is currently invalid,
    //  we will continue, but the content will be kept as it was before the editing
    await saveChangesToCache();
    setCacheExplicitUpdateTracker(prev => prev + 1);
  };
  useEffect(() => {
    // TODO RadStr Critical: WARNING, I probably broke something here – or was it always like this? Anyway, when I open the diff editor, it gets counted as a modification
    if (cacheExplicitUpdateTracker === 0) {
      // Skip initial load
      return;
    }

    const saveToBackend = async () => {
      const closeDialogObject = createCloseDialogObject();
      openModal(LoadingDialog, {
        dialogTitle: "git.diff-editor.storing-to-backend.title",
        waitingText: "",
        waitTime: SAVING_DIFF_EDITOR_STATE_TO_BACKEND,
        setCloseDialogAction: closeDialogObject.setCloseDialogAction,
        shouldShowTimer: true,
        shouldDisableClosing: true
      });

      setShouldFinalize(false);
      const finalizing = shouldFinalize;
      if (examinedMergeState === null) {
        throw new Error("The merge state is not set when we are saving to backend. Should not happen.")
      }
      const mergeFromRootIri = examinedMergeState.rootIriMergeFrom;
      const mergeToRootIri = examinedMergeState.rootIriMergeTo;

      const saveResult = await saveFileChanges(false);
      if (saveResult === DiffEditorOutsideChangeChosenAction.Nothing) {
        return;
      }
      else if (saveResult === DiffEditorOutsideChangeChosenAction.Continue) {
        if (examinedMergeState !== null) {
          await updateMergeState(examinedMergeState, conflictsToBeResolvedOnSave);
        }
        await reloadMergeState(true, true);
        await requestLoadPackage(mergeFromRootIri, true);
        await requestLoadPackage(mergeToRootIri, true);
      }
      else if (saveResult === DiffEditorOutsideChangeChosenAction.Reload) {
        await reloadMergeState(true, true);
      }

      if (finalizing) {
        openModal(MergeStateFinalizerDialog, { mergeState: examinedMergeState, openModal }).finally(() => closeWithSuccess());
      }

      closeDialogObject.closeDialogAction();
    };
    saveToBackend();
  }, [cacheExplicitUpdateTracker]);


  const unresolveToBeResolvedConflict = (comparisonData: DatastoreComparison) => {
    setConflictsToBeResolvedOnSave(prev => {
      return prev.filter(iteratedComparison => iteratedComparison !== comparisonData);
    });
  };

  console.info({convertedCacheContentForMergeFrom, convertedCacheContentForMergeTo});   // TODO RadStr Debug: DEBUG print

  const saveFileChanges = async (shouldReloadFromBackendAfterFinish: boolean): Promise<DiffEditorOutsideChangeChosenAction> => {
    const { editable: editableCacheContents, nonEditable: nonEditableCacheContents } = getEditableAndNonEditableValue(editable, convertedCacheContentForMergeFrom, convertedCacheContentForMergeTo);
    const editableFilesystem = getEditableValue(editable, examinedMergeState?.filesystemTypeMergeFrom, examinedMergeState?.filesystemTypeMergeTo) ?? null;
    await saveCreatedFilesystemNodesToBackend(editableCacheContents, nonEditableCacheContents, editableFilesystem);

    // TODO RadStr PR: Alternatively we could update directly the diff tree instead of letting the backend recompute it again.
    //              ... But it is quite non-trival implementation-wise - Future work
    // TODO RadStr Critical: Also we should do only one fetcheMergeState request, otherwise there might be concurrency issues
    const fetchedMergeStateToCheckForUpToDate = await fetchMergeState(initialMergeFromRootMetaPath, initialMergeToRootMetaPath, true, false, false);
    if (examinedMergeState === null || fetchedMergeStateToCheckForUpToDate === null) {
      throw new Error(`Either the old merge state (${examinedMergeState}) or the new merge state (${fetchedMergeStateToCheckForUpToDate}) are null.`);
    }

    if (!fetchedMergeStateToCheckForUpToDate?.isUpToDate || examinedMergeState.modifiedDiffTreeAt !== fetchedMergeStateToCheckForUpToDate.modifiedDiffTreeAt) {
      // TODO RadStr PR: Ideally also have what files changed on the backend - it should not be hard just have new field in database which will contain iris of the changed resources
      //                 It will be set in the observer, but yeah that is Future work
      const { result: modalResult } = await openModal(ChooseActionForDiffEditorUnplannedChange, {oldMergeState: examinedMergeState, newMergeState: fetchedMergeStateToCheckForUpToDate});
      if (modalResult === DiffEditorOutsideChangeChosenAction.Nothing) {
        return modalResult;
      }
      else if (modalResult === DiffEditorOutsideChangeChosenAction.Continue) {
        // Do nothing
      }
      else if (modalResult === DiffEditorOutsideChangeChosenAction.Reload) {
        return modalResult;
      }
      else {
        throw new Error(`Unknown modalResult: ${modalResult}`)
      }
    }
    const fetchedMergeState = await fetchMergeState(initialMergeFromRootMetaPath, initialMergeToRootMetaPath, true, true, true);
    console.info({fetchedMergeState});      // TODO RadStr Debug: Debug
    setExaminedMergeState(fetchedMergeState);
    const newIriMappingFromNonEditableToEditableStorage = {};
    const newProjectIriToDiffNodeMap = {};
    const localProjectIriToIriMap: Record<string, MergeFromMergeToStrings> = {};
    createIriMappings(fetchedMergeState?.diffTreeData?.diffTree!, editable, {}, localProjectIriToIriMap, newIriMappingFromNonEditableToEditableStorage, newProjectIriToDiffNodeMap);


    let filesystemNodeParentIri: string | null = null;

    for (const [nodeTreePath, datastoreInfoMap] of Object.entries(datastoreInfosForCacheEntries)) {
      if (removedTreePaths.includes(nodeTreePath)) {
        await ClientFilesystem.removeFilesystemNodeDirectly(fetchedMergeState!.uuid, nodeTreePath, import.meta.env.VITE_BACKEND, editableFilesystem);
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
        filesystemNodeParentIri = metaMergeTo === null ? null : filesystemNodeWithMetaMergeTo.metadata.iri;
        console.info({datastoreInfoMap, datastoreInfosForCacheEntries, diffTreeNode, metaMergeTo, diffTree: fetchedMergeState!.diffTreeData!.diffTree});    // TODO RadStr DEBUG: Debug
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
          alert("Handling remove");     // TODO RadStr Debug: Debug alert
          const diffNode = getDiffNodeFromDiffTree(fetchedMergeState!.diffTreeData!.diffTree, nodeTreePath);
          if (diffNode === null) {
            throw new Error(`The node (${nodeTreePath}) to remove does not exist inside diffTree`);
          }
          const datastoreParentIri = diffNode.resources.new!.metadata.iri;
          alert("Handling remove2");      // TODO RadStr Debug: Debug alert
          await ClientFilesystem.removeDatastoreDirectly(fetchedMergeState!.uuid, datastoreParentIri, removedDatastore, import.meta.env.VITE_BACKEND, editableFilesystem, false);
          continue;
        }

        const format = formatsForCacheEntries[nodeTreePath][modelName];
        // TODO RadStr Critical: Can it even ever be default? Better question is what if it is default - should we throw error or shouldnt we just stop??
        const newValue = editableCacheContents?.[nodeTreePath]?.[modelName] ?? getDefaultValueForMissingDatastoreInDiffEditor();
        const newValueConvertedResult = convertDatastoreContentBasedOnFormat(newValue, format, true, null);
        if (!newValueConvertedResult.ok) {
          console.error("Should never happen. If value is in the cache of the diff editor, then it already should be in the valid format");
          throw new Error(newValueConvertedResult.error);
        }
        let newValueAsJSON: object = newValueConvertedResult.value;
        const projectIriToIriForEditable: Record<string, string | null> = {};
        for (const [key, value] of Object.entries(localProjectIriToIriMap)) {
          projectIriToIriForEditable[key] = value[editable];
        }

        // First replace the project iris to iris. After we are done, we will replace the newly created iris by their correct values.
        const iriToProjectIriResult = createDatastoreWithReplacedIris(newValueAsJSON, projectIriToIriForEditable);
        const missingIrisInNew = iriToProjectIriResult.missingIrisInNew;
        let newValueAsJSONWithIris = iriToProjectIriResult.datastoreWithReplacedIris;

        if (missingIrisInNew.length > 0) {
          throw new Error(`${missingIrisInNew} - these iris could not be replaced back from projectIris to iris`);
        }
        // const newValueAsJSONWithIris = newValueAsJSON;   // TODO RadStr Debug: debug set

        if (datastoreInfoForNonEditable !== null && createdDatastoresToIrisNeedingReplacementMap.current[datastoreInfoForNonEditable.fullPath] !== undefined) {
          // Repair the iris ... The relevant meta files to which we will replace iris should be already created on backend and we got them by fetching the diff state again,
          // so now just replace with the mapping from non-editable iris to the newly created editable ones
          // We need to replace only those in cache. Since, the new modified values has to be set by user, they do not appear out of nowhere
          // TODO RadStr Critical: Does this work correctly with the projectIris or not???????????!!?!? ... I swapped the order so it should be fine now
          //                       First we map projectIri to iri and then iri to iri

          // Replace the iris of newly created datastores with their newly created iris
          const { datastoreWithReplacedIris, missingIrisInNew } = createDatastoreWithReplacedIris(newValueAsJSONWithIris, newIriMappingFromNonEditableToEditableStorage);
          if (missingIrisInNew.length > 0) {
            throw new Error("For some reason we still have not created meta files in the editable filesystem, which behave as replacement for pointed to from the old filesystem");
          }

          newValueAsJSONWithIris = datastoreWithReplacedIris;
        }

        const stringifiedNewValue: string = stringifyDatastoreContentBasedOnFormat(newValueAsJSONWithIris, format, true);
        console.info({newValueAsJSON, newValueAsJSONWithIris, localProjectIriToIriMap});  // TODO RadStr Debug: Debug print
        // console.info(newValueAsJSON);                    // TODO RadStr Debug: Debug print
        // console.info({newValueAsJSONWithIris});
        // console.info({localProjectIriToIriMap});
        if (datastoreInfoForEditable !== null) {
          // Just update, it does exist
          await ClientFilesystem.updateDatastoreContentDirectly(fetchedMergeState!.uuid, filesystemNodeParentIri, datastoreInfoForEditable, stringifiedNewValue, editableFilesystem, import.meta.env.VITE_BACKEND);
        }
        else {
          // Create new one.
          await ClientFilesystem.createDatastoreDirectly(fetchedMergeState!.uuid, filesystemNodeParentIri, stringifiedNewValue, editableFilesystem, datastoreInfoForNonEditable, import.meta.env.VITE_BACKEND);
          continue;
        }
        if (shouldReloadFromBackendAfterFinish) {
          await reloadModelsDataFromBackend();
        }
      }
    }


    setCreatedDatastores([]);
    setRemovedDatastores([]);
    setRemovedTreePaths([]);
    setCreatedFilesystemNodes({});
    createdDatastoresToIrisNeedingReplacementMap.current = {};
    return DiffEditorOutsideChangeChosenAction.Continue;
    // // Remove all listeners first
    // const mergeToEditor = monacoEditor.current?.editor.getMergeToEditor();
    // // mergeToEditor?.dispose();
  };

  const saveCreatedFilesystemNodesToBackend = async (
    editableCacheContents: CacheContentMap,
    nonEditableCacheContents: CacheContentMap,
    editableFilesystem: AvailableFilesystems | null,
  ): Promise<void> => {
    // TODO RadStr Critical: Set Not used ... I have to think about it a bit - when exactly I need to (not) update the metas in the code after this
    const createdMetas: Set<string> = new Set();

    for (const [_, filesystemNodesBatchToCreate] of Object.entries(createdFilesystemNodes)) {
      const filesystemNodesBatchMetadata: ExportShareableMetadataType[] = [];

      for (const filesystemNodeToCreate of filesystemNodesBatchToCreate.createdFilesystemNodes) {
        createdMetas.add(filesystemNodeToCreate.projectIrisTreePath);
        // TODO RadStr Debug: Debug
        console.info({editableCacheContents, "treePath": filesystemNodeToCreate.projectIrisTreePath, "userMetadataDatastoreInfo": filesystemNodeToCreate.userMetadataDatastoreInfo});
        // Throws error on failure since that should not happen in that method ever
        const filesystemNodeMetadata = getDatastoreInCacheAsObject(
          editableCacheContents, nonEditableCacheContents, filesystemNodeToCreate.projectIrisTreePath,
          filesystemNodeToCreate.userMetadataDatastoreInfo, removedDatastores, true);
        filesystemNodesBatchMetadata.push(filesystemNodeMetadata);
      }

      if (filesystemNodesBatchToCreate.firstExistingParentIri === null) {
        toast.error("Fatal Merge error, check console", { "richColors": true });
        throw new Error("We can not (at least currently) have 2 roots. That is both packages have to have one common root.");
      }

      alert("Before CREATED IRIS");

      const createdIris = await ClientFilesystem.createFilesystemNodesDirectly(
        examinedMergeState!.uuid, filesystemNodesBatchMetadata, filesystemNodesBatchToCreate.firstExistingParentIri,
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

  return {
    monacoEditor,
    examinedMergeState, setExaminedMergeState,
    conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave,
    removedDatastores, setRemovedDatastores, addToRemovedDatastoresAndAddToCache,
    createdDatastoresToIrisNeedingReplacementMap,
    createdDatastores, setCreatedDatastores, addToCreatedDatastoresAndAddToCache,
    createdFilesystemNodes, setCreatedFilesystemNodes,
    removedTreePaths, setRemovedTreePaths,
    activeTreePathToNodeContainingDatastore, setActiveTreePathToNodeContainingDatastore,
    formatsForCacheEntries, setFormatsForCacheEntries,
    datastoreInfosForCacheEntries, setDatastoreInfosForCacheEntries,
    convertedCacheContentForMergeFrom, setConvertedCacheContentForMergeFrom,
    convertedCacheContentForMergeTo, setConvertedCacheContentForMergeTo,
    mergeFromDatastoreInfo, setMergeFromDatastoreInfo,
    mergeToDatastoreInfo, setMergeToDatastoreInfo,
    mergeFromSvg, setMergeFromSvg,
    mergeToSvg, setMergeToSvg,
    comparisonTabType, setComparisonTabType,
    isLoadingTextData, setIsLoadingTextData,
    isLoadingTreeStructure, setIsLoadingTreeStructure,
    activeMergeFromContentConverted, activeMergeToContentConverted,
    showStrippedVersion, setShowStrippedVersion,
    strippedMergeFromContent, strippedMergeToContent,
    activeDatastoreType,
    activeFormat,
    activeConflicts,

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
