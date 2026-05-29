import { Badge } from "@/components/ui/badge";
import { API_SPECIFICATION_MODEL, APPLICATION_GRAPH, LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { AlertTriangleIcon, ArrowLeftRight, BugIcon, CheckIcon, ChevronDown, ChevronRight, CircuitBoard, CloudDownload, Code, EllipsisVertical, Eye, EyeIcon, FileText, Filter, Folder, FolderDown, GitBranchPlus, GitCommit, GitGraph, GitMerge, GitPullRequestArrowIcon, GitPullRequestIcon, Import, LightbulbIcon, Link, NotepadTextDashed, Pencil, Plus, RotateCw, Shapes, Sparkles, TagIcon, TimerResetIcon, Trash2 } from "lucide-react";
import { useCallback, useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { getValidTime } from "../time";
import { Translate } from "../translate";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CreateNew } from "@/dialog/create-new";
import { DeleteResource } from "@/dialog/delete-resource";
import { RenameResourceDialog } from "@/dialog/rename-resource";
import { ResourceDetail } from "@/dialog/resource-detail";
import { useToggle } from "@/hooks/use-toggle";
import { ModelIcon, modelTypeToName } from "@/known-models";
import { useBetterModal } from "@/lib/better-modal";
import { ResourceWithIris, ResourcesContext, ensurePackageWorksForDSE, modifyUserMetadata, requestLoadPackage } from "@/package";
import { ModifyDocumentationTemplate } from "@/dialog/modify-documentation-template";
import React from "react";
import { ModifyRawDialog } from "@/dialog/modify-raw";
import { Autolayout } from "@/dialog/autolayout";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ReloadImported } from "@/dialog/reload-imported";
import { AddImported } from "@/dialog/add-imported";
import { ReloadPimWrapper } from "@/dialog/reload-pim-wrapper";
import { stopPropagation } from "@/utils/events";
import { gitHistoryVisualizationOnClickHandler } from "../git-history-visualization";
import { BranchAction, CreateNewBranchDialog } from "@/dialog/create-new-branch";
import { ListMergeStatesDialog } from "@/dialog/list-merge-states";
import { GitProvider, GitRef, isGitUrlSet, PACKAGE_ROOT } from "@dataspecer/git";
import { GitProviderFactory } from "@dataspecer/git/git-providers";
import { manualPull, trySetPackageAsUpToDate, switchRepresentsBranchHead } from "@/utils/git-fetch-related-actions";
import ResourceTooltip from "../git-tooltip";
import { CreateMergeStateCausedByMergeDialog } from "@/dialog/open-merge-state";
import { PackageListDialog } from "@/dialog/package-list-dialog";
import { DeleteGitRepoDialog } from "@/dialog/remove-git-repo-dialog";
import { SetGitRemoteConfigurationDialog } from "@/dialog/set-git-remote-configuration-dialog";
import { GitPrsListDialog } from "@/dialog/list-git-prs-for-branch";
import { GitIssuesListDialog } from "@/dialog/list-git-issues";
import { createNewTabAndOpen } from "@/dialog/advanced-sign-in";
import { commitToGitDialogOnClickHandler, createNewRemoteRepositoryHandler, linkToExistingGitRepositoryHandler } from "@/dialog/git-actions-dialogs";
import { ManagerRowType, useSortIris } from "@/Dir";
import { useManagerTour } from "@/managerTourContext";


type ManagerTourRowType = ManagerRowType & {
  isFirstRow: boolean;
  tourStep: number;
};

export const TourRow = ({ isFirstRow, tourStep, iri, underRootIri, packageGitFilter, setPackageGitFilter, isSignedIn, parentIri, signedInUserPullRequests }: ManagerTourRowType) => {
  const resources = useContext(ResourcesContext);
  const resource = resources[iri]!;

  const { startManagerTour, managerTourStep } = useManagerTour();

  if (packageGitFilter !== null && resource.projectIri !== packageGitFilter) {
    return null;
  }
  const hasSetRemoteRepository: boolean = resource.linkedGitRepositoryURL !== "";
  const gitProvider: GitProvider | null = !hasSetRemoteRepository ? null : GitProviderFactory.createGitProviderFromRepositoryURL(resource.linkedGitRepositoryURL, fetch, {});
  const repositoryOwner: string | null = gitProvider?.extractPartOfRepositoryURL(resource.linkedGitRepositoryURL, "repository-owner") ?? null;
  const repositoryName: string | null = gitProvider?.extractPartOfRepositoryURL(resource.linkedGitRepositoryURL, "repository-name") ?? null;
  let gitRef: GitRef | null = null;
  if (hasSetRemoteRepository) {
    if (resource.representsBranchHead) {
      gitRef = {
        type: "branch",
        name: resource.branch,
      };
    }
    else {
      gitRef = {
        type: "commit",
        sha: resource.lastCommitHash,
      };
    }
  }

  const {t, i18n} = useTranslation();

  const [isOpen, setIsOpen] = useState<boolean>(false);

  const open = useCallback(async () => {
    requestLoadPackage(iri);
    setIsOpen(true);
  }, [iri]);

  const detailModalToggle = useToggle();

  const openModal = useBetterModal();

  const subResources = useSortIris(resource.subResourcesIri ?? []);

  const createMergeStateAction = async () => {
    const mergeFrom = await openModal(PackageListDialog, {
      modalTitle: "Create merge state",
      modalDescription: "Choose branch (or commit) to merge from",
      resources: resources,
      resourcesFilter: (r: ResourceWithIris) => (r.iri !== resource.iri && resource.linkedGitRepositoryURL !== "" && r?.linkedGitRepositoryURL === resource.linkedGitRepositoryURL),
      noEntriesDialogText: "⚠️ There are no other branches (or commits) in Dataspecer to merge from.",
      comboboxEntryTextGetter: (r: ResourceWithIris) => `${r?.branch}`}
    );
    if (mergeFrom === null) {
      return;
    }
    openModal(CreateMergeStateCausedByMergeDialog, {
      mergeFrom: {iri: mergeFrom.chosenPackage.iri, isBranch: mergeFrom.chosenPackage.representsBranchHead},
      mergeTo: {iri: resource.iri, isBranch: resource.representsBranchHead},
      editable: "mergeTo"
    });
  };

  const tooltipForSetUpToDateMenuItem = `Use this when the Git button is yellow (has uncommitted changes) and you think it should be green (no changes).

Reason: Since the comparison with remote is costly, we do not perform it automatically, we only track if there was change in DS since last Git pull/push.`;

  const gitProviderSpecificNameForPR = gitProvider?.getProviderSpecificLabel("Pull Request") ?? "Pull Request";
  const gitProviderSpecificNameForPRShortcut = gitProvider?.getProviderSpecificLabel("PR") ?? "PR";
  const prInfo = signedInUserPullRequests.findIndex(url => url === resource.linkedGitRepositoryURL) === -1 ? null : <div className="pl-0.5 text-red-600">{gitProviderSpecificNameForPRShortcut}</div>;

  let gitPart: React.ReactNode;
  // We put all of the Git stuff in <a> to show that the url at the bottom left
  if (resource.activeMergeStateCount !== 0) {
    gitPart = <a onClick={(e) => {e.preventDefault(); createNewTabAndOpen(resource.linkedGitRepositoryURL)}} href={resource.linkedGitRepositoryURL} className="text-red-500 pt-1 flex flex-1 flex-row cursor-pointer">GIT<AlertTriangleIcon className="w-4 h-4 ml-0.75 mt-1"/>
      <sup className="pt-2">{prInfo}</sup>
    </a>;
  }
  else {
    if (resource.hasUncommittedChanges) {
      gitPart = <a onClick={(e) => {e.preventDefault(); createNewTabAndOpen(resource.linkedGitRepositoryURL)}} href={resource.linkedGitRepositoryURL} className="text-yellow-400 pt-1 flex flex-1 flex-row cursor-pointer">GIT<CheckIcon className="w-4 h-4 ml-0.75 mt-1"/>
        <sup className="pt-2">{prInfo}</sup>
      </a>;
    }
    else {
      gitPart = <a onClick={(e) => {e.preventDefault(); createNewTabAndOpen(resource.linkedGitRepositoryURL)}} href={resource.linkedGitRepositoryURL} className="text-green-400 pt-1 flex flex-1 flex-row cursor-pointer">GIT<CheckIcon className="w-4 h-4 ml-0.75 mt-1"/>
        <sup className="pt-2">{prInfo}</sup>
      </a>;
    }
  }

  return <li className="first:border-y last:border-none border-b">
    <div className="flex items-center space-x-4 hover:bg-accent">
       {resource.types.includes(LOCAL_PACKAGE) ? <div className="flex"><button className="cursor-pointer" onClick={stopPropagation(() => isOpen ? setIsOpen(false) : open())}>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button><Folder className="text-gray-400 ml-1" /></div> : <div><ModelIcon type={resource.types} /></div>}

      <div className="grow min-w-0">
        <div className="font-medium">
          <Translate
            text={resource.userMetadata?.label}
            match={(t, isMatch, language) => <>
              <span className={isMatch ? "" : "text-muted-foreground"}>{t}</span>
              {!isMatch && <span className="ml-1 ">@{language}</span>}
              <span className="ml-5 text-gray-500 font-normal">{modelTypeToName[resource.types[0]]}</span>
            </>}
            fallback={modelTypeToName[resource.types[0]]}
          />
        </div>
        <div className="text-sm text-gray-500 flex">
          <span className="truncate w-[4cm]">
            {getValidTime(resource.metadata?.creationDate) && t("created", {val: new Date(resource.metadata?.creationDate!)})}
          </span>
          <span className="truncate w-[6cm]">
            {getValidTime(resource.metadata?.modificationDate) && t("changed", {val: new Date(resource.metadata?.modificationDate!)})}
          </span>
          <span className="truncate w-[5cm]" title={"IRI: " + resource.iri}>
            {resource.iri}
          </span>
          {
            !isGitUrlSet(resource.linkedGitRepositoryURL) ?
              null :
              <ResourceTooltip resource={resource} side="right">
                <div className="flex pl-4 pr-2 w-20 -mt-1">
                  {gitPart}
                  {
                    resource.representsBranchHead ?
                      null :
                      <TagIcon className="w-4 h-4 pl-0.5 mt-1" />
                  }
                </div>
              </ResourceTooltip>
          }
          {
            !isGitUrlSet(resource.linkedGitRepositoryURL) ?
              <span className="truncate px-2 w-[2.5cm]" title={"Project IRI: " + resource.projectIri}>
                {resource.projectIri}
              </span> :
              <>
                <span className="truncate px-2 w-[2.5cm]" title={"Project IRI: " + resource.projectIri}>
                  {resource.projectIri}
                </span>
                <span className="truncate px-2 w-[4cm]" title={"Branch name: " + resource.branch}>
                  {resource.branch}
                </span>
              </>
          }
        </div>
      </div>

      {resource.userMetadata?.tags?.map(tag => <Badge variant="secondary" key={tag}>{tag}</Badge>)}

      {resource.types.includes(APPLICATION_GRAPH) &&
        <Button asChild variant={"ghost"} onClick={stopPropagation()}>
          <a href={import.meta.env.VITE_BACKEND + "/generate/application?iri=" + encodeURIComponent(iri)}>
            {t("generate application")}
          </a>
        </Button>
      }
      {resource.types.includes(V1.PSM) && <Button variant={"ghost"} onClick={async event => {
        event.preventDefault();
        event.stopPropagation();

        await ensurePackageWorksForDSE(parentIri!);
        window.location.href = import.meta.env.VITE_DATA_SPECIFICATION_EDITOR + "/editor?data-specification=" + encodeURIComponent(parentIri ?? "") + "&data-psm-schema=" + encodeURIComponent(iri);
      }}>{t("open")}</Button>}
      {resource.types.includes(LOCAL_VISUAL_MODEL) && <Button asChild variant={"ghost"} onClick={stopPropagation()}><a href={import.meta.env.VITE_CME + "/diagram?package-id=" + encodeURIComponent(parentIri ?? "") + "&view-id=" + encodeURIComponent(iri) }>{t("open")}</a></Button>}
      {resource.types.includes(API_SPECIFICATION_MODEL) && <Button asChild variant={"ghost"} onClick={stopPropagation()}><a href={import.meta.env.VITE_API_SPECIFICATION_APPLICATION + "?package-iri=" + encodeURIComponent(parentIri ?? "") + "&model-iri=" + encodeURIComponent(iri) }>{t("open")}</a></Button>}

      {resource.types.includes(LOCAL_PACKAGE) && (resource.userMetadata as any)?.importedFromUrl &&
        <Tooltip>
          <TooltipTrigger>
            <Button asChild variant="ghost" size="icon" className="shrink-0" onClick={stopPropagation(() => openModal(ReloadImported, {id: iri, parentId: parentIri ?? ""}))}>
              <span>
                <RotateCw className="h-4 w-4" />
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("data specification reload")}</p>
          </TooltipContent>
        </Tooltip>
      }

      {resource.types.includes("https://dataspecer.com/core/model-descriptor/pim-store-wrapper") &&
        <Tooltip>
          <TooltipTrigger>
            <Button asChild variant="ghost" size="icon" className="shrink-0" onClick={stopPropagation(() => openModal(ReloadPimWrapper, {id: iri, parentId: parentIri ?? ""}))}>
              <span>
                <RotateCw className="h-4 w-4" />
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("data specification reload")}</p>
          </TooltipContent>
        </Tooltip>
      }

      {resource.types.includes(LOCAL_PACKAGE) &&
        <Tooltip>
          <TooltipTrigger>
            <Button asChild variant="ghost" size="icon" className="shrink-0" onClick={stopPropagation()}>
              <a
                href={import.meta.env.VITE_DATA_SPECIFICATION_EDITOR + "/specification?dataSpecificationIri=" + encodeURIComponent(iri ?? "") }
                onClick={async event => {
                  event.preventDefault();
                  event.stopPropagation();

                  await ensurePackageWorksForDSE(iri);
                  window.location.href = import.meta.env.VITE_DATA_SPECIFICATION_EDITOR + "/specification?dataSpecificationIri=" + encodeURIComponent(iri ?? "");
                }}
              >
                <Code className="h-4 w-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("data specification button")}</p>
          </TooltipContent>
        </Tooltip>
      }

      {resource.types.includes(LOCAL_PACKAGE) &&
        <Tooltip>
          <TooltipTrigger>
            <Button asChild variant="ghost" size="icon" className="shrink-0" onClick={stopPropagation()}>
              <a href={import.meta.env.VITE_CME + "/diagram?package-id=" + encodeURIComponent(iri ?? "")}>
                <Shapes className="h-4 w-4" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("conceptual editor button")}</p>
          </TooltipContent>
        </Tooltip>
      }

      {resource.types.includes(LOCAL_PACKAGE) &&
        <Button variant="ghost" size="icon" className="shrink-0" onClick={stopPropagation(() => openModal(CreateNew, {iri}))}>
          <Plus className="h-4 w-4" />
        </Button>
      }

      {/* Git actions */}
      { (resource.types.includes(LOCAL_PACKAGE) && parentIri === PACKAGE_ROOT) ?
        <DropdownMenu open={isFirstRow}>
          <DropdownMenuTrigger asChild>
            <Button id="manager-git-actions-button" variant="ghost" size="icon" className="shrink-0">
              <EllipsisVertical className="h-4 w-4" /><p className="text-xs">Git</p>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {
              // Git show actions. The menu is shown only when it is already linked to the remote
              !hasSetRemoteRepository ? null :
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <div id="manager-git-show-submenu-trigger" className="flex flex-1 flex-row"><Eye className="h-4 w-4 mt-0.75 mr-2" />Show</div>
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent className="data-[side=top]">
                  {<DropdownMenuItem id="manager-tour-git-show-branch-item" onClick={() => createNewTabAndOpen(gitProvider === null ? "" : gitProvider.createGitRepositoryURL(repositoryOwner!, repositoryName!, gitRef!))}><Eye className="mr-2 h-4 w-4" />Show {resource.representsBranchHead ? "branch" : "commit"} on GitHub</DropdownMenuItem>}
                  {<DropdownMenuItem id="manager-tour-git-show-pages-item" onClick={() => createNewTabAndOpen(gitProvider === null ? "" : gitProvider.getGitPagesURL(resource.linkedGitRepositoryURL))}><Eye className="mr-2 h-4 w-4" />Show {gitProvider?.getProviderSpecificLabel("GitHub Pages")}</DropdownMenuItem>}
                  {<DropdownMenuItem id="manager-tour-git-history-item" onClick={async () => gitHistoryVisualizationOnClickHandler(openModal, resource, resources)}><GitGraph className="mr-2 h-4 w-4" />Git history visualization</DropdownMenuItem>}
                  {<hr className="border-gray-300" />}
                  {<DropdownMenuItem id="manager-tour-git-active-prs-item" onClick={async () => openModal(GitPrsListDialog, {resources, gitUrl: resource.linkedGitRepositoryURL, branch: null, gitProviderSpecificNameForPR, gitProviderSpecificNameForPRShortcut})}><GitPullRequestArrowIcon className="mr-2 h-4 w-4" />Active {gitProviderSpecificNameForPR}s</DropdownMenuItem>}
                  {<DropdownMenuItem id="manager-tour-git-active-prs-branch-item" onClick={async () => openModal(GitPrsListDialog, {resources, gitUrl: resource.linkedGitRepositoryURL, branch: resource.branch, gitProviderSpecificNameForPR, gitProviderSpecificNameForPRShortcut})}><GitPullRequestArrowIcon className="mr-2 h-4 w-4" />Active {gitProviderSpecificNameForPR}s for branch</DropdownMenuItem>}
                  {<DropdownMenuItem id="manager-tour-git-active-issues-item" onClick={async () => openModal(GitIssuesListDialog, {gitUrl: resource.linkedGitRepositoryURL})}><BugIcon className="mr-2 h-4 w-4" />Active issues</DropdownMenuItem>}
                  {<hr className="border-gray-300" />}
                  {<DropdownMenuItem id="manager-tour-git-show-merge-states-item" onClick={() => openModal(ListMergeStatesDialog, { iri })}><EyeIcon className="mr-2 h-4 w-4" />Show merge states</DropdownMenuItem>}
                  {<DropdownMenuItem id="manager-tour-git-show-same-repo-item" onClick={() => setPackageGitFilter(resource.projectIri)}><Filter className="mr-2 h-4 w-4" />Show same repository projects</DropdownMenuItem>}
                  {hasSetRemoteRepository && <hr className="border-gray-300" />}
                                    {hasSetRemoteRepository && <Button variant="default" size={"sm"} className="shrink-0 ml-4" onClick={() => startManagerTour(t)}><LightbulbIcon className="mr-2 h-4 w-4" />TODO RadStr: HELP ME!!!!!!!!!!!</Button>}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            }
            {/* Git perform actions */}
            <DropdownMenuSub open={isFirstRow}>
              <DropdownMenuSubTrigger id="manager-git-actions-submenu-trigger">
                <div className="flex flex-1 flex-row"><GitCommit className="h-4 w-4 mt-0.75 mr-2" />Actions</div>
              </DropdownMenuSubTrigger>

              <DropdownMenuSubContent className="data-[side=top]">
                {/* TODO RadStr: For debug/migration */}
                {/* {hasSetRemoteRepository && <DropdownMenuItem onClick={() => debugClearMergeStateDBTable()}><ShieldQuestion className="mr-2 h-4 w-4" />DEBUG - Clear merge db state table</DropdownMenuItem>} */}
                {<DropdownMenuItem title={tooltipForSetUpToDateMenuItem} onClick={() => trySetPackageAsUpToDate(resource.iri)}><TimerResetIcon className="mr-2 h-4 w-4" />Verify status of local changes</DropdownMenuItem>}
                {<hr className="border-gray-300" />}
                {<DropdownMenuItem id="manager-tour-git-create-remote-repo-item" onClick={async () => createNewRemoteRepositoryHandler(t, openModal, iri, resource)}><GitPullRequestIcon className="mr-2 h-4 w-4" />Create remote repository</DropdownMenuItem>}
                {<DropdownMenuItem id="manager-tour-git-link-existing-item" onClick={async () => linkToExistingGitRepositoryHandler(t, openModal, iri, resource)}><Link className="mr-2 h-4 w-4" />Link to remote repository</DropdownMenuItem>}
                {<DropdownMenuItem id="manager-tour-git-action-commit-item" onClick={async () => commitToGitDialogOnClickHandler(t, openModal, iri, resource, "classic-commit", true, true, null, null)}><GitCommit className="mr-2 h-4 w-4" />Commit</DropdownMenuItem>}
                {<DropdownMenuItem id="manager-tour-git-action-pull-item" onClick={async () => manualPull(t, iri)}><Import className="mr-2 h-4 w-4" />Pull</DropdownMenuItem>}
                {<DropdownMenuItem id="manager-tour-git-configure-item" onClick={async () => openModal(SetGitRemoteConfigurationDialog, {inputPackage: resource})}><Pencil className="mr-2 h-4 w-4" />Configure Git</DropdownMenuItem>}
                {<hr className="border-gray-300" />}
                {<DropdownMenuItem id="manager-tour-git-create-branch-item" onClick={() => openModal(CreateNewBranchDialog, { sourcePackage: resource, actionOnConfirm: BranchAction.CreateNewBranch })}><GitBranchPlus className="mr-2 h-4 w-4" />Create branch</DropdownMenuItem>}
                {<DropdownMenuItem id="manager-tour-git-merge-item" onClick={createMergeStateAction}><GitMerge className="mr-2 h-4 w-4"/>Merge - Choose merge from</DropdownMenuItem>}
                {<hr className="border-gray-300" />}
                {<DropdownMenuItem id="manager-tour-git-convert-item" onClick={() => switchRepresentsBranchHead(resource, openModal)}><ArrowLeftRight className="mr-2 h-4 w-4" /> Convert to {resource.representsBranchHead ? "tag" : "branch"}</DropdownMenuItem>}
                {<hr className="border-gray-300" />}
                {<DropdownMenuItem id="manager-tour-git-delete-item" className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={() => openModal(DeleteGitRepoDialog, {iri, gitUrl: resource.linkedGitRepositoryURL})}><Trash2 className="mr-2 h-4 w-4" />Delete Git repository</DropdownMenuItem>}
                {<DropdownMenuItem id="manager-tour-git-delete-item" className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={() => openModal(DeleteGitRepoDialog, {iri, gitUrl: resource.linkedGitRepositoryURL})}><Trash2 className="mr-2 h-4 w-4" />{managerTourStep}</DropdownMenuItem>}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu> :
        null
      }
      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <EllipsisVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem asChild><a href={import.meta.env.VITE_BACKEND + "/experimental/output.zip?iri=" + encodeURIComponent(iri)}><FolderDown className="mr-2 h-4 w-4" /> {t("export-zip")}</a></DropdownMenuItem>}
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem asChild><a target="_blank" href={import.meta.env.VITE_BACKEND + `/preview/${i18n.language}/index.html?iri=` + encodeURIComponent(iri)}><FileText className="mr-2 h-4 w-4" /> {t("show-documentation")} ({i18n.language})</a></DropdownMenuItem>}
          {i18n.language !== "en" && resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem asChild><a target="_blank" href={import.meta.env.VITE_BACKEND + `/preview/en/index.html?iri=` + encodeURIComponent(iri)}><FileText className="mr-2 h-4 w-4" /> {t("show-documentation")} (en)</a></DropdownMenuItem>}
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem onClick={() => openModal(ModifyDocumentationTemplate, {iri})}><NotepadTextDashed className="mr-2 h-4 w-4" /> {t("modify-documentation-template")}</DropdownMenuItem>}
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem onClick={() => openModal(AddImported, {iri, urlOnly: true})}><Import className="mr-2 h-4 w-4" /> {t("import specification from url")}</DropdownMenuItem>}
          <DropdownMenuItem asChild><a href={import.meta.env.VITE_BACKEND + "/resources/export.zip?iri=" + encodeURIComponent(iri) + "&exportFormat=json"}><CloudDownload className="mr-2 h-4 w-4" /> {t("export") + " as json"}</a></DropdownMenuItem>
          <DropdownMenuItem asChild><a href={import.meta.env.VITE_BACKEND + "/resources/export.zip?iri=" + encodeURIComponent(iri) + "&exportFormat=yaml"}><CloudDownload className="mr-2 h-4 w-4" /> {t("export") + " as yaml"}</a></DropdownMenuItem>
          <DropdownMenuItem onClick={async () => {
            const result = await openModal(RenameResourceDialog, {inputLabel: resource.userMetadata?.label, inputDescription: resource.userMetadata?.description});
            if (result) {
              await modifyUserMetadata(iri, {label: result.name, description: result.description});
              await requestLoadPackage(underRootIri, true);
            }
          }}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
          {resource.types.includes(LOCAL_SEMANTIC_MODEL) && <DropdownMenuItem onClick={() => openModal(Autolayout, {iri, parentIri: parentIri!})}><Sparkles className="mr-2 h-4 w-4" /> {t("autolayout")}</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => openModal(ModifyRawDialog, {iri})}><CircuitBoard className="mr-2 h-4 w-4" /> {t("modify raw data")}</DropdownMenuItem>
          <DropdownMenuItem className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={() => openModal(DeleteResource, {iri})}><Trash2 className="mr-2 h-4 w-4" /> {t("remove")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {subResources.length > 0 && isOpen && <ul className="pl-8">
      {/* We pass null for the filter, since we want to render the children and the root packages, which we do not render are already blocked by the filter */}
      {subResources.map(iri => <TourRow isFirstRow={isFirstRow} tourStep={tourStep} underRootIri={underRootIri} iri={iri} key={iri} parentIri={resource.iri} isSignedIn={isSignedIn} packageGitFilter={null} setPackageGitFilter={setPackageGitFilter} signedInUserPullRequests={signedInUserPullRequests} />)}
    </ul>}
    <ResourceDetail isOpen={detailModalToggle.isOpen} close={detailModalToggle.close} iri={iri} />
  </li>
};