import { Dispatch, RefObject, SetStateAction, useEffect, useRef, useState } from "react";
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
  CreateDatastoreFilesystemNodesData,
  FilesystemNode,
  convertDatastoreContentForInputFormatToOutputFormat,
  setEditableValue,
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
 * @deprecated Not needed I guess, we just use the mapping directly from backend - so TODO RadStr Later: Remove together with the commented code using it down below after it will be clear it is really useless
 */
// @ts-ignore
type IriMappings = {
  iriToProjectIriMap: Record<string, string>,
  projectIriToIriMap: Record<string, MergeFromMergeToStrings>,
};

// Note that the hook is not useful for anything else than the diff editor dialog, but since it is quite large I put it into separate file
export const useDiffEditorDialogProps = ({editable, initialMergeFromResourceIri, initialMergeToResourceIri, resolve}: TextDiffEditorHookProps) => {
  const monacoEditor = useRef<{editor: monaco.editor.IStandaloneDiffEditor}>(undefined);


  // Set once in the useEffect
  const [examinedMergeState, setExaminedMergeState] = useState<MergeState | null>(null);
  const [conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave] = useState<ComparisonData[]>([]);
  const [createdDatastores, setCreatedDatastores] = useState<DatastoreInfo[]>([]);
  const [createdFilesystemNodes, setCreatedFilesystemNodes] = useState<Record<string, EntriesAffectedByCreateType>>({});
  const currentlyInAsyncUpdateOfCreatedFilesystemNodes = useRef<boolean>(false);
  const createdDatastoresInPreviousIteration = useRef<DatastoreInfo[]>([]);
  // Removed datastores are a bit simpler to solve - basically. Removal of Meta = removal of all datastores together with filesystem node (recursively), but that is handled in directory diff editor.
  const [removedDatastores, setRemovedDatastores] = useState<DatastoreInfo[]>([]);
  const [removedTreePaths, setRemovedTreePaths] = useState<string[]>([]);

  const [currentTreePathToNodeContainingDatastore, setCurrentTreePathToNodeContainingDatastore] = useState<string>("");
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

  // TODO RadStr: Not needed then I guess
  // const { iriToProjectIriMap, projectIriToIriMap } = useMemo<IriMappings>(() => {
  //   const iriToProjectIriMapStorage: Record<string, string> = {};
  //   const projectIriToIriMapStorage: Record<string, MergeFromMergeToStrings> = {};

  //   for (const diffNode of Object.values(examinedMergeState?.diffTreeData?.diffTree ?? {})) {
  //     const { old: mergeFromResource, new: mergeToResource } = diffNode.resources;
  //     const projectIri = mergeFromResource?.metadata.projectIri ?? mergeToResource?.metadata.projectIri;
  //     if (projectIri === undefined) {
  //       throw new Error(`The diff node inside diff tree does not have defined neither old and neither new resource for some reason: ${diffNode}`);
  //     }
  //     const mapValue: MergeFromMergeToStrings = {
  //       mergeFrom: mergeFromResource?.metadata.iri ?? null,
  //       mergeTo: mergeToResource?.metadata.iri ?? null,
  //     };

  //     mapValue.mergeFrom ??= (projectIriToIriMapStorage[projectIri]?.mergeFrom ?? null);
  //     mapValue.mergeTo ??= (projectIriToIriMapStorage[projectIri]?.mergeTo ?? null);
  //     projectIriToIriMapStorage[projectIri] = mapValue;
  //     if (mapValue.mergeFrom !== null) {
  //       iriToProjectIriMapStorage[mapValue.mergeFrom] = projectIri;
  //     }
  //     if (mapValue.mergeTo !== null) {
  //       iriToProjectIriMapStorage[mapValue.mergeTo] = projectIri;
  //     }
  //   }

  //   return {
  //     iriToProjectIriMap: iriToProjectIriMapStorage,
  //     projectIriToIriMap: projectIriToIriMapStorage,
  //   };
  // }, [examinedMergeState]);


  const activeDatastoreType = mergeToDatastoreInfo?.type ?? mergeFromDatastoreInfo?.type ?? null;
  const activeFormat = activeDatastoreType === null ? "" : formatsForCacheEntries[currentTreePathToNodeContainingDatastore]?.[activeDatastoreType] ?? "";
  const activeMergeFromContentConverted = findValueInCache(mergeFromDatastoreInfo?.fullPath ?? null, currentTreePathToNodeContainingDatastore, activeDatastoreType, activeFormat, removedDatastores, [convertedCacheForMergeFromContent, convertedCacheForMergeToContent]);
  const activeMergeToContentConverted = findValueInCache(mergeToDatastoreInfo?.fullPath ?? null, currentTreePathToNodeContainingDatastore, activeDatastoreType, activeFormat, removedDatastores, [convertedCacheForMergeToContent, convertedCacheForMergeFromContent]);

  const resetUseStates = () => {
    setExaminedMergeState(null);
    setConflictsToBeResolvedOnSave([]);
    setCreatedDatastores([]);
    setCreatedFilesystemNodes({});
    createdDatastoresInPreviousIteration.current = [];
    setRemovedDatastores([]);
    setCurrentTreePathToNodeContainingDatastore("");
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

          // Create new one. For that we have to find all the related datastores/nodes
          if (newlyCreatedDatastores.find(createdDatastore => createdDatastore.fullPath === datastoreCausingTheUpdate?.fullPath) === undefined) {
            continue;
          }


          await onCascadeUpdateForCreatedDatastores(
            nodeTreePath, examinedMergeState, editable, datastoreCausingTheUpdate,
            convertedCacheForMergeFromContent, convertedCacheForMergeToContent, updateModelDataWithoutActiveModelChange,
            setCreatedDatastores, setCreatedFilesystemNodes, createdFilesystemNodesAsArray);
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
   * Updates models related data. If {@link shouldChangeActiveModel} is true Changes current active model, that is modifies states to reflect that.
   *  If {@link useCache} is set to true then tries to use cache (if the datastore is present it uses the cache, otherwise updates the cache by fetching from backend),
   *   if set to false, then always fetches from backend and updates cache
   * @param shouldChangeActiveModel - if true then we use the given datastore infos to set active model. If false then this method behaves as a possible updater of cache ({@link useCache} should be also false then.)
   */
  const updateModelData = async (
    treePathToNodeContainingDatastore: string,
    newMergeFromDatastoreInfo: DatastoreInfo | null,
    newMergeToDatastoreInfo: DatastoreInfo | null,
    useCache: boolean,
    shouldChangeActiveModel: boolean,
  ) => {
    if (newMergeFromDatastoreInfo === null && newMergeToDatastoreInfo === null) {
      if (!shouldChangeActiveModel) {
        return;
      }
      // TOOD RadStr: Not sure about this special case, but I think this should be the correct way to handle it
      setMergeFromDatastoreInfo(null);
      setMergeToDatastoreInfo(null);
      setCurrentTreePathToNodeContainingDatastore(treePathToNodeContainingDatastore);
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

    if (mergeFromDatastoreInfo?.fullPath !== newMergeFromDatastoreInfo?.fullPath || mergeToDatastoreInfo !== null && mergeToDatastoreInfo?.fullPath !== newMergeToDatastoreInfo?.fullPath) {
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
        currentTreePathToNodeContainingDatastore, oldDatastoreType, currentMergeFromContentInEditor, newFormat);

      const currentMergeToContentInEditor = editors.mergeToEditor?.getValue()!;
      convertDataAndUpdateCacheContentEntry(setConvertedCacheForMergeToContent,
        currentTreePathToNodeContainingDatastore, oldDatastoreType, currentMergeToContentInEditor, newFormat);
    }

    const isMergeFromDataResourceInCache = isDatastorePresentInCache(convertedCacheForMergeFromContent, treePathToNodeContainingDatastore, newDatastoreType);
    const isMergeToDataResourceInCache = isDatastorePresentInCache(convertedCacheForMergeToContent, treePathToNodeContainingDatastore, newDatastoreType);
    if (!(useCache && (isMergeFromDataResourceInCache || isMergeToDataResourceInCache))) {
      // Update cache values
      const newMergeFromDataAsText = await ClientFilesystem.getDatastoreContentDirectly(newMergeFromDatastoreInfo, false, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeFrom ?? null);
      const newMergeToDataAsText = await ClientFilesystem.getDatastoreContentDirectly(newMergeToDatastoreInfo, false, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeTo ?? null);

      console.info({newMergeFromDataResourceNameInfo: newMergeFromDatastoreInfo, newMergeToDataResourceNameInfo: newMergeToDatastoreInfo});

      if (newMergeFromDataAsText !== null && newMergeFromDatastoreInfo !== null) {
        const convertedCacheValue = convertDatastoreContentBasedOnFormat(newMergeFromDataAsText, newMergeFromDatastoreInfo.format, true);
        const stringifiedCachevalue = stringifyDatastoreContentBasedOnFormat(convertedCacheValue, newFormat, true);
        convertDataAndUpdateCacheContentEntry(setConvertedCacheForMergeFromContent,
          treePathToNodeContainingDatastore, newDatastoreType, stringifiedCachevalue, newFormat);
      }

      if (newMergeToDataAsText !== null && newMergeToDatastoreInfo !== null) {
        const convertedCacheValue = convertDatastoreContentBasedOnFormat(newMergeToDataAsText, newMergeToDatastoreInfo.format, true);
        const stringifiedCachevalue = stringifyDatastoreContentBasedOnFormat(convertedCacheValue, newFormat, true);
        convertDataAndUpdateCacheContentEntry(setConvertedCacheForMergeToContent,
          treePathToNodeContainingDatastore, newDatastoreType, stringifiedCachevalue, newFormat);
      }
    }

    if (shouldChangeActiveModel) {
      setCurrentTreePathToNodeContainingDatastore(treePathToNodeContainingDatastore);
      setMergeFromDatastoreInfo(newMergeFromDatastoreInfo);
      setMergeToDatastoreInfo(newMergeToDatastoreInfo);
    }

    setIsLoadingTextData(false);
  }

  const reloadModelsDataFromBackend = async () => {
    if (mergeFromDatastoreInfo !== null || mergeToDatastoreInfo !== null) {
      await updateModelData(currentTreePathToNodeContainingDatastore, mergeFromDatastoreInfo, mergeToDatastoreInfo, false, true);
    }
  };

  const saveChangesToCache = async () => {
    if (mergeFromDatastoreInfo !== null || mergeToDatastoreInfo !== null) {
      await updateModelData(currentTreePathToNodeContainingDatastore, mergeFromDatastoreInfo, mergeToDatastoreInfo, true, true);
    }
  };

  const updateModelDataWithoutActiveModelChange = async (
    treePathToNodeContaingDatastore: string,
    givenMergeFromDatastoreInfo: DatastoreInfo | null,
    givenMergeToDatastoreInfo: DatastoreInfo | null
  ) => {
    await updateModelData(treePathToNodeContaingDatastore, givenMergeFromDatastoreInfo, givenMergeToDatastoreInfo, false, false);
  }


  const applyAutomaticMergeStateResolver = (mergeStrategy: MergeResolverStrategy) => {
    const datastoreInfoForEditable = getEditableValue(editable, mergeFromDatastoreInfo, mergeToDatastoreInfo);
    if (datastoreInfoForEditable === null) {
      return;
    }

    const setCacheToTextContentForEditable = getEditableValue(editable, setConvertedCacheForMergeFromContent, setConvertedCacheForMergeToContent);
    const activeMergeContents = getEditableAndNonEditableValue(editable, activeMergeFromContentConverted, activeMergeToContentConverted);

    const mergeResolveResult = mergeStrategy.resolve(activeMergeContents.nonEditable, activeMergeContents.editable);
    updateCacheContentEntry(setCacheToTextContentForEditable, currentTreePathToNodeContainingDatastore, datastoreInfoForEditable.type, mergeResolveResult);
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

    // TODO RadStr: Not used ... I have to think about it a bit - when exactly I need to (not) update the metas in the code after this
    const createdMetas: Set<string> = new Set();

    for (const [_, filesystemNodesBatchToCreate] of Object.entries(createdFilesystemNodes)) {
      const filesystemNodesBatchWithData: CreateDatastoreFilesystemNodesData[] = [];

      for (const filesystemNodeToCreate of filesystemNodesBatchToCreate.createdFilesystemNodes) {
        createdMetas.add(filesystemNodeToCreate.treePath);
        console.info({editableCacheContents, "treePath": filesystemNodeToCreate.treePath, "userMetadataDatastoreInfo": filesystemNodeToCreate.userMetadataDatastoreInfo})
        const filesystemNodeMetadata = getDatastoreInCacheAsObject(editableCacheContents, nonEditableCacheContents, filesystemNodeToCreate.treePath, filesystemNodeToCreate.userMetadataDatastoreInfo, removedDatastores);
        // TODO RadStr PROJECTIRIS: userMetadata should be enough and maybe also parentProejctIri, but nothing anything else
        const dataInsteadOfInfo: CreateDatastoreFilesystemNodesData = {
          parentProjectIri: filesystemNodeToCreate.parentProjectIri,
          treePath: filesystemNodeToCreate.treePath,
          userMetadata: filesystemNodeMetadata,
          format: filesystemNodeToCreate.userMetadataDatastoreInfo.format,
        };
        filesystemNodesBatchWithData.push(dataInsteadOfInfo);
      }

      if (filesystemNodesBatchToCreate.firstExistingParentIri === null) {
        toast.error("Fatal Merge error, check console");
        throw new Error("We can not (at least currently) have 2 roots. That is both packages have to have one common root.");
      }

      alert("Before CREATED IRIS");

      const createdIris = await ClientFilesystem.createFilesystemNodesDirectly(
        filesystemNodesBatchWithData, filesystemNodesBatchToCreate.firstExistingParentIri,
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
        console.info(datastoreInfosForCacheEntries[filesystemNodesBatchToCreate.createdFilesystemNodes[i].treePath][type]);
        setEditableValue(editable, datastoreInfosForCacheEntries[filesystemNodesBatchToCreate.createdFilesystemNodes[i].treePath][type], createdDatastoreInfo);
        console.info("After");
        console.info(datastoreInfosForCacheEntries[filesystemNodesBatchToCreate.createdFilesystemNodes[i].treePath][type]);
      }
    }


    let filesystemNodeParentIri: string | null = null;

    for (const [nodeTreePath, datastoreInfoMap] of Object.entries(datastoreInfosForCacheEntries)) {
      if (removedTreePaths.includes(nodeTreePath)) {
        ClientFilesystem.removeFilesystemNodeDirectly(nodeTreePath, import.meta.env.VITE_BACKEND, editableFilesystem);
        continue;
      }

      for (const [modelName, datastoreInfo] of Object.entries(datastoreInfoMap)) {
        const {
          editable: datastoreInfoForEditable,
          nonEditable: datastoreInfoForNonEditable
        } = getEditableAndNonEditableValue(editable, datastoreInfo.mergeFrom, datastoreInfo.mergeTo);

        if (modelName === "meta") {
          if (datastoreInfoForNonEditable !== null && createdDatastores.includes(datastoreInfoForNonEditable)) {
            continue;
          }
        }

        // Handle Remove
        let removedDatastore: DatastoreInfo | undefined;
        if ((removedDatastore = removedDatastores.find(datastore => datastore.fullPath === datastoreInfoForEditable?.fullPath)) !== undefined) {
          const diffTreeNode = examinedMergeState!.diffTreeData!.diffTree[nodeTreePath];
          const relevantResource: FilesystemNode = getEditableValue(editable, diffTreeNode.resources.old, diffTreeNode.resources.new)!;
          const datastoreParentIri = relevantResource.metadata.iri;
          await ClientFilesystem.removeDatastoreDirectly(datastoreParentIri, removedDatastore, import.meta.env.VITE_BACKEND, editableFilesystem, false);
          continue;
        }

        const format = formatsForCacheEntries[nodeTreePath][modelName];
        const newValue = editableCacheContents?.[nodeTreePath]?.[modelName] ?? getDefaultValueForFormat(format);
        const newValueAsJSON = convertDatastoreContentForInputFormatToOutputFormat(newValue, format, "json", true);
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
      filesystemNodeParentIri = datastoreInfoMap["meta"].mergeTo === null ?
        null :
        getDatastoreInCacheAsObject(editableCacheContents, nonEditableCacheContents, nodeTreePath, datastoreInfoMap["meta"].mergeTo, removedDatastores).iri;
    }

    setCreatedDatastores([]);
    setRemovedDatastores([]);
    setRemovedTreePaths([]);
    setCreatedFilesystemNodes({});

    // // Remove all listeners first
    // const mergeToEditor = monacoEditor.current?.editor.getMergeToEditor();
    // // mergeToEditor?.dispose();
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
    createdDatastores, setCreatedDatastores,
    createdFilesystemNodes, setCreatedFilesystemNodes,
    removedTreePaths, setRemovedTreePaths,
    currentTreePathToNodeContainingDatastore, setCurrentTreePathToNodeContainingDatastore,
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
    activeFormat,

    resetUseStates,
    reloadMergeState,
    changeActiveModel: updateModelData,
    saveChangesToCache,
    reloadModelsDataFromBackend,
    closeWithSuccess,
    applyAutomaticMergeStateResolver,
    saveEverything,
    unresolveToBeResolvedConflict,
    finalizeMergeStateHandler,
  };
}

async function onCascadeUpdateForCreatedDatastores(
  nodeTreePath: string,
  examinedMergeState: MergeState | null,
  editable: EditableType,
  datastoreCausingTheUpdate: DatastoreInfo | null,
  convertedCacheForMergeFromContent: CacheContentMap,
  convertedCacheForMergeToContent: CacheContentMap,
  updateModelDataWithoutActiveModelChange: (treePathToNodeContaingDatastore: string, givenMergeFromDatastoreInfo: DatastoreInfo | null, givenMergeToDatastoreInfo: DatastoreInfo | null) => Promise<void>,
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
      const metadataInfo = getDatastoreInfoOfGivenDatastoreType(existingResource!, "meta");

      // TODO RadStr DEBUG: Debug prints
      console.info({ lastTreePathSeparatorIndex: treePathSeparatorIndex, len: currentNodeTreePath.length, currentIri, currentNodeTreePath, nodeTreePath, currentNode: currentDiffNode, difftree: examinedMergeState?.diffTreeData?.diffTree }); // TODO RadStr DEBUG: Debug print

      console.info({ convertedCacheForMergeFromContent, convertedCacheForMergeToContent }); // TODO RadStr DEBUG: Debug print
      console.info({ metadataAsJSON: metadataInfo, PATH_FOR_METADATA: existingResource!.irisTreePath! }); // TODO RadStr DEBUG: Debug print

      const isFilesystemNodeNotYetAdded = createdFilesystemNodesAsArray.find(alreadyCreated => alreadyCreated.treePath === existingResource!.irisTreePath) === undefined;
      if (isFilesystemNodeNotYetAdded) {
        visitedFirstNodeToCreate = true;
        if (parentNode === null) {
          toast.error("Fatal Merge error, check console");
          throw new Error("We can not (at least currently) have 2 roots. That is both packages have to have one common root.");
        }

        const mergeFromMetadataInfo = (currentDiffNode?.resources.old === undefined || currentDiffNode?.resources.old === null) ? null : getDatastoreInfoOfGivenDatastoreType(currentDiffNode?.resources.old, "meta");
        const mergeToMetadataInfo = (currentDiffNode?.resources.new === undefined || currentDiffNode?.resources.new === null) ? null : getDatastoreInfoOfGivenDatastoreType(currentDiffNode?.resources.new, "meta");
        console.info({mergeFromMetadataInfo, mergeToMetadataInfo});
        await updateModelDataWithoutActiveModelChange(existingResource!.irisTreePath, mergeFromMetadataInfo, mergeToMetadataInfo);
        setCreatedDatastores(prev => [...prev, metadataInfo]);

        // TODO RadStr PROJECTIRIS: userMetadata should be enough - just for the metadata and the projectIri
        const newFilesystemNodeToCreate = {
          parentProjectIri: parentNode.metadata.projectIri,
          treePath: existingResource!.irisTreePath,
          userMetadataDatastoreInfo: metadataInfo,
        };
        createdFilesystemNodesInTreePath.push(newFilesystemNodeToCreate);
        createdFilesystemNodesAsArray.push(newFilesystemNodeToCreate);
        parentNode = existingResource;
      }
    }
    else {
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
