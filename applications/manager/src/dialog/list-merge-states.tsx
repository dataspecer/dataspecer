import { BetterModalProps, OpenBetterModal, useBetterModal, } from "@/lib/better-modal";
import { useContext, useEffect, useState } from "react";
import { BadgeHelpIcon, BookOpenTextIcon, InfoIcon, Loader, SparkleIcon, Trash2 } from "lucide-react";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { getHumanReadableFilesystemName, getHumanReadableFilesystemShortName, MergeState } from "@dataspecer/git";
import { removeMergeState } from "@/utils/merge-state-backend-requests";
import { ShowMergeStateInfoDialog } from "./show-merge-state-info-dialog";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { requestLoadPackage, ResourcesContext, ResourceWithIris } from "@/package";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { checkIfHashMatchesGitRemote, manualPull } from "@/utils/git-fetch-related-actions";
import { commitToGitDialogOnClickHandler } from "./git-actions-dialogs";
import { createMergeStateOnBackend } from "./open-merge-state";


type MergeStateDialogProps = {
  iri: string,
} & BetterModalProps<null>;


/**
 * Lists the merge states for data specification with the given IRI.
 */
export const ListMergeStatesDialog = ({ iri, isOpen, resolve }: MergeStateDialogProps) => {
  const resources = useContext(ResourcesContext);
  const resource = resources[iri];

  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [mergeStates, setMergeStates] = useState<any[]>([]);
  const openModal = useBetterModal();
  const [isInfoDialogShown, setIsInfoDialogShown] = useState<boolean>(false);
  // The value does not matter - it just says that on change there should be refetch
  const [shouldRefetchMergeStates, setShouldRefetchMergeStates] = useState<boolean>(true);


  useEffect(() => {
    setIsLoading(true);
    const fetchMergeStatesAndSetVariables = async () => {
      const responseAsJSON = await fetchMergeStates(iri);
      setMergeStates(responseAsJSON);
      setIsLoading(false);
    };

    fetchMergeStatesAndSetVariables();
  }, [shouldRefetchMergeStates]);

  const removeFromMergeStatesInDialog = (uuid: string) => {
    setMergeStates(prev => prev.filter(mergeState => uuid !== mergeState.uuid));
  };

  const mergeStateCount = (mergeStates?.length ?? 0);

  return (
    <Modal open={!isInfoDialogShown && isOpen} onClose={() => resolve(null)}>
      <ModalContent className="md:min-w-[1380px]">
        <ModalHeader>
          <ModalTitle>{t("merge-state.list.title")} <PopOverGitGeneralComponent><MergeStateListTooltip/></PopOverGitGeneralComponent></ModalTitle>
          <ModalDescription>
            {mergeStateCount > 0 ?
              mergeStateCount === 1 ?
                <>
                  <p className="flex flex-1 flex-row">- <p className="text-red-600">&nbsp;{t("merge-state.list.single-state.line.one.part.one")}&nbsp;</p>{t("merge-state.list.single-state.line.one.part.two")}</p>
                  <strong className="flex flex-1 flex-row pt-0.5">{t("merge-state.list.hint.pull")}<PopOverGitGeneralComponent><MergeStatePullResolvingHintTooltip/></PopOverGitGeneralComponent></strong>
                  {/* TODO RadStr: Localize the following (the newly added part of string) */}
                  <strong className="flex flex-1 flex-row -mt-4">{t("merge-state.list.hint.single")} (The bottom part is what <SparkleIcon className="dark:text-gray-200"/> does) <PopOverGitGeneralComponent><MergeStateResolveOrderTooltip/></PopOverGitGeneralComponent></strong>
                </> :
                <>
                  <p className="flex flex-1 flex-row">- {t("merge-state.list.sorted-by-date")}</p>
                  <p className="flex flex-1 flex-row">- <p className="text-red-600">&nbsp;{t("merge-state.list.single-state.line.one.part.one")}&nbsp;</p>{t("merge-state.list.single-state.line.one.part.two")}</p>
                  <strong className="flex flex-1 flex-row pt-0.5">{t("merge-state.list.hint.pull")}<PopOverGitGeneralComponent><MergeStatePullResolvingHintTooltip/></PopOverGitGeneralComponent></strong>
                  {/* TODO RadStr: Localize the following (the newly added part of string) */}
                  <strong className="flex flex-1 flex-row -mt-4">{t("merge-state.list.hint.many")} (The bottom part is what <SparkleIcon className="dark:text-gray-200"/> does) <PopOverGitGeneralComponent><MergeStateResolveOrderTooltip/></PopOverGitGeneralComponent></strong>
                </> :
              <p>{t("merge-state.list.empty")}</p>
            }
          </ModalDescription>
          {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" /> }
          {
          !isLoading && <>
            {/* The header */}
            {/* The ml-4 is here for the first button, otherwise the merge state cause in the rows is shifted */}
            <div className="grid grid-cols-[79%_21%]">
              <div className="grid grid-cols-[1.8fr_1.9fr_1fr_1.9fr_2.0fr] divide-x divide-gray-300 min-w-[1000px] max-lg:min-w-[1000px]">
                <div className="flex items-center justify-center">{t("merge-state.list.columns.created-at")}</div>
                <div className="flex items-center justify-center">{t("merge-state.list.columns.last-modified-at")}</div>
                <div className="flex items-center justify-center">{t("merge-state.list.columns.cause")}</div>
                <div className="flex items-center justify-center">{t("merge-state.list.columns.merge-from")}</div>
                <div className="flex items-center justify-center">{t("merge-state.list.columns.merge-to")}</div>
              </div>
            </div>

            { mergeStates
              .sort((a: MergeState, b: MergeState) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map(mergeState => renderMergeState(resource, mergeState, mergeStates, removeFromMergeStatesInDialog, setIsInfoDialogShown, openModal, setIsLoading, () => setShouldRefetchMergeStates(prev => !prev), resolve, t)) }
          </>
          }
        </ModalHeader>
        <ModalFooter className="pt-8">
          <Button variant="outline" onClick={() => resolve(null)}>{t("close")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}


const fetchMergeStates = async (iri: string) => {
  const response = await fetch(import.meta.env.VITE_BACKEND +
    "/git/get-merge-states?iri=" + iri +
    "&includeDiffData=false", {
    method: "GET",
  });

  const responseAsJSON = await response.json();
  return responseAsJSON;
};

const solvePull = async (
  t: TFunction<"translation", undefined>,
  mergeState: MergeState,
  allMergeStates: MergeState[],
) => {
  const mergeStatesToRemove = allMergeStates.filter(ms => ms.mergeStateCause === "pull");
  const promisesToWaitFor: Promise<any>[] = [];
  for (const mergeStateToRemove of mergeStatesToRemove) {
    promisesToWaitFor.push(removeMergeState(mergeStateToRemove.uuid));
  }
  promisesToWaitFor.push(manualPull(t, mergeState.rootIriMergeTo));
  await Promise.all(promisesToWaitFor);
  await requestLoadPackage(mergeState.rootIriMergeTo, true);
};

const solvePush = async (
  t: TFunction<"translation", undefined>,
  openModal: OpenBetterModal,
  closeMergeStateListDialog: (value: null) => void,
  resource: ResourceWithIris,
  mergeState: MergeState,
  allMergeStates: MergeState[],
) => {
  const mergeStatesToRemove = allMergeStates.filter(ms => ms.mergeStateCause === "pull" || ms.mergeStateCause === "push");
  const promisesToWaitFor: Promise<any>[] = [];
  for (const mergeStateToRemove of mergeStatesToRemove) {
    promisesToWaitFor.push(removeMergeState(mergeStateToRemove.uuid));
  }
  await Promise.all(promisesToWaitFor);
  closeMergeStateListDialog(null);
  await requestLoadPackage(mergeState.rootIriMergeTo, true);
  commitToGitDialogOnClickHandler(t, openModal, mergeState.rootIriMergeTo, resource, "classic-commit", true, false, null, null);
};

const solveMerge = async (
  t: TFunction<"translation", undefined>,
  mergeState: MergeState,
  allMergeStates: MergeState[],
) => {
  const filterFunction = (ms: MergeState) => ms.mergeStateCause === "pull" || ms.mergeStateCause === "merge";

  const mergeStatesToRemove = allMergeStates.filter(filterFunction);
  const mergeFromMergeStates: MergeState[] = (await fetchMergeStates(mergeState.rootIriMergeFrom)).filter(filterFunction);
  for (const mergeFromMergeState of mergeFromMergeStates) {
    if (mergeStatesToRemove.find(ms => ms.uuid === mergeFromMergeState.uuid) === undefined) {
      mergeStatesToRemove.push(mergeFromMergeState);
    }
  }

  const promisesToWaitFor: Promise<any>[] = [];
  for (const mergeStateToRemove of mergeStatesToRemove) {
    promisesToWaitFor.push(removeMergeState(mergeStateToRemove.uuid));
  }
  // Pull and then merge
  let isUpToDate: boolean = true;
  isUpToDate &&= await manualPull(t, mergeState.rootIriMergeFrom);
  isUpToDate &&= await manualPull(t, mergeState.rootIriMergeTo);
  await Promise.all(promisesToWaitFor);
  if (isUpToDate) {
    await createMergeStateOnBackend(mergeState.rootIriMergeFrom, mergeState.rootIriMergeTo);
  }
  await requestLoadPackage(mergeState.rootIriMergeFrom, true);
  await requestLoadPackage(mergeState.rootIriMergeTo, true);
};

const solveMergeState = async (
  t: TFunction<"translation", undefined>,
  openModal: OpenBetterModal,
  closeMergeStateListDialog: (value: null) => void,
  resource: ResourceWithIris,
  mergeState: MergeState,
  allMergeStates: MergeState[],
) => {
  switch (mergeState.mergeStateCause) {
    case "pull":
      await solvePull(t, mergeState, allMergeStates);
      break;
    case "push":
      await solvePush(t, openModal, closeMergeStateListDialog, resource, mergeState, allMergeStates);
      break;
    case "merge":
      await solveMerge(t, mergeState, allMergeStates);
      break;
    default:
      alert(`Unknown merge state cause (${mergeState.mergeStateCause}) - programmer error`);      // Just alert it - it should not ever happened
      throw new Error(`Unknown merge state cause (${mergeState.mergeStateCause}) - programmer error`);
  }
};

const validate = (mergeState: MergeState) => {
  switch (mergeState.mergeStateCause) {
    case "pull":
      checkIfHashMatchesGitRemote(mergeState.gitUrlMergeFrom, mergeState.lastCommitHashMergeFrom, mergeState.branchMergeFrom);
      break;
    case "push":
      checkIfHashMatchesGitRemote(mergeState.gitUrlMergeTo, mergeState.lastCommitHashMergeTo, mergeState.branchMergeTo);
      break;
    case "merge":
      checkIfHashMatchesGitRemote(mergeState.gitUrlMergeFrom, mergeState.lastCommitHashMergeFrom, mergeState.branchMergeFrom);
      setTimeout(() => checkIfHashMatchesGitRemote(mergeState.gitUrlMergeTo, mergeState.lastCommitHashMergeTo, mergeState.branchMergeTo), 1000);
      break;
    default:
      alert(`Unknown merge state cause (${mergeState.mergeStateCause}) - programmer error`);      // Just alert it - it should not ever happened
      throw new Error(`Unknown merge state cause (${mergeState.mergeStateCause}) - programmer error`);
  }
};


/**
 * Renders a single merge state.
 */
const renderMergeState = (
  resource: ResourceWithIris,
  mergeState: MergeState,
  allMergeStates: MergeState[],
  removeFromMergeStatesInDialog: (uuid: string) => void,
  setIsInfoDialogShown: (isShown: boolean) => void,
  openModal: OpenBetterModal,
  setIsLoading: (value: boolean) => void,
  forceMergeStatesRefetch: () => void,
  closeMergeStateListDialog: (value: null) => void,
  t: TFunction<"translation", undefined>,
) => {
  const removeMergeStateOnClickHandler = async () => {
    removeFromMergeStatesInDialog(mergeState.uuid);
    await removeMergeState(mergeState.uuid);
    await requestLoadPackage(mergeState.rootIriMergeFrom, true);
    await requestLoadPackage(mergeState.rootIriMergeTo, true);
  };

  const openDiffEditor = () => {
    closeMergeStateListDialog(null);
    openModal(TextDiffEditorDialog, {
      initialMergeFromRootMetaPath: mergeState.rootFullPathToMetaMergeFrom,
      initialMergeToRootMetaPath: mergeState.rootFullPathToMetaMergeTo,
      editable: mergeState.editable
    });
  }


  const automaticResolveHelperAction = async () => {
    setIsLoading(true);
    await solveMergeState(t, openModal, closeMergeStateListDialog, resource, mergeState, allMergeStates);
    forceMergeStatesRefetch();
  };

  const validateAction = () => {
    validate(mergeState);
  };


  return <div className={`flex items-baseline`}>
      <div className="grid grid-cols-[89%_11%] min-w-[1175px] ">
        <div className={`${mergeState.isUpToDate ? "" : "bg-red-400"} w-full`}>
          {mergeStateRowText(mergeState)}
        </div>
        <div className="flex flex-row relative top-[10%] ml-8 gap-x-8">
          <button title={t("merge-state.list.button.open-diff-editor")} onClick={openDiffEditor} className="cursor-pointer relative">
            <BookOpenTextIcon className="hover:bg-gray-400 dark:hover:bg-gray-700 hover:text-white dark:text-gray-200"/>
          </button>
          {/* TODO RadStr: Localize title */}
          <button title={t("Performs 'magic' resolving - Explained in the tooltip")} onClick={automaticResolveHelperAction} className="cursor-pointer relative">
            <SparkleIcon className="hover:bg-gray-400 dark:hover:bg-gray-700 hover:text-white dark:text-gray-200"/>
          </button>
          {/* TODO RadStr: Localize title */}
          <button title={t("Checks whether the merge states is performed on top of the latest Git remote commits")} onClick={validateAction} className="cursor-pointer relative">
            <BadgeHelpIcon className="hover:bg-gray-400 dark:hover:bg-gray-700 hover:text-white dark:text-gray-200"/>
          </button>
          <button title={t("merge-state.list.button.show-info")} onClick={() => openModal(ShowMergeStateInfoDialog, {mergeState, setIsInfoDialogShown})} className="cursor-pointer hover:bg-blue-500 relative">
            <InfoIcon className="text-blue-400 hover:bg-blue-400 hover:text-white dark:hover:bg-blue-700"/>
          </button>
          <button title={t("merge-state.list.button.remove")} onClick={removeMergeStateOnClickHandler} className="cursor-pointer hover:bg-red-600 relative">
            <Trash2 className="text-destructive hover:bg-destructive hover:text-black dark:hover:text-white"/>
          </button>
        </div>
      </div>
    </div>;
}


function mergeStateRowText(mergeState: MergeState) {
  return <div className="grid grid-cols-[2fr_2fr_1fr_2.1fr_2.1fr] justify-center items-center gap-4">
    <span title={new Date(mergeState.createdAt).toLocaleString()}
          className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">
      {new Date(mergeState.createdAt).toLocaleString()}
    </span>
    <span title={new Date(mergeState.modifiedDiffTreeAt).toLocaleString()}
          className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">
      {new Date(mergeState.modifiedDiffTreeAt).toLocaleString()}
    </span>
    <span title={mergeState.mergeStateCause}
          className="flex text-base font-medium whitespace-nowrap justify-center items-center truncate">
      {mergeState.mergeStateCause}
    </span>
    <div className="flex justify-center items-center truncate">
      {mergeStateSourceText(mergeState, "MergeFrom")}
    </div>
    <div className="flex justify-center items-center truncate">
      {mergeStateSourceText(mergeState, "MergeTo")}
    </div>
  </div>;
}

function mergeStateSourceText(mergeState: MergeState, side: "MergeFrom" | "MergeTo") {
  return <>
      <span title={mergeState[`branch${side}`]}
            className="text-base font-medium whitespace-nowrap truncate max-w-[4cm]">
        {mergeState[`branch${side}`]}
      </span>
      <span title={getHumanReadableFilesystemName(mergeState[`filesystemType${side}`])}
            className="text-xs text-gray-500 whitespace-nowrap pl-1 pt-1 max-w-[4cm]">
        {getHumanReadableFilesystemShortName(mergeState[`filesystemType${side}`])}
      </span>
    </>;
}


function MergeStateListTooltip() {
  const { t } = useTranslation();
  return <div>
    <p>{t("merge-state.list-tooltip.main.line.one")}</p>
    <br/>
    <p>
      - {t("merge-state.list-tooltip.main.line.two.part.one")}
      <span className="text-destructive inline">{t("merge-state.list-tooltip.main.line.two.part.two")}</span>
      {t("merge-state.list-tooltip.main.line.two.part.three")}
    </p>
    <p>- {t("merge-state.list-tooltip.main.line.three")}</p>
    <p>- {t("merge-state.list-tooltip.main.line.four")}</p>
    <p>
      - {t("merge-state.list-tooltip.main.line.five.part.one")}
      <span className="text-destructive inline">{t("merge-state.list-tooltip.main.line.five.part.two")}</span>
      {t("merge-state.list-tooltip.main.line.five.part.three")}
    </p>
  </div>;
}

function MergeStateResolveOrderTooltip() {
  const { t } = useTranslation();
  return <div>
    <p>- {t("merge-state.resolve-order-tooltip.line.one")}</p>
    <h2 className="text-base font-bold">
      {t("merge-state.resolve-order-tooltip.line.two.part.one")}
      <span className="text-red-600">{t("merge-state.resolve-order-tooltip.line.two.part.two")}</span>
      {t("merge-state.resolve-order-tooltip.line.two.part.three")}
    </h2>
    <br/>
    <ul>
      <li>&nbsp; - {t("merge-state.resolve-order-tooltip.list.one")}</li>
      <li>&nbsp; - {t("merge-state.resolve-order-tooltip.list.two")}</li>
      <li>&nbsp; - {t("merge-state.resolve-order-tooltip.list.three")}</li>
    </ul>
    <br/>
    <h2 className="text-base font-bold">- {t("merge-state.resolve-order-tooltip.line.four")}</h2>
    <br/>
    <p>- {t("merge-state.resolve-order-tooltip.line.five")}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;{t("merge-state.resolve-order-tooltip.line.six")}</p>
    <p>- {t("merge-state.resolve-order-tooltip.line.seven")}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;{t("merge-state.resolve-order-tooltip.line.eight")}</p>
    <p>- {t("merge-state.resolve-order-tooltip.line.nine")}</p>
    <p>&nbsp;&nbsp;&nbsp;&nbsp;{t("merge-state.resolve-order-tooltip.line.ten")}</p>
  </div>;
}


function MergeStatePullResolvingHintTooltip() {
  const { t } = useTranslation();
  return <div>
    <p className="flex flex-1 flex-row">
      -&nbsp;
      <span className="text-red-600">{t("merge-state.pull-resolving-hint-tooltip.line.one.part.one")}&nbsp;</span>
      {t("merge-state.pull-resolving-hint-tooltip.line.one.part.two")}
    </p>
    <p className="flex flex-1 flex-row">-&nbsp;{t("merge-state.pull-resolving-hint-tooltip.line.two")}</p>
    <p className="flex flex-1 flex-row">&nbsp;&nbsp;&nbsp;{t("merge-state.pull-resolving-hint-tooltip.line.three")}</p>
  </div>;
}
