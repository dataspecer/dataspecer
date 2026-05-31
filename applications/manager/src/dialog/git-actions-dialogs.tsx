import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps, OpenBetterModal } from "@/lib/better-modal";
import { RefObject, useEffect, useMemo, useRef, useState } from "react";
import { gitOperationResultToast } from "@/utils/utilities";
import { requestLoadPackage } from "@/package";
import { InputComponent, InputSuggestionsType } from "@/components/input-component";
import { Package } from "@dataspecer/core-v2/project";
import { toast } from "sonner";
import {
  CommitRedirectResponseJson, createSetterWithGitValidation, CommitRedirectExtendedResponseJson, MergeFromDataType,
  MergeState, SingleBranchCommitType, convertMergeStateCauseToEditable, CommitConflictInfo, GitProviderEnum, convertGitProviderNameToEnum,
  getGitRemoteConfigurationModelFromPackage, GitRemoteConfigurations, ExportFormatType, saveGitRemoteConfiguration,
  PUBLICATION_BRANCH_DEFAULT_NAME,
  ExportVersionType,
  getDefaultExportVersion,
  getDefaultExportFormat,
  convertEnumToGitProviderName,
  UserOrganizationsFetchResponseFrontend,
  isGitProviderName,
  getGitProviderDomain,
  ErrorDefinitionConstantsClass
} from "@dataspecer/git";
import { CommitRedirectForMergeStatesDialog } from "./commit-confirm-dialog-caused-by-merge-state";
import { commitToGitBackendRequest, createNewRemoteRepositoryRequest, GitCommitData, GitMergeCommitData, linkToExistingGitRepositoryRequest, mergeCommitToGitBackendRequest } from "@/utils/git-backend-requests";
import { createCloseLoadingDialogObject, LoadingDialog } from "@/dialog/loading-dialog";
import { ComboBox, createGitProviderComboBoxOptions } from "@/components/combo-box";
import { removeMergeState } from "@/utils/merge-state-backend-requests";
import { TextDiffEditorDialog } from "./diff-editor-dialog";
import { useLogin } from "@/hooks/use-login";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";
import { SetGitRemoteConfigurationComponent } from "./set-git-remote-configuration-dialog";
import { useRequiredFieldsForGitConfig } from "@/hooks/use-required-fields-for-git-config";
import { CREATE_REPOSITORY_WAIT_TIME, GIT_COMMIT_WAIT_TIME, MERGE_COMMIT_WAIT_TIME } from "@/utils/git-wait-times";
import { ArrowDownNarrowWide, ArrowUpNarrowWide, Loader } from "lucide-react";
import { BooleanRadioButtons } from "@/components/boolean-radio-buttons";
import { PopOverGitGeneralComponent } from "@/components/popover-git-general";
import { useAsyncMemo } from "@/hooks/use-async-memo";


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


type NullableGitRemoteConfigurations = GitRemoteConfigurations | null;

export type SetGitRemoteConfigurationStatePartMethod = (gitRemoteConfigurationSetter: SetGitConfigurationReactStateType, key: keyof GitRemoteConfigurations, newValue: any) => void;

/**
 * TODO RadStr: Could be probably typed better
 */
export type SetGitConfigurationReactStateType = (value: NullableGitRemoteConfigurations | ((prevState: NullableGitRemoteConfigurations) => NullableGitRemoteConfigurations)) => void;

export function setGitRemoteConfigurationStatePart(
  gitRemoteConfigurationSetter: SetGitConfigurationReactStateType,
  key: keyof GitRemoteConfigurations,
  newValue: any,
) {
  gitRemoteConfigurationSetter((prevState: NullableGitRemoteConfigurations) => {
    if (prevState === null) {
      return null;
    }
    return {
      ...prevState,
      [key]: newValue
    } as NullableGitRemoteConfigurations;
  });
}


type GitActionsDialogProps = {
  inputPackage: Package;
  defaultShouldAlwaysCreateMergeStateValue: boolean;
  shouldShowAlwaysCreateMergeStateOption: boolean | null;
  defaultCommitMessage: string | null;
  type?: "create-new-repository-and-commit" | "commit" | "merge-commit" | "link-to-existing-repository";
} & BetterModalProps<{
  repositoryName: string;
  remoteRepositoryURL: string;
  gitProviderDomain: string;
  commitMessage: string;
  signedInUserOrOrganization: string | null;
  isUserRepo: boolean;
  shouldAlwaysCreateMergeState: boolean;
  shouldAppendAfterDefaultMergeCommitMessage: boolean;
  publicationBranch: string;
  exportFormat: ExportFormatType;
  exportVersion: ExportVersionType;
} | null>;

const gitDialogInputIdPrefix = "git-dialog-prefix";

/**
 * This dialog represents the dialog used for manipulation of git.
 * The purpose depends on the given type, which can be seen in {@link GitActionsDialogProps}.
 *  It is one of the following:
 *  - Create new repo and commit current content to it
 *  - Commit current content
 *  - Perform merge-commit
 *  - link to existing repository - which is disabled for now due to huge issues regarding IRIs
 * It is all part of one dialog since some functionality is shared.
 *  This dialog is usually called by handler methods, for example {@link commitToGitHandler}.
 * Before resolving check for mandatory fields is performed, where the fields depend on the type of dialog.
 */
export const GitActionsDialog = ({ inputPackage, defaultCommitMessage, isOpen, resolve, type, shouldShowAlwaysCreateMergeStateOption, defaultShouldAlwaysCreateMergeStateValue }: GitActionsDialogProps) => {
  const { t } = useTranslation();
  type = type ?? "create-new-repository-and-commit";
  const [showMore, setShowMore] = useState<boolean>(false);

  const gitProvidersComboboxOptions = useMemo(() => {
    // TODO RadStr: In future the Git provider would be ideally set based on the Git provider the user logged in as.
    return createGitProviderComboBoxOptions();
  }, []);

  const [rootPackageContent, setRootPackageContent] = useState<any>(null);
  const [gitRemoteConfiguration, setGitRemoteConfiguration] = useState<GitRemoteConfigurations | null>(null);
  useEffect(() => {
    const setGitRemoteConfigurationState = async () => {
      // For the commits (and creating of repo) we will pass in the exportFormat directly, instead of retrieving it again on server.
      const isGitDialogSettingGitConfiguration = type !== "link-to-existing-repository";
      let rootPackageFetchResponse = await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(inputPackage.iri));
      let rootPackageFetchedContent: any;
      if (rootPackageFetchResponse.status === 404 && type === "create-new-repository-and-commit") {
        // The "model" does not exist
        await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(inputPackage.iri), {
          method: "POST",
        });
        rootPackageFetchResponse = await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(inputPackage.iri));
      }
      rootPackageFetchedContent = await rootPackageFetchResponse.json();
      const fetchedGitRemoteConfiguration = isGitDialogSettingGitConfiguration ? await getGitRemoteConfigurationModelFromPackage(rootPackageFetchedContent) : null;
      setRootPackageContent(rootPackageFetchedContent);
      setGitRemoteConfiguration(fetchedGitRemoteConfiguration);
    };
    setGitRemoteConfigurationState();
  }, [inputPackage]);

  const { accountProvider, username, genericScope, isSignedIn, isLoginDataReady } = useLogin();

  const [repositoryName, setRepositoryName] = useState<string>("");
  // const [repositoryName, setRepositoryName] = useState<string>(inputPackage.iri);    // TODO RadStr: Debugging - default unique value
  const defaultRemoteRepositoryUrl = inputPackage.linkedGitRepositoryURL.length === 0 ? "https://github.com/userName/repositoryName" : inputPackage.linkedGitRepositoryURL;
  const [remoteRepositoryUrl, setRemoteRepositoryUrl] = useState<string>(defaultRemoteRepositoryUrl);
  const [organization, setOrganization] = useState<string>("");
  const [isLoadingOrganizationSuggestions, setIsLoadingOrganizationSuggestions] = useState<boolean>(false);
  const [isOwnerSignedInUser, setIsOwnerSignedInUser] = useState<boolean>(true);
  const [gitProvider, setGitProvider] = useState<GitProviderEnum>(gitProvidersComboboxOptions[0].value);
  const defaultCommitMessageExplicit = defaultCommitMessage ??
    (type === "create-new-repository-and-commit" ?
      "Initial commit with data specification" :
      type === "commit" ?
        "Default commit message" :
        type === "merge-commit" ?
          "Default merge commit message" :
          ""
    );
  const [commitMessage, setCommitMessage] = useState<string>(defaultCommitMessageExplicit);
  const [isUserRepo, setIsUserRepo] = useState<boolean>(true);
  // We want the shouldAlwaysCreateMergeState option on, except when we are not showing it, then it can cause recursion
  const [shouldAlwaysCreateMergeState, setShouldAlwaysCreateMergeState] = useState<boolean>(defaultShouldAlwaysCreateMergeStateValue);
  const [shouldAppendAfterDefaultMergeCommitMessage, setShouldAppendAfterDefaultMergeCommitMessage] = useState<boolean>(true);

  useEffect(() => {
    if (isLoginDataReady) {
      if (accountProvider !== convertEnumToGitProviderName(gitProvider) || !isSignedIn || !genericScope.includes("publicRepo")) {
        // It has to be bot
        setIsOwnerSignedInUser(false);
      }
    }
  }, [accountProvider, isSignedIn, genericScope, isLoginDataReady]);


  useEffect(() => {
    if (isSignedIn && isLoginDataReady)  {
      if (!isGitProviderName(accountProvider)) {
        return;     // We just return, since it might be possible that the user might be signed in using KeyCloak or something like that
      }
      const initialGitProvider = convertGitProviderNameToEnum(accountProvider);
      if (initialGitProvider === undefined) {
        throw new Error(`For some reason could not convert ${accountProvider} to the existing enum. Most-likely programmer error`);
      }
      setGitProvider(initialGitProvider);
    }
  }, [isLoginDataReady, isSignedIn, accountProvider]);

  // Fetching organizations so they show in input box when writing
  // TODO RadStr: The suggestion (both user and bot) should be a Record, so we do not keep fetching data of Git provider we already have.
  //                 But it is just optimization user usually does not keep changing between Git providers.
  //                 They just pick one and create repository
  const [userOrganizationSuggestions, userOrganizationSuggestionsNotReady] = useAsyncMemo(async () => {
    if (!isUserRepo && isSignedIn) {
      setIsLoadingOrganizationSuggestions(true);
      try {
        const fetchResponse = await fetch(import.meta.env.VITE_BACKEND + "/git/authenticated-user-organizations?targetGitProvider=" + convertEnumToGitProviderName(gitProvider), {
          method: "GET",
          credentials: "include",
        });

        const userOrganizations: UserOrganizationsFetchResponseFrontend = await fetchResponse.json();
        if ("error" in userOrganizations) {
          throw new Error(userOrganizations.error);
        }

        if (!userOrganizations.isLastPage) {
          // We should not really alert in production, but this is such a hardcore case that we will.
          alert(t("git.dialog.alert.too-many-user-organizations"));
        }
        return userOrganizations.organizations.map(org => {
          const suggestion: InputSuggestionsType = {
            value: org,
            textSuffix: "",
          };
          return suggestion;
        });
      }
      catch (error: any) {
        console.error("Failed fetching organizations the authenticated user is part of.");
        console.error(error.message);
        return [];
      }
    }
  }, [isSignedIn, gitProvider, isUserRepo]);

  const [botOrganizationSuggestions, botOrganizationSuggestionsNotReady] = useAsyncMemo(async () => {
    if (!isUserRepo) {
      try {
        setIsLoadingOrganizationSuggestions(true);
        const fetchResponse = await fetch(import.meta.env.VITE_BACKEND + "/git/bot-organizations?targetGitProvider=" + convertEnumToGitProviderName(gitProvider), {
          method: "GET",
        });
        const botOrganizations: UserOrganizationsFetchResponseFrontend = await fetchResponse.json();
        if ("error" in botOrganizations) {
          throw new Error(botOrganizations.error);
        }

        if (!botOrganizations.isLastPage) {
          // We should not really alert in production, but this is such a hardcore case that we will.
          alert(t("git.dialog.alert.too-many-bot-organizations"));
        }
        return botOrganizations.organizations.map(org => {
          const suggestion: InputSuggestionsType = {
            value: org,
            textSuffix: " (bot)",
          };
          return suggestion;
        });
      }
      catch (error: any) {
        console.error("Failed fetching the bot organizations.");
        console.error(error.message);
        return [];
      }
    }
  }, [gitProvider, isUserRepo]);

  // Combine the bot and singed in user organizations into one array.
  const suggestionsForOrganization: InputSuggestionsType[] = useMemo(() => {
    let botOrganizationSuggestionsToUse: InputSuggestionsType[];
    if (botOrganizationSuggestionsNotReady) {
      botOrganizationSuggestionsToUse = [];
    }
    else {
      botOrganizationSuggestionsToUse = botOrganizationSuggestions ?? [];
    }
    let userOrganizationSuggestionsToUse: InputSuggestionsType[];
    if (userOrganizationSuggestionsNotReady) {
      userOrganizationSuggestionsToUse = [];
    }
    else {
      userOrganizationSuggestionsToUse = userOrganizationSuggestions ?? [];
    }

    const suggestionsWithDuplicates: InputSuggestionsType[] = userOrganizationSuggestionsToUse.concat(botOrganizationSuggestionsToUse);
    const isInUserSuggestions = (botSuggestionToCheck: InputSuggestionsType) => {
      return userOrganizationSuggestionsToUse?.find(userSuggestion => botSuggestionToCheck.value === userSuggestion.value) !== undefined;
    };
    // Either it is user suggestion or it is not and then it has to not be present in the user suggestions.
    const suggestionsWithoutDuplicates = suggestionsWithDuplicates
      .filter(suggestion => suggestion.textSuffix === "" || !isInUserSuggestions(suggestion));
    if (suggestionsWithoutDuplicates.length > 0) {
      setOrganization(suggestionsWithoutDuplicates[0].value);
    }
    setIsLoadingOrganizationSuggestions(false);
    return suggestionsWithoutDuplicates;
  }, [userOrganizationSuggestions, botOrganizationSuggestions]);
  //

  // Values for non-empty inputbox check
  const repositoryNameInputFieldRef = useRef<HTMLInputElement | null>(null);
  const commitMessageInputFieldRef = useRef<HTMLInputElement | null>(null);
  const organizationInputFieldRef = useRef<HTMLInputElement | null>(null);
  const { publicationBranchRef, requiredGitConfigFieldsMap } = useRequiredFieldsForGitConfig();

  const requiredFields: RefObject<HTMLInputElement | null>[] = useMemo(() => {
    const requiredFieldsInternal: RefObject<HTMLInputElement | null>[] = [];
    switch(type) {
      case "create-new-repository-and-commit":
        requiredFieldsInternal.push(repositoryNameInputFieldRef, organizationInputFieldRef, commitMessageInputFieldRef, publicationBranchRef);
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
    if (type === "create-new-repository-and-commit") {
      repositoryNameInputFieldRef.current?.focus();
    }
  }, [isLoginDataReady]);

  useEffect(() => {
    if (isLoginDataReady) {
      // We have to it like this because the login is asynchronous
      // If the Git provider matches and we have a push scope, then show the user's name instead of empty string.
      if (convertGitProviderNameToEnum(accountProvider) === gitProvidersComboboxOptions[0].value && genericScope.includes("publicRepo")) {
        setIsOwnerSignedInUser(true);
      }
    }
  }, [accountProvider, username, genericScope, isLoginDataReady]);


  let suffixNumber = 0;


  const tryCloseWithSuccess = () => {
    const resolveAsNoParamsMethod = async () => {
      if (type === "create-new-repository-and-commit") {
        // We store the new configuration only when creating new repository,
        const storeModelToBackend = async (iri: string, newPackageContent: object) => {
          try {
            // TODO RadStr Improvement to existing code: This probably should be in some interface, maybe the BackendPackageService
            //               We do it like this, since there is no existing method,
            //                where is this implemented and we do not what to introduce one,
            //                since similar code exists on multiple places not implemented by me.
            await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(iri), {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(newPackageContent),
            });
          }
          catch (error) {
            toast.error(t("git.dialog.error.failed-saving-configuration"), { "richColors": true });
            throw error;
          }
        };
        await saveGitRemoteConfiguration(inputPackage.iri, rootPackageContent, gitRemoteConfiguration, storeModelToBackend);
      }

      let owner: string | null;
      if (isUserRepo) {
        owner = isOwnerSignedInUser ? (isSignedIn ? username : null) : null;
      }
      else {
        owner = organization;
      }

      const gitProviderDomain = getGitProviderDomain(gitProvider, true, true);
      resolve({
        signedInUserOrOrganization: owner, repositoryName, remoteRepositoryURL: remoteRepositoryUrl, gitProviderDomain, commitMessage, isUserRepo,
        shouldAlwaysCreateMergeState, shouldAppendAfterDefaultMergeCommitMessage,
        publicationBranch: gitRemoteConfiguration?.publicationBranch ?? PUBLICATION_BRANCH_DEFAULT_NAME,
        exportFormat: gitRemoteConfiguration?.exportFormat ?? getDefaultExportFormat(),
        exportVersion: gitRemoteConfiguration?.exportVersion ?? getDefaultExportVersion(),
      });
    };

    resolveWithRequiredCheck(resolveAsNoParamsMethod, ...requiredFields);
  };

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
        <div className="pt-2 flex flex-1 flex-row">
          <p className="text-sm pt-2.5">{t("git.dialog.label.git-provider")}</p>
          <div className="pl-23">
            <ComboBox options={gitProvidersComboboxOptions} onChange={(value: GitProviderEnum) => setGitProvider(value)}/>
          </div>
        </div>
        <div className="pt-6 flex flex-1 flex-row">
          <p className="text-sm">{t("git.dialog.label.repository-type")}</p> <PopOverGitGeneralComponent><RepositoryOwnerTooltip/></PopOverGitGeneralComponent>
          <div className="pt-2 pl-8 flex flex-1 flex-row">
            <BooleanRadioButtons value={isUserRepo}
                                  setValue={setIsUserRepo}
                                  isFalseDisabled={false}
                                  isTrueDisabled={false}
                                  trueText="git.dialog.radio.user-repository"
                                  falseText="git.dialog.radio.organization-repository"
              />
          </div>
        </div>
        {
          isUserRepo ?
            <div className="flex flex-1 flex-row">
              <p className="pb-3 pt-1 text-sm">{t("git.dialog.label.repository-owner")}</p>
              <div className="pl-14 items-center justify-center pt-3">
                <BooleanRadioButtons
                  value={isOwnerSignedInUser}
                  setValue={setIsOwnerSignedInUser}
                  isFalseDisabled={false}
                  isTrueDisabled={!isSignedIn}
                  trueText="git.dialog.radio.signed-in-user"
                  falseText="git.dialog.radio.bot-fallback-user"
                />
              </div>
            </div> :
            isLoadingOrganizationSuggestions ?
              <div className="flex flex-1 flex-row"><Loader className="mr-2 mt-1.5 h-4 w-4 animate-spin" />{t("git.dialog.text.fetching-organizations")}</div> :
              <div>
                <InputComponent
                  idPrefix={gitDialogInputIdPrefix}
                  idSuffix={suffixNumber++}
                  label={t("git.dialog.label.repository-owner")}
                  input={organization}
                  setInput={createSetterWithGitValidation(setOrganization)}
                  suggestions={suggestionsForOrganization}
                  requiredRefObject={organizationInputFieldRef}
                />
                <div className="my-8"/>
              </div>
        }
        {
          isLoadingOrganizationSuggestions ? null :
          <>
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
              label={t("git.dialog.label.initial-commit-message")}
              setInput={setCommitMessage}
              input={commitMessage}
              requiredRefObject={commitMessageInputFieldRef}
            />
            {/* ---- COLLAPSIBLE SECTION ---- */}
            <Button
              variant="ghost"
              className="mt-2 mb-2 p-0 text-sm"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? <ArrowUpNarrowWide /> : <ArrowDownNarrowWide />} {t("git.dialog.button.advanced-settings")}
            </Button>
            { (!showMore || gitRemoteConfiguration === null) ?
                null :
                <div>
                  <div className="mt-3 font-semibold">{t("git.dialog.text.git-configuration")}</div>
                  <SetGitRemoteConfigurationComponent
                    configuration={gitRemoteConfiguration!}
                    setGitConfigurationReactState={setGitRemoteConfiguration}
                    requiredFieldsMap={requiredGitConfigFieldsMap}
                  />
                </div>
            }
            {/* ---- END OF COLLAPSIBLE SECTION ---- */}
          </>
        }
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
            {(shouldShowAlwaysCreateMergeStateOption ?? false) === false ?
              null :
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={shouldAlwaysCreateMergeState}
                  onChange={(e) => setShouldAlwaysCreateMergeState(e.target.checked)}
                  className="w-5 h-5 accent-blue-600"
                  title={t("git.dialog.checkbox.merge-state-tooltip")}
                />
                <span>{t("git.dialog.merge-state.always")}</span>
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={shouldAppendAfterDefaultMergeCommitMessage}
              onChange={(e) => setShouldAppendAfterDefaultMergeCommitMessage(e.target.checked)}
              className="w-5 h-5 accent-blue-600"
            />
            <span>{t("git.dialog.label.merge-commit-message.append")}</span>
          </label>
        </div>;
      break;
    case "link-to-existing-repository":
      modalBody = <InputComponent idPrefix={gitDialogInputIdPrefix} idSuffix={suffixNumber++} label={t("git.dialog.label.remote-url")} setInput={setRemoteRepositoryUrl} input={remoteRepositoryUrl} />;
      break;
    default:
      modalBody = <div/>;
      break;
  }

  return (
    <Modal open={isOpen} onClose={() => resolve(null)}>
      <ModalContent className="sm:max-w-[700px]! max-h-[95%] overflow-auto">
        <ModalHeader>
          <ModalTitle>{modalTitle}</ModalTitle>
          <ModalDescription>
            <p className="whitespace-pre-line">{modalDescription}</p>
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

function RepositoryOwnerTooltip() {
  const { t } = useTranslation();
  return <div>
    {t("git.dialog.repository-owner-tooltip.example")}
    <br/>
     &nbsp; - "torvalds" {t("git.dialog.repository-owner-tooltip.is-the")} <strong>{t("git.dialog.repository-owner-tooltip.owner")}</strong>, {t("git.dialog.repository-owner-tooltip.while")} "linux" {t("git.dialog.repository-owner-tooltip.is-the")} <strong>{t("git.dialog.repository-owner-tooltip.name")}</strong> {t("git.dialog.repository-owner-tooltip.of-the-repository")}.
    <br/>
     &nbsp; - <strong>{t("git.dialog.repository-owner-tooltip.owner")}</strong> {t("git.dialog.repository-owner-tooltip.can-be")}
  </div>;
}



export const createNewRemoteRepositoryHandler = async (t: TFunction<"translation", undefined>, openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  // {@link DropdownMenuItem} has to be used in the tree, when it is part of another component, it is rendered incorrectly,
  // that is why we implement it like this and not like react component
  const result = await openModal(GitActionsDialog, {
    inputPackage,
    defaultCommitMessage: null,
    type: "create-new-repository-and-commit",
    shouldShowAlwaysCreateMergeStateOption: null,
    defaultShouldAlwaysCreateMergeStateValue: true,
  });
  if (result) {
    const closeDialogObject = createCloseLoadingDialogObject();
    setTimeout(() => {
      openModal(LoadingDialog, {
        dialogTitle: "git.loading.create-repository.title",
        waitingText: "git.loading.commit.wait-text",
        waitTime: CREATE_REPOSITORY_WAIT_TIME,
        setCloseDialogAction: closeDialogObject.setCloseDialogAction,
        shouldShowTimer: true,
        shouldDisableClosing: true,
      });
    }, 20);
    try {
      const response = await createNewRemoteRepositoryRequest(iri, result);
      closeDialogObject.closeDialogAction();
      await requestLoadPackage(iri, true);
      if (response.status === 422) {
        // TODO RadStr: Localization
        toast.error(`Repository with the given name (${result.repositoryName}) already exists under the user (${result.signedInUserOrOrganization ?? "Dataspecer bot"}).`, { richColors: true });
        return;
      }
      else if (response.status === 403) {
        toast.error(`Unauthorized (not sufficient permissions) - Cannot create repository: ${result.repositoryName}, and user: ${result.signedInUserOrOrganization ?? "Dataspecer bot"}`, { richColors: true });
      }
      else if (response.status === 404) {
        if (result.isUserRepo) {
          console.error(`THIS SHOULD NOT HAPPEN. It should happen only for organization repositories, since this would otherwise mean that the user does not exist. (User: ${result.signedInUserOrOrganization ?? "Dataspecer bot"}) (Repo name: ${result.repositoryName})`);
          toast.error(`Could not create the repository since the user does not exist. Check console for more details.`, { richColors: true });
        }
        else {
          toast.error(`Organization with given name (${result.signedInUserOrOrganization}) does not exist.`, { richColors: true });
        }
      }
      else {
        gitOperationResultToast(t, response);
      }
    }
    catch (error) {
      closeDialogObject.closeDialogAction();  // Closing the dialog twice is fine
      throw error;
    }
  }
};


export const mergeCommitToGitDialogOnClickHandler = async (
  t: TFunction<"translation", undefined>,
  openModal: OpenBetterModal,
  iri: string,
  inputPackage: Package,
  mergeState: MergeState,
) => {
  let defaultCommitMessage: string;
  if (mergeState.commitMessage === "") {
    defaultCommitMessage = "Default merge commit message";
  }
  else {
    defaultCommitMessage = mergeState.commitMessage;
  }

  const result = await openModal(GitActionsDialog, {
    inputPackage,
    defaultCommitMessage,
    type: "merge-commit",
    shouldShowAlwaysCreateMergeStateOption: false,
    defaultShouldAlwaysCreateMergeStateValue: false,
  });
  if (result) {
    const gitMergeCommitData: GitMergeCommitData = {
      commitMessage: result.commitMessage,
      exportFormat: result.exportFormat,
      exportVersion: result.exportVersion,
    };
    await mergeCommitToGitHandler(t, openModal, iri, mergeState, gitMergeCommitData, result.shouldAppendAfterDefaultMergeCommitMessage);
  }
};

export const mergeCommitToGitHandler = async (
  t: TFunction<"translation", undefined>,
  openModal: OpenBetterModal,
  iri: string,
  mergeState: MergeState,
  gitMergeCommitData: GitMergeCommitData,
  shouldAppendAfterDefaultMergeCommitMessage: boolean,
) => {
  const closeDialogObject = createCloseLoadingDialogObject();
  openModal(LoadingDialog, {
    dialogTitle: "git.loading.merge.title",
    waitingText: "git.loading.commit.wait-text",
    waitTime: MERGE_COMMIT_WAIT_TIME,
    setCloseDialogAction: closeDialogObject.setCloseDialogAction,
    shouldShowTimer: true,
    shouldDisableClosing: true
  });
  const mergeFromData: MergeFromDataType = {
    branch: mergeState.branchMergeFrom,
    commitHash: mergeState.lastCommitHashMergeFrom,
    iri: mergeState.rootIriMergeFrom,
  };

  // We do not care about existence of merge states, so we pass in false
  mergeCommitToGitBackendRequest(iri, gitMergeCommitData, shouldAppendAfterDefaultMergeCommitMessage, mergeFromData, false)
    .then(async (response) => {
      closeDialogObject.closeDialogAction();
      if (response.status === 500) {
        const jsonResponse: any = await response.json();
        if (jsonResponse.error === ErrorDefinitionConstantsClass.convertToFrontendResponseMessage(ErrorDefinitionConstantsClass.BRANCH_ALREADY_MERGE_ERROR_MSG)) {
          // In this case we want to always remove the merge state. User has to move heads by committing and then he can create new merge state.
          toast.error(t("git.error.merge-already-merged"), { "richColors": true });
          console.error(jsonResponse.error + " Removing the merge state.");
          const removalResult = await removeMergeState(mergeState.uuid);
          if (!removalResult) {
            setTimeout(() => {
              toast.error(t("git.error.merge-state-removal-failed"), { "richColors": true });
            }, 1000);
          }
        }
        else if (jsonResponse?.error === ErrorDefinitionConstantsClass.convertToFrontendResponseMessage(ErrorDefinitionConstantsClass.NO_CHANGES_TO_COMMIT_ERROR_MSG)) {
          closeDialogObject.closeDialogAction();
          toast.error(ErrorDefinitionConstantsClass.NO_CHANGES_TO_COMMIT_ERROR_MSG, {richColors: true});
          return;
        }
        else {
          gitOperationResultToast(t, response);
        }
      }
      else if (response.status === 409) {
        // We put the message into console again
        console.error("One of the branches did not match the latest commit in Git. Merge again.");
        toast.error("One of the branches did not match the latest commit in Git. Merge again.", { "richColors": true });
        const removalResult = await removeMergeState(mergeState.uuid);
        if (!removalResult) {
          setTimeout(() => {
            toast.error(t("git.error.merge-state-removal-failed"), { "richColors": true });
          }, 1000);
        }
      }
      else if (response.status === 200) {
        // Unlike for other merge states, we remove th emerge state here instead when finalizing backend (the merge state is exception).
        // Since other mergestates just updated the last commit in the finalizer. But that is not the case for merge
        gitOperationResultToast(t, response);
        const removalResult = await removeMergeState(mergeState.uuid);
        if (!removalResult) {
          setTimeout(() => {
            toast.error(t("git.error.merge-state-removal-failed"), { "richColors": true });
          }, 1000);
        }
      }
      else {
        gitOperationResultToast(t, response);
      }
      await requestLoadPackage(mergeState.rootIriMergeFrom, true);
      await requestLoadPackage(mergeState.rootIriMergeTo, true);
    })
    .catch(() => {
      closeDialogObject.closeDialogAction();
    });
};

export type MergeStateCreationAllowanceType = {
  allowMergeStateCreation: boolean;
  // Should be defined if "allowMergeStateCreation" is false (for true it is not used). If it is not defined some default message will be used.
  toastMessageForUnexpectedMergeStateCreation?: string;
}

/**
 * @param mergeStateCreationAllowance If not provided then we allow creation of merge states by default.
 */
export const commitToGitDialogOnClickHandler = async (
  t: TFunction<"translation", undefined>,
  openModal: OpenBetterModal,
  iri: string,
  inputPackage: Package,
  commitType: SingleBranchCommitType,
  shouldShowAlwaysCreateMergeStateOption: boolean,
  shouldRedirectWithExistenceOfMergeStates: boolean,
  defaultCommitMessage: string | null,
  onSuccessCallback: (() => void) | null,
  mergeStateCreationAllowance?: MergeStateCreationAllowanceType,
) => {
  if (defaultCommitMessage === "" && commitType === "rebase-commit") {
    defaultCommitMessage = "Rebase commit message";
  }

  const result = await openModal(GitActionsDialog, {
    inputPackage,
    defaultCommitMessage,
    type: "commit",
    shouldShowAlwaysCreateMergeStateOption,
    defaultShouldAlwaysCreateMergeStateValue: false,
  });
  if (result) {
    const gitCommitData: GitCommitData = {
      ...result,
      commitType,
      allowMergeStateCreation: mergeStateCreationAllowance?.allowMergeStateCreation ?? true,
    };
    await commitToGitHandler(
      t, openModal, iri, gitCommitData, shouldRedirectWithExistenceOfMergeStates, onSuccessCallback, mergeStateCreationAllowance?.toastMessageForUnexpectedMergeStateCreation);
  }
};


/**
 * @param shouldRedirectWithExistenceOfMergeStates for commitType singalizing "rebase-commit", this parameter will be ignored and false will be used instead.
 * @param toastMessageForUnexpectedMergeStateCreation used when the canCreateMergeStateIfNecessary is false but we hit conflicts anyways and create merge state because of that
 */
export const commitToGitHandler = async (
  t: TFunction<"translation", undefined>,
  openModal: OpenBetterModal,
  iri: string,
  gitCommitData: GitCommitData,
  shouldRedirectWithExistenceOfMergeStates: boolean,
  onSuccessCallback: (() => void) | null,
  toastMessageForUnexpectedMergeStateCreation?: string,
) => {
  const closeDialogObject = createCloseLoadingDialogObject();
  openModal(LoadingDialog, {
    dialogTitle: "git.loading.commit.title",
    waitingText: "git.loading.commit.wait-text",
    waitTime: GIT_COMMIT_WAIT_TIME,
    setCloseDialogAction: closeDialogObject.setCloseDialogAction,
    shouldShowTimer: true,
    shouldDisableClosing: true,
  });

  if (gitCommitData.commitType === "rebase-commit") {
    // In rebase case we just commit. Otherwise, the LoadingDialog runs twice, which we do not want,
    //  since for rebase the default action is committing again without any other invervention
    //   I feel like this is the correct decision - when we are rebasing from diff editor, and we passed the validation, then we want to commit
    //    even if other merge states exist - this is equivalent to merging - there we also do not care that merge states exist.
    //    Technically, it could be rewritten to rebase exactly if the one commit exist, but we will keep it like this.
    shouldRedirectWithExistenceOfMergeStates = false;
  }
  commitToGitBackendRequest(iri, gitCommitData, shouldRedirectWithExistenceOfMergeStates)
    .then(async (response) => {
      if (response.status === 300) {
        const jsonResponseTyped: CommitRedirectResponseJson = await response.json() as CommitRedirectResponseJson;
        const extendedResponse: CommitRedirectExtendedResponseJson = {
          ...jsonResponseTyped,
          commitType: gitCommitData.commitType,
          shouldAppendAfterDefaultMergeCommitMessage: null,
          shouldAlwaysCreateMergeState: gitCommitData.shouldAlwaysCreateMergeState,
          onSuccessCallback,
        };
        openModal(CommitRedirectForMergeStatesDialog, {commitRedirectResponse: extendedResponse});
        closeDialogObject.closeDialogAction();
      }
      else if (response.status === 500) {
        const jsonResponse: any = await response.json();
        if (jsonResponse?.error ===  ErrorDefinitionConstantsClass.convertToFrontendResponseMessage(ErrorDefinitionConstantsClass.NO_CHANGES_TO_COMMIT_ERROR_MSG)) {
          closeDialogObject.closeDialogAction();
          toast.error(ErrorDefinitionConstantsClass.NO_CHANGES_TO_COMMIT_ERROR_MSG, {richColors: true});
          return;
        }
        else {
          closeDialogObject.closeDialogAction();
          gitOperationResultToast(t, response);
          await requestLoadPackage(iri, true);
        }
      }
      else if (response.status === 409) {
        closeDialogObject.closeDialogAction();
        if (gitCommitData.allowMergeStateCreation) {
          const jsonResponseTyped: NonNullable<CommitConflictInfo> = await response.json() as NonNullable<CommitConflictInfo>;
          openModal(TextDiffEditorDialog, { initialMergeFromRootMetaPath: jsonResponseTyped.conflictMergeFromRootPath, initialMergeToRootMetaPath: jsonResponseTyped.conflictMergeToRootPath, editable: convertMergeStateCauseToEditable("push")});
          toast.success(t("git.toast.merge-state-created"));
        }
        else {
          const errorMessage = toastMessageForUnexpectedMergeStateCreation ?? "You should create merge state, since the commit had conflicts.";
          console.error(errorMessage);   // We also write it to the console if the user misses it because it was too quick.
          toast.error(errorMessage, { "richColors": true });
        }
        await requestLoadPackage(iri, true);
        return;
      }
      else if (response.status === 403) {
        // TODO RadStr: Localization
        toast.error("Unauthorized - Cannot commit, neither the user or the bot has sufficient rights", { richColors: true });
        closeDialogObject.closeDialogAction();
        return;
      }
      else {
        closeDialogObject.closeDialogAction();
        gitOperationResultToast(t, response);
        await requestLoadPackage(iri, true);
        if (response.ok) {
          onSuccessCallback?.();
        }
      }
    })
    .catch(() => {
      closeDialogObject.closeDialogAction();
    });
};


export const linkToExistingGitRepositoryHandler = async (t: TFunction<"translation", undefined>, openModal: OpenBetterModal, iri: string, inputPackage: Package) => {
  const result = await openModal(GitActionsDialog, {
    inputPackage,
    defaultCommitMessage: null,
    type: "link-to-existing-repository",
    shouldShowAlwaysCreateMergeStateOption: null,
    defaultShouldAlwaysCreateMergeStateValue: true,     // The value does not matter
  });
  if (result) {
    const response = await linkToExistingGitRepositoryRequest(iri, result.remoteRepositoryURL);
    if (response.ok) {
      toast.success(t("git.toast.link-success"));
    }
    else {
      toast.error(t("git.toast.link-failed"), { "richColors": true });
    }
    requestLoadPackage(iri, true);
  }
};
