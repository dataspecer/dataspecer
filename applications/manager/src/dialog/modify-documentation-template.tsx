import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@/components/modal";
import { MonacoEditor } from "@/components/monaco-editor";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { BetterModalProps } from "@/lib/better-modal";
import { packageService, requestLoadPackage } from "@/package";
import { preventDefault, stopPropagation } from "@/utils/events";
import { Trash, Undo2 } from "lucide-react";
import * as monaco from "monaco-editor";
import { useEffect, useRef, useState } from "react";
import { createDefaultConfigurationModelFromJsonObject } from "@dataspecer/core-v2/configuration-model";
import { applyPartialDocumentationConfiguration, createPartialDocumentationConfiguration, DOCUMENTATION_MAIN_TEMPLATE_PARTIAL } from "@dataspecer/documentation/configuration";
import { defaultDocumentationConfiguration, documentationPartialsFromGenerators } from "@dataspecer/specification/documentation";
import { useOnBeforeUnload } from "@/hooks/use-on-before-unload";
import { useOnKeyDown } from "@/hooks/use-on-key-down";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

type PartialState = "UNCHANGED" | "MODIFIED" | "LOCAL" | "REMOVED";
const MAIN_TEMPLATE = DOCUMENTATION_MAIN_TEMPLATE_PARTIAL;

const KNOWN_GENERATORS = documentationPartialsFromGenerators;

function PartialState({ state }: { state: PartialState }) {
  const { t } = useTranslation();

  if (state === "UNCHANGED") {
    return (
      <div>
        <span className="inline-block w-2 h-2 rounded-full bg-green-600"></span> {t("modify-documentation-template-dialog.state-unchanged")}
      </div>
    );
  }
  if (state === "MODIFIED") {
    return (
      <div>
        <span className="inline-block w-2 h-2 rounded-full bg-orange-600"></span> {t("modify-documentation-template-dialog.state-modified")}
      </div>
    );
  }
  if (state === "LOCAL") {
    return (
      <div>
        <span className="inline-block w-2 h-2 rounded-full bg-orange-600"></span> {t("modify-documentation-template-dialog.state-local")}
      </div>
    );
  }
  if (state === "REMOVED") {
    return (
      <div>
        <span className="inline-block w-2 h-2 rounded-full bg-red-600"></span> {t("modify-documentation-template-dialog.state-removed")}
      </div>
    );
  }
}

function PartialButton(props: {
  text: string;
  state: PartialState;

  selected?: boolean;
  onSelect?: () => void;

  onRevert?: () => void;
  onRemove?: () => void;
}) {
  return (
    <button
      onClick={props.state !== "REMOVED" ? props.onSelect : undefined}
      // disabled={props.state === "REMOVED"}
      role="radio"
      className={
        "cursor-pointer mb-2 text-sm text-left leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 rounded-md border-2 border-muted bg-transparent px-4 py-2 [&:not(:has(button:hover)):hover]:bg-accent group flex items-center" +
        (props.selected ? " border-primary" : "") +
        (props.state === "REMOVED" ? " text-muted-foreground" : "")
      }
    >
      <div className="grow">
        <div className="mb-1 font-medium">{props.text}</div>
        <PartialState state={props.state} />
      </div>
      <div className="h-4" />
      {/* {props.onRevert && ( */}
      <Button disabled={!props.onRevert} variant="ghost" size="icon" className="hover:bg-accent" onClick={stopPropagation(props.onRevert)}>
        <Undo2 className="w-4 h-4 text-muted-foreground" />
      </Button>
      {/* )} */}
      {/* {props.onRemove && ( */}
      <Button disabled={!props.onRemove} variant="ghost" size="icon" className="hover:bg-accent" onClick={stopPropagation(props.onRemove)}>
        <Trash className="w-4 h-4 text-muted-foreground" />
      </Button>
      {/* )} */}
    </button>
  );
}

function getNewPartialsState(defaultPartials: Record<string, string>, current: Record<string, string | false>): Record<string, PartialState> {
  const newPartialsState: Record<string, PartialState> = {};
  for (const [name, value] of Object.entries(current)) {
    if (defaultPartials[name]) {
      if (value === defaultPartials[name]) {
        newPartialsState[name] = "UNCHANGED";
        delete current[name];
      } else {
        newPartialsState[name] = value === false ? "REMOVED" : "MODIFIED";
      }
    } else {
      newPartialsState[name] = "LOCAL";
    }
  }
  for (const name of Object.keys(defaultPartials)) {
    if (current[name] === undefined) {
      newPartialsState[name] = "UNCHANGED";
    }
  }
  return newPartialsState;
}

export const ModifyDocumentationTemplate = ({ isOpen, resolve, iri }: { iri: string } & BetterModalProps) => {
  const monaco = useRef<{ editor: monaco.editor.IStandaloneCodeEditor }>(undefined);
  const { t } = useTranslation();

  useOnBeforeUnload(true);
  useOnKeyDown(e => {
    if (e.key === "s" && e.ctrlKey) {
      e.preventDefault();
      save();
      toast.success(t("modify-documentation-template-dialog.saved"));
    }
  });

  const save = async () => {
    const data = (await packageService.getResourceJsonData(iri)) ?? {};
    const configuration = createDefaultConfigurationModelFromJsonObject(data);
    const documentationConfiguration = createPartialDocumentationConfiguration(configuration);
    documentationConfiguration.partials = currentPartials.current;
    applyPartialDocumentationConfiguration(configuration, documentationConfiguration);
    const result = configuration.serializeModelToApiJsonObject(data);
    await packageService.setResourceJsonData(iri, result);
    await requestLoadPackage(iri, true);
  };

  const defaultPartials = defaultDocumentationConfiguration.partials;

  const [isLoading, setIsLoading] = useState(true);
  const currentPartials = useRef<Record<string, string | false>>({});
  useEffect(() => {
    (async () => {
      const data = (await packageService.getResourceJsonData(iri)) ?? {};
      const configuration = createDefaultConfigurationModelFromJsonObject(data);
      const documentationConfiguration = structuredClone(createPartialDocumentationConfiguration(configuration));
      currentPartials.current = documentationConfiguration.partials;
      setPartialsState(getNewPartialsState(defaultPartials, currentPartials.current));
      selectNewPartial(MAIN_TEMPLATE);
      setIsLoading(false);
    })();
  }, []);


  const [partialsState, setPartialsState] = useState<Record<string, PartialState>>(() => getNewPartialsState(defaultPartials, currentPartials.current));
  let [selectedPartial, setSelectedPartial] = useState<string>(MAIN_TEMPLATE);

  const selectNewPartial = (name: string) => {
    setSelectedPartial(name);
    selectedPartial = name; // todo hack
    monaco.current?.editor.setValue((currentPartials.current[name] as string) ?? defaultPartials[name]);
  };

  const addNewPartial = (name: string) => {
    if (currentPartials.current[name] === undefined) {
      currentPartials.current[name] = "";
      setPartialsState(getNewPartialsState(defaultPartials, currentPartials.current));
      selectNewPartial(name);
    } else {
      selectNewPartial(name);
    }
  };

  const remove = (name: string) => {
    if (defaultPartials[name]) {
      currentPartials.current[name] = false;
    } else {
      delete currentPartials.current[name];
    }
    setPartialsState(getNewPartialsState(defaultPartials, currentPartials.current));
    if (selectedPartial === name) selectNewPartial(MAIN_TEMPLATE);
  };

  const revert = (name: string) => {
    console.log("revert", name);
    delete currentPartials.current[name];
    setPartialsState(getNewPartialsState(defaultPartials, currentPartials.current));
    if (selectedPartial === name) selectNewPartial(name);
  };

  const editorValueUpdated = (value: string | undefined) => {
    if (value === undefined) return;
    currentPartials.current[selectedPartial] = value;
    const newState = getNewPartialsState(defaultPartials, currentPartials.current);
    // todo compare with previous state
    setPartialsState(newState);
  };

  return (
    // Forbid modal auto close
    <Modal open={isOpen}>
      <ModalContent className="max-w-none! h-full py-0 rounded-none! border-none!" disableClose>
        <ModalBody className="grow flex overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="overflow-hidden">
            <ResizablePanel defaultSize={20} className="flex flex-col pr-5 pl-1 my-6">
              <ModalHeader className="mb-4">
                <ModalTitle>{t("modify-documentation-template-dialog.title")}</ModalTitle>
              </ModalHeader>

              {!isLoading &&
                <div className="flex flex-col grow overflow-y-auto pr-2 -mr-2 -ml-2 pl-2">
                  <h5 className="scroll-m-20 text-l mb-3 tracking-tight">{t("modify-documentation-template-dialog.template")}</h5>

                  <PartialButton
                    text={t("modify-documentation-template-dialog.source-template")}
                    state={partialsState[MAIN_TEMPLATE]}
                    selected={selectedPartial === MAIN_TEMPLATE}
                    onSelect={() => selectNewPartial(MAIN_TEMPLATE)}
                    onRevert={partialsState[MAIN_TEMPLATE] === "MODIFIED" ? () => revert(MAIN_TEMPLATE) : undefined}
                  />

                  <h5 className="scroll-m-20 text-l mb-3 tracking-tight mt-3">{t("modify-documentation-template-dialog.reusable-parts")}</h5>

                  <Alert variant="info" className="mb-3">
                    <AlertDescription>
                      {t("modify-documentation-template-dialog.reusable-parts-help-prefix")} <code>{"{{> name}}"}</code>.
                    </AlertDescription>
                  </Alert>

                  {Object.entries(partialsState)
                    .filter(([name]) => name !== MAIN_TEMPLATE && !KNOWN_GENERATORS.includes(name))
                    .toSorted(([a], [b]) => a.localeCompare(b))
                    .map(([name, state]) => (
                      <PartialButton
                        text={name}
                        state={state}
                        selected={selectedPartial === name}
                        onSelect={() => selectNewPartial(name)}
                        onRemove={state !== "REMOVED" ? () => remove(name) : undefined}
                        onRevert={state === "MODIFIED" || state === "REMOVED" ? () => revert(name) : undefined}
                      />
                    ))}

                  <form
                    onSubmit={preventDefault((e) => {
                      const target = e.target as HTMLFormElement;
                      addNewPartial(target["partialName"].value);
                      target.reset();
                    })}
                    className="flex gap-2 mb-2"
                  >
                    <Input placeholder={t("modify-documentation-template-dialog.new-partial-placeholder")} name="partialName" />
                    <Button variant="default" type="submit">
                      {t("modify-documentation-template-dialog.add-new")}
                    </Button>
                  </form>

                  <h5 className="scroll-m-20 text-l mb-3 tracking-tight mt-3">{t("modify-documentation-template-dialog.generator-parts")}</h5>

                  {Object.entries(partialsState)
                    .filter(([name]) => KNOWN_GENERATORS.includes(name))
                    .toSorted(([a], [b]) => a.localeCompare(b))
                    .map(([name, state]) => (
                      <PartialButton
                        text={name}
                        state={state}
                        selected={selectedPartial === name}
                        onSelect={() => selectNewPartial(name)}
                        onRemove={state !== "REMOVED" ? () => remove(name) : undefined}
                        onRevert={state === "MODIFIED" || state === "REMOVED" ? () => revert(name) : undefined}
                      />
                    ))}
                </div>
              }

              <div className="flex gap-2 mt-4 justify-end mb-2">
                <Button variant="outline" onClick={() => resolve()}>
                  {t("modify-documentation-template-dialog.cancel")}
                </Button>
                <Button variant="outline" onClick={() => save()} disabled={isLoading}>
                  {t("modify-documentation-template-dialog.save-ctrl-s")}
                </Button>
                <Button variant={"default"} onClick={() => save().then(resolve)} disabled={isLoading}>
                  {t("modify-documentation-template-dialog.save-close")}
                </Button>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle autoFocus={false} />
            <ResizablePanel className="overflow-hidden flex flex-col pt-1">
              {!isLoading && <MonacoEditor refs={monaco} defaultValue={(currentPartials.current[selectedPartial] === false || currentPartials.current[selectedPartial] === undefined) ? defaultPartials[selectedPartial] : currentPartials.current[selectedPartial] as string} language="handlebars" onChange={editorValueUpdated} />}
            </ResizablePanel>
          </ResizablePanelGroup>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};