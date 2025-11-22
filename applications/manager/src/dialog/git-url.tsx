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
import { CommitRedirectResponseJson, createSetterWithGitValidation } from "@dataspecer/git";
import { CommitRedirectForMergeStatesDialog } from "./commit-confirm-dialog-caused-by-merge-state";
import { commitToGitRequest, createNewRemoteRepositoryRequest, linkToExistingGitRepositoryRequest } from "@/utils/git-backend-requests";
import { createCloseDialogObject, LoadingDialog } from "@/components/loading-dialog";


type GitActionsDialogProps = {
  inputPackage: Package;
  shouldShowAlwaysCreateMergeStateOption: boolean | null;
  defaultCommitMessage: string | null;
  type?: "create-new-repository-and-commit" | "commit" | "link-to-existing-repository";
} & BetterModalProps<{
  repositoryName: string;
  remoteRepositoryURL: string;
  user: string;
  gitProvider: string;
  commitMessage: string;
  isUserRepo: boolean;
  shouldAlwaysCreateMergeState: boolean;
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
  const [exportFormat, setExportFormat] = useState<ExportFormatType>("json");

  let suffixNumber = 0;

  useLayoutEffect(() => {
    if (isOpen) {
      const idToFocus = createIdentifierForHTMLElement(gitDialogInputIdPrefix, suffixNumber, "input");
      window.requestAnimationFrame(() => document.getElementById(idToFocus)?.focus());
    }
  }, []);

  const closeWithSuccess = () => {
    resolve({ user, repositoryName, remoteRepositoryURL, gitProvider, commitMessage, isUserRepo, shouldAlwaysCreateMergeState, exportFormat });
  }

  const shouldDisableConfirm = useMemo(() => {
    switch(type) {
      case "create-new-repository-and-commit":
        return false;
      case "commit":
        return !inputPackage.representsBranchHead;
      case "link-to-existing-repository":
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
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Repository name" setInput={createSetterWithGitValidation(setRepositoryName)} input={repositoryName} />
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Git user (or org)" tooltip="Name under which should be the repository created. If empty - auth user name is used, if not logged in or user did not provide rights to create repo, bot name is used" setInput={createSetterWithGitValidation(setUser)} input={user} />
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
        <ComboBox options={gitProvidersComboboxOptions} onChange={(value: string) => setGitProvider(value)}/>
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
    openModal(LoadingDialog, {dialogTitle: "Creating repository with first commit", waitingText: "Waiting for response", setCloseDialogAction: closeDialogObject.setCloseDialogAction});
    const response = await createNewRemoteRepositoryRequest(iri, result);
    closeDialogObject.closeDialogAction();
    await requestLoadPackage(iri, true);
    gitOperationResultToast(response);
  }
};


export const commitToGitDialogOnClickHandler = async (
  openModal: OpenBetterModal,
  iri: string,
  inputPackage: Package,
  defaultCommitMessage: string | null,
) => {
  const result = await openModal(GitActionsDialog, { inputPackage, defaultCommitMessage, type: "commit" });
  if (result) {
    const closeDialogObject = createCloseDialogObject();
    // TODO RadStr: Localization
    openModal(LoadingDialog, {dialogTitle: "Committing", waitingText: "Waiting for response", setCloseDialogAction: closeDialogObject.setCloseDialogAction});
    commitToGitRequest(iri, result.commitMessage, result.exportFormat, result.shouldAlwaysCreateMergeState, false)
      .then(async (response) => {
        closeDialogObject.closeDialogAction();
        if (response.status === 300) {
          const jsonResponse: CommitRedirectResponseJson = await response.json();
          openModal(CommitRedirectForMergeStatesDialog, {commitRedirectResponse: jsonResponse});
          console.info(jsonResponse);     // TODO RadStr: Debug print
        }
        gitOperationResultToast(response);
        requestLoadPackage(iri, true);
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
