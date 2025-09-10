import { Modal, ModalBody, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { BetterModalProps } from "@/lib/better-modal";
import { SetStateAction, useEffect, useRef, useState } from "react";
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
import { ClientFilesystem, ComparisonData, DatastoreInfo, EditableType, MergeResolverStrategy, MergeState } from "@dataspecer/git";
import { MergeStrategyComponent } from "@/components/merge-strategy-component";


export type ChangeActiveModelMethod = (
  originalDatastoreInfo: DatastoreInfo | null,
  modifiedDatastoreInfo: DatastoreInfo | null,
  useCache: boolean,
) => Promise<void>;

type TextDiffEditorDialogProps = {
  initialOriginalResourceIri: string,
  initialModifiedResourceIri: string,
  editable: EditableType,
} & BetterModalProps<{
  newResourceContent: string | undefined,
}>;

type FullPath = string;
type ModelName = string;

type CacheContentMap = Record<FullPath, Record<ModelName, string>>;

/**
 * Creates copy of {@link oldCache} and changes (or adds if not present) {@link newValue} at {@link datastoreToChange}
 */
function createNewContentCache(oldCache: CacheContentMap, datastoreToChange: DatastoreInfo, newValue: string) {
  const newCache = {
    ...oldCache,
    [datastoreToChange.fullPath]: {
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

const saveMergeState = async (
  fetchedMergeState: MergeState,
  conflictsToBeResolvedOnSave: ComparisonData[],
) => {
  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/update-merge-state`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uuid: fetchedMergeState.uuid,
          newlyResolvedConflicts: conflictsToBeResolvedOnSave.map(conflict => conflict.affectedDataStore.fullPath),
        }),
      });
    console.info("update merge state response", fetchResult);   // TODO RadStr: Debug

    return fetchResult;
  }
  catch(error) {
    console.error(`Error when updating merge state (${fetchedMergeState}). The error: ${error}`);
    throw error;
  }
};

const finalizeMergeState = async (mergeStateUUID: string | undefined) => {
  if (mergeStateUUID === undefined) {
    // I think that it should be error
    throw new Error("Error when updating merge state, there is actually no merge state");
  }

  try {
    const fetchResult = await fetch(
      `${import.meta.env.VITE_BACKEND}/git/finalize-merge-state?uuid=${mergeStateUUID}`, {
        method: "POST",
      });
    console.info("Finalize merge state response", fetchResult);   // TODO RadStr: Debug

    return fetchResult;
  }
  catch(error) {
    console.error(`Error when updating merge state (${mergeStateUUID}). The error: ${error}`);
    throw error;
  }
}

const updateCacheContentEntry = (
    cacheSetter: (value: SetStateAction<CacheContentMap>) => void,
    datastoreInfo: DatastoreInfo,
    newValue: string,
  ) => {
    cacheSetter(prevState => {
      return createNewContentCache(prevState, datastoreInfo, newValue);
    });
  }


export const TextDiffEditorDialog = ({ initialOriginalResourceIri, initialModifiedResourceIri, editable, isOpen, resolve, }: TextDiffEditorDialogProps) => {
  const monacoEditor = useRef<{editor: monaco.editor.IStandaloneDiffEditor}>(undefined);

  // Set once in the useEffect
  const [examinedMergeState, setExaminedMergeState] = useState<MergeState | null>(null);
  const [conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave] = useState<ComparisonData[]>([]);

  const [cacheForOriginalTextContent, setCacheForOriginalTextContent] = useState<CacheContentMap>({});
  const [cacheForModifiedTextContent, setCacheForModifiedTextContent] = useState<CacheContentMap>({});
  const [originalDatastoreInfo, setOriginalDatastoreInfo] = useState<DatastoreInfo | null>(null);
  const [modifiedDatastoreInfo, setModifiedDatastoreInfo] = useState<DatastoreInfo | null>(null);

  const [comparisonTabType, setComparisonTabType] = useState<"image-compare" | "text-compare">("text-compare");

  const activeOriginalContent = originalDatastoreInfo === null ? "" : cacheForOriginalTextContent[originalDatastoreInfo.fullPath]?.[originalDatastoreInfo.type] ?? "";
  const activeModifiedContent = modifiedDatastoreInfo === null ? "" : cacheForModifiedTextContent[modifiedDatastoreInfo.fullPath]?.[modifiedDatastoreInfo.type] ?? "";

  useOnBeforeUnload(true);
  useOnKeyDown(e => {
    if (e.key === "s" && e.ctrlKey) {
      e.preventDefault();
      saveFileChanges();
      toast.success("Saved currently opened file to backend");
    }
  });

  // When loading the directory structure from backend
  // Note that the value itself is not set neither here it is passed to the child class
  const [isLoadingTreeStructure, setIsLoadingTreeStructure] = useState<boolean>(true);
  // When loading the concrete file (or rather model) data from backend
  const [isLoadingTextData, setIsLoadingTextData] = useState<boolean>(true);
  useEffect(() => {
    (async () => {
      setIsLoadingTextData(true);
      const fetchedMergeState = await fetchMergeState(initialOriginalResourceIri, initialModifiedResourceIri, true);
      setExaminedMergeState(fetchedMergeState);
    })();
  }, []);

  /**
   * Changes current active model. That is modifies states to reflect that.
   *  If {@link useCache} is set to true then tries to use cache (if the datastore is present it uses the cache, otherwise updates the cache by fetching from backend),
   *  if set to false, then always fetches from backend and updates cache
   */
  const changeActiveModel = async (
    newOriginalDatastoreInfo: DatastoreInfo | null,
    newModifiedDatastoreInfo: DatastoreInfo | null,
    useCache: boolean,
  ) => {
    setIsLoadingTextData(true);

    if (newOriginalDatastoreInfo?.type === "svg" || newModifiedDatastoreInfo?.type === "svg") {
      setComparisonTabType("image-compare");
    }
    else {
      setComparisonTabType("text-compare");
    }

    // Set the edited value in cache
    if (originalDatastoreInfo !== null && originalDatastoreInfo?.fullPath !== newOriginalDatastoreInfo?.fullPath) {
      const currentOriginalContentInEditor = monacoEditor.current?.editor.getOriginalEditor().getValue()!;
      updateCacheContentEntry(setCacheForOriginalTextContent, originalDatastoreInfo, currentOriginalContentInEditor);
    }
    if(modifiedDatastoreInfo !== null && modifiedDatastoreInfo?.fullPath !== newModifiedDatastoreInfo?.fullPath) {
      const currentModifiedContentInEditor = monacoEditor.current?.editor.getModifiedEditor().getValue()!;
      updateCacheContentEntry(setCacheForModifiedTextContent, modifiedDatastoreInfo, currentModifiedContentInEditor);
    }

    const isOriginalDataResourceInCache = isDatastorePresentInCache(cacheForOriginalTextContent, newOriginalDatastoreInfo);
    const isModifiedDataResourceInCache = isDatastorePresentInCache(cacheForModifiedTextContent, newModifiedDatastoreInfo);
    if (!(useCache && isOriginalDataResourceInCache && isModifiedDataResourceInCache)) {
      // TODO RadStr: We have to extend the API by types  - text, JSON, YAML, ...
      // TODO RadStr: Also I should use the filesystem and original/modified based on the editable not hardcore it
      const newOriginalObjectData = await ClientFilesystem.getDatastoreContentDirectly(newOriginalDatastoreInfo, true, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeFrom ?? null);
      const newModifiedObjectData = await ClientFilesystem.getDatastoreContentDirectly(newModifiedDatastoreInfo, true, import.meta.env.VITE_BACKEND, examinedMergeState?.filesystemTypeMergeTo ?? null);

      console.info({newOriginalDataResourceNameInfo: newOriginalDatastoreInfo, newModifiedDataResourceNameInfo: newModifiedDatastoreInfo});

      if (newOriginalObjectData !== null && newOriginalDatastoreInfo !== null) {
        const changedCacheValue = JSON.stringify(newOriginalObjectData);
        updateCacheContentEntry(setCacheForOriginalTextContent, newOriginalDatastoreInfo, changedCacheValue);
      }

      if (newModifiedObjectData !== null && newModifiedDatastoreInfo !== null) {
        const changedCacheValue = JSON.stringify(newModifiedObjectData);
        updateCacheContentEntry(setCacheForModifiedTextContent, newModifiedDatastoreInfo, changedCacheValue);
      }
    }

    // If set to new models, else we are reloading data
    if (newOriginalDatastoreInfo?.fullPath !== originalDatastoreInfo?.fullPath || newOriginalDatastoreInfo?.type !== originalDatastoreInfo?.type) {
      setOriginalDatastoreInfo(newOriginalDatastoreInfo);
    }

    // If set to new models, else we are reloading data
    if (newModifiedDatastoreInfo?.fullPath !== modifiedDatastoreInfo?.fullPath || newModifiedDatastoreInfo?.type !== modifiedDatastoreInfo?.type) {
      setModifiedDatastoreInfo(newModifiedDatastoreInfo);
    }

    setIsLoadingTextData(false);
  }

  const reloadModelsDataFromBackend = async () => {
    if (originalDatastoreInfo !== null && modifiedDatastoreInfo !== null) {
      await changeActiveModel(originalDatastoreInfo, modifiedDatastoreInfo, false);
    }
  };


  const handleMergeStateResolving = (mergeStrategy: MergeResolverStrategy) => {
    if (modifiedDatastoreInfo === null) {
      return;
    }

    const mergeResolveResult = mergeStrategy.resolve(activeOriginalContent, activeModifiedContent);
    console.info(activeModifiedContent === mergeResolveResult, {activeModifiedContent, mergeResolveResult});
    updateCacheContentEntry(setCacheForModifiedTextContent, modifiedDatastoreInfo, mergeResolveResult);
  };

  const closeWithSuccess = () => {
    // TODO RadStr: Don't know if it can ever be undefined, so for now just ?, but in future change the type to string only and use !. instead of ?.
    const editedNewVersion = monacoEditor.current?.editor.getModifiedEditor().getValue();
    resolve({ newResourceContent: editedNewVersion });
  };

  const saveEverything = async () => {
    await saveFileChanges();
    if (examinedMergeState !== null) {
      await saveMergeState(examinedMergeState, conflictsToBeResolvedOnSave);
    }
    closeWithSuccess();
  };

  const saveFileChanges = async () => {
    const editedNewVersion = JSON.parse(monacoEditor.current?.editor.getModifiedEditor().getValue() ?? "{}");
    ClientFilesystem.updateDatastoreContentDirectly(modifiedDatastoreInfo, editedNewVersion, examinedMergeState?.filesystemTypeMergeTo ?? null, import.meta.env.VITE_BACKEND);
    // await updateDatastoreDirectly(modifiedDatastoreInfo.resourceIri, editedNewVersion, modifiedDatastoreInfo.modelName);   // TODO RadStr: Remove - old version
    await reloadModelsDataFromBackend();


    // // Remove all listeners first
    // const modifiedEditor = monacoEditor.current?.editor.getModifiedEditor();
    // // modifiedEditor?.dispose();

    // // Define overlay widget
    // // const overlayWidget: monaco.editor.IOverlayWidget = {
    // //   getId: () => "myOverlayWidget", // unique id
    // //   getDomNode: () => {
    // //     const domNode = document.createElement("div");
    // //     domNode.style.background = "rgba(0,0,0,0.6)";
    // //     domNode.style.color = "white";
    // //     domNode.style.padding = "4px 8px";
    // //     domNode.style.borderRadius = "4px";
    // //     domNode.textContent = "Click Me";
    // //     domNode.style.cursor = "pointer";
    // //     domNode.onclick = () => alert("Overlay widget clicked!");
    // //     return domNode;
    // //   },
    // //   getPosition: () => {
    // //     return {
    // //       preference: monaco.editor.OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER,
    // //     };
    // //   },
    // // };

    // // Define a glyph margin widget
    // const myGlyphWidget: monaco.editor.IGlyphMarginWidget = {
    //   getId: () => "uniqueGlyphWidget",
    //   getDomNode: () => {
    //     const el = document.createElement("div");
    //     el.textContent = "⭐"; // could be icon, button, etc.
    //     el.style.cursor = "pointer";
    //     el.onclick = () => alert("Glyph clicked!");
    //     return el;
    //   },
    //   getPosition: () => ({
    //     lane: monaco.editor.GlyphMarginLane.Left, // or Right, depending on config
    //     range: new monaco.Range(3, 1, 3, 1),    // targeting line 3
    //     zIndex: 1,
    //   }),
    // };

    // // Add the widget
    // modifiedEditor?.addGlyphMarginWidget(myGlyphWidget);

    // // If needed, re-layout after style or layout changes
    // modifiedEditor?.layoutGlyphMarginWidget(myGlyphWidget);

    // // Create the glyph margin widget
    // const reactGlyphWidget: monaco.editor.IGlyphMarginWidget = {
    //   getId: () => "reactGlyphWidget",
    //   getDomNode: () => {
    //     const container = document.createElement("div");

    //     // Render React component into the DOM node
    //     const root = createRoot(container);
    //     root.render(
    //       <div>
    //         <button className="focus:outline-none text-white bg-green-700 hover:bg-green-800 focus:ring-4 focus:ring-green-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-green-600 dark:hover:bg-green-700 dark:focus:ring-green-800" onClick={() => alert("Glyph clicked1!")} />
    //         <button className="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900" onClick={() => alert("Glyph clicked2!")} />
    //       </div>
    //     );

    //     return container;
    //   },
    //   getPosition: () => ({
    //     lane: monaco.editor.GlyphMarginLane.Left,
    //     range: new monaco.Range(2, 1, 2, 1), // line 2
    //     zIndex: 10,
    //   }),
    // };

    // // Add the react widget
    // modifiedEditor?.addGlyphMarginWidget(reactGlyphWidget);

    // // Add the overlay
    // // modifiedEditor?.addOverlayWidget(overlayWidget);
  };


  let originalSvg: string = "";
  if (originalDatastoreInfo?.type === "svg") {
    originalSvg = JSON.parse(activeOriginalContent)?.svg ?? "";
  }
  let modifiedSvg: string = "";
  if (modifiedDatastoreInfo?.type === "svg") {
    modifiedSvg = JSON.parse(activeModifiedContent)?.svg ?? "";
  }

  return (
    <Tabs defaultValue="text-compare">
      <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : closeWithSuccess()}>
        <ModalContent className="max-w-none h-[100%]">
            <ModalBody className="grow flex overflow-hidden">
            {/* The pr-2 is there so the cross at the top right corner is seen */}
            <ResizablePanelGroup direction="horizontal" className="overflow-hidden pr-2">
              <ResizablePanel defaultSize={20} className="flex flex-col pr-16 pl-1 my-6">
                <ModalHeader className="mb-4">
                  <Tabs value={comparisonTabType}>
                    <TabsList className="grid w-full grid-cols-2" content="image-compare">
                      <TabsTrigger value="text-compare">Text comparison</TabsTrigger>
                      <TabsTrigger value="image-compare">Image comparison</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <ModalTitle>Text diff editor</ModalTitle>
                  <ModalDescription>
                    {/* TODO RadStr: Empty for now */}
                  </ModalDescription>
                </ModalHeader>
                  {/* The overflow-y is needed however it adds a bit horizontal space between the vertical splitter and the Tree structure */}
                  <div className="flex flex-1 flex-col grow overflow-y-auto pr-2 -mr-2 -ml-2 pl-2 h-full w-full">
                    {
                      conflictsToBeResolvedOnSave.map(conflictToBeResolvedOnSave => {
                        return <div>{conflictToBeResolvedOnSave.affectedDataStore.fullPath}</div>;
                      })
                    }
                    <DiffTreeVisualization changeActiveModel={changeActiveModel}
                                            isLoadingTreeStructure={isLoadingTreeStructure}
                                            setIsLoadingTreeStructure={setIsLoadingTreeStructure}
                                            mergeStateFromBackend={examinedMergeState}
                                            setConflictsToBeResolvedOnSave={setConflictsToBeResolvedOnSave}
                                            />
                  </div>
                <div className="flex gap-2 mt-4 justify-start mb-2">
                  <Button title="Note that this only saves the changes to files. It does not touch the current merge state, that is conflicts."variant="outline" onClick={() => saveFileChanges()}>
                    Save file changes (Ctrl + S)
                  </Button>
                  <Button title="This does save both the changes to files and updates the merge state" variant={"default"} onClick={() => saveEverything()}>
                    Save changes and update merge state
                  </Button>
                  <Button title="This performs the operation, which triggered the merge state. Can be pull/push/merge" variant={"default"} onClick={() => finalizeMergeState(examinedMergeState?.uuid)}>
                    Finalize merge state
                  </Button>
                </div>
              </ResizablePanel>
              {/* The minus "ml" shenanigans in classNames are because of some weird spaces caused by overflow-y-auto in the diff editor */}
              <ResizableHandle className="-ml-16" withHandle autoFocus={false} />
              <ResizablePanel className="overflow-hidden flex flex-col pt-1 h-screen bg-white z-10">
                { isLoadingTextData && Object.keys(cacheForOriginalTextContent).length !== 0 &&     // The check for non-empty objects is there se we don't show loading on initial load
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                }
                { !isLoadingTextData &&
                   <div className="flex flex-col flex-1 h-screen">
                    <TabsContent value="image-compare">
                      <RotateCw className="flex ml-1 h-4 w-4" onClick={() => reloadModelsDataFromBackend()} />
                      <div>
                        <SvgVisualDiff originalSvg={originalSvg} modifiedSvg={modifiedSvg} />
                      </div>
                    </TabsContent>
                    <TabsContent value="text-compare">
                      <div className="flex items-center space-x-4">
                        <RotateCw className="flex ml-1 h-4 w-4" onClick={() => reloadModelsDataFromBackend()} />
                        <MergeStrategyComponent handleMergeStateResolving={handleMergeStateResolving}/>
                      </div>
                      {/* The h-screen is needed otherwise the monaco editor is not shown at all */}
                      {/* Also small note - there is loading effect when first starting up the editor, it is not any custom made functionality */}
                      <MonacoDiffEditor className="flex-1 -ml-16 h-screen" refs={monacoEditor} originalContent={activeOriginalContent} editable={editable} modifiedContent={activeModifiedContent} language="text" />
                    </TabsContent>
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
