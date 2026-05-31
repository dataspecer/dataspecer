import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@/components/modal";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useOnBeforeUnload } from "@/hooks/use-on-before-unload";
import { useOnKeyDown } from "@/hooks/use-on-key-down";
import { DiffTreeVisualization } from "@/components/directory-diff";
import { ArrowDownIcon, ArrowUpIcon, Loader } from "lucide-react";
import SvgVisualDiffDialog from "@/dialog/show-svgs-diff-dialog";
import { goToNextDiff, goToPreviousDiff, MonacoDiffEditor } from "@/components/monaco-diff-editor";
import { MergeStrategyComponent } from "@/components/merge-strategy-component";
import { useDiffEditorDialogProps } from "@/hooks/use-diff-editor-dialog-props";
import { AvailableFilesystems, createEmptyMergeState, DatastoreComparison, DatastoreInfo, EditableType, getEditableAndNonEditableValue, MergeState, MergeStateCause, createComparisonResultForTourMode } from "@dataspecer/git";
import { BetterModalProps, useBetterModal } from "@/lib/better-modal";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { EntriesAffectedByCreateType } from "@/utils/use-diff-editor-dialog-props-utils";
import { startDiffEditorDialogTour } from "@/components/driver-tutorial-tours/diff-editor-dialog-tutorial";

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
  const openModel = useBetterModal();
  const { t } = useTranslation();

  const [tourMockMode, setTourMockMode] = useState(false);

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
      toast.success("git.diff-editor.toast.saved-cache-to-backend");
    }
  });

  const cantFinalize = (activeConflicts?.length ?? 1) !== 0;
  const mergeStateCauseText = examinedMergeState?.mergeStateCause ? t(`git.diff-editor.merge-state-cause.${examinedMergeState.mergeStateCause}`) : "";


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


  const [conflictsToBeResolvedOnSaveForTour, setConflictsToBeResolvedOnSaveForTour] = useState<DatastoreComparison[]>([]);
  const createdFilesystemNodesForTour: React.RefObject<Record<string, EntriesAffectedByCreateType>> = useRef({});
  const createdDatastoresForTour: React.RefObject<DatastoreInfo[]> = useRef([]);
  const [removedDatastoresForTour, setRemovedDatastoresForTour] = useState<DatastoreInfo[]>([]);
  const [removedTreePathsForTour, setRemovedTreePathsForTour] = useState<string[]>([]);
  const mergeStateFromBackendForTourMode: React.RefObject<MergeState | null> = useRef(null);

  useEffect(() => {
    return () => {
      if (!tourMockMode) {
        setIsLoadingTreeStructure(true);
        // Create the data for the tour mode.
        createComparisonResultForTourMode().then((result) => {
          mergeStateFromBackendForTourMode.current = createEmptyMergeState(
            examinedMergeState?.mergeStateCause ?? "pull", result.diffTree, result.diffTreeSize, result.conflicts,
          );
          setConflictsToBeResolvedOnSaveForTour(conflictsToBeResolvedOnSave);
          createdFilesystemNodesForTour.current = {};
          createdDatastoresForTour.current = [];
          setRemovedDatastoresForTour([]);
          setRemovedTreePathsForTour([]);
          setIsLoadingTreeStructure(false);
        });
      }
    };
  }, [tourMockMode]);

  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : closeWithSuccess()}>
      <ModalContent className="max-w-none! h-full! py-0 rounded-none! border-none!">
        <ModalBody className="grow overflow-hidden h-screen!">
          {/* The pr-2 is there so the cross at the top right corner is seen */}
          <ResizablePanelGroup direction="horizontal" className="overflow-hidden">
            <ResizablePanel defaultSize={20} className="flex! flex-col pr-16">
              <ModalHeader>
                <ModalTitle className="flex flex-1 flex-row font-bold text-lg pt-1.25 border-b">
                  <p>{t("git.diff-editor.title", { cause: mergeStateCauseText })}</p>
                  {examinedMergeState?.mergeStateCause === undefined ? null : <DiffEditorInfoGeneralPopOver mergeStateCause={examinedMergeState?.mergeStateCause}/>}
                </ModalTitle>
              </ModalHeader>
                {/* The overflow-y is needed however it adds a bit horizontal space between the vertical splitter and the Tree structure */}
                <div className="h-full">
                    { !tourMockMode ?
                        <div className="flex! flex-1 flex-col grow pr-2 -mr-2 -ml-2 pl-2 h-[70%]! w-full!">
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
                        </div> :
                        <div id="diff-editor-tree-panel-for-tour" className="flex! flex-1 flex-col grow pr-2 -mr-2 -ml-2 pl-2 h-[70%]! w-full!">
                          <DiffTreeVisualization updateModelData={async () => {}}
                                                  datastoreInfosForCacheEntries={{}}
                                                  isLoadingTreeStructure={false}
                                                  setIsLoadingTreeStructure={() => {}}
                                                  mergeStateFromBackend={mergeStateFromBackendForTourMode.current}
                                                  conflictsToBeResolvedOnSaveFromParent={conflictsToBeResolvedOnSaveForTour}
                                                  setConflictsToBeResolvedOnSave={setConflictsToBeResolvedOnSaveForTour}
                                                  createdFilesystemNodes={createdFilesystemNodesForTour.current}
                                                  createdDatastores={createdDatastoresForTour.current}
                                                  addToCreatedDatastores={async () => {}}
                                                  removedDatastores={removedDatastoresForTour}
                                                  setRemovedDatastores={setRemovedDatastoresForTour}
                                                  setRemovedDatastoresAndLoadIntoCache={async () => {}}
                                                  removedTreePaths={removedTreePathsForTour}
                                                  setRemovedTreePaths={setRemovedTreePathsForTour}
                                                  tourModeActive={true}
                          />
                        </div>
                    }
                  <div className="gap-2 mt-7 justify-start -pl-8">
                    <Button title={t("git.diff-editor.button.close-tooltip")}
                            variant={"outline"}
                            onClick={() => closeWithSuccess()}
                            className="m-1">
                      {t("close")}
                    </Button>
                    <Button id="diff-editor-save-all-button" title={t("git.diff-editor.button.save-all-tooltip")}
                            variant={"outline"}
                            onClick={() => saveEverything()}
                            className="m-1 border bg-blue-100 border-blue-500 hover:bg-blue-500 hover:text-white dark:bg-blue-900 dark:border-blue-400 dark:hover:bg-blue-500 dark:hover:text-white transition">
                      {t("git.diff-editor.button.save-all")}
                    </Button>
                    {
                    isLoadingTreeStructure ? null :
                    <span title={cantFinalize ?
                                t("git.diff-editor.tooltip.resolve-conflicts") :
                                t("git.diff-editor.tooltip.save-and-finalize") }>
                      <Button id="diff-editor-finalize-button" variant={"outline"}
                              onClick={finalizeMergeStateHandler}
                              disabled={cantFinalize}
                              className="m-1 border bg-green-100 border-green-500 hover:bg-green-500 hover:text-white dark:bg-green-900 dark:border-green-400 dark:hover:bg-green-500 dark:hover:text-white transition">
                        {cantFinalize ? t("git.diff-editor.button.save-finalize-warning") : t("git.diff-editor.button.save-finalize")}
                      </Button>
                    </span>
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
                    <div className="grid grid-cols-[5%_95%]! border-b pb-1">
                      {
                        activeDatastoreType === "svg" ?
                          <div className="flex! mt-3 ml-1 h-4 w-4" /> :
                          <div className="flex! mt-3 ml-1 h-4 w-4" />
                      }
                      <div className="flex! items-center justify-center space-x-4 -ml-32">    { /* TODO RadStr: ... the ml mr is a bit hacky, it does not scale well */ }
                        <div className="flex flex-row mr-24">
                          <Button id="diff-editor-prev-diff" className="flex! cursor-pointer" variant="outline" onClick={() => goToPreviousDiff(monacoEditor.current?.editor)}><ArrowUpIcon/>{t("git.diff-editor.button.prev-diff")}</Button>
                          <Button id="diff-editor-next-diff" className="flex! ml-1 cursor-pointer" variant="outline" onClick={() => goToNextDiff(monacoEditor.current?.editor)}><ArrowDownIcon/>{t("git.diff-editor.button.next-diff")}</Button>
                          <Button id="diff-editor-tour-button" className="flex! ml-1 cursor-pointer" variant="outline" onClick={() => { setTourMockMode(true); startDiffEditorDialogTour(t, () => setTourMockMode(false)); }}>{t("git.diff-editor.button.tutorial", "Tour")}</Button>
                        </div>
                        <MergeStrategyComponent handleMergeStateResolving={applyAutomaticMergeStateResolver}/>
                        {
                          activeDatastoreType === "svg" ?
                            <Button variant="default" onClick={() => {openModel(SvgVisualDiffDialog, {editableType: editable, mergeFromSvg, mergeToSvg})}}>{t("git.diff-editor.button.show-as-images")}</Button>
                            : null
                        }
                        <label id="diff-editor-show-stripped-version" className="flex! items-center">
                          <input
                            type="checkbox"
                            checked={showStrippedVersion}
                            onChange={(e) => setShowStrippedVersion(e.target.checked)}
                            className="w-5 h-5 accent-blue-600 ml-28"
                            title={t("git.diff-editor.checkbox.show-stripped-version-tooltip")}
                          />
                          &nbsp;<span>{t("git.diff-editor.checkbox.show-stripped-version")}</span>
                        </label>
                      </div>
                    </div>
                    {
                      tourMockMode ?
                        <div className="grid grid-cols-2 items-center w-full pt-1 pb-1">
                          <div id="diff-editor-branch-names-tour-left" className="text-center font-semibold">
                            my-tour-branch (Git)
                          </div>
                          <div id="diff-editor-branch-names-tour-right" className="text-center font-semibold">
                            my-tour-branch
                          </div>
                        </div> :
                        <div className="grid grid-cols-2 items-center w-full pt-1 pb-1">
                          <div className="text-center font-semibold">
                            {nonEditableBranchDataToRender?.branch} {nonEditableBranchDataToRender?.filesystem === AvailableFilesystems.ClassicFilesystem ? " (Git)" : ""}
                          </div>

                          <div className="text-center font-semibold">
                            {editableBranchDataToRender?.branch} {editableBranchDataToRender?.filesystem === AvailableFilesystems.ClassicFilesystem ? " (Git)" : ""}
                          </div>
                        </div>
                    }
                    <MonacoDiffEditor className="-ml-2 h-[95.5%]!"       // The h- has to be defined otherwise it takes full window (which goes beyound the start taskbar)
                                      editorRef={monacoEditor}
                                      mergeFromContent={strippedMergeFromContent}
                                      editable={editable}
                                      mergeToContent={strippedMergeToContent}
                                      datastoreType={activeDatastoreType}
                                      format={activeFormat}
                                      projectIrisTreePathToFilesystemNode={activeTreePathToNodeContainingDatastore}
                                      mergeState={examinedMergeState}
                                      setMergeState={setExaminedMergeState}
                    />
                  </div>
              }
            </ResizablePanel>
          </ResizablePanelGroup>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}


function DiffEditorInfoGeneralPopOver(props: {mergeStateCause: MergeStateCause}) {
  const [shouldAnimate, setShouldAnimate] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShouldAnimate(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return <div id="diff-editor-info-general" onMouseEnter={() => setShouldAnimate(false)} className={`${shouldAnimate ? "motion-safe:animate-ping pt-2.5" : "pt-1"}`}>
    <PopOverGitGeneralComponent>
      <BasicTutorialTooltipForMergeState mergeStateCause={props.mergeStateCause}/>
    </PopOverGitGeneralComponent>
  </div>;
}


const BasicTutorialTooltipForMergeState = (props: {mergeStateCause: MergeStateCause}): React.ReactNode => {
  const { t } = useTranslation();
  const commonTooltipPart = <strong>{t("git.diff-editor.tooltip.common.line-one")}<br/>
    {t("git.diff-editor.tooltip.common.line-two")}<br/><br/>
    </strong>;
  switch(props.mergeStateCause) {
    case "pull":
      return <div>
        {commonTooltipPart}
        <p><strong>{t("git.diff-editor.tooltip.pull.line.one.part-one")}</strong>! {t("git.diff-editor.tooltip.pull.line.one.part-two")} <strong>{t("git.diff-editor.tooltip.pull.line.one.part-three")}</strong> {t("git.diff-editor.tooltip.pull.line.one.part-four")}</p>
        <p><strong>{t("git.diff-editor.tooltip.pull.left-window.part-one")}</strong> = {t("git.diff-editor.tooltip.pull.left-window.part-two")}<strong>{t("git.diff-editor.tooltip.pull.left-window.part-three")}</strong>{t("git.diff-editor.tooltip.pull.left-window.part-four")}</p>
        <p><strong>{t("git.diff-editor.tooltip.pull.right-window.part-one")}</strong> = {t("git.diff-editor.tooltip.pull.right-window.part-two")}<strong>{t("git.diff-editor.tooltip.pull.right-window.part-three")}</strong></p>
        <p>{t("git.diff-editor.tooltip.pull.line.two")}</p>
        <br/>
      </div>;
    case "push":
      return <div>
        {commonTooltipPart}
        <p><strong>{t("git.diff-editor.tooltip.push.line.one.part-one")}</strong>! {t("git.diff-editor.tooltip.push.line.one.part-two")} <strong>{t("git.diff-editor.tooltip.push.line.one.part-three")}</strong> {t("git.diff-editor.tooltip.push.line.one.part-four")}</p>
        <p><strong>{t("git.diff-editor.tooltip.push.left-window.part-one")}</strong> = {t("git.diff-editor.tooltip.push.left-window.part-two")}<strong>{t("git.diff-editor.tooltip.push.left-window.part-three")}</strong>{t("git.diff-editor.tooltip.push.left-window.part-four")}</p>
        <p><strong>{t("git.diff-editor.tooltip.push.right-window.part-one")}</strong> = {t("git.diff-editor.tooltip.push.right-window.part-two")}<strong>{t("git.diff-editor.tooltip.push.right-window.part-three")}</strong></p>
        <br/>
      </div>;
    case "merge":
      return <div>
        {commonTooltipPart}
        <p><strong>{t("git.diff-editor.tooltip.merge.line.one.part-one")}</strong>! {t("git.diff-editor.tooltip.merge.line.one.part-two")} <strong>{t("git.diff-editor.tooltip.merge.line.one.part-three")}</strong> {t("git.diff-editor.tooltip.merge.line.one.part-four")}</p>
        <p><strong>{t("git.diff-editor.tooltip.merge.left-window.part-one")}</strong> = {t("git.diff-editor.tooltip.merge.left-window.part-two")}</p>
        <p><strong>{t("git.diff-editor.tooltip.merge.right-window.part-one")}</strong> = {t("git.diff-editor.tooltip.merge.right-window.part-two")}</p>
        <p>{t("git.diff-editor.tooltip.merge.line.two")}</p>
        <br/>
      </div>;
    default:
      throw new Error("Programmer error unknown merge state cause: " + props.mergeStateCause)
  }
};

