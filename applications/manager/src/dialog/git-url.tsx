import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BetterModalProps, OpenBetterModal, useBetterModal } from "@/lib/better-modal";
import { Label } from "@/components/ui/label"
import { Dispatch, SetStateAction, useLayoutEffect, useMemo, useState } from "react";
import { DropdownMenuItem } from "@radix-ui/react-dropdown-menu";
import { Pencil } from "lucide-react";
import { convertToValidRepositoryName } from "@/utils/utilities";
import { requestLoadPackage } from "@/package";

// TODO RadStr: Maybe use enum instead of TS string enum
/**
 * input - when type === "create-new-repository", then it is the name of the repository
 *         when type === "link-to-existing-repository", then it is the URL of the repository (the branch URL)
 */
type GitURLDialogProps = {
  input?: string,
  type?: "create-new-repository-and-commit" | "commit" | "link-to-existing-repository"
} & BetterModalProps<{
  inputByUser: string,
  user?: string,
  gitProvider?: string,
  commitMessage?: string,
} | null>;

/**
 * This dialog represents the dialog used for manipulation of git.
 * It is multipurpose in a sense that. It has the following 2 use-cases
 * 1) We want to create only commit for linked repo
 * 2) We want to create link to existing repo and commit current content to it.
 *
 * The type of shown dialog depends on the "type" property.
 */
export const GitDialog = ({ input: defaultInput, isOpen, resolve, type }: GitURLDialogProps) => {
  type = type ?? "create-new-repository-and-commit";

  // TODO RadStr: Not sure about the defaults
  // TODO RadStr: Maybe better name for the input by user?
  const [inputByUser, setInputByUser] = useState<string>(defaultInput ?? "");
  const [user, setUser] = useState<string>("");
  const [gitProvider, setGitProvider] = useState<string>("https://github.com/");
  const [commitMessage, setCommitMessage] = useState<string>("");

  useLayoutEffect(() => {
    if (isOpen) {
      window.requestAnimationFrame(() => document.getElementById("repository-url-dialog-div")?.focus());
    }
  }, []);

  const closeWithSuccess = () => {
    // TODO RadStr: Don't like this inputByUser
    const resultingInputByUser = type === "link-to-existing-repository" ? inputByUser : convertToValidRepositoryName(inputByUser);
    resolve({ inputByUser: resultingInputByUser, user, gitProvider, commitMessage });
  }

  const modalDescription = useMemo(() => {
    switch(type) {
      case "create-new-repository-and-commit":
        return "insert name of Git remote repository, which will be created and the current package will be linked to it";
      case "commit":
        return "insert the commit message for git";
      case "link-to-existing-repository":
        return "insert URL of Git remote repository, which already exists and from which you want to create new Dataspecer package";
      default:
        return "[Programmer oversight - We forgot to extend modal description memo for git dialog]"
    }
  }, [type]);

  let modalBody;
  switch(type) {
    case "create-new-repository-and-commit":
      modalBody = <div>
        <InputComponent label="Git user (or org) name under which should be the repository created. If empty - auth user name is used, if not logged in or user did not provide rights to create repo, bot name is used" setInput={setUser} input={user} />
        <InputComponent label="The commit message for git" setInput={setCommitMessage} input={commitMessage} />
        <InputComponent label="Git remote repository name" setInput={setInputByUser} input={inputByUser} />
        <InputComponent label="Git provider URL (Should contain the schema and end with / - for example https://github.com/)" setInput={setGitProvider} input={gitProvider} />
      </div>;
      break;
    case "commit":
      modalBody = <InputComponent label="The commit message for git" setInput={setCommitMessage} input={commitMessage} />;
      break;
    case "link-to-existing-repository":
      modalBody = <InputComponent label="Git remote repository URL" setInput={setInputByUser} input={inputByUser} />;
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
          <Button type="submit" onClick={closeWithSuccess}>Confirm</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

type InputComponentProps = {
  setInput: Dispatch<SetStateAction<string>>
  input?: string,
  label?: string,
};

const InputComponent = ({ input, label, setInput }: InputComponentProps) => {
  return <div className="grid gap-4">
    <div key="repository-url-dialog-div">
      <Label htmlFor="repository-url-dialog-div" className="flex grow-3 items-baseline gap-2 mb-2">
        <div>
          {label}
        </div>
        <div className="grow"></div>
      </Label>
      <Input id="repository-url-dialog-div" value={input} className="grow" onChange={target => setInput(target.target.value)} />
    </div>
    <button type="submit" className="hidden" />
  </div>;
};


/**
 * @deprecated {@link DropdownMenuItem} hsa to be used in the tree, when it is part of another component, it is rendered incorrectly.
 *  So we use {@link linkToGitRepoOnClickHandler} instead.
 */
export const LinkToGitRepoDialog = (props: {iri: string}) => {
  const openModal = useBetterModal();
  const iri = props.iri;

  return <DropdownMenuItem
    onClick={async () => {
      const result = await openModal(GitDialog, {input: iri, type: "create-new-repository-and-commit"});
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
}

// TODO RadStr: Maybe put on some better place?
export const linkToGitRepoOnClickHandler = async (openModal: OpenBetterModal, iri: string) => {
  const result = await openModal(GitDialog, {input: iri, type: "create-new-repository-and-commit"});
  if (result) {
    const url = import.meta.env.VITE_BACKEND + "/git/link-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&givenRepositoryName=" + encodeURIComponent(result.inputByUser) +
                                              "&givenUserName=" + encodeURIComponent(result.user ?? "") +
                                              "&gitProviderURL=" + encodeURIComponent(result.gitProvider ?? "") +
                                              "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "");
    // TODO RadStr: To test with docker I put the link-package-to-git code into export.zip, because for some reason docker didn't work with new API points
    // const url = import.meta.env.VITE_BACKEND + "/resources/export.zip?iri=" + encodeURIComponent(iri) +
    //                                           "&givenRepositoryName=" + encodeURIComponent(result.inputByUser) +
    //                                           "&givenUserName=" + encodeURIComponent(result.user ?? "") +
    //                                           "&gitProviderURL=" + encodeURIComponent(result.gitProvider ?? "") +
    //                                           "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "");

    await fetch(
      url,
      {
        credentials: "include",         // TODO RadStr: Important, without this we don't send the authorization cookies.
        method: "GET",
      });
    // TODO RadStr: Debug
    // TODO RadStr: Debug print with potentionally sensitive stuff (it may contain PAT token) - this one is almost surely fine, but just in case
    // console.log("fetch RESPONSE", await response);


    requestLoadPackage(iri, true);
  }
}


/**
 * @deprecated {@link DropdownMenuItem} hsa to be used in the tree, when it is part of another component, it is rendered incorrectly.
 *  So we use {@link commitToDigDialogOnClickHandler} instead
 */
export const CommitToGitDialog = (props: {iri: string}) => {
  const openModal = useBetterModal();
  const iri = props.iri;

  return <DropdownMenuItem
    onClick={async () => {
      const result = await openModal(GitDialog, {input: iri, type: "commit"});
      if (result) {
        const url = import.meta.env.VITE_BACKEND + "/git/commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                                  "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "");
        fetch(url);
      }
      }}><Pencil className="mr-2 h-4 w-4" /> Commit
  </DropdownMenuItem>;
}

// TODO RadStr: Maybe put on some better place?
export const commitToDigDialogOnClickHandler = async (openModal: OpenBetterModal, iri: string) => {
  const result = await openModal(GitDialog, {input: iri, type: "commit"});
  if (result) {
    const url = import.meta.env.VITE_BACKEND + "/git/commit-package-to-git?iri=" + encodeURIComponent(iri) +
                                              "&commitMessage=" + encodeURIComponent(result.commitMessage ?? "");

    fetch(
      url,
      {
        credentials: "include",         // TODO RadStr: Important, without this we don't send the authorization cookies
        method: "GET",
      });
  }
}