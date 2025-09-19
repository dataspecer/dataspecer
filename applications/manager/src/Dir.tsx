import { Badge } from "@/components/ui/badge";
import { API_SPECIFICATION_MODEL, APPLICATION_GRAPH, LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, LOCAL_VISUAL_MODEL, V1 } from "@dataspecer/core-v2/model/known-models";
import { LanguageString } from "@dataspecer/core/core/core-resource";
import { ArrowLeft, ArrowLeftRight, ArrowRight, ChevronDown, ChevronRight, CircuitBoard, CloudDownload, Code, Copy, EllipsisVertical, Eye, EyeIcon, FileText, Filter, FilterX, Folder, FolderDown, GitBranchPlus, GitCommit, GitGraph, GitMerge, GitPullRequestIcon, Import, Link, Menu, NotepadTextDashed, Pencil, Plus, RotateCw, Shapes, ShieldQuestion, Sparkles, Trash2, WandSparkles } from "lucide-react";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { getValidTime } from "./components/time";
import { Translate } from "./components/translate";
import { Button } from "./components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./components/ui/dropdown-menu";
import { Skeleton } from "./components/ui/skeleton";
import { CreateNew } from "./dialog/create-new";
import { DeleteResource } from "./dialog/delete-resource";
import { ProjectWizard } from "./dialog/project-wizard/project-wizard";
import { RenameResourceDialog } from "./dialog/rename-resource";
import { ResourceDetail } from "./dialog/resource-detail";
import { useToggle } from "./hooks/use-toggle";
import { ModelIcon, createModelInstructions, modelTypeToName } from "./known-models";
import { useBetterModal } from "./lib/better-modal";
import { ResourcesContext, ensurePackageWorksForDSE, modifyUserMetadata, packageService, requestLoadPackage } from "./package";
import { ModifyDocumentationTemplate } from "./dialog/modify-documentation-template";
import React from "react";
import { SortModelsContext } from "./components/sort-models";
import { ModifyRawDialog } from "./dialog/modify-raw";
import { Autolayout } from "./dialog/autolayout";
import { Tooltip, TooltipContent, TooltipTrigger } from "./components/ui/tooltip";
import { ReloadImported } from "./dialog/reload-imported";
import { AddImported } from "./dialog/add-imported";
import { ReloadPimWrapper } from "./dialog/reload-pim-wrapper";
import { stopPropagation } from "./utils/events";
import { commitToGitDialogOnClickHandler, linkToExistingGitRepositoryHandler, createNewRemoteRepositoryHandler } from "./dialog/git-url";
import LoginCard from "./components/login-card";
import { gitHistoryVisualizationOnClickHandler } from "./components/git-history-visualization";
import { debugClearMergeStateDBTable, removeGitLinkFromPackage, switchRepresentsBranchHead } from "./utils/utilities";
import { MergeActorsType, useMergeActors } from "./hooks/use-merge";
import { setProjectIriAndBranchDialog } from "./dialog/set-projectIRI-and-branch";
import { BranchAction, CreateNewBranchDialog } from "./dialog/create-new-branch";
import { manualPull } from "./components/manual-pull";
import { MergeStatesDialog } from "./dialog/merge-conflict-dialog";
import { OpenMergeState } from "./dialog/open-merge-state";
import { useLogin, UseLoginType } from "./hooks/use-login";
import SetPrivateSSHKeyDialog from "./dialog/set-private-ssh";
import { isGitUrlSet, PACKAGE_ROOT } from "@dataspecer/git";

export function lng(text: LanguageString | undefined): string | undefined {
  return text?.["cs"] ?? text?.["en"];
}

const useSortIris = (iris: string[]) => {
  const {selectedOption} = React.useContext(SortModelsContext);
  const resources = useContext(ResourcesContext);
  return useMemo(() => {
    const toSort = iris.map(iri => resources[iri]!);
    toSort?.sort((a, b) => {
      if (!a || !b) return 0;
      if (selectedOption === "name-az") {
        return lng(a.userMetadata?.label)?.localeCompare(lng(b.userMetadata?.label) ?? "") ?? 0;
      } else if (selectedOption === "name-za") {
        return (lng(b.userMetadata?.label) ?? "").localeCompare(lng(a.userMetadata?.label) ?? "") ?? 0;
      } else if (selectedOption === "modification-new-first") {
        return new Date(b.metadata?.modificationDate ?? 0).getTime() - new Date(a.metadata?.modificationDate ?? 0).getTime();
      } else if (selectedOption === "modification-old-first") {
        return new Date(a.metadata?.modificationDate ?? 0).getTime() - new Date(b.metadata?.modificationDate ?? 0).getTime();
      } else if (selectedOption === "creation-new-first") {
        return new Date(b.metadata?.creationDate ?? 0).getTime() - new Date(a.metadata?.creationDate ?? 0).getTime();
      } else if (selectedOption === "creation-old-first") {
        return new Date(a.metadata?.creationDate ?? 0).getTime() - new Date(b.metadata?.creationDate ?? 0).getTime();
      }
      return 0;
    });

    return toSort.map(r => r?.iri);
  }, [iris, resources, selectedOption]);
};

const Row = ({ iri, projectFilter, setProjectFilter, isSignedIn, mergeActors, parentIri }: { iri: string, projectFilter: string | null, setProjectFilter: (value: string | null) => void, isSignedIn: boolean, mergeActors: MergeActorsType, parentIri?: string }) => {
  const resources = useContext(ResourcesContext);
  const resource = resources[iri]!;

  if (projectFilter !== null && resource.projectIri !== projectFilter) {
    return null;
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

  return <li className="first:border-y last:border-none border-b">
    <div className="flex items-center space-x-4 hover:bg-accent">
      {mergeActors.mergeFrom === iri ? "Merging from" : null}
      {mergeActors.mergeTo === iri ? "Merging to" : null}
      {resource.types.includes(LOCAL_PACKAGE) ? <div className="flex"><button onClick={stopPropagation(() => isOpen ? setIsOpen(false) : open())}>
      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button><Folder className="text-gray-400 ml-1" /></div> : <div><ModelIcon type={resource.types} /></div>}

      <div className="grow min-w-0">
        <div className="font-medium">
          <Translate
            text={resource.userMetadata?.label}
            match={t => <>{t} <span className="ml-5 text-gray-500 font-normal">{modelTypeToName[resource.types[0]]}</span></>}
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
          <span className="truncate max-w-[8cm]">
            {resource.iri}
          </span>
          <span className="truncate px-2 max-w-[4cm]">
            {resource.projectIri}
          </span>
          <span className="truncate px-2 max-w-[4cm]">
            {resource.branch}
          </span>
          <span className="truncate px-2 max-w-[4cm]">
            {resource.representsBranchHead ? "is Branch" : "is Tag"}
          </span>
          <span className="truncate px-1 max-w-[2cm]">
            {resource.lastCommitHash.substring(0, 6)}
          </span>
          <div className="truncate px-8">
            {
              isGitUrlSet(resource.linkedGitRepositoryURL) ?
                <a href={resource.linkedGitRepositoryURL} className={resource.isSynchronizedWithRemote ? "text-green-400" : "text-red-400" } >GIT</a> :
                null
            }
          </div>
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
            <Button asChild variant="ghost" size="icon" className="shrink-0" onClick={stopPropagation(() => openModal(ReloadPimWrapper, {id: iri}))}>
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="shrink-0">
              <EllipsisVertical className="h-4 w-4" /><p className="text-xs">Git</p>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {/* TODO RadStr: Just for debugging ! */}
            {<DropdownMenuItem onClick={() => debugClearMergeStateDBTable()}><ShieldQuestion className="mr-2 h-4 w-4" />DEBUG - Clear merge db state table</DropdownMenuItem>}
            {<DropdownMenuItem asChild><a href={import.meta.env.VITE_BACKEND + "/git/redirect-to-remote-git-repository?iri=" + encodeURIComponent(iri)}><Eye className="mr-2 h-4 w-4" />Visit the remote repository</a></DropdownMenuItem>}
            {<DropdownMenuItem onClick={async () => gitHistoryVisualizationOnClickHandler(openModal, resource, resources)}><GitGraph className="mr-2 h-4 w-4" />Git branch visualization</DropdownMenuItem>}
            <hr className="border-gray-300" />
            {isSignedIn && <DropdownMenuItem onClick={() => openModal(SetPrivateSSHKeyDialog, {})}><GitGraph className="mr-2 h-4 w-4" />Add private SSH key</DropdownMenuItem>}
            <hr className="border-gray-300" />
            {<DropdownMenuItem onClick={async () => createNewRemoteRepositoryHandler(openModal, iri, resource)}><GitPullRequestIcon className="mr-2 h-4 w-4" />Create remote repository</DropdownMenuItem>}
            {<DropdownMenuItem onClick={async () => linkToExistingGitRepositoryHandler(openModal, iri, resource)}><Link className="mr-2 h-4 w-4" />Link to remote repository</DropdownMenuItem>}
            {<DropdownMenuItem onClick={async () => commitToGitDialogOnClickHandler(openModal, iri, resource)}><GitCommit className="mr-2 h-4 w-4" />Commit </DropdownMenuItem>}
            {<DropdownMenuItem onClick={async () => manualPull(iri)}><Import className="mr-2 h-4 w-4" />Pull</DropdownMenuItem>}
            {<DropdownMenuItem onClick={() => openModal(CreateNewBranchDialog, { sourcePackage: resource, actionOnConfirm: BranchAction.CreateNewBranch })}><GitBranchPlus className="mr-2 h-4 w-4" />Create branch</DropdownMenuItem>}
            <hr className="border-gray-300" />
            {<DropdownMenuItem onClick={() => openModal(setProjectIriAndBranchDialog, { examinedPackage: resource })}><Pencil className="mr-2 h-4 w-4" />Set project branch and/or project IRI</DropdownMenuItem>}
            {<DropdownMenuItem onClick={() => switchRepresentsBranchHead(resource, openModal)}><ArrowLeftRight className="mr-2 h-4 w-4" /> Convert to {resource.representsBranchHead ? "tag" : "branch"}</DropdownMenuItem>}
            <hr className="border-gray-300" />
            {<DropdownMenuItem onClick={() => openModal(MergeStatesDialog, { iri })}><EyeIcon className="mr-2 h-4 w-4" /> Show merge states</DropdownMenuItem>}
            {<DropdownMenuItem onClick={() => setProjectFilter(resource.projectIri)}><Filter className="mr-2 h-4 w-4" />Filter projects</DropdownMenuItem>}
            {mergeActors.mergeFrom !== null && mergeActors.mergeTo !== null && <DropdownMenuItem onClick={() => openModal(OpenMergeState, {mergeFrom: mergeActors.mergeFrom!, mergeTo: mergeActors.mergeTo!, editable: "mergeTo"})}><GitMerge className="mr-2 h-4 w-4" />Perform merge on DS packages</DropdownMenuItem>}
            {mergeActors.mergeFrom !== null && mergeActors.mergeFrom !== iri && <DropdownMenuItem onClick={() => mergeActors.setMergeTo(iri)}><ArrowRight className="mr-2 h-4 w-4"/>Merge to</DropdownMenuItem>}
            {<DropdownMenuItem onClick={() => mergeActors.setMergeFrom(iri)}><ArrowLeft className="mr-2 h-4 w-4"/>Merge from</DropdownMenuItem>}
            {<DropdownMenuItem className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={async () => removeGitLinkFromPackage(iri)}><Trash2 className="mr-2 h-4 w-4" />Remove GitHub Repo</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu> :
        null
      }
      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0">
            <Menu className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem asChild><a href={import.meta.env.VITE_BACKEND + "/experimental/output.zip?iri=" + encodeURIComponent(iri)}><FolderDown className="mr-2 h-4 w-4" /> {t("export-zip")}</a></DropdownMenuItem>}
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem asChild><a target="_blank" href={import.meta.env.VITE_BACKEND + `/preview/${i18n.language}/index.html?iri=` + encodeURIComponent(iri)}><FileText className="mr-2 h-4 w-4" /> {t("show-documentation")} ({i18n.language})</a></DropdownMenuItem>}
          {i18n.language !== "en" && resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem asChild><a target="_blank" href={import.meta.env.VITE_BACKEND + `/preview/en/index.html?iri=` + encodeURIComponent(iri)}><FileText className="mr-2 h-4 w-4" /> {t("show-documentation")} (en)</a></DropdownMenuItem>}
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem onClick={() => openModal(ModifyDocumentationTemplate, {iri})}><NotepadTextDashed className="mr-2 h-4 w-4" /> {t("modify-documentation-template")}</DropdownMenuItem>}
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem onClick={() => openModal(AddImported, {id: iri})}><Import className="mr-2 h-4 w-4" /> {t("import specification from url")}</DropdownMenuItem>}
          <DropdownMenuItem asChild><a href={import.meta.env.VITE_BACKEND + "/resources/export.zip?iri=" + encodeURIComponent(iri) + "&exportFormat=json"}><CloudDownload className="mr-2 h-4 w-4" /> {t("export") + " as json"}</a></DropdownMenuItem>
          <DropdownMenuItem asChild><a href={import.meta.env.VITE_BACKEND + "/resources/export.zip?iri=" + encodeURIComponent(iri) + "&exportFormat=yaml"}><CloudDownload className="mr-2 h-4 w-4" /> {t("export") + " as yaml"}</a></DropdownMenuItem>
          {resource.types.includes(LOCAL_PACKAGE) && <DropdownMenuItem onClick={async () => {
            await packageService.copyRecursively(iri, parentIri!);
            await requestLoadPackage(parentIri!, true);
          }}><Copy className="mr-2 h-4 w-4" /> {t("duplicate-resource")}</DropdownMenuItem>}
          <DropdownMenuItem onClick={async () => {
            const result = await openModal(RenameResourceDialog, {inputLabel: resource.userMetadata?.label, inputDescription: resource.userMetadata?.description});
            if (result) {
              await modifyUserMetadata(iri, {label: result.name, description: result.description});
            }
          }}><Pencil className="mr-2 h-4 w-4" /> Rename</DropdownMenuItem>
          {resource.types.includes(LOCAL_SEMANTIC_MODEL) && <DropdownMenuItem onClick={() => openModal(Autolayout, {iri, parentIri: parentIri!})}><Sparkles className="mr-2 h-4 w-4" /> {t("autolayout")}</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => openModal(ModifyRawDialog, {iri})}><CircuitBoard className="mr-2 h-4 w-4" /> {t("modify raw data")}</DropdownMenuItem>
          <DropdownMenuItem className="bg-destructive text-destructive-foreground hover:bg-destructive" onClick={() => openModal(DeleteResource, {iri})}><Trash2 className="mr-2 h-4 w-4" /> {t("remove")}</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
    {subResources.length > 0 && isOpen && <ul className="pl-8">
      {subResources.map(iri => <Row iri={iri} key={iri} parentIri={resource.iri} isSignedIn={isSignedIn} projectFilter={projectFilter} setProjectFilter={setProjectFilter} mergeActors={mergeActors} />)}
    </ul>}
    <ResourceDetail isOpen={detailModalToggle.isOpen} close={detailModalToggle.close} iri={iri} />
  </li>
};

export default function Component() {
  const login = useLogin();

  return (
    <div>
      <RootPackage iri={PACKAGE_ROOT} login={login} />
      <RootPackage iri={"http://dataspecer.com/packages/v1"} login={login} />
      <RootPackage iri={"https://dataspecer.com/resources/import/lod"} defaultToggle={false} login={login} />
    </div>
  )
}

function RootPackage({iri, defaultToggle, login}: {iri: string, defaultToggle?: boolean, login: UseLoginType}) {
  const openModal = useBetterModal();
  const resources = useContext(ResourcesContext);
  const pckg = resources[iri];
  const {t} = useTranslation();

  // Whether the package is open or not
  const [isOpen, setIsOpen] = useState<boolean>(defaultToggle ?? true);

  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const mergeActors = useMergeActors();

  useEffect(() => {
    requestLoadPackage(iri);
  }, []);

  const subResources = useSortIris(pckg?.subResourcesIri ?? []);

  if (pckg === null) {
    return;
  }

  if (!pckg) {
    return <div className="my-2 flex">
      <Skeleton className="w-[44px] h-[44px] rounded-full" />
      <div className="ml-3">
        <Skeleton className="w-[200px] h-6 mb-1" />
        <Skeleton className="w-[100px] h-4" />
      </div>
    </div>;
  }

  return <div className="mb-12">
    <LoginCard login={login}/>
    <div className="flex flex-row">
      <button onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      <h2 className="font-heading ml-3 scroll-m-20 pb-2 text-2xl font-semibold tracking-tight first:mt-0 grow"><Translate text={pckg.userMetadata?.label} /></h2>
      <Button variant="ghost" size="sm" className="shrink=0 ml-4"
        onClick={() => {
          mergeActors.setMergeTo(null);
          mergeActors.setMergeFrom(null);
        }}>
          Reset chosen merge actors
      </Button>
      <Button variant="ghost" size="sm" className="shrink=0 ml-4"
        onClick={() => setProjectFilter(null)}>
          <FilterX className="mr-2 h-4 w-4" />
          Remove filter
      </Button>
      <Button variant="ghost" size="sm" className="shrink=0 ml-4"
        onClick={() => openModal(AddImported, {id: iri})}>
        <Import className="mr-2 h-4 w-4" /> {t("import")}
      </Button>
      <Button variant="ghost" size={"sm"} className="shrink-0 ml-4" onClick={async () => {
        const names = await openModal(RenameResourceDialog, {type: "create"});
        if (!names) return;
        await createModelInstructions[LOCAL_PACKAGE].createHook({
          iri: "",
          parentIri: iri,
          modelType: LOCAL_PACKAGE,
          label: names?.name,
          description: names?.description,
        });
      }}><Folder className="mr-2 h-4 w-4" /> {t("new-package")}</Button>
      <Button variant="default" size={"sm"} className="shrink-0 ml-4" onClick={() => openModal(ProjectWizard, {iri})}><WandSparkles className="mr-2 h-4 w-4" /> {t("project-wizard")}</Button>
    </div>
    {isOpen &&
      <ul>
        {subResources.map(iri => {
          return <Row iri={iri} parentIri={pckg.iri} key={iri} isSignedIn={login.isSignedIn} projectFilter={projectFilter} setProjectFilter={setProjectFilter} mergeActors={mergeActors} />;
        })}
      </ul>
    }
  </div>;
}
