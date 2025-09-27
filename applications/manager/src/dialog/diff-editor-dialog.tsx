import { Modal, ModalBody, ModalContent, ModalHeader } from "@/components/modal";
import { BetterModalProps } from "@/lib/better-modal";
import { RefObject, SetStateAction, useEffect, useRef, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOnBeforeUnload } from "@/hooks/use-on-before-unload";
import { useOnKeyDown } from "@/hooks/use-on-key-down";
import * as monaco from 'monaco-editor';
import { DiffTreeVisualization } from "@/components/directory-diff";
import { Loader, RotateCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import SvgVisualDiff from "@/components/images-conflict-resolver";
import { MonacoDiffEditor } from "@/components/monaco-diff-editor";
import { fetchMergeState } from "./open-merge-state";
import { AvailableFilesystems, ClientFilesystem, ComparisonData, convertDatastoreContentBasedOnFormat, convertDatastoreContentForInputFormatToOutputFormat, DatastoreInfo, EditableType, MergeResolverStrategy, MergeState, stringifyDatastoreContentBasedOnFormat, getEditableValue, getEditableAndNonEditableValue } from "@dataspecer/git";
import { MergeStrategyComponent } from "@/components/merge-strategy-component";
import ExpandableList from "@/components/expandable-list";
import { RemoveFromToBeResolvedReactComponent } from "@/components/remove-from-to-be-resolved";
import { finalizeMergeState, saveMergeState } from "@/utils/merge-state-fetch-methods";

export type ChangeActiveModelMethod = (
  treePathToNodeContainingDatastore: string,
  mergeFromDatastoreInfo: DatastoreInfo | null,
  mergeToDatastoreInfo: DatastoreInfo | null,
  useCache: boolean,
) => Promise<void>;


type TextDiffEditorDialogProps = {
  initialMergeFromResourceIri: string,
  initialMergeToResourceIri: string,
  editable: EditableType,
}

type TextDiffEditorBetterModalProps = TextDiffEditorDialogProps & BetterModalProps<{
  newResourceContent: string | undefined,
}>;

type TextDiffEditorHookProps = Omit<TextDiffEditorBetterModalProps, "isOpen">;


export const DIFF_EDITOR_EDIT_ICON_TAILWIND_WIDTH = "w-6";
export const DIFF_EDITOR_EDIT_ICON_TAILWIND_HEIGHT = "h-6";

export const TextDiffEditorDialog = ({ initialMergeFromResourceIri, initialMergeToResourceIri, editable, isOpen, resolve, }: TextDiffEditorBetterModalProps) => {
  const {
    monacoEditor,
    examinedMergeState,
    conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave,
    removedDatastores, setRemovedDatastores,
    createdDatastores, setCreatedDatastores,
    convertedCacheForMergeFromContent,
    mergeFromSvg,
    mergeToSvg,
    comparisonTabType, setComparisonTabType,
    isLoadingTextData,
    isLoadingTreeStructure, setIsLoadingTreeStructure,
    activeMergeFromContentConverted,
    activeMergeToContentConverted,
    activeFormat,

    changeActiveModel,
    reloadModelsDataFromBackend,
    closeWithSuccess,
    applyAutomaticMergeStateResolver,
    saveEverything,
    unresolveToBeResolvedConflict,
    finalizeMergeStateHandler,
  } = useDiffEditorDialogProps({initialMergeFromResourceIri, initialMergeToResourceIri, editable, resolve});


  useOnBeforeUnload(true);
  useOnKeyDown(e => {
    if (e.key === "s" && e.ctrlKey) {
      e.preventDefault();
      saveEverything();
      toast.success("Saved currently opened file to backend");
    }
  });


  return (
    <Tabs defaultValue="text-compare">
      <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : closeWithSuccess()}>
        <ModalContent className="max-w-none h-[100%]">
          <ModalBody className="grow flex overflow-hidden">
            {/* The pr-2 is there so the cross at the top right corner is seen */}
            <ResizablePanelGroup direction="horizontal" className="overflow-hidden pr-2">
              <ResizablePanel defaultSize={20} className="flex flex-col pr-16 pl-1 my-6">
                <ModalHeader className="mb-4">
                  <h1 className="font-bold text-lg">Diff editor to resolve {examinedMergeState?.mergeStateCause} conflict</h1>
                  <Tabs value={comparisonTabType} onValueChange={setComparisonTabType as any}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="text-compare">Text comparison</TabsTrigger>
                      <TabsTrigger value="image-compare">Image comparison</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </ModalHeader>
                  {/* The overflow-y is needed however it adds a bit horizontal space between the vertical splitter and the Tree structure */}
                  <div className="flex flex-1 flex-col grow overflow-y-auto pr-2 -mr-2 -ml-2 pl-2 h-full w-full">
                    <div className="mb-2">
                      <ExpandableList title="Marked as resolved" items={conflictsToBeResolvedOnSave} buttonComponentContent={RemoveFromToBeResolvedReactComponent} onClickAction={unresolveToBeResolvedConflict} />
                    </div>
                    <DiffTreeVisualization changeActiveModel={changeActiveModel}
                                            isLoadingTreeStructure={isLoadingTreeStructure}
                                            setIsLoadingTreeStructure={setIsLoadingTreeStructure}
                                            mergeStateFromBackend={examinedMergeState}
                                            conflictsToBeResolvedOnSaveFromParent={conflictsToBeResolvedOnSave}
                                            setConflictsToBeResolvedOnSave={setConflictsToBeResolvedOnSave}
                                            createdDatastores={createdDatastores}
                                            setCreatedDatastores={setCreatedDatastores}
                                            removedDatastores={removedDatastores}
                                            setRemovedDatastores={setRemovedDatastores}
                                            />
                  </div>
                <div className="flex gap-2 mt-4 justify-start mb-2">
                  <Button title="This does save both the changes to files and updates the merge state" variant={"default"} onClick={() => saveEverything()}>
                    Save changes and update merge state (Ctrl + S)
                  </Button>
                  <Button title="This performs the operation, which triggered the merge state. Can be pull/push/merge" variant={"default"} onClick={finalizeMergeStateHandler}>
                    Finalize merge state
                  </Button>
                </div>
              </ResizablePanel>
              {/* The minus "ml" shenanigans in classNames are because of some weird spaces caused by overflow-y-auto in the diff editor */}
              <ResizableHandle className="-ml-16" withHandle autoFocus={false} />
              <ResizablePanel className="overflow-hidden flex flex-col pt-1 h-screen bg-white z-10">
                { isLoadingTextData && Object.keys(convertedCacheForMergeFromContent).length !== 0 &&     // The check for non-empty objects is there se we don't show loading on initial load
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                }
                { !isLoadingTextData &&
                   <div className="flex flex-col flex-1 h-screen">
                    <Tabs value={comparisonTabType}>
                      <TabsContent value="image-compare">
                        <RotateCw className="flex ml-1 h-4 w-4" onClick={reloadModelsDataFromBackend} />
                        <div>
                          <SvgVisualDiff mergeFromSvg={mergeFromSvg} mergeToSvg={mergeToSvg} />
                        </div>
                      </TabsContent>
                      <TabsContent value="text-compare">
                        <div className="flex items-center space-x-4">
                          <RotateCw className="flex ml-1 h-4 w-4" onClick={reloadModelsDataFromBackend} />
                          <MergeStrategyComponent handleMergeStateResolving={applyAutomaticMergeStateResolver}/>
                        </div>
                        {/* The h-screen is needed otherwise the monaco editor is not shown at all */}
                        {/* Also small note - there is loading effect when first starting up the editor, it is not any custom made functionality */}
                        <MonacoDiffEditor className="flex-1 -ml-16 h-screen" refs={monacoEditor} mergeFromContent={activeMergeFromContentConverted} editable={editable} mergeToContent={activeMergeToContentConverted} format={activeFormat} />
                      </TabsContent>
                    </Tabs>
                  </div>
                }
              </ResizablePanel>
            </ResizablePanelGroup>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Tabs>
  );
}



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
  datastoreToChange: DatastoreInfo,
  newValue: string
) {
  const newCache = {
    ...oldCache,
    [treePathToNodeContainingDatastore]: {
      ...(oldCache[datastoreToChange.fullPath] ?? {}),
      [datastoreToChange.type]: newValue,
    },
  };

  return newCache;
}

function isDatastorePresentInCache(cache: CacheContentMap, datastoreInfo: DatastoreInfo | null): boolean {
  if (datastoreInfo === null) {
    return false;
  }
  return getDatastoreInCache(cache, datastoreInfo) !== undefined;
}

function getDatastoreInCache(cache: CacheContentMap, datastoreInfo: DatastoreInfo) {
  return cache[datastoreInfo.fullPath]?.[datastoreInfo.type];
}

const updateCacheContentEntryEverywhere = (
  convertedCacheSetter: (value: SetStateAction<CacheContentMap>) => void,
  treePathToNodeContainingDatastore: string,
  datastoreInfo: DatastoreInfo,
  newValue: string,
  format: string,
) => {
  const convertedNewValue = convertDatastoreContentBasedOnFormat(newValue, format, true);
  const stringifiedConvertedNewValue = stringifyDatastoreContentBasedOnFormat(convertedNewValue, format, true);
  convertedCacheSetter(prevState => {
    return createNewContentCache(prevState, treePathToNodeContainingDatastore, datastoreInfo, stringifiedConvertedNewValue);
  });
}

const updateCacheContentEntry = (
  cacheSetter: (value: SetStateAction<CacheContentMap>) => void,
  treePathToNodeContainingDatastore: string,
  datastoreInfo: DatastoreInfo,
  newValue: string,
) => {
  cacheSetter(prevState => {
    return createNewContentCache(prevState, treePathToNodeContainingDatastore, datastoreInfo, newValue);
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

export const useDiffEditorDialogProps = ({editable, initialMergeFromResourceIri, initialMergeToResourceIri, resolve}: TextDiffEditorHookProps) => {
  const monacoEditor = useRef<{editor: monaco.editor.IStandaloneDiffEditor}>(undefined);

  // Set once in the useEffect
  const [examinedMergeState, setExaminedMergeState] = useState<MergeState | null>(null);
  const [conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave] = useState<ComparisonData[]>([]);
  const [removedDatastores, setRemovedDatastores] = useState<DatastoreInfo[]>([]);
  const [createdDatastores, setCreatedDatastores] = useState<DatastoreInfo[]>([]);

  const [currentTreePathToNodeContainingDatastore, setCurrentTreePathToNodeContainingDatastore] = useState<string>("");
  const [formatsForCacheEntries, setFormatsForCacheEntries] = useState<FormatsCache>({});
  const [datastoreInfosForCacheEntries, setDatastoreInfosForCacheEntries] = useState<DatastoreInfosCache>({});
  // Converted cache because it is string, but in one of the formats to which it was converted
  const [convertedCacheForMergeFromContent, setConvertedCacheForMergeFromContent] = useState<CacheContentMap>({});
  const [convertedCacheForMergeToContent, setConvertedCacheForMergeToContent] = useState<CacheContentMap>({});
  const [mergeFromDatastoreInfo, setMergeFromDatastoreInfo] = useState<DatastoreInfo | null>(null);
  const [mergeToDatastoreInfo, setMergeToDatastoreInfo] = useState<DatastoreInfo | null>(null);
  const [mergeFromSvg, setMergeFromSvg] = useState<any | "">("");
  const [mergeToSvg, setMergeToSvg] = useState<any | "">("");

  const [comparisonTabType, setComparisonTabType] = useState<"image-compare" | "text-compare">("text-compare");

  // When loading the specific file (or rather model) data from backend
  const [isLoadingTextData, setIsLoadingTextData] = useState<boolean>(true);
  // When loading the directory structure from backend
  // Note that the value itself is not set neither here it is passed to the child class
  const [isLoadingTreeStructure, setIsLoadingTreeStructure] = useState<boolean>(true);


  const activeMergeFromContentConverted = mergeFromDatastoreInfo === null ? "" : convertedCacheForMergeFromContent[currentTreePathToNodeContainingDatastore]?.[mergeFromDatastoreInfo.type] ?? "";
  const activeMergeToContentConverted = mergeToDatastoreInfo === null ? "" : convertedCacheForMergeToContent[currentTreePathToNodeContainingDatastore]?.[mergeToDatastoreInfo.type] ?? "";
  const activeFormat = (mergeToDatastoreInfo === null && mergeFromDatastoreInfo === null) ? "" : formatsForCacheEntries[currentTreePathToNodeContainingDatastore]?.[(mergeToDatastoreInfo?.type ?? mergeFromDatastoreInfo?.type) as string] ?? "";

  const resetUseStates = () => {
    setExaminedMergeState(null);
    setConflictsToBeResolvedOnSave([]);
    setCreatedDatastores([]);
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

  /**
   * Changes current active model. That is modifies states to reflect that.
   *  If {@link useCache} is set to true then tries to use cache (if the datastore is present it uses the cache, otherwise updates the cache by fetching from backend),
   *  if set to false, then always fetches from backend and updates cache
   */
  const changeActiveModel = async (
    treePathToNodeContainingDatastore: string,
    newMergeFromDatastoreInfo: DatastoreInfo | null,
    newMergeToDatastoreInfo: DatastoreInfo | null,
    useCache: boolean,
  ) => {
    if (newMergeFromDatastoreInfo === null && newMergeToDatastoreInfo === null) {
      // TOOD RadStr: Not sure about this special case, but I think this should be the correct way to handle it
      setMergeFromDatastoreInfo(null);
      setMergeToDatastoreInfo(null);
      setCurrentTreePathToNodeContainingDatastore(treePathToNodeContainingDatastore);
      return;
    }


    setIsLoadingTextData(true);
    // Note that it must be always string because of the if guard for both nulls at the start of method
    const newDatastoreType = (newMergeFromDatastoreInfo?.type ?? newMergeToDatastoreInfo?.type) as string;

    setCurrentTreePathToNodeContainingDatastore(treePathToNodeContainingDatastore);
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

    // Set the edited value in cache
    if (mergeFromDatastoreInfo !== null) {
      const currentMergeFromContentInEditor = editors.mergeFromEditor?.getValue()!;
      updateCacheContentEntryEverywhere(setConvertedCacheForMergeFromContent,
        treePathToNodeContainingDatastore, mergeFromDatastoreInfo, currentMergeFromContentInEditor, newFormat);
    }
    if (mergeToDatastoreInfo !== null) {
      const currentMergeToContentInEditor = editors.mergeToEditor?.getValue()!;
      updateCacheContentEntryEverywhere(setConvertedCacheForMergeToContent,
        treePathToNodeContainingDatastore, mergeToDatastoreInfo, currentMergeToContentInEditor, newFormat);
    }

    const isMergeFromDataResourceInCache = isDatastorePresentInCache(convertedCacheForMergeFromContent, newMergeFromDatastoreInfo);
    const isMergeToDataResourceInCache = isDatastorePresentInCache(convertedCacheForMergeToContent, newMergeToDatastoreInfo);
    if (!(useCache && isMergeFromDataResourceInCache && isMergeToDataResourceInCache)) {
      const newMergeFromDataAsText = await ClientFilesystem.getDatastoreContentDirectly(newMergeFromDatastoreInfo, false, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeFrom ?? null);
      const newMergeToDataAsText = await ClientFilesystem.getDatastoreContentDirectly(newMergeToDatastoreInfo, false, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeTo ?? null);

      console.info({newMergeFromDataResourceNameInfo: newMergeFromDatastoreInfo, newMergeToDataResourceNameInfo: newMergeToDatastoreInfo});

      if (newMergeFromDataAsText !== null && newMergeFromDatastoreInfo !== null) {
        const convertedCacheValue = convertDatastoreContentBasedOnFormat(newMergeFromDataAsText, newMergeFromDatastoreInfo.format, true);
        const stringifiedCachevalue = stringifyDatastoreContentBasedOnFormat(convertedCacheValue, newFormat, true);
        updateCacheContentEntryEverywhere(setConvertedCacheForMergeFromContent,
          treePathToNodeContainingDatastore, newMergeFromDatastoreInfo, stringifiedCachevalue, newFormat);
      }

      if (newMergeToDataAsText !== null && newMergeToDatastoreInfo !== null) {
        const convertedCacheValue = convertDatastoreContentBasedOnFormat(newMergeToDataAsText, newMergeToDatastoreInfo.format, true);
        const stringifiedCachevalue = stringifyDatastoreContentBasedOnFormat(convertedCacheValue, newFormat, true);
        updateCacheContentEntryEverywhere(setConvertedCacheForMergeToContent,
          treePathToNodeContainingDatastore, newMergeToDatastoreInfo, stringifiedCachevalue, newFormat);
      }
    }

    // If set to new models, else we are reloading data
    if (newMergeFromDatastoreInfo?.fullPath !== mergeFromDatastoreInfo?.fullPath || newMergeFromDatastoreInfo?.type !== mergeFromDatastoreInfo?.type) {
      setMergeFromDatastoreInfo(newMergeFromDatastoreInfo);
    }

    // If set to new models, else we are reloading data
    if (newMergeToDatastoreInfo?.fullPath !== mergeToDatastoreInfo?.fullPath || newMergeToDatastoreInfo?.type !== mergeToDatastoreInfo?.type) {
      setMergeToDatastoreInfo(newMergeToDatastoreInfo);
    }

    setIsLoadingTextData(false);
  }

  const reloadModelsDataFromBackend = async () => {
    if (mergeFromDatastoreInfo !== null && mergeToDatastoreInfo !== null) {
      await changeActiveModel(currentTreePathToNodeContainingDatastore, mergeFromDatastoreInfo, mergeToDatastoreInfo, false);
    }
  };

  const saveChangesToCache = async () => {
    if (mergeFromDatastoreInfo !== null && mergeToDatastoreInfo !== null) {
      await changeActiveModel(currentTreePathToNodeContainingDatastore, mergeFromDatastoreInfo, mergeToDatastoreInfo, true);
    }
  };


  const applyAutomaticMergeStateResolver = (mergeStrategy: MergeResolverStrategy) => {
    const datastoreInfoForEditable = getEditableValue(editable, mergeFromDatastoreInfo, mergeToDatastoreInfo);
    if (datastoreInfoForEditable === null) {
      return;
    }

    const setCacheToTextContentForEditable = getEditableValue(editable, setConvertedCacheForMergeFromContent, setConvertedCacheForMergeToContent);
    const activeMergeContents = getEditableAndNonEditableValue(editable, activeMergeFromContentConverted, activeMergeToContentConverted);

    const mergeResolveResult = mergeStrategy.resolve(activeMergeContents.nonEditable, activeMergeContents.editable);
    updateCacheContentEntry(setCacheToTextContentForEditable, currentTreePathToNodeContainingDatastore, datastoreInfoForEditable, mergeResolveResult);
  };

  const closeWithSuccess = () => {
    const editedNewVersion = monacoEditor.current?.editor.getModifiedEditor()?.getValue();
    resolve({ newResourceContent: editedNewVersion });
  };

  const saveEverything = async () => {
    await saveChangesToCache();
    await saveFileChanges();
    if (examinedMergeState !== null) {
      await saveMergeState(examinedMergeState, conflictsToBeResolvedOnSave);
    }
    closeWithSuccess();
  };

  const unresolveToBeResolvedConflict = (comparisonData: ComparisonData) => {
    setConflictsToBeResolvedOnSave(prev => {
      return prev.filter(iteratedComparison => iteratedComparison !== comparisonData);
    });
  };

  const saveFileChanges = async () => {
    const editableCacheContents = getEditableValue(editable, convertedCacheForMergeFromContent, convertedCacheForMergeToContent);
    const editableFilesystem = getEditableValue(editable, examinedMergeState?.filesystemTypeMergeFrom, examinedMergeState?.filesystemTypeMergeTo) ?? null;

    for (const [nodeTreePath, datastoreInfoMap] of Object.entries(datastoreInfosForCacheEntries)) {
      for (const [modelName, datastoreInfo] of Object.entries(datastoreInfoMap)) {
        const datastoreInfoForEditable = getEditableValue(editable, datastoreInfo.mergeFrom, datastoreInfo.mergeTo);

        let removedDatastore: DatastoreInfo | undefined;
        if ((removedDatastore = removedDatastores.find(datastore => datastore.fullPath === datastoreInfoForEditable?.fullPath)) !== undefined) {
          const datastoreParentIri = examinedMergeState?.diffTreeData?.diffTree[nodeTreePath].resource.metadataCache.iri!;
          await ClientFilesystem.removeDatastoreDirectly(datastoreParentIri, removedDatastore, import.meta.env.VITE_BACKEND , editableFilesystem, false);
          continue;
        }

        const format = formatsForCacheEntries[nodeTreePath][modelName];
        const newValue = editableCacheContents[nodeTreePath][modelName];
        const newValueAsJSON = convertDatastoreContentForInputFormatToOutputFormat(newValue, format, "json", true);
        await ClientFilesystem.updateDatastoreContentDirectly(datastoreInfoForEditable, newValueAsJSON, editableFilesystem, import.meta.env.VITE_BACKEND);
        await reloadModelsDataFromBackend();
      }
    }


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
    changeActiveModel,
    saveChangesToCache,
    reloadModelsDataFromBackend,
    closeWithSuccess,
    applyAutomaticMergeStateResolver,
    saveEverything,
    unresolveToBeResolvedConflict,
    finalizeMergeStateHandler,
  };
}