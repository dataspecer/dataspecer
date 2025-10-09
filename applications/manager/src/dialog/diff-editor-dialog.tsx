import { Modal, ModalBody, ModalContent, ModalHeader } from "@/components/modal";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOnBeforeUnload } from "@/hooks/use-on-before-unload";
import { useOnKeyDown } from "@/hooks/use-on-key-down";
import { DiffTreeVisualization } from "@/components/directory-diff";
import { Loader, RotateCw } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import SvgVisualDiff from "@/components/images-conflict-resolver";
import { MonacoDiffEditor } from "@/components/monaco-diff-editor";
import { MergeStrategyComponent } from "@/components/merge-strategy-component";
import ExpandableList from "@/components/expandable-list";
import { RemoveFromToBeResolvedReactComponent } from "@/components/remove-from-to-be-resolved";
import { TextDiffEditorBetterModalProps, useDiffEditorDialogProps } from "@/hooks/use-diff-editor-dialog-props";
import { DatastoreInfo } from "@dataspecer/git";

export type UpdateModelDataMethod = (
  treePathToNodeContainingDatastore: string,
  mergeFromDatastoreInfo: DatastoreInfo | null,
  mergeToDatastoreInfo: DatastoreInfo | null,
  useCache: boolean,
  shouldChangeActiveModel: boolean,
) => Promise<void>;



export const DIFF_EDITOR_EDIT_ICON_TAILWIND_WIDTH = "w-6";
export const DIFF_EDITOR_EDIT_ICON_TAILWIND_HEIGHT = "h-6";

export const TextDiffEditorDialog = ({ initialMergeFromResourceIri, initialMergeToResourceIri, editable, isOpen, resolve, }: TextDiffEditorBetterModalProps) => {
  const {
    monacoEditor,
    examinedMergeState,
    conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave,
    removedDatastores, setRemovedDatastores,
    createdDatastores, setCreatedDatastores,
    createdFilesystemNodes,
    removedTreePaths, setRemovedTreePaths,
    convertedCacheForMergeFromContent,
    mergeFromSvg,
    mergeToSvg,
    comparisonTabType, setComparisonTabType,
    isLoadingTextData,
    isLoadingTreeStructure, setIsLoadingTreeStructure,
    activeMergeFromContentConverted,
    activeMergeToContentConverted,
    datastoreInfosForCacheEntries,
    activeFormat,

    updateModelData,
    updateModelDataWithoutActiveModelChange,
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

  /**
   * @param metadataDatastoreInfoToCreate We need the meta file to correctly create the paret filesystem ndoe if it does not exist.
   */
  const setCreatedDatastoresAndAddToCache = async (
    parentProjectIrisTreePath: string,
    datastoreInfoToCreate: DatastoreInfo,
    metadataDatastoreInfoToCreate: DatastoreInfo | null,
  ) => {
    await updateModelDataWithoutActiveModelChange(parentProjectIrisTreePath, datastoreInfoToCreate, null);
    if (metadataDatastoreInfoToCreate !== null) {
      await updateModelDataWithoutActiveModelChange(parentProjectIrisTreePath, metadataDatastoreInfoToCreate, null);
    }
    setCreatedDatastores(prev => {
      const newDatastores = [...prev, datastoreInfoToCreate];
      if (metadataDatastoreInfoToCreate !== null &&
        newDatastores.find(datastore => datastore.fullPath === metadataDatastoreInfoToCreate.fullPath) === undefined &&
        (datastoreInfosForCacheEntries[metadataDatastoreInfoToCreate.fullPath]?.mergeTo ?? null) === null) {
        // If It is not null and not present in the datastores to be and also it was not yet created.
        newDatastores.push(metadataDatastoreInfoToCreate);
      }
      return newDatastores;
    });
  };


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
                    <DiffTreeVisualization updateModelData={updateModelData}
                                            isLoadingTreeStructure={isLoadingTreeStructure}
                                            setIsLoadingTreeStructure={setIsLoadingTreeStructure}
                                            mergeStateFromBackend={examinedMergeState}
                                            conflictsToBeResolvedOnSaveFromParent={conflictsToBeResolvedOnSave}
                                            setConflictsToBeResolvedOnSave={setConflictsToBeResolvedOnSave}
                                            createdFilesystemNodes={createdFilesystemNodes}
                                            createdDatastores={createdDatastores}
                                            setCreatedDatastores={setCreatedDatastoresAndAddToCache}
                                            removedDatastores={removedDatastores}
                                            setRemovedDatastores={setRemovedDatastores}
                                            removedTreePaths={removedTreePaths}
                                            setRemovedTreePaths={setRemovedTreePaths}
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
                        <MonacoDiffEditor className="flex-1 -ml-16 h-screen" editorRef={monacoEditor} mergeFromContent={activeMergeFromContentConverted} editable={editable} mergeToContent={activeMergeToContentConverted} format={activeFormat} />
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
