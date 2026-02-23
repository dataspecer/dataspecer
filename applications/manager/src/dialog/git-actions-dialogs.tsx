import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { RefObject, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gitOperationResultToast } from "@/utils/utilities";
import { requestLoadPackage } from "@/package";
import { createIdentifierForHTMLElement, InputComponent } from "@/components/simple-input-component";
import { Package } from "@dataspecer/core-v2/project";
import { toast } from "sonner";
import { ExportFormatRadioButtons, ExportFormatType } from "@/components/export-format-radio-buttons";
import { CommitRedirectResponseJson, createSetterWithGitValidation, CommitRedirectExtendedResponseJson, MergeFromDataType, MergeState, SingleBranchCommitType, convertMergeStateCauseToEditable, CommitConflictInfo, GitProviderEnum, convertGitProviderNameToEnum } from "@dataspecer/git";
import { CommitRedirectForMergeStatesDialog } from "./commit-confirm-dialog-caused-by-merge-state";
import { commitToGitBackendRequest, createNewRemoteRepositoryRequest, linkToExistingGitRepositoryRequest, mergeCommitToGitBackendRequest } from "@/utils/git-backend-requests";
import { createCloseDialogObject, LoadingDialog } from "@/components/loading-dialog";
import { ComboBox, createGitProviderComboBoxOptions } from "@/components/combo-box";
import { removeMergeState } from "@/utils/merge-state-backend-requests";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { useLogin } from "@/hooks/use-login";
import { getGitProviderDomain } from "@dataspecer/git/git-providers";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

/**
 * Checks if the {@link requiredFieldsRefs} are valid (non-empty). If so, the {@link resolve} method is called.
 * @returns True if all the refs are valid. That is they are non-empty. (To be exact the reportValidity returns tre)
 */
export const resolveWithRequiredCheck = (resolve: () => void, ...requiredFieldsRefs: RefObject<HTMLInputElement | null>[]): boolean => {
  let areRefsValid : boolean = true;
  for (const ref of requiredFieldsRefs) {
    if (ref.current === null) {
      continue;
    }
    const isValid = ref.current?.reportValidity();
    if (isValid === undefined) {
      throw new Error("The field has no reportValidity method. Either it is different element or the ref of the input field was not set");
    }
    areRefsValid &&= isValid;
  }

  if (areRefsValid) {
    resolve();
  }

  return areRefsValid;
}


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
  const { t } = useTranslation();
  type = type ?? "create-new-repository-and-commit";

  const gitProvidersComboboxOptions = useMemo(() => {
    // TODO RadStr PR: In future this should be ideally set based on the Git provider the user logged in as.
    return createGitProviderComboBoxOptions();
  }, []);

  const { accountProvider, username, genericScope } = useLogin();

  const [repositoryName, setRepositoryName] = useState<string>(inputPackage.iri);
  const [remoteRepositoryURL, setRemoteRepositoryURL] = useState<string>("https://github.com/userName/repositoryName");
  const [user, setUser] = useState<string>("");
  const [gitProvider, setGitProvider] = useState<string>(getGitProviderDomain(gitProvidersComboboxOptions[0].value, true, true));
  const [commitMessage, setCommitMessage] = useState<string>(defaultCommitMessage ?? "");
  const [isUserRepo, setIsUserRepo] = useState<boolean>(true);
  // We want the shouldAlwaysCreateMergeState option on, except when we are not showing it, then it can cause recursion
  const [shouldAlwaysCreateMergeState, setShouldAlwaysCreateMergeState] = useState<boolean>(shouldShowAlwaysCreateMergeStateOption !== false);
  const [shouldAppendAfterDefaultMergeCommitMessage, setShouldAppendAfterDefaultMergeCommitMessage] = useState<boolean>(true);
  const [exportFormat, setExportFormat] = useState<ExportFormatType>("json");

  // Values for non-empty inputbox check
  const repositoryNameInputFieldRef = useRef<HTMLInputElement | null>(null);
  const commitMessageInputFieldRef = useRef<HTMLInputElement | null>(null);

  const requiredFields: RefObject<HTMLInputElement | null>[] = useMemo(() => {
    const requiredFieldsInternal: RefObject<HTMLInputElement | null>[] = [];
    switch(type) {
      case "create-new-repository-and-commit":
        // TODO RadStr: For now without the repositoryOwnerInputFieldRef - we just use the bot, if it is empty
        requiredFieldsInternal.push(repositoryNameInputFieldRef, commitMessageInputFieldRef);
        break;
      case "commit":
        requiredFieldsInternal.push(commitMessageInputFieldRef);
        break;
      case "merge-commit":
        requiredFieldsInternal.push(commitMessageInputFieldRef);
        break;
      case "link-to-existing-repository":
        break;
      default:
        throw new Error(`Unknown type ${type} of Git dialog`);
    }
    return requiredFieldsInternal;
  }, []);

  useEffect(() => {
    // We have to it like this because the login is asynchronous
    // If the Git provider matches and we have a push scope, then show the user's name instead of empty string.
    if (convertGitProviderNameToEnum(accountProvider) === gitProvidersComboboxOptions[0].value && genericScope.includes("publicRepo")) {
      setUser(username);
    }
  }, [accountProvider, username, genericScope]);


  let suffixNumber = 0;

  useLayoutEffect(() => {
    if (isOpen) {
      const idToFocus = createIdentifierForHTMLElement(gitDialogInputIdPrefix, suffixNumber, "input");
      window.requestAnimationFrame(() => document.getElementById(idToFocus)?.focus());
    }
  }, []);

  const tryCloseWithSuccess = () => {
    const resolveAsNoParamsMethod = () => {
      resolve({ user, repositoryName, remoteRepositoryURL, gitProvider, commitMessage, isUserRepo, shouldAlwaysCreateMergeState, shouldAppendAfterDefaultMergeCommitMessage, exportFormat });
    };

    resolveWithRequiredCheck(resolveAsNoParamsMethod, ...requiredFields);
  }

  const shouldDisableConfirm = useMemo(() => {
    let shouldDisableConfirmInternal: boolean;
    switch(type) {
      case "create-new-repository-and-commit":
        shouldDisableConfirmInternal = false;
        break;
      case "commit":
        shouldDisableConfirmInternal = !inputPackage.representsBranchHead;
        break;
      case "link-to-existing-repository":
        shouldDisableConfirmInternal = false;
        break;
      case "merge-commit":
        shouldDisableConfirmInternal = false;
        break;
      default:
        shouldDisableConfirmInternal = true;
        break;
    };

    return shouldDisableConfirmInternal;
  }, [type]);

  const modalTitle = useMemo(() => {
    switch(type) {
      case "create-new-repository-and-commit":
        return t("git.dialog.title.create-new-repository-and-commit");
      case "commit":
        return t("git.dialog.title.commit");
      case "merge-commit":
        return t("git.dialog.title.merge-commit");
      case "link-to-existing-repository":
        return t("git.dialog.title.link-to-existing-repository");
      default:
        return t("git.dialog.title.fallback");
    }
  }, [type, t]);

  const modalDescription = useMemo(() => {
    switch(type) {
      case "create-new-repository-and-commit":
        return t("git.dialog.description.create-new-repository-and-commit");
      case "commit":
        if (!inputPackage.representsBranchHead) {
          return t("git.dialog.description.commit-tag-error");
        }
        return t("git.dialog.description.commit");
      case "merge-commit":
        return t("git.dialog.description.merge-commit");
      case "link-to-existing-repository":
        return t("git.dialog.description.link-to-existing-repository");
      default:
        return t("git.dialog.description.fallback");
    }
  }, [type, inputPackage.representsBranchHead, t]);

  let modalBody;
  switch(type) {
    case "create-new-repository-and-commit":
      modalBody = <div>
        <ComboBox options={gitProvidersComboboxOptions} onChange={(value: GitProviderEnum) => setGitProvider(getGitProviderDomain(value, true, true))}/>
        <InputComponent
          idPrefix={gitDialogInputIdPrefix}
          idSuffix={suffixNumber++}
          label={t("git.dialog.label.repository-name")}
          setInput={createSetterWithGitValidation(setRepositoryName)}
          input={repositoryName}
          requiredRefObject={repositoryNameInputFieldRef}
        />
        <InputComponent
          idPrefix={gitDialogInputIdPrefix}
          idSuffix={suffixNumber++}
          label={t("git.dialog.label.repository-owner")}
          tooltip={t("git.dialog.tooltip.repository-owner")}
          setInput={createSetterWithGitValidation(setUser)} input={user}
        />
        <div className="-mt-2 mb-8 flex items-center space-x-6">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={isUserRepo === true}
              onChange={() => setIsUserRepo(true)}
              className="w-5 h-5 border-gray-400 text-blue-600 focus:ring-blue-500 form-radio text-blue-600"
            />
            <span>{t("git.dialog.radio.user-repository")}</span>
          </label>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="radio"
              checked={isUserRepo === false}
              onChange={() => setIsUserRepo(false)}
              className="w-5 h-5 border-gray-400 text-blue-600 focus:ring-blue-500 form-radio text-blue-600"
            />
            <span>{t("git.dialog.radio.organization-repository")}</span>
          </label>
        </div>
        <div className="my-8"/>
        <InputComponent
          idPrefix={gitDialogInputIdPrefix}
          idSuffix={suffixNumber++}
          label={t("git.dialog.label.initial-commit-message")}
          setInput={setCommitMessage}
          input={commitMessage}
          requiredRefObject={commitMessageInputFieldRef}
        />
        <ExportFormatRadioButtons exportFormat={exportFormat} setExportFormat={setExportFormat} />
      </div>;
      break;
    case "commit":
      if (!inputPackage.representsBranchHead) {
        modalBody = null;
      }
      else {
        modalBody = <div>
            <InputComponent
              disabled={shouldDisableConfirm}
              idPrefix={gitDialogInputIdPrefix}
              idSuffix={suffixNumber++}
              label={t("git.dialog.label.commit-message")}
              setInput={setCommitMessage}
              input={commitMessage}
              requiredRefObject={commitMessageInputFieldRef}
            />
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
                <span>{shouldAlwaysCreateMergeState ? t("git.dialog.merge-state.always") : t("git.dialog.merge-state.on-conflict")}</span>
              </label>}
          </div>;
      }
      break;
    case "merge-commit":
      modalBody = <div>
          <InputComponent
            disabled={shouldDisableConfirm}
            idPrefix={gitDialogInputIdPrefix}
            idSuffix={suffixNumber++}
            label={t("git.dialog.label.merge-commit-message.input-title")}
            setInput={setCommitMessage}
            input={commitMessage}
            requiredRefObject={commitMessageInputFieldRef}
          />
          <ExportFormatRadioButtons exportFormat={exportFormat} setExportFormat={setExportFormat} />
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shouldAppendAfterDefaultMergeCommitMessage}
              onChange={(e) => setShouldAppendAfterDefaultMergeCommitMessage(e.target.checked)}
              className="w-5 h-5 accent-blue-600"
            />
            <span>{shouldAppendAfterDefaultMergeCommitMessage ?
              t("git.dialog.merge-commit-message.append") :
              t("git.dialog.merge-commit-message.exact")}</span>
          </label>
        </div>;
      break;
    case "link-to-existing-repository":
      modalBody = <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label={t("git.dialog.label.remote-url")} setInput={setRemoteRepositoryURL} input={remoteRepositoryURL} />;
      break;
    default:
      modalBody = <div/>;
      break;
  }

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="sm:max-w-[700px]!">
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
          <Button variant="outline" onClick={() => resolve(null)}>{t("close")}</Button>
          <Button type="submit" className="hover:bg-purple-700" onClick={tryCloseWithSuccess} disabled={shouldDisableConfirm}>{t("confirm")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const createNewRemoteRepositoryHandler = async (t: TFunction<"translation", undefined>, openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  // {@link DropdownMenuItem} has to be used in the tree, when it is part of another component, it is rendered incorrectly,
  // that is why we implement it like this and not like react component
  const result = await openModal(GitActionsDialog, { inputPackage, defaultCommitMessage: null, type: "create-new-repository-and-commit", shouldShowAlwaysCreateMergeStateOption: null });
  if (result) {
    const closeDialogObject = createCloseDialogObject();
    // TODO RadStr: Localization
    openModal(LoadingDialog, {
      dialogTitle: "git.loading.create-repository.title",
      waitingText: "git.loading.create-repository.wait",
      setCloseDialogAction: closeDialogObject.setCloseDialogAction,
      shouldShowTimer: true,
    });
    const response = await createNewRemoteRepositoryRequest(iri, result);
    closeDialogObject.closeDialogAction();
    await requestLoadPackage(iri, true);
    gitOperationResultToast(t, response);
  }
};


export const mergeCommitToGitDialogOnClickHandler = async (
  t: TFunction<"translation", undefined>,
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
    await mergeCommitToGitHandler(t, openModal, iri, mergeState, result.commitMessage, result.shouldAppendAfterDefaultMergeCommitMessage, result.exportFormat);
  }
};

export const mergeCommitToGitHandler = async (
  t: TFunction<"translation", undefined>,
  openModal: OpenBetterModal,
  iri: string,
  mergeState: MergeState,
  commitMessage: string | null,
  shouldAppendAfterDefaultMergeCommitMessage: boolean,
  exportFormat: string,
) => {
  const closeDialogObject = createCloseDialogObject();
  // TODO RadStr: Localization
  openModal(LoadingDialog, {
    dialogTitle: "git.loading.merge.title",
    waitingText: "git.loading.default.wait",
    setCloseDialogAction: closeDialogObject.setCloseDialogAction,
    shouldShowTimer: true,
  });
  const mergeFromData: MergeFromDataType = {
    branch: mergeState.branchMergeFrom,
    commitHash: mergeState.lastCommitHashMergeFrom,
    iri: mergeState.rootIriMergeFrom,
  };

  // We do not care about existence of merge states, so we pass in false
  mergeCommitToGitBackendRequest(iri, commitMessage, shouldAppendAfterDefaultMergeCommitMessage, exportFormat, mergeFromData, false)
    .then(async (response) => {
      closeDialogObject.closeDialogAction();
      if (response.status === 500) {
        const jsonResponse: any = await response.json();
        // TODO: ..... Not really clean: The check for the equality of strings of error. But can't really think of anything much better now
        if (jsonResponse.error === "Error: The merge from branch was already merged. We can not merge again.") {
          // In this case we want to always remove the merge state. User has to move heads by committing and then he can create new merge state.
          toast.error(t("git.error.merge-already-merged"));
          console.error(jsonResponse.error + " Removing the merge state.");
          const removalResult = await removeMergeState(mergeState.uuid);
          if (!removalResult) {
            setTimeout(() => {
              toast.error(t("git.error.merge-state-removal-failed"));
            }, 1000);
          }
        }
        else {
          gitOperationResultToast(t, response);
        }
      }
      else if (response.status === 200) {
        // Unlike for other merge states, we remove th emerge state here instead when finalizing backend (the merge state is exception).
        // Since other mergestates just updated the last commit in the finalizer. But that is not the case for merge
        gitOperationResultToast(t, response);
        const removalResult = await removeMergeState(mergeState.uuid);
        if (!removalResult) {
          setTimeout(() => {
            toast.error(t("git.error.merge-state-removal-failed"));
          }, 1000);
        }
      }
      else {
        gitOperationResultToast(t, response);
      }
      await requestLoadPackage(mergeState.rootIriMergeFrom, true);
      await requestLoadPackage(mergeState.rootIriMergeTo, true);
    });
};

export const commitToGitDialogOnClickHandler = async (
  t: TFunction<"translation", undefined>,
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
    await commitToGitHandler(
      t, openModal, iri, commitType, shouldShowAlwaysCreateMergeStateOption,
      result.commitMessage, result.exportFormat, result.shouldAlwaysCreateMergeState, true, onSuccessCallback);
  }
};

/**
 * @param shouldRedirectWithExistenceOfMergeStates for commitType singalizing "rebase-commit", this parameter will be ignored and false will be used instead.
 */
export const commitToGitHandler = async (
  t: TFunction<"translation", undefined>,
  openModal: OpenBetterModal,
  iri: string,
  commitType: SingleBranchCommitType,
  canCreateMergeStateIfNecessary: boolean,
  commitMessage: string | null,
  exportFormat: string,
  shouldAlwaysCreateMergeState: boolean,
  shouldRedirectWithExistenceOfMergeStates: boolean,
  onSuccessCallback: (() => void) | null,
) => {
  const closeDialogObject = createCloseDialogObject();
  // TODO RadStr: Localization
  openModal(LoadingDialog, {
    dialogTitle: "git.loading.commit.title",
    waitingText: "git.loading.default.wait",
    setCloseDialogAction: closeDialogObject.setCloseDialogAction,
    shouldShowTimer: true,
  });

  if (commitType === "rebase-commit") {
    // In rebase case we just commit. Otherwise, the LoadingDialog runs twice, which we do not want,
    //  since for rebase the default action is committing again without any other invervention
    // TODO RadStr PR: I feel like this is the correct decision - when we are rebasing from diff editor, and we passed the validation, then we want to commit
    //                 even if other merge states exist - this is equivalent to merging - there we also do not care that merge states exist.
    //                 Technically, it could be rewritten to rebase exactly if the one commit exist, but we will keep it like this.
    shouldRedirectWithExistenceOfMergeStates = false;
  }
  commitToGitBackendRequest(iri, commitMessage, exportFormat, shouldAlwaysCreateMergeState, shouldRedirectWithExistenceOfMergeStates)
    .then(async (response) => {
      if (response.status === 300) {
        const jsonResponse: CommitRedirectResponseJson = await response.json();
        const extendedResponse: CommitRedirectExtendedResponseJson = {
          ...jsonResponse,
          commitType,
          shouldAppendAfterDefaultMergeCommitMessage: null,
          shouldAlwaysCreateMergeState,
          onSuccessCallback,
        };
        openModal(CommitRedirectForMergeStatesDialog, {commitRedirectResponse: extendedResponse});
        closeDialogObject.closeDialogAction();
        console.info({jsonResponse});     // TODO RadStr Debug: Debug print
      }
      else if (response.status === 409 && canCreateMergeStateIfNecessary) {
        closeDialogObject.closeDialogAction();
        const jsonResponse: NonNullable<CommitConflictInfo> = await response.json();
        openModal(TextDiffEditorDialog, { initialMergeFromRootMetaPath: jsonResponse.conflictMergeFromRootPath, initialMergeToRootMetaPath: jsonResponse.conflictMergeToRootPath, editable: convertMergeStateCauseToEditable("push")});
        toast.success(t("git.toast.merge-state-created"));
        requestLoadPackage(iri, true);
        return;
      }
      else {
        closeDialogObject.closeDialogAction();
        gitOperationResultToast(t, response);
        requestLoadPackage(iri, true);
        if (response.ok) {
          onSuccessCallback?.();
        }
      }
    });
};


export const linkToExistingGitRepositoryHandler = async (t: TFunction<"translation", undefined>, openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  const result = await openModal(GitActionsDialog, { inputPackage, defaultCommitMessage: null, type: "link-to-existing-repository", shouldShowAlwaysCreateMergeStateOption: null });
  if (result) {
    const response = await linkToExistingGitRepositoryRequest(iri, result.remoteRepositoryURL);
    if (response.ok) {
      // TODO RadStr later: Localization
      toast.success(t("git.toast.link-success"));
    }
    else {
      // TODO RadStr later: Localization
      toast.error(t("git.toast.link-failed"));
    }
    requestLoadPackage(iri, true);
  }
};
