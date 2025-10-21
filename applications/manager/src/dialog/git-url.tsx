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
import { createSetterWithGitValidation } from "@dataspecer/git";


type GitActionsDialogProps = {
  inputPackage: Package,
  type?: "create-new-repository-and-commit" | "commit" | "link-to-existing-repository"
} & BetterModalProps<{
  exportFormat: ExportFormatType,
  repositoryName: string,
  remoteRepositoryURL: string,
  user: string,
  gitProvider: string,
  commitMessage: string,
  isUserRepo: boolean,
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
export const GitActionsDialog = ({ inputPackage, isOpen, resolve, type }: GitActionsDialogProps) => {
  type = type ?? "create-new-repository-and-commit";

  const [repositoryName, setRepositoryName] = useState<string>(inputPackage.iri);
  const [remoteRepositoryURL, setRemoteRepositoryURL] = useState<string>("https://github.com/userName/repositoryName")
  const [user, setUser] = useState<string>("");
  const [gitProvider, setGitProvider] = useState<string>("https://github.com/");
  const [commitMessage, setCommitMessage] = useState<string>("");
  const [isUserRepo, setIsUserRepo] = useState<boolean>(true);
  const [exportFormat, setExportFormat] = useState<ExportFormatType>("json");

  let suffixNumber = 0;

  useLayoutEffect(() => {
    if (isOpen) {
      const idToFocus = createIdentifierForHTMLElement(gitDialogInputIdPrefix, suffixNumber, "input");
      window.requestAnimationFrame(() => document.getElementById(idToFocus)?.focus());
    }
  }, []);

  const closeWithSuccess = () => {
    resolve({ user, repositoryName, remoteRepositoryURL, gitProvider, commitMessage, isUserRepo, exportFormat });
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

  const modalDescription = useMemo(() => {
    switch(type) {
      case "create-new-repository-and-commit":
        return "insert name of Git remote repository, which will be created and the current package will be linked to it";
      case "commit":
        if (!inputPackage.representsBranchHead) {
          return "You can not commit into package, which represents tag. Turn it into branch first.";
        }
        return "Insert the commit message for git";
      case "link-to-existing-repository":
        return "Insert URL of Git remote repository, which already exists and from which you want to create new Dataspecer package. Note that you can put in url pointing to commit/branch/tag.";
      default:
        return "[Programmer oversight - We forgot to extend modal description memo for git dialog]"
    }
  }, [type]);

  let modalBody;
  switch(type) {
    case "create-new-repository-and-commit":
      modalBody = <div>
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Git user (or org) name under which should be the repository created. If empty - auth user name is used, if not logged in or user did not provide rights to create repo, bot name is used" setInput={createSetterWithGitValidation(setUser)} input={user} />
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="The commit message for git" setInput={setCommitMessage} input={commitMessage} />
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Git remote repository name" setInput={createSetterWithGitValidation(setRepositoryName)} input={repositoryName} />
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Git provider URL (Should contain the schema and end with / - for example https://github.com/)" setInput={setGitProvider} input={gitProvider} disabled/>
        <ExportFormatRadioButtons exportFormat={exportFormat} setExportFormat={setExportFormat} />
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isUserRepo}
            onChange={(e) => setIsUserRepo(e.target.checked)}
            className="w-5 h-5 border-gray-400 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-800">Is user repo (if not checked it is organization repo)</span>
        </label>
      </div>;
      break;
    case "commit":
      modalBody = <div>
        <InputComponent disabled={shouldDisableConfirm} idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="The commit message for git" setInput={setCommitMessage} input={commitMessage} />
        <ExportFormatRadioButtons exportFormat={exportFormat} setExportFormat={setExportFormat} />
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
          <ModalTitle>Input remote Git repository</ModalTitle>
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
  const result = await openModal(GitActionsDialog, { inputPackage, type: "create-new-repository-and-commit" });
  if (result) {
    const url = import.meta.env.VITE_BACKEND + "/git/create-new-git-repository-with-package-content?iri=" + encodeURIComponent(iri) +
                                              "&givenRepositoryName=" + encodeURIComponent(result.repositoryName) +
                                              "&givenUserName=" + encodeURIComponent(result.user ?? "") +
                                              "&gitProviderURL=" + encodeURIComponent(result.gitProvider ?? "") +
                                              "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "") +
                                              "&isUserRepo=" + encodeURIComponent(result.isUserRepo ?? "") +
                                              "&exportFormat=" + result.exportFormat;
    // TODO RadStr: To test with docker I put the link-package-to-git code into export.zip, because for some reason docker didn't work with new API points
    // const url = import.meta.env.VITE_BACKEND + "/resources/export.zip?iri=" + encodeURIComponent(iri) +
    //                                           "&givenRepositoryName=" + encodeURIComponent(result.inputByUser) +
    //                                           "&givenUserName=" + encodeURIComponent(result.user ?? "") +
    //                                           "&gitProviderURL=" + encodeURIComponent(result.gitProvider ?? "") +
    //                                           "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "");

    const response = await fetch(
      url,
      {
        credentials: "include",         // Important, without this we don't send the authorization cookies.
        method: "GET",
      });

    await requestLoadPackage(iri, true);
    gitOperationResultToast(response);
  }
};


export const commitToGitDialogOnClickHandler = async (openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  const result = await openModal(GitActionsDialog, { inputPackage, type: "commit" });
  if (result) {
    const url = import.meta.env.VITE_BACKEND + "/git/commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "") +
                                              "&exportFormat=" + result.exportFormat;

    const response = await fetch(
      url,
      {
        credentials: "include",         // Important, without this we don't send the authorization cookies
        method: "GET",
      });
    gitOperationResultToast(response);
    requestLoadPackage(iri, true);
  }
};


export const linkToExistingGitRepositoryHandler = async (openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  const result = await openModal(GitActionsDialog, { inputPackage, type: "link-to-existing-repository" });
  if (result) {
    const url = import.meta.env.VITE_BACKEND + "/git/link-to-existing-git-repository?iri=" + encodeURIComponent(iri) +
                                              "&repositoryURL=" + encodeURIComponent(result.remoteRepositoryURL);

    const response = await fetch(
      url,
      {
        // Note that we do not set the credentials here.
        method: "GET",
      });

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
