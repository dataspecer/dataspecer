import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal, useBetterModal } from "@/lib/better-modal";
import { useLayoutEffect, useMemo, useState } from "react";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { Pencil } from "lucide-react";
import { convertToValidRepositoryName, gitOperationResultToast } from "@/utils/utilities";
import { requestLoadPackage } from "@/package";
import { createIdentifierForHTMLElement, InputComponent } from "@/components/simple-input-component";
import { Package } from "@dataspecer/core-v2/project";
import { toast } from "sonner";
import { ExportFormatRadioButtons, ExportFormatType } from "@/components/export-format-radio-buttons";


// TODO RadStr: Maybe use enum instead of TS string enum
/**
 * input - when type === "create-new-repository", then it is the name of the repository
 *         when type === "link-to-existing-repository", then it is the URL of the repository (the branch URL)
 */
type GitURLDialogProps = {
  inputPackage: Package,
  input?: string,
  type?: "create-new-repository-and-commit" | "commit" | "link-to-existing-repository"
} & BetterModalProps<{
  inputByUser: string,
  exportFormat: ExportFormatType,
  user?: string,
  gitProvider?: string,
  commitMessage?: string,
  isUserRepo?: boolean,
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
export const GitDialog = ({ input: defaultInput, inputPackage, isOpen, resolve, type }: GitURLDialogProps) => {
  type = type ?? "create-new-repository-and-commit";

  // TODO RadStr: Not sure about the defaults
  // TODO RadStr: Maybe better name for the input by user?
  const [inputByUser, setInputByUser] = useState<string>(defaultInput ?? "");
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
    // TODO RadStr: Don't like this inputByUser
    const resultingInputByUser = type === "link-to-existing-repository" ? inputByUser : convertToValidRepositoryName(inputByUser);
    resolve({ inputByUser: resultingInputByUser, user, gitProvider, commitMessage, isUserRepo, exportFormat });
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
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Git user (or org) name under which should be the repository created. If empty - auth user name is used, if not logged in or user did not provide rights to create repo, bot name is used" setInput={setUser} input={user} />
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="The commit message for git" setInput={setCommitMessage} input={commitMessage} />
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Git remote repository name" setInput={setInputByUser} input={inputByUser} />
        <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Git provider URL (Should contain the schema and end with / - for example https://github.com/)" setInput={setGitProvider} input={gitProvider} />
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
        </div>
      break;
    case "link-to-existing-repository":
      modalBody = <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label="Git remote repository URL" setInput={setInputByUser} input={inputByUser} />;
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


/**
 * @deprecated {@link DropdownMenuItem} hsa to be used in the tree, when it is part of another component, it is rendered incorrectly.
 *  So we use {@link createNewRemoteRepositoryHandler} instead.
 */
export const LinkToGitRepoDialog = (props: { iri: string, inputPackage: Package }) => {
  const openModal = useBetterModal();
  const iri = props.iri;
  const inputPackage = props.inputPackage;

  return <DropdownMenuItem
    onClick={async () => {
      const result = await openModal(GitDialog, {input: iri, inputPackage, type: "create-new-repository-and-commit"});
      if (result) {
        const url = import.meta.env.VITE_BACKEND + "/git/link-package-to-git?iri=" + encodeURIComponent(iri) +
                                                  "&givenRepositoryName=" + encodeURIComponent(result.inputByUser) +
                                                  "&givenUserName=" + encodeURIComponent(result.user ?? "") +
                                                  "&gitProviderURL=" + encodeURIComponent(result.gitProvider ?? "") +
                                                  "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "");

        fetch(url);
      }
      }}><Pencil className="mr-2 h-4 w-4" /> Link to GitHub REPO
  </DropdownMenuItem>
};

// TODO RadStr: Maybe put on some better place?
export const createNewRemoteRepositoryHandler = async (openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  const result = await openModal(GitDialog, {input: iri, inputPackage, type: "create-new-repository-and-commit"});
  if (result) {
    const url = import.meta.env.VITE_BACKEND + "/git/link-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&givenRepositoryName=" + encodeURIComponent(result.inputByUser) +
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
        credentials: "include",         // TODO RadStr: Important, without this we don't send the authorization cookies.
        method: "GET",
      });
    // TODO RadStr: Debug
    // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token) - this one is almost surely fine, but just in case
    // console.log("fetch RESPONSE", await response);


    await requestLoadPackage(iri, true);
    gitOperationResultToast(response);
  }
};


/**
 * @deprecated {@link DropdownMenuItem} hsa to be used in the tree, when it is part of another component, it is rendered incorrectly.
 *  So we use {@link commitToGitDialogOnClickHandler} instead
 */
export const CommitToGitDialog = (props: { iri: string, inputPackage: Package }) => {
  const openModal = useBetterModal();
  const iri = props.iri;
  const inputPackage = props.inputPackage;

  return <DropdownMenuItem
    onClick={async () => {
      const result = await openModal(GitDialog, {input: iri, inputPackage, type: "commit"});
      if (result) {
        const url = import.meta.env.VITE_BACKEND + "/git/commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                                  "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "");
        await fetch(url);
      }
      }}><Pencil className="mr-2 h-4 w-4" /> Commit
  </DropdownMenuItem>;
};

// TODO RadStr: Maybe put on some better place?
export const commitToGitDialogOnClickHandler = async (openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  const result = await openModal(GitDialog, {input: iri, inputPackage, type: "commit"});
  if (result) {
    const url = import.meta.env.VITE_BACKEND + "/git/commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "") +
                                              "&exportFormat=" + result.exportFormat;

    const response = await fetch(
      url,
      {
        credentials: "include",         // TODO RadStr: Important, without this we don't send the authorization cookies
        method: "GET",
      });
    gitOperationResultToast(response);
    requestLoadPackage(iri, true);
  }
};


// TODO RadStr: Maybe put on some better place?
export const linkToExistingGitRepositoryHandler = async (openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  const result = await openModal(GitDialog, {input: iri, inputPackage, type: "link-to-existing-repository"});
  if (result) {
    const url = import.meta.env.VITE_BACKEND + "/git/link-to-existing-git-repository?iri=" + encodeURIComponent(iri) +
                                              "&repositoryURL=" + encodeURIComponent(result.inputByUser);

    const response = await fetch(
      url,
      {
        credentials: "include",         // TODO RadStr: Important, without this we don't send the authorization cookies, however in this case we might not need it
        method: "GET",
      });

    if (response.ok) {
      // TODO: Localization
      toast.success("Sucessfully updated link to remote git repository");
    }
    else {
      // TODO: Localization
      toast.error("Failed updating link to remote git repository");
    }
    requestLoadPackage(iri, true);
  }
};
