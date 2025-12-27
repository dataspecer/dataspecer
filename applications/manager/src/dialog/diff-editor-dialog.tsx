import { Modal, ModalBody, ModalContent, ModalHeader } from "@/components/modal";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOnBeforeUnload } from "@/hooks/use-on-before-unload";
import { useOnKeyDown } from "@/hooks/use-on-key-down";
import { DiffTreeVisualization } from "@/components/directory-diff";
import { Loader, RotateCw } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { TabsContent } from "@radix-ui/react-tabs";
import SvgVisualDiff from "@/components/images-conflict-resolver";
import { MonacoDiffEditor } from "@/components/monaco-diff-editor";
import { MergeStrategyComponent } from "@/components/merge-strategy-component";
import { useDiffEditorDialogProps } from "@/hooks/use-diff-editor-dialog-props";
import { DatastoreInfo, EditableType } from "@dataspecer/git";
import { BetterModalProps } from "@/lib/better-modal";

export type UpdateModelDataMethod = (
  treePathToNodeContainingDatastore: string,
  mergeFromDatastoreInfo: DatastoreInfo | null,
  mergeToDatastoreInfo: DatastoreInfo | null,
  mergeFromRelevantMetaDatastoreInfo: DatastoreInfo | null,
  mergeToRelevantMetaDatastoreInfo: DatastoreInfo | null,
  useCache: boolean,
  shouldChangeActiveModel: boolean,
  shouldCopyIfMissing: boolean,
) => Promise<void>;

export type TextDiffEditorBetterModalProps = TextDiffEditorDialogProps & BetterModalProps<{
  newResourceContent: string | undefined,
}>;

type TextDiffEditorDialogProps = {
  initialMergeFromResourceIri: string,
  initialMergeToResourceIri: string,
  editable: EditableType,
}

export const DIFF_EDITOR_EDIT_ICON_TAILWIND_WIDTH = "w-6";
export const DIFF_EDITOR_EDIT_ICON_TAILWIND_HEIGHT = "h-6";

export const TextDiffEditorDialog = ({ initialMergeFromResourceIri, initialMergeToResourceIri, editable, isOpen, resolve, }: TextDiffEditorBetterModalProps) => {
  const {
    monacoEditor,
    examinedMergeState, setExaminedMergeState,
    conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave,
    removedDatastores, setRemovedDatastores, addToRemovedDatastoresAndAddToCache,
    createdDatastores, addToCreatedDatastoresAndAddToCache,
    createdFilesystemNodes,
    removedTreePaths, setRemovedTreePaths,
    convertedCacheForMergeFromContent,
    mergeFromSvg, mergeToSvg,
    comparisonTabType, setComparisonTabType,
    isLoadingTextData,
    isLoadingTreeStructure, setIsLoadingTreeStructure,
    strippedMergeFromContent, strippedMergeToContent,
    showStrippedVersion, setShowStrippedVersion,
    activeTreePathToNodeContainingDatastore,
    activeDatastoreType,
    activeFormat,
    activeConflicts,
    datastoreInfosForCacheEntries,

    updateModelData,
    reloadModelsDataFromBackend,
    closeWithSuccess,
    applyAutomaticMergeStateResolver,
    saveEverything,
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
            <ResizablePanelGroup direction="horizontal" className="overflow-hidden">
              <ResizablePanel defaultSize={20} className="flex flex-col pr-16">
                <ModalHeader className="mb-2">
                  <h1 className="font-bold bg-gray-200 text-lg"><p>Diff editor to resolve {examinedMergeState?.mergeStateCause} conflict</p></h1>
                  <Tabs value={comparisonTabType} onValueChange={setComparisonTabType as any}>
                    {/* <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="text-compare">Text comparison</TabsTrigger>
                      <TabsTrigger value="image-compare">Image comparison</TabsTrigger>
                    </TabsList> */}
                  </Tabs>
                </ModalHeader>
                  {/* The overflow-y is needed however it adds a bit horizontal space between the vertical splitter and the Tree structure */}
                  <div className="h-full">
                    <div className="flex flex-1 flex-col grow pr-2 -mr-2 -ml-2 pl-2 h-[80%] w-full">
                      <DiffTreeVisualization updateModelData={updateModelData}
                                              datastoreInfosForCacheEntries={datastoreInfosForCacheEntries}
                                              isLoadingTreeStructure={isLoadingTreeStructure}
                                              setIsLoadingTreeStructure={setIsLoadingTreeStructure}
                                              mergeStateFromBackend={examinedMergeState}
                                              conflictsToBeResolvedOnSaveFromParent={conflictsToBeResolvedOnSave}
                                              setConflictsToBeResolvedOnSave={setConflictsToBeResolvedOnSave}
                                              createdFilesystemNodes={createdFilesystemNodes}
                                              createdDatastores={createdDatastores}
                                              addToCreatedDatastores={addToCreatedDatastoresAndAddToCache}
                                              removedDatastores={removedDatastores}
                                              setRemovedDatastores={setRemovedDatastores}
                                              setRemovedDatastoresAndLoadIntoCache={addToRemovedDatastoresAndAddToCache}
                                              removedTreePaths={removedTreePaths}
                                              setRemovedTreePaths={setRemovedTreePaths}
                                              />
                    </div>
                    <div className="gap-2 mt-7 justify-start -pl-8">
                      <Button title="Closes the diff editor without saving changes"
                              variant={"outline"}
                              onClick={() => closeWithSuccess()}
                              className="m-1">
                        Close
                      </Button>
                      <Button title="This does save both the changes to files and updates the merge state"
                              variant={"outline"}
                              onClick={() => saveEverything()}
                              className="m-1 bg-blue-600 hover:bg-blue-700">
                        Save All (Ctrl + S)
                      </Button>
                      {
                      ((activeConflicts?.length ?? 1) !== 0) ? null :
                        <Button title="First saves all the unsaved changes and then it performs the operation, which triggered the merge state. Can be pull/push/merge"
                                variant={"outline"}
                                onClick={finalizeMergeStateHandler}
                                className="m-1 bg-green-600 hover:bg-green-700">
                          Save and Finalize
                        </Button>
                      }
                    </div>
                  </div>
              </ResizablePanel>
              {/* The minus "ml" shenanigans in classNames are because of some weird spaces caused by overflow-y-auto in the diff editor */}
              <ResizableHandle className="-ml-16" withHandle autoFocus={false} />
              <ResizablePanel className="overflow-hidden flex flex-col h-screen bg-white">
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
                        <div className="grid grid-cols-[5%_95%]">
                            <RotateCw className="flex mt-3 ml-1 h-4 w-4 cursor-pointer" onClick={reloadModelsDataFromBackend} />
                          <div className="flex items-center justify-center space-x-4">
                            <MergeStrategyComponent handleMergeStateResolving={applyAutomaticMergeStateResolver}/>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={showStrippedVersion}
                                onChange={(e) => setShowStrippedVersion(e.target.checked)}
                                className="w-5 h-5 accent-blue-600"
                              />
                              <span>{showStrippedVersion ? "Showing stripped version" : "Showing raw version"}</span>
                            </label>
                          </div>
                        </div>
                        {/* The h-screen is needed otherwise the monaco editor is not shown at all */}
                        {/* Also small note - there is loading effect when first starting up the editor, it is not any custom made functionality */}
                        <MonacoDiffEditor className="flex-1 -ml-16 h-screen"
                                          editorRef={monacoEditor}
                                          mergeFromContent={strippedMergeFromContent}
                                          editable={editable}
                                          mergeToContent={strippedMergeToContent}
                                          datastoreType={activeDatastoreType}
                                          format={activeFormat}
                                          projectIrisTreePathToFilesystemNode={activeTreePathToNodeContainingDatastore}
                                          setMergeState={setExaminedMergeState}
                                          />
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
