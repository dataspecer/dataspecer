import { Badge } from "@/components/ui/badge";
import { API_SPECIFICATION_MODEL, APPLICATION_GRAPH, LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { AlertTriangleIcon, ArrowLeftRight, BugIcon, CheckIcon, ChevronDown, ChevronRight, CircuitBoard, CloudDownload, Code, EllipsisVertical, Eye, EyeIcon, FileText, Filter, Folder, FolderDown, GitBranchPlus, GitCommit, GitGraph, GitMerge, GitPullRequestArrowIcon, GitPullRequestIcon, Import, LightbulbIcon, Link, NotepadTextDashed, Pencil, Plus, RotateCw, Shapes, Sparkles, TagIcon, TimerResetIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getValidTime } from "../time";
import { Translate } from "../translate";
import { Button } from "../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ModelIcon, modelTypeToName } from "@/known-models";
import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { isGitUrlSet } from "@dataspecer/git";
import ResourceGitInfoTooltip from "../git-tooltip";
import { ManagerRowType, useSortIris } from "@/Dir";
import { useManagerTour } from "@/manager-git-tour-context/manager-tour-context";
import { ResourceWithIris } from "@/package";


type ManagerTourRowType = Omit<ManagerRowType & {
  isFirstRow: boolean;
  tourStep: number;
}, "isSignedIn" | "signedInUserPullRequests" | "underRootIri" | "parentIri">;

export const TourRow = ({ iri, isFirstRow, tourStep, packageGitFilter, setPackageGitFilter }: ManagerTourRowType) => {
  const getTourId = (element: string) => {
    const tourId = `${element}-${iri}`;
    return tourId;
  };

  const resource: ResourceWithIris = {
    activeMergeStateCount: 0,
    branch: isFirstRow ? "main" : "feature-branch",
    hasUncommittedChanges: false,
    iri: iri,
    lastCommitHash: "abc123",
    linkedGitRepositoryURL: "abc",
    projectIri: "project-iri-unique-in-repository",
    representsBranchHead: true,
    subResourcesIri: [],
    metadata: {
      creationDate: new Date("2024-01-01T12:00:00Z"),
      modificationDate: new Date("2024-01-02T12:00:00Z"),
    },
    types: [LOCAL_PACKAGE],
    userMetadata: {
      label: {
        en: isFirstRow ? "First package" : "Second package",
      }
    },
    subResources: [],
  };

  const { managerTourStep } = useManagerTour();

  if (packageGitFilter !== null && resource.projectIri !== packageGitFilter) {
    return null;
  }
  const hasSetRemoteRepository: boolean = resource.linkedGitRepositoryURL !== "";

  const {t, i18n} = useTranslation();

  const [isOpen, _setIsOpen] = useState<boolean>(false);


  const subResources = useSortIris(resource.subResourcesIri ?? []);

  const tooltipForSetUpToDateMenuItem = `Use this when the Git button is yellow (has uncommitted changes) and you think it should be green (no changes).

Reason: Since the comparison with remote is costly, we do not perform it automatically, we only track if there was change in DS since last Git pull/push.`;

  const prInfo = managerTourStep === 0 ? null : <div className="pl-0.5 text-red-600">PR</div>;

  let gitPart: React.ReactNode;
  // We put all of the Git stuff in <a> to show that the url at the bottom left
  if (managerTourStep === 6) {
    gitPart = <div id={getTourId("manager-git-status-indicator")} onClick={(e) => {e.preventDefault();}} className="text-red-500 pt-1 flex flex-1 flex-row cursor-pointer">GIT<AlertTriangleIcon className="w-4 h-4 ml-0.75 mt-1"/>
      <sup className="pt-2">{prInfo}</sup>
    </div>;
  }
  else if (managerTourStep === 5) {
    gitPart = <div id={getTourId("manager-git-status-indicator")} onClick={(e) => {e.preventDefault();}} className="text-yellow-400 pt-1 flex flex-1 flex-row cursor-pointer">GIT<CheckIcon className="w-4 h-4 ml-0.75 mt-1"/>
      <sup className="pt-2">{prInfo}</sup>
    </div>;
  }
  else {
    gitPart = <div id={getTourId("manager-git-status-indicator")} onClick={(e) => {e.preventDefault();}} className="text-green-400 pt-1 flex flex-1 flex-row cursor-pointer">GIT<CheckIcon className="w-4 h-4 ml-0.75 mt-1"/>
      <sup className="pt-2">{prInfo}</sup>
    </div>;
  }

  return <li className="first:border-y last:border-none border-b">
    <div className="flex items-center space-x-4 hover:bg-accent">
       {resource.types.includes(LOCAL_PACKAGE) ? <div className="flex"><button className="cursor-pointer" onClick={() => {}}>
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
          <span id={getTourId("manager-git-unique-iri-label")} className="truncate w-[5cm]" title={"IRI: " + resource.iri}>
            {"This-is-unique-IRI-" + resource.iri}
          </span>
          {
            !isGitUrlSet(resource.linkedGitRepositoryURL) ?
              null :
              <ResourceGitInfoTooltip resource={resource} side="right" shouldBeOpen={isFirstRow && managerTourStep >= 4 && managerTourStep <= 10}>
                <div className="flex pl-4 pr-2 w-20 -mt-1">
                  {gitPart}
                  {
                    resource.representsBranchHead ?
                      null :
                      <TagIcon className="w-4 h-4 pl-0.5 mt-1" />
                  }
                </div>
              </ResourceGitInfoTooltip>
          }
          {
            !isGitUrlSet(resource.linkedGitRepositoryURL) ?
              <span className="truncate px-2 w-[2.5cm]" title={"Project IRI: " + resource.projectIri}>
                {resource.projectIri}
              </span> :
              <>
                <span id={getTourId("manager-git-project-iri-label")} className="truncate px-2 w-[6.5cm]" title={"Project IRI: " + resource.projectIri}>
                  {resource.projectIri}
                </span>
                <span id={getTourId("manager-git-branch-label")} className="truncate px-2 w-[4cm]" title={"Branch name: " + resource.branch}>
                  {resource.branch}
                </span>
              </>
          }
        </div>
      </div>

      {resource.userMetadata?.tags?.map(tag => <Badge variant="secondary" key={tag}>{tag}</Badge>)}

      {resource.types.includes(APPLICATION_GRAPH) &&
        <Button asChild variant={"ghost"} onClick={() => {}}>
          <a href={import.meta.env.VITE_BACKEND + "/generate/application?iri=" + encodeURIComponent(iri)}>
            {t("generate application")}
          </a>
        </Button>
      }
      {resource.types.includes(V1.PSM) && <Button variant={"ghost"} onClick={() => {}}>{t("open")}</Button>}
      {resource.types.includes(LOCAL_VISUAL_MODEL) && <Button asChild variant={"ghost"} onClick={() => {}}><a href={import.meta.env.VITE_CME + "/diagram?package-id=" + "&view-id=" + encodeURIComponent(iri) }>{t("open")}</a></Button>}
      {resource.types.includes(API_SPECIFICATION_MODEL) && <Button asChild variant={"ghost"} size="icon" className="shrink-0" onClick={() => {}}><a href={import.meta.env.VITE_API_SPECIFICATION_APPLICATION + "?package-iri=" + "&model-iri=" + encodeURIComponent(iri) }>{t("open")}</a></Button>}

      {resource.types.includes(LOCAL_PACKAGE) && (resource.userMetadata as any)?.importedFromUrl &&
        <Tooltip>
          <TooltipTrigger>
            <Button asChild variant="ghost" size="icon" className="shrink-0" onClick={() => {}}>
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
            <Button asChild variant="ghost" size="icon" className="shrink-0" onClick={() => {}}>
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
            <Button asChild variant="ghost" size="icon" className="shrink-0" onClick={() => {}}>
              <a
                href={import.meta.env.VITE_DATA_SPECIFICATION_EDITOR + "/specification?dataSpecificationIri=" + encodeURIComponent(iri ?? "") }
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
            <Button asChild variant="ghost" size="icon" className="shrink-0" onClick={() => {}}>
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
        <Button variant="ghost" size="icon" className="shrink-0" onClick={() => {}}>
          <Plus className="h-4 w-4" />
        </Button>
      }

      {/* Git actions */}
      { (resource.types.includes(LOCAL_PACKAGE)) ?
        <DropdownMenu open={isFirstRow}>
          <DropdownMenuTrigger asChild>
            <Button id={getTourId("manager-git-actions-button")} variant="ghost" size="icon" className="shrink-0">
              <EllipsisVertical className="h-4 w-4" /><p className="text-xs">Git</p>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {
              // Git show actions. The menu is shown only when it is already linked to the remote
              !hasSetRemoteRepository ? null :
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <div id={getTourId("manager-git-show-submenu-trigger")} className="flex flex-1 flex-row"><Eye className="h-4 w-4 mt-0.75 mr-2" />Show</div>
                </DropdownMenuSubTrigger>

                <DropdownMenuSubContent className="data-[side=top]">
                  {<DropdownMenuItem id={getTourId("manager-tour-git-show-branch-item")} onClick={() => {}}><Eye className="mr-2 h-4 w-4" />Show {resource.representsBranchHead ? "branch" : "commit"} on GitHub</DropdownMenuItem>}
                  {<DropdownMenuItem id={getTourId("manager-tour-git-show-pages-item")} onClick={() => {}}><Eye className="mr-2 h-4 w-4" />Show {"GitHub Pages"}</DropdownMenuItem>}
                  {<DropdownMenuItem id={getTourId("manager-tour-git-history-item")} onClick={() => {}}><GitGraph className="mr-2 h-4 w-4" />Git history visualization</DropdownMenuItem>}
                  {<hr className="border-gray-300" />}
                  {<DropdownMenuItem id={getTourId("manager-tour-git-active-prs-item")} onClick={() => {}}><GitPullRequestArrowIcon className="mr-2 h-4 w-4" />Active PRs</DropdownMenuItem>}
                  {<DropdownMenuItem id={getTourId("manager-tour-git-active-prs-branch-item")} onClick={() => {}}><GitPullRequestArrowIcon className="mr-2 h-4 w-4" />Active PRs for branch</DropdownMenuItem>}
                  {<DropdownMenuItem id={getTourId("manager-tour-git-active-issues-item")} onClick={() => {}}><BugIcon className="mr-2 h-4 w-4" />Active issues</DropdownMenuItem>}
                  {<hr className="border-gray-300" />}
                  {<DropdownMenuItem id={getTourId("manager-tour-git-show-merge-states-item")} onClick={() => {}}><EyeIcon className="mr-2 h-4 w-4" />Show merge states</DropdownMenuItem>}
                  {<DropdownMenuItem id={getTourId("manager-tour-git-show-same-repo-item")} onClick={() => {}}><Filter className="mr-2 h-4 w-4" />Show same repository projects</DropdownMenuItem>}
                  <hr className="border-gray-300" />
                  <DropdownMenuItem onClick={() => {}}><LightbulbIcon className="mr-2 h-4 w-4" />Guide me through Git</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {}}><LightbulbIcon className="mr-2 h-4 w-4" />Guide - Git actions + merge states</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            }
            {/* Git perform actions */}
            <DropdownMenuSub open={isFirstRow}>
              <DropdownMenuSubTrigger id={getTourId("manager-git-actions-submenu-trigger")}>
                <div className="flex flex-1 flex-row"><GitCommit className="h-4 w-4 mt-0.75 mr-2" />Actions</div>
              </DropdownMenuSubTrigger>

              <DropdownMenuSubContent className="data-[side=top]">
                {/* TODO RadStr: For debug/migration */}
                {/* {hasSetRemoteRepository && <DropdownMenuItem onClick={() => debugClearMergeStateDBTable()}><ShieldQuestion className="mr-2 h-4 w-4" />DEBUG - Clear merge db state table</DropdownMenuItem>} */}
                {<DropdownMenuItem title={tooltipForSetUpToDateMenuItem} onClick={() => {}}><TimerResetIcon className="mr-2 h-4 w-4" />Verify status of local changes</DropdownMenuItem>}
                {<hr className="border-gray-300" />}
                {<DropdownMenuItem id={getTourId("manager-tour-git-create-remote-repo-item")} onClick={() => {}}><GitPullRequestIcon className="mr-2 h-4 w-4" />Create remote repository</DropdownMenuItem>}
                {<DropdownMenuItem id={getTourId("manager-tour-git-link-existing-item")} onClick={() => {}}><Link className="mr-2 h-4 w-4" />Link to remote repository</DropdownMenuItem>}
                {<DropdownMenuItem id={getTourId("manager-tour-git-action-commit-item")} onClick={() => {}}><GitCommit className="mr-2 h-4 w-4" />Commit</DropdownMenuItem>}
                {<DropdownMenuItem id={getTourId("manager-tour-git-action-pull-item")} onClick={() => {}}><Import className="mr-2 h-4 w-4" />Pull</DropdownMenuItem>}
                {<DropdownMenuItem id={getTourId("manager-tour-git-configure-item")} onClick={() => {}}><Pencil className="mr-2 h-4 w-4" />Configure Git</DropdownMenuItem>}
                {<hr className="border-gray-300" />}
                {<DropdownMenuItem id={getTourId("manager-tour-git-create-branch-item")} onClick={() => {}}><GitBranchPlus className="mr-2 h-4 w-4" />Create branch</DropdownMenuItem>}
                {<DropdownMenuItem id={getTourId("manager-tour-git-merge-item")} onClick={() => {}}><GitMerge className="mr-2 h-4 w-4"/>Merge - Choose merge from</DropdownMenuItem>}
                {<hr className="border-gray-300" />}
                {<DropdownMenuItem id={getTourId("manager-tour-git-convert-item")} onClick={() => {}}><ArrowLeftRight className="mr-2 h-4 w-4" /> Convert to {resource.representsBranchHead ? "tag" : "branch"}</DropdownMenuItem>}
                {<hr className="border-gray-300" />}
                {<DropdownMenuItem id={getTourId("manager-tour-git-delete-item")} className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={() => {}}><Trash2 className="mr-2 h-4 w-4" />Delete Git repository</DropdownMenuItem>}
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
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem onClick={() => {}}><NotepadTextDashed className="mr-2 h-4 w-4" /> {t("modify-documentation-template")}</DropdownMenuItem>}
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem onClick={() => {}}><Import className="mr-2 h-4 w-4" /> {t("import specification from url")}</DropdownMenuItem>}
          <DropdownMenuItem asChild><a href={import.meta.env.VITE_BACKEND + "/resources/export.zip?iri=" + encodeURIComponent(iri) + "&exportFormat=json"}><CloudDownload className="mr-2 h-4 w-4" /> {t("export") + " as json"}</a></DropdownMenuItem>
          <DropdownMenuItem asChild><a href={import.meta.env.VITE_BACKEND + "/resources/export.zip?iri=" + encodeURIComponent(iri) + "&exportFormat=yaml"}><CloudDownload className="mr-2 h-4 w-4" /> {t("export") + " as yaml"}</a></DropdownMenuItem>
          <DropdownMenuItem onClick={() => {}}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
          {resource.types.includes(LOCAL_SEMANTIC_MODEL) && <DropdownMenuItem onClick={() => {}}><Sparkles className="mr-2 h-4 w-4" /> {t("autolayout")}</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => {}}><CircuitBoard className="mr-2 h-4 w-4" /> {t("modify raw data")}</DropdownMenuItem>
          <DropdownMenuItem className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={() => {}}><Trash2 className="mr-2 h-4 w-4" /> {t("remove")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {subResources.length > 0 && isOpen && <ul className="pl-8">
      {/* We pass null for the filter, since we want to render the children and the root packages, which we do not render are already blocked by the filter */}
      {subResources.map(iri => <TourRow isFirstRow={isFirstRow} tourStep={tourStep} iri={iri} key={iri} packageGitFilter={null} setPackageGitFilter={setPackageGitFilter} />)}
    </ul>}
  </li>
};