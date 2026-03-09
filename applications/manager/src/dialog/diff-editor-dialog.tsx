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
import { AvailableFilesystems, DatastoreInfo, EditableType, getEditableAndNonEditableValue } from "@dataspecer/git";
import { BetterModalProps } from "@/lib/better-modal";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { saveChangesTooltipText } from "./outside-changes-to-diff-editor-action-dialog";

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
  initialMergeFromRootMetaPath: string,
  initialMergeToRootMetaPath: string,
  editable: EditableType,
}

type BranchDataToRender = {
  branch?: string;
  filesystem?: AvailableFilesystems;
}

export const DIFF_EDITOR_EDIT_ICON_TAILWIND_WIDTH = "w-6";
export const DIFF_EDITOR_EDIT_ICON_TAILWIND_HEIGHT = "h-6";

export const TextDiffEditorDialog = ({ initialMergeFromRootMetaPath, initialMergeToRootMetaPath, editable, isOpen, resolve, }: TextDiffEditorBetterModalProps) => {
  const {
    monacoEditor,
    examinedMergeState, setExaminedMergeState,
    conflictsToBeResolvedOnSave, setConflictsToBeResolvedOnSave,
    removedDatastores, setRemovedDatastores, addToRemovedDatastoresAndAddToCache,
    createdDatastores, addToCreatedDatastoresAndAddToCache,
    createdFilesystemNodes,
    removedTreePaths, setRemovedTreePaths,
    convertedCacheContentForMergeFrom,
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
  } = useDiffEditorDialogProps({initialMergeFromRootMetaPath, initialMergeToRootMetaPath, editable, resolve});


  useOnBeforeUnload(true);
  useOnKeyDown(e => {
    if (e.key === "s" && e.ctrlKey) {
      e.preventDefault();
      saveEverything();
      toast.success("Saved currently opened file to backend");
    }
  });


  const mergeFromBranchDataToRender: BranchDataToRender = {
    branch: examinedMergeState?.branchMergeFrom,
    filesystem: examinedMergeState?.filesystemTypeMergeFrom,
  };
  const mergeToBranchDataToRender: BranchDataToRender = {
    branch: examinedMergeState?.branchMergeTo,
    filesystem: examinedMergeState?.filesystemTypeMergeTo,
  };
  const {editable: editableBranchDataToRender, nonEditable: nonEditableBranchDataToRender} = examinedMergeState === null ?
    {
      editable: { branch: "", filesystem: AvailableFilesystems.DS_Filesystem },
      nonEditable: { branch: "", filesystem: AvailableFilesystems.DS_Filesystem }
    } :
    getEditableAndNonEditableValue(examinedMergeState?.editable, mergeFromBranchDataToRender, mergeToBranchDataToRender);


  return (
    <Tabs defaultValue="text-compare">
      <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : closeWithSuccess()}>
        <ModalContent className="max-w-none! h-full! py-0 rounded-none! border-none!">
          <ModalBody className="grow overflow-hidden h-screen!">
            {/* The pr-2 is there so the cross at the top right corner is seen */}
            <ResizablePanelGroup direction="horizontal" className="overflow-hidden">
              <ResizablePanel defaultSize={20} className="flex! flex-col pr-16">
                <ModalHeader className="mb-2">
                  <h1 className="flex flex-1 flex-row font-bold bg-gray-200 text-lg">
                    <p>Diff editor to resolve {examinedMergeState?.mergeStateCause} conflict</p>
                    <DiffEditorInfoPopOver/>
                  </h1>
                  <Tabs value={comparisonTabType} onValueChange={setComparisonTabType as any}>
                    {/* <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="text-compare">Text comparison</TabsTrigger>
                      <TabsTrigger value="image-compare">Image comparison</TabsTrigger>
                    </TabsList> */}
                  </Tabs>
                </ModalHeader>
                  {/* The overflow-y is needed however it adds a bit horizontal space between the vertical splitter and the Tree structure */}
                  <div className="h-full">
                    <div className="flex! flex-1 flex-col grow pr-2 -mr-2 -ml-2 pl-2 h-[80%]! w-full!">
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
                              className="m-1 border bg-blue-100 border-blue-500 hover:bg-blue-500 hover:text-white transition">
                        Save All (Ctrl + S)
                      </Button>
                      {
                      ((activeConflicts?.length ?? 1) !== 0) ? null :
                        <Button title="First saves all the unsaved changes and then it performs the operation, which triggered the merge state. Can be pull/push/merge"
                                variant={"outline"}
                                onClick={finalizeMergeStateHandler}
                                className="m-1 border bg-green-100 border-green-500 hover:bg-green-500 hover:text-white transition">
                          Save and Finalize
                        </Button>
                      }
                    </div>
                  </div>
              </ResizablePanel>
              {/* The minus "ml" shenanigans in classNames are because of some weird spaces caused by overflow-y-auto in the diff editor */}
              <ResizableHandle className="-ml-16" withHandle autoFocus={false} />
              <ResizablePanel className="overflow-hidden flex! flex-col">
                { isLoadingTextData && Object.keys(convertedCacheContentForMergeFrom).length !== 0 &&     // The check for non-empty objects is there se we don't show loading on initial load
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                }
                { !isLoadingTextData &&
                   <div className="flex! flex-col flex-1 h-screen overflow-hidden">
                    <Tabs value={comparisonTabType}>
                      <TabsContent value="image-compare">
                        <RotateCw className="flex! ml-1 h-4 w-4" onClick={reloadModelsDataFromBackend} />
                        <div>
                          <SvgVisualDiff mergeFromSvg={mergeFromSvg} mergeToSvg={mergeToSvg} />
                        </div>
                      </TabsContent>
                      <TabsContent value="text-compare">
                        <div className="grid grid-cols-[5%_95%]! border-b">
                          <RotateCw className="flex! mt-3 ml-1 h-4 w-4 cursor-pointer" onClick={reloadModelsDataFromBackend} />
                          <div className="flex! items-center justify-center space-x-4 ml-16 pl-32">
                            <MergeStrategyComponent handleMergeStateResolving={applyAutomaticMergeStateResolver}/>
                            <label className="flex! items-center">
                              <input
                                type="checkbox"
                                checked={showStrippedVersion}
                                onChange={(e) => setShowStrippedVersion(e.target.checked)}
                                className="w-5 h-5 accent-blue-600 ml-28"
                              />
                              &nbsp;<span>{showStrippedVersion ? "Showing stripped version" : "Showing raw version"}</span>
                            </label>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 items-center w-full pt-2 pb-2">
                          <div className="text-center">
                            {nonEditableBranchDataToRender?.branch} {nonEditableBranchDataToRender?.filesystem === AvailableFilesystems.ClassicFilesystem ? " (Git)" : ""}
                          </div>


                          <div className="text-center">
                            {editableBranchDataToRender?.branch} {editableBranchDataToRender?.filesystem === AvailableFilesystems.ClassicFilesystem ? " (Git)" : ""}
                          </div>
                        </div>
                        {/* Also small note - there is loading effect when first starting up the editor, it is not any custom made functionality */}
                        <MonacoDiffEditor className="-ml-2 h-[95.5%]!"       // The h- has to be defined otherwise it takes full window (which goes beyound the start taskbar)
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

function DiffEditorInfoPopOver() {
  return <div className="pt-1">
    <PopOverGitGeneralComponent>
      <p>- Diff Editor's purpose is to resolve the merge state by performing changes to models and marking conflicts (⚠️) as resolved (✅).</p>
      <p>- {saveChangesTooltipText}</p>
      <p>- The stripped version of file hides content, which is expected to be changed automatically, such as export time.</p>
      <p>- The left component of this dialog contains directory diff. The directory diff is visualized with regards to the editable window of the text editor.</p>
      <p>- This means that:</p>
      <div className="flex flex-1 flex-row">&nbsp;&nbsp; -&nbsp;<p className="text-red-600">Red</p>&nbsp;node - It is NOT present in the editable window.</div>
      <div className="flex flex-1 flex-row">&nbsp;&nbsp; -&nbsp;<p className="text-green-600">Green</p>&nbsp;node - It is present in the editable window. And not in the other one.</div>
      <div className="flex flex-1 flex-row">&nbsp;&nbsp; -&nbsp;<p className="text-blue-600">Blue</p>&nbsp;node - Present in both, but they differ.</div>
      <p>&nbsp;&nbsp; - Otherwise - Same text in both.</p>
      <p>- The merge actors are not changed in any way. This means that you have to manually do all the changes if needed.</p>
      <p className="pl-5">You can also use merge strategy at the top to do the changes automatically. The changes are applied to the currently opened file.</p>
      <p>- The editable window is always on the right.</p>
      <p>- For pull and merge the editable windows are the "merge to" actors.</p>
      <p>- The push is reversed, that is the editable window is the "merge from" actor. This is same as in Git, since the "merge to" is the remote.</p>
      <p>&nbsp;&nbsp; Therefore, we have to update the local (the "merge from") to contain the changes from remote and then we can perform the push.</p>
    </PopOverGitGeneralComponent>
  </div>;
}