import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { useLayoutEffect, useMemo, useState } from "react";
import { gitOperationResultToast } from "@/utils/utilities";
import { requestLoadPackage } from "@/package";
import { createIdentifierForHTMLElement, InputComponent } from "@/components/simple-input-component";
import { Package } from "@dataspecer/core-v2/project";
import { toast } from "sonner";
import { ExportFormatRadioButtons, ExportFormatType } from "@/components/export-format-radio-buttons";
import { CommitRedirectResponseJson, createSetterWithGitValidation, CommitRedirectExtendedResponseJson, MergeFromDataType, MergeState, SingleBranchCommitType, convertMergeStateCauseToEditable, CommitConflictInfo } from "@dataspecer/git";
import { CommitRedirectForMergeStatesDialog } from "./commit-confirm-dialog-caused-by-merge-state";
import { commitToGitRequest, createNewRemoteRepositoryRequest, linkToExistingGitRepositoryRequest, mergeCommitToGitRequest } from "@/utils/git-backend-requests";
import { createCloseDialogObject, LoadingDialog } from "@/components/loading-dialog";
import { ComboBox, createGitProviderComboBoxOptions } from "@/components/combo-box";
import { removeMergeState } from "@/utils/merge-state-backend-requests";
import { TextDiffEditorDialog } from "./diff-editor-dialog";


type GitActionsDialogProps = {
  inputPackage: Package;
  shouldShowAlwaysCreateMergeStateOption: boolean | null;
  defaultCommitMessage: string | null;
  type?: "create-new-repository-and-commit" | "commit" | "merge-commit" | "link-to-existing-repository";
} & BetterModalProps<{
  repositoryName: string;
  remoteRepositoryURL: string;
  user: string;
  gitProvider: string;
  commitMessage: string;
  isUserRepo: boolean;
  shouldAlwaysCreateMergeState: boolean;
  shouldAppendAfterDefaultMergeCommitMessage: boolean;
  exportFormat: ExportFormatType;
} | null>;

const gitDialogInputIdPrefix = "git-dialog-prefix";

/**
 * This dialog represents the dialog used for manipulation of git.
 * It is multipurpose in a sense that. It has the following 2 use-cases
 * 1) We want to create only commit for linked repo
 * 2) We want to create link to existing repo and commit current content to it.
 *
 * The type of shown dialog depends on the "type" property.
 */
export const GitActionsDialog = ({ inputPackage, defaultCommitMessage, isOpen, resolve, type, shouldShowAlwaysCreateMergeStateOption }: GitActionsDialogProps) => {
  type = type ?? "create-new-repository-and-commit";

  const gitProvidersComboboxOptions = useMemo(() => {
    return createGitProviderComboBoxOptions();
  }, []);

  const [repositoryName, setRepositoryName] = useState<string>(inputPackage.iri);
  const [remoteRepositoryURL, setRemoteRepositoryURL] = useState<string>("https://github.com/userName/repositoryName")
  const [user, setUser] = useState<string>("");
  const [gitProvider, setGitProvider] = useState<string>(gitProvidersComboboxOptions[0].value);
  const [commitMessage, setCommitMessage] = useState<string>(defaultCommitMessage ?? "");
  const [isUserRepo, setIsUserRepo] = useState<boolean>(true);
  // We want the shouldAlwaysCreateMergeState option on, except when we are not showing it, then it can cause recursion
  const [shouldAlwaysCreateMergeState, setShouldAlwaysCreateMergeState] = useState<boolean>(shouldShowAlwaysCreateMergeStateOption !== false);
  const [shouldAppendAfterDefaultMergeCommitMessage, setShouldAppendAfterDefaultMergeCommitMessage] = useState<boolean>(true);
  const [exportFormat, setExportFormat] = useState<ExportFormatType>("json");

  let suffixNumber = 0;

  useLayoutEffect(() => {
    if (isOpen) {
      const idToFocus = createIdentifierForHTMLElement(gitDialogInputIdPrefix, suffixNumber, "input");
      window.requestAnimationFrame(() => document.getElementById(idToFocus)?.focus());
    }
  }, []);

  const closeWithSuccess = () => {
    resolve({ user, repositoryName, remoteRepositoryURL, gitProvider, commitMessage, isUserRepo, shouldAlwaysCreateMergeState, shouldAppendAfterDefaultMergeCommitMessage, exportFormat });
  }

  const shouldDisableConfirm = useMemo(() => {
    switch(type) {
      case "create-new-repository-and-commit":
        return false;
      case "commit":
        return !inputPackage.representsBranchHead;
      case "link-to-existing-repository":
        return false;
      case "merge-commit":
        return false;
      default:
        return true;
    };
  }, [type]);

  const modalTitle = useMemo(() => {
    switch(type) {
      case "create-new-repository-and-commit":
        return "Create new remote Git repository";
      case "commit":
        return "Commit to remote Git repository";
      case "merge-commit":
        return "Create merge commit to remote Git repository";
      case "link-to-existing-repository":
        return "Link package to remote Git repository";
      default:
        return "[Programmer oversight - We forgot to extend modal title memo for git dialog]"
    }
  }, [type]);

  const modalDescription = useMemo(() => {
    switch(type) {
      case "create-new-repository-and-commit":
        return "On confirm new remote Git repository will be created and the current package will be linked to it";
      case "commit":
        if (!inputPackage.representsBranchHead) {
          return "You can not commit into package, which represents tag. Turn it into branch first.";
        }
        return "Insert the commit message for git";
      case "merge-commit":
        return "Insert the commit message for git merge";
      case "link-to-existing-repository":
        return "Insert URL of Git remote repository, which already exists and to which you want to link the current package. Note that you can put in url pointing to commit/branch/tag.";
      default:
        return "[Programmer oversight - We forgot to extend modal description memo for git dialog]"
    }
  }, [type]);

  let modalBody;
  switch(type) {
    case "create-new-repository-and-commit":
      modalBody = <div>
        <ComboBox options={gitProvidersComboboxOptions} onChange={(value: string) => setGitProvider(value)}/>
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Repository name" setInput={createSetterWithGitValidation(setRepositoryName)} input={repositoryName} />
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Repository owner" tooltip="Name under which should be the repository created. If empty - auth user name is used, if not logged in or user did not provide rights to create repo, bot name is used" setInput={createSetterWithGitValidation(setUser)} input={user} />
        <label className="flex items-center space-x-2 cursor-pointer -mt-4">
          <input
            type="checkbox"
            checked={isUserRepo}
            onChange={(e) => setIsUserRepo(e.target.checked)}
            className="w-5 h-5 border-gray-400 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-800">Is user repo (if not checked it is organization repo)</span>
        </label>
        <div className="my-6"/>
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Initial commit message" setInput={setCommitMessage} input={commitMessage} />
        <ExportFormatRadioButtons exportFormat={exportFormat} setExportFormat={setExportFormat} />
      </div>;
      break;
    case "commit":
      if (!inputPackage.representsBranchHead) {
        modalBody = null;
      }
      else {
        modalBody = <div>
            <InputComponent disabled={shouldDisableConfirm} idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Commit message" setInput={setCommitMessage} input={commitMessage} />
            <ExportFormatRadioButtons exportFormat={exportFormat} setExportFormat={setExportFormat} />
            {!shouldShowAlwaysCreateMergeStateOption ?
              null :
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={shouldAlwaysCreateMergeState}
                  onChange={(e) => setShouldAlwaysCreateMergeState(e.target.checked)}
                  className="w-5 h-5 accent-blue-600"
                />
                <span>{shouldAlwaysCreateMergeState ? "Always create merge state (current option)" : "Create merge state only on conflict (current option)"}</span>
              </label>}
          </div>;
      }
      break;
    case "merge-commit":
      modalBody = <div>
          <InputComponent disabled={shouldDisableConfirm} idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Merge Commit message" setInput={setCommitMessage} input={commitMessage} />
          <ExportFormatRadioButtons exportFormat={exportFormat} setExportFormat={setExportFormat} />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shouldAppendAfterDefaultMergeCommitMessage}
              onChange={(e) => setShouldAppendAfterDefaultMergeCommitMessage(e.target.checked)}
              className="w-5 h-5 accent-blue-600"
            />
            <span>{shouldAppendAfterDefaultMergeCommitMessage ?
              "The given message will be put after the default merge message created in git (current option)" :
              "The merge message will look exactly as given (current option)"}</span>
          </label>
        </div>;
      break;
    case "link-to-existing-repository":
      modalBody = <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Git remote repository URL" setInput={setRemoteRepositoryURL} input={remoteRepositoryURL} />;
      break;
    default:
      modalBody = <div/>;
      break;
  }

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="sm:max-w-[700px]">
        <ModalHeader>
          <ModalTitle>{modalTitle}</ModalTitle>
          <ModalDescription>
            {modalDescription}
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          {modalBody}
        </ModalBody>
        <ModalFooter className="flex flex-row">
          <Button variant="outline" onClick={() => resolve(null)}>Cancel</Button>
          <Button type="submit" onClick={closeWithSuccess} disabled={shouldDisableConfirm}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const createNewRemoteRepositoryHandler = async (openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  // {@link DropdownMenuItem} has to be used in the tree, when it is part of another component, it is rendered incorrectly,
  // that is why we implement it like this and not like react component
  const result = await openModal(GitActionsDialog, { inputPackage, defaultCommitMessage: null, type: "create-new-repository-and-commit", shouldShowAlwaysCreateMergeStateOption: null });
  if (result) {
    const closeDialogObject = createCloseDialogObject();
    // TODO RadStr: Localization
    openModal(LoadingDialog, {
      dialogTitle: "Creating repository with initial commit",
      waitingText: "Usually takes around 10-20 seconds",
      setCloseDialogAction: closeDialogObject.setCloseDialogAction,
      shouldShowTimer: true,
    });
    const response = await createNewRemoteRepositoryRequest(iri, result);
    closeDialogObject.closeDialogAction();
    await requestLoadPackage(iri, true);
    gitOperationResultToast(response);
  }
};


export const mergeCommitToGitDialogOnClickHandler = async (
  openModal: OpenBetterModal,
  iri: string,
  inputPackage: Package,
  mergeState: MergeState,
) => {
  const result = await openModal(GitActionsDialog, {
    inputPackage,
    defaultCommitMessage: mergeState.commitMessage,
    type: "merge-commit",
    shouldShowAlwaysCreateMergeStateOption: false,
  });
  if (result) {
    const closeDialogObject = createCloseDialogObject();
    // TODO RadStr: Localization
    openModal(LoadingDialog, {
      dialogTitle: "Committing merge",
      waitingText: "Usually takes around 5-15 seconds",
      setCloseDialogAction: closeDialogObject.setCloseDialogAction,
      shouldShowTimer: true,
    });
    const mergeFromData: MergeFromDataType = {
      branch: mergeState.branchMergeFrom,
      commitHash: mergeState.lastCommitHashMergeFrom,
      iri: mergeState.rootIriMergeFrom,
    };


    // We do not care about existence of merge states, so we pass in false
    mergeCommitToGitRequest(iri, result.commitMessage, result.shouldAppendAfterDefaultMergeCommitMessage, result.exportFormat, mergeFromData, false)
      .then(async (response) => {
        closeDialogObject.closeDialogAction();
        if (response.status === 500) {
          const jsonResponse: any = await response.json();
          // TODO: ..... Not really clean: The check for the equality of strings of error. But can't really think of anything much better now
          if (jsonResponse.error === "Error: The merge from branch was already merged. We can not merge again.") {
            // In this case we want to always remove the merge state. User has to move heads by committing and then he can create new merge state.
            toast.error("Failure, check console for more info.");
            console.error(jsonResponse.error + " Removing the merge state.");
            const removalResult = await removeMergeState(mergeState.uuid);
            if (!removalResult) {
              setTimeout(() => {
                toast.error("The removal of merge state failed");
              }, 1000);
            }
          }
        }
        else if (response.status === 200) {
          // Unlike for other merge states, we remove th emerge state here instead when finalizing backend (the merge state is exception).
          // Since other mergestates just updated the last commit in the finalizer. But that is not the case for merge
          await removeMergeState(mergeState.uuid);
        }
        await requestLoadPackage(mergeState.rootIriMergeFrom, true);
        await requestLoadPackage(mergeState.rootIriMergeTo, true);
      });
  }
};

export const commitToGitDialogOnClickHandler = async (
  openModal: OpenBetterModal,
  iri: string,
  inputPackage: Package,
  commitType: SingleBranchCommitType,
  shouldShowAlwaysCreateMergeStateOption: boolean,
  defaultCommitMessage: string | null,
  onSuccessCallback: (() => void) | null,
) => {
  const result = await openModal(GitActionsDialog, { inputPackage, defaultCommitMessage, type: "commit", shouldShowAlwaysCreateMergeStateOption });
  if (result) {
    const closeDialogObject = createCloseDialogObject();
    // TODO RadStr: Localization
    openModal(LoadingDialog, {
      dialogTitle: "Committing",
      waitingText: "Usually takes around 5-15 seconds",
      setCloseDialogAction: closeDialogObject.setCloseDialogAction,
      shouldShowTimer: true,
    });

    commitToGitRequest(iri, result.commitMessage, result.exportFormat, result.shouldAlwaysCreateMergeState, false)
      .then(async (response) => {
        closeDialogObject.closeDialogAction();
        if (response.status === 300) {
          // TODO: ... I am calling the "commitToGitRequest" with false. This means that it should never return 300
          const jsonResponse: CommitRedirectResponseJson = await response.json();
          const extendedResponse: CommitRedirectExtendedResponseJson = {
            ...jsonResponse,
            commitType,
            shouldAppendAfterDefaultMergeCommitMessage: null,
          };
          openModal(CommitRedirectForMergeStatesDialog, {commitRedirectResponse: extendedResponse});
          console.info({jsonResponse});     // TODO RadStr Debug: Debug print
        }
        else if (response.status === 409 && shouldShowAlwaysCreateMergeStateOption) {
          const jsonResponse: NonNullable<CommitConflictInfo> = await response.json();
          openModal(TextDiffEditorDialog, { initialMergeFromResourceIri: jsonResponse.conflictMergeFromIri, initialMergeToResourceIri: jsonResponse.conflictMergeToIri, editable: convertMergeStateCauseToEditable("push")});
          toast.success("Created merge state");
          requestLoadPackage(iri, true);
          return;
        }
        gitOperationResultToast(response);
        requestLoadPackage(iri, true);
        if (response.ok) {
          onSuccessCallback?.();
        }
      });
  }
};


export const linkToExistingGitRepositoryHandler = async (openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  const result = await openModal(GitActionsDialog, { inputPackage, defaultCommitMessage: null, type: "link-to-existing-repository", shouldShowAlwaysCreateMergeStateOption: null });
  if (result) {
    const response = await linkToExistingGitRepositoryRequest(iri, result.remoteRepositoryURL);
    if (response.ok) {
      // TODO RadStr later: Localization
      toast.success("Sucessfully updated link to remote git repository");
    }
    else {
      // TODO RadStr later: Localization
      toast.error("Failed updating link to remote git repository");
    }
    requestLoadPackage(iri, true);
  }
};
