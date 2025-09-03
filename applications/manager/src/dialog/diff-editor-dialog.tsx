import { Modal, ModalBody, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { BetterModalProps } from "@/lib/better-modal";
import { useEffect, useRef, useState } from "react";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOnBeforeUnload } from "@/hooks/use-on-before-unload";
import { useOnKeyDown } from "@/hooks/use-on-key-down";
import { packageService } from "@/package";
import * as monaco from 'monaco-editor';
import { AvailableFilesystems, ComparisonData, DatastoreInfo, DiffTreeVisualization, EditableType, MergeState } from "@/components/directory-diff";
import { Loader, RotateCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import SvgVisualDiff from "@/components/images-conflict-resolver";
import { MonacoDiffEditor } from "@/components/monaco-diff-editor";


export type ChangeActiveModelMethod = (
  originalDatastoreInfo: DatastoreInfo,
  modifiedDatastoreInfo: DatastoreInfo,
  useCache: boolean,
) => Promise<void>;

type TextDiffEditorDialogProps = {
  initialOriginalResourceNameInfo: DataResourceNameInfo,
  initialModifiedResourceIri: DataResourceNameInfo,
  editable: EditableType,
} & BetterModalProps<{
  newResourceContent: string | undefined,
}>;

export type DataResourceNameInfo = {
  resourceIri: ResourceIri,
  modelName: ModelName,
};

type ResourceIri = string;
type ModelName = string;

type CacheContentMap = Record<ResourceIri, Record<ModelName, string>>;

/**
 * Creates copy of {@link oldCache} and changes (or adds if not present) {@link newValue} at {@link dataResourceToChange}
 */
function createNewContentCache(oldCache: CacheContentMap, dataResourceToChange: DataResourceNameInfo, newValue: string) {
  const newCache = {
    ...oldCache,
    [dataResourceToChange.resourceIri]: {
      ...(oldCache[dataResourceToChange.resourceIri] ?? {}),
      [dataResourceToChange.modelName]: newValue,
    },
  };

  return newCache;
}

function isDataResourcePresentInCache(cache: CacheContentMap, dataResourceNameInfo: DataResourceNameInfo): boolean {
  return getDataResourceInCache(cache, dataResourceNameInfo) !== undefined;
}

function getDataResourceInCache(cache: CacheContentMap, dataResourceNameInfo: DataResourceNameInfo) {
  return cache[dataResourceNameInfo.resourceIri]?.[dataResourceNameInfo.modelName];
}

/**
 * TODO RadStr: Put to better place
 */
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
    console.error(`Error when fetching merge state (for iris: ${rootIriMergeFrom} and ${rootIriMergeTo}). The error: ${error}`);
    throw error;
  }
}

const saveMergeState = async (
  fetchedMergeState: MergeState,
  conflictsToBeResolvedOnSave: ComparisonData[]
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



export const TextDiffEditorDialog = ({ initialOriginalResourceNameInfo, initialModifiedResourceIri, editable, isOpen, resolve, }: TextDiffEditorDialogProps) => {
  const monacoEditor = useRef<{editor: monaco.editor.IStandaloneDiffEditor}>(undefined);

  // Set once in the useEffect
  const [examinedMergeState, setExaminedMergeState] = useState<MergeState | null>(null);
  const [conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave] = useState<ComparisonData[]>([]);

  const [cacheForOriginalTextContent, setCacheForOriginalTextContent] = useState<CacheContentMap>({});
  const [cacheForModifiedTextContent, setCacheForModifiedTextContent] = useState<CacheContentMap>({});
  const [originalDataResourceNameInfo, setOriginalResourceNameInfo] = useState<DataResourceNameInfo>({ resourceIri: "", modelName: "" });
  const [modifiedDataResourceNameInfo, setModifiedResourceNameInfo] = useState<DataResourceNameInfo>({ resourceIri: "", modelName: "" });

  const activeOriginalContent = cacheForOriginalTextContent[originalDataResourceNameInfo.resourceIri]?.[originalDataResourceNameInfo.modelName] ?? "";
  const activeModifiedContent = cacheForModifiedTextContent[modifiedDataResourceNameInfo.resourceIri]?.[modifiedDataResourceNameInfo.modelName] ?? "";

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
      // TODO RadStr: Fetch the data here
      setOriginalResourceNameInfo(initialOriginalResourceNameInfo);
      setModifiedResourceNameInfo(initialModifiedResourceIri);
      setIsLoadingTextData(true);
      const fetchedMergeState = await fetchMergeState(initialOriginalResourceNameInfo.resourceIri, initialModifiedResourceIri.resourceIri);
      setExaminedMergeState(fetchedMergeState);
    })();
  }, []);

  // @ts-ignore TODO RadStr: Remove ts-ignore later
  /**
   * Changes current active model. That is modifies states to reflect that.
   *  If {@link useCache} is set to true then tries to use cache (if the datastore is present it uses the cache, otherwise updates the cache by fetching from backend),
   *  if set to false, then always fetches from backend and updates cache
   */
  const changeActiveModel = async (newOriginalDatastoreInfo: DatastoreInfo, newModifiedDatastoreInfo: DatastoreInfo, useCache: boolean) => {
    setIsLoadingTextData(true);

    // TODO RadStr: Just for now so I have something that works, we will need only the DatastoreInfo
    const newOriginalDataResourceNameInfo: DataResourceNameInfo = {
      resourceIri: newOriginalDatastoreInfo.fullPath,
      modelName: newOriginalDatastoreInfo.name,
    };

    const newModifiedDataResourceNameInfo: DataResourceNameInfo = {
      resourceIri: newModifiedDatastoreInfo.fullPath,
      modelName: newModifiedDatastoreInfo.name,
    };

    // Set the edited value in cache
    setCacheForOriginalTextContent(prevState => {
      const currentOriginalContentInEditor = monacoEditor.current?.editor.getOriginalEditor().getValue();
      return createNewContentCache(prevState, originalDataResourceNameInfo, currentOriginalContentInEditor!);
    });
    setCacheForModifiedTextContent(prevState => {
      const currentModifiedContentInEditor = monacoEditor.current?.editor.getModifiedEditor().getValue();
      return createNewContentCache(prevState, modifiedDataResourceNameInfo, currentModifiedContentInEditor!);
    });

    const isOriginalDataResourceInCache = isDataResourcePresentInCache(cacheForOriginalTextContent, newOriginalDataResourceNameInfo);
    const isModifiedDataResourceInCache = isDataResourcePresentInCache(cacheForModifiedTextContent, newModifiedDataResourceNameInfo);
    if (!(useCache && isOriginalDataResourceInCache && isModifiedDataResourceInCache)) {
      // TODO RadStr: We have to extend the API by types  - text, JSON, YAML, ...

      // TODO RadStr: Copy-paste for modified and old
      // TODO RadStr: Also hardcoded the filesystems just for now
      const newOriginalQueryAsObject = {
        pathToDatastore: encodeURIComponent(newOriginalDatastoreInfo.fullPath),
        format: newOriginalDatastoreInfo.format,
        type: newOriginalDatastoreInfo.type,
        filesystem: AvailableFilesystems.ClassicFilesystem,
        shouldConvertToDatastoreFormat: true,
      };

      let newOriginalUrl = import.meta.env.VITE_BACKEND + "/git/get-datastore-content?";
      for (const [key, value] of Object.entries(newOriginalQueryAsObject)) {
        newOriginalUrl += key;
        newOriginalUrl += "=";
        newOriginalUrl += value;
        newOriginalUrl += "&";
      }
      newOriginalUrl = newOriginalUrl.slice(0, -1);

      const newOriginalResponse = await fetch(newOriginalUrl, {
        method: "GET",
      });

      const newOriginalObjectData = await newOriginalResponse.json();

      const newModifiedQueryAsObject = {
        pathToDatastore: encodeURIComponent(newModifiedDatastoreInfo.fullPath),
        format: newModifiedDatastoreInfo.format,
        type: newModifiedDatastoreInfo.type,
        filesystem: AvailableFilesystems.DS_Filesystem,
        shouldConvertToDatastoreFormat: true,
      };

      let newModifiedUrl = import.meta.env.VITE_BACKEND + "/git/get-datastore-content?";
      for (const [key, value] of Object.entries(newModifiedQueryAsObject)) {
        newModifiedUrl += key;
        newModifiedUrl += "=";
        newModifiedUrl += value;
        newModifiedUrl += "&";
      }
      newModifiedUrl = newModifiedUrl.slice(0, -1);

      const newModifiedResponse = await fetch(newModifiedUrl, {
        method: "GET",
      });

      const newModifiedObjectData = await newModifiedResponse.json();

      console.info({newOriginalDataResourceNameInfo: newOriginalDatastoreInfo, newModifiedDataResourceNameInfo: newModifiedDatastoreInfo});

      setCacheForOriginalTextContent(prevState => {
        const changedCacheValue = JSON.stringify(newOriginalObjectData);
        return createNewContentCache(prevState, newOriginalDataResourceNameInfo, changedCacheValue);
      });
      setCacheForModifiedTextContent(prevState => {
        const changedCacheValue = JSON.stringify(newModifiedObjectData);
        return createNewContentCache(prevState, newModifiedDataResourceNameInfo, changedCacheValue);
      });
    }

    // If set to new models, else we are reloading data
    if (newOriginalDataResourceNameInfo.resourceIri !== originalDataResourceNameInfo.resourceIri || newOriginalDataResourceNameInfo.modelName !== originalDataResourceNameInfo.modelName) {
      setOriginalResourceNameInfo(newOriginalDataResourceNameInfo);
    }

    // If set to new models, else we are reloading data
    if (newModifiedDataResourceNameInfo.resourceIri !== modifiedDataResourceNameInfo.resourceIri || newModifiedDataResourceNameInfo.modelName !== modifiedDataResourceNameInfo.modelName) {
      setModifiedResourceNameInfo(newModifiedDataResourceNameInfo);
    }

    setIsLoadingTextData(false);
  }

  const reloadModelsDataFromBackend = async () => {
    alert("TODO RadStr: Implement me");
    // await changeActiveModel(originalDataResourceNameInfo, modifiedDataResourceNameInfo, false);
  }


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
    await packageService.setResourceJsonData(modifiedDataResourceNameInfo.resourceIri, editedNewVersion, modifiedDataResourceNameInfo.modelName);
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


  // TODO RadStr: ... Don't load unless it contains svg in name
  // let originalSvg: string;
  // try {
  //   originalSvg = JSON.parse(activeOriginalContent)?.svg ?? "";
  // }
  // catch(e) {
  //   originalSvg = "";
  // }

  // let modifiedSvg: string;
  // try {
  //   modifiedSvg = JSON.parse(activeModifiedContent)?.svg ?? "";
  // }
  // catch(e) {
  //   modifiedSvg = "";
  // }
  const originalSvg: string = "";
  const modifiedSvg: string = "";

  return (
    <Tabs defaultValue="text-compare">
      <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : closeWithSuccess()}>
        <ModalContent className="max-w-none h-[100%]">
            <ModalBody className="grow flex overflow-hidden">
            {/* The pr-2 is there so the cross at the top right corner is seen */}
            <ResizablePanelGroup direction="horizontal" className="overflow-hidden pr-2">
              <ResizablePanel defaultSize={20} className="flex flex-col pr-16 pl-1 my-6">
                <ModalHeader className="mb-4">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="text-compare">Text comparison</TabsTrigger>
                        <TabsTrigger value="image-compare">Image comparison</TabsTrigger>
                      </TabsList>
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
                    <DiffTreeVisualization originalDataResourceNameInfo={originalDataResourceNameInfo}
                                            modifiedDataResourceNameInfo={modifiedDataResourceNameInfo}
                                            changeActiveModel={changeActiveModel}
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
                      <RotateCw className="flex ml-1 h-4 w-4" onClick={() => reloadModelsDataFromBackend()} />
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
