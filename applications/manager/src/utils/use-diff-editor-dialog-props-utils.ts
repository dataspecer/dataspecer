import { TextDiffEditorBetterModalProps } from "@/dialog/diff-editor-dialog";
import { AvailableFilesystems, convertDatastoreContentBasedOnFormat, CreateDatastoreFilesystemNodesInfo, DatastoreComparison, DatastoreInfo, DiffTree, EditableType, FilesystemNode, getDatastoreInfoOfGivenDatastoreType, getDefaultValueForMissingDatastoreInDiffEditor, getEditableAndNonEditableValue, getEditableValue, getMergeFromAndMergeTo, MergeResolverStrategy, MergeState, ResourceComparison, ResourceDatastoreStripHandlerBase, stringifyDatastoreContentBasedOnFormat, stringifyShareableMetadataInfoFromDatastoreContent } from "@dataspecer/git";
import { Dispatch, RefObject, SetStateAction } from "react";
import { toast } from "sonner";
import * as monaco from "monaco-editor";

type FullTreePath = string;
type ModelName = string;

export type CacheContentMap = Record<FullTreePath, Record<ModelName, string>>;

export type FormatsCache = Record<FullTreePath, Record<ModelName, string>>;

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

export function isDatastorePresentInCache(cache: CacheContentMap, treePathToFilesystemNode: string, datastoreType: string | null): boolean {
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
export function getDatastoreInCacheAsObject(
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
export const convertDataAndUpdateCacheContentEntryAsCombination = (
  convertedCacheSetter: (value: SetStateAction<CacheContentMap>) => void,
  treePathToNodeContainingDatastore: string,
  resourceType: string,
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
  updateCacheContentEntryAsCombination(convertedCacheSetter, treePathToNodeContainingDatastore, resourceType, datastoreType, convertedNewValue.value, format);
}

/**
 * Combines the given object {@link newValueAsJSON} with the previous value and stores it into cache.
 *  The combination is with the stripped values. The other values come from the new object.
 */
export const updateCacheContentEntryAsCombination = (
  cacheSetter: (value: SetStateAction<CacheContentMap>) => void,
  treePathToNodeContainingDatastore: string,
  resourceType: string,
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

    const stripMethod = new ResourceDatastoreStripHandlerBase(resourceType).createHandlerMethodForDatastoreType(datastoreType);
    const { strippedValues: previousStrippedValues } = stripMethod(previousValueAsJSON, false);
    for (const [key, val] of Object.entries(previousStrippedValues)) {
      if (val === undefined) {
        delete previousStrippedValues[key];
      }
    }

    let combinedValue: any = {};
    if (previousStrippedValues["iri"] !== undefined) {
      combinedValue["iri"] = previousStrippedValues["iri"];
    }
    const previousStrippedValuesWithoutIri = {
      ...previousStrippedValues
    };
    delete previousStrippedValuesWithoutIri["iri"];

    combinedValue = {
      ...combinedValue,
      ...newValueAsJSON,
      ...previousStrippedValuesWithoutIri,
    };

    const stringifiedConvertedCombinedValue = stringifyDatastoreContentBasedOnFormat(combinedValue, outputFormat, true);
    return createNewContentCache(prevState, treePathToNodeContainingDatastore, datastoreType, stringifiedConvertedCombinedValue);
  });
}


export function getEditorsInOriginalOrder(
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
export function findValueInCache(
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

export type TextDiffEditorHookProps = Omit<TextDiffEditorBetterModalProps, "isOpen">;
export type MergeFromMergeToStrings = { mergeFrom: string | null, mergeTo: string | null };

/**
 * Only the mappings of metas (respectively filesystem nodes). We do not need other datastores iris.
 */
export type IriMappings = {
  iriToProjectIriMap: Record<string, string>;
  projectIriToIriMap: Record<string, MergeFromMergeToStrings>;
  iriMappingFromNonEditableToEditable: Record<string, string | null>;
  projectIriToDiffNodeMap: Record<string, ResourceComparison>;
};


/**
 * Creates the mappins based on the content of the {@link diffTree}.
 * @param iriToProjectIriMap is an output parameter
 * @param projectIriToIriMap is an output parameter
 * @param iriMappingFromNonEditableToEditable is an output parameter
 * @param projectIriToDiffNodeMap is an output parameter
 */
export function createIriMappings(
  diffTree: DiffTree,
  editable: EditableType,
  // Output parameters:
  iriToProjectIriMap: Record<string, string>,
  projectIriToIriMap: Record<string, MergeFromMergeToStrings>,
  iriMappingFromNonEditableToEditable: Record<string, string | null>,
  projectIriToDiffNodeMap: Record<string, ResourceComparison>,
): void {
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


/**
 * Handles the fact that we have to create parent nodes if they do not exist during creating (The user clicked "+")
 * @todo Maybe it would be better to add everything from the parents, since we usually want to add everything not just metas.
 */
export async function onCascadeUpdateForCreatedDatastores(
  nodeTreePath: string,
  examinedMergeState: MergeState | null,
  editable: EditableType,
  datastoreCausingTheUpdate: DatastoreInfo | null,
  updateModelDataOnCreate: (projectIriTreePathToNodeContainingDatastore: string, givenMergeFromDatastoreInfo: DatastoreInfo | null, givenMergeToDatastoreInfo: DatastoreInfo | null) => Promise<void>,
  setConflictsToBeResolvedOnSave: Dispatch<SetStateAction<DatastoreComparison[]>>,
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

        const { mergeFrom: mergeFromFilesystemNode, mergeTo: mergeToFilesystemNode } = getMergeFromAndMergeTo(editable, currentDiffNode?.resources.old, currentDiffNode?.resources.new);
        const mergeFromMetadataInfo = (mergeFromFilesystemNode === undefined || mergeFromFilesystemNode === null) ? null : getDatastoreInfoOfGivenDatastoreType(mergeFromFilesystemNode, "meta");
        const mergeToMetadataInfo = (mergeToFilesystemNode === undefined || mergeToFilesystemNode === null) ? null : getDatastoreInfoOfGivenDatastoreType(mergeToFilesystemNode, "meta");
        console.info({mergeFromMetadataInfo, mergeToMetadataInfo});     // TODO RadStr DEBUG: Debug print
        await updateModelDataOnCreate(existingResource!.projectIrisTreePath, mergeFromMetadataInfo, mergeToMetadataInfo);
        setCreatedDatastores(prev => [...prev, metadataInfo]);
        const datastoreComparison = currentDiffNode.datastoreComparisons.find(comparison => comparison.affectedDataStore.fullPath === metadataInfo.fullPath);
        if (datastoreComparison !== undefined) {
          // Ideally we would set it in useEffect when setCreatedDatastores changes, but the DatastoreInfo does not provide enough info.
          //  (It does not contain the projectIri).
          setConflictsToBeResolvedOnSave(prev => {
            if (prev.findIndex(prevVal => prevVal.affectedDataStore.fullPath === datastoreComparison.affectedDataStore.fullPath) !== -1) {
              return prev;
            }
            else {
              return [...prev, datastoreComparison];
            }
          });
        }

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
export function pickFormat(
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

export type ParamsForApplyMergeStateResolver = {
  mergeStrategy: MergeResolverStrategy;
  editable: EditableType;
  mergeFromDatastoreInfo: DatastoreInfo | null;
  mergeToDatastoreInfo: DatastoreInfo | null;
  setConvertedCacheContentForMergeFrom: (value: SetStateAction<CacheContentMap>) => void;
  setConvertedCacheContentForMergeTo: (value: SetStateAction<CacheContentMap>) => void;
  mergeFromContentConverted: string;
  mergeToContentConverted: string;
  resourceType: string;
  datastoreType: string;
  format: string;
  projectIriTreePathToNodeContainingDatastore: string;
}

export function applyAutomaticMergeStateResolverToSingleModel(params: ParamsForApplyMergeStateResolver): string | null {
  const {
    datastoreType, editable, format, mergeFromContentConverted,
    mergeFromDatastoreInfo, mergeStrategy, mergeToContentConverted,
    mergeToDatastoreInfo, projectIriTreePathToNodeContainingDatastore, resourceType,
    setConvertedCacheContentForMergeFrom, setConvertedCacheContentForMergeTo
  } = params;

  const datastoreInfoForEditable = getEditableValue(editable, mergeFromDatastoreInfo, mergeToDatastoreInfo);
  if (datastoreInfoForEditable === null) {
    return null;
  }

  const setCacheToTextContentForEditable = getEditableValue(editable, setConvertedCacheContentForMergeFrom, setConvertedCacheContentForMergeTo);
  const mergeContents = getEditableAndNonEditableValue(editable, mergeFromContentConverted, mergeToContentConverted);

  // TODO RadStr Critical: Probably does not work correctly for YAML/JSON, because of the format
  const mergeResolveResult = mergeStrategy.resolve(mergeContents.nonEditable, mergeContents.editable, datastoreType, format);
  const resourceStripHandlerMethod = new ResourceDatastoreStripHandlerBase(resourceType).createHandlerMethodForDatastoreType(datastoreType);
  const newContentAsObject = convertDatastoreContentBasedOnFormat(mergeResolveResult, format, true, resourceStripHandlerMethod);
  if (!newContentAsObject.ok) {
    throw new Error(newContentAsObject.error);
  }
  updateCacheContentEntryAsCombination(setCacheToTextContentForEditable, projectIriTreePathToNodeContainingDatastore, resourceType, datastoreInfoForEditable.type, newContentAsObject.value, format);
  return mergeResolveResult;
}
