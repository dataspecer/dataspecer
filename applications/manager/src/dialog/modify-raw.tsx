import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { MonacoEditor } from "@/components/monaco-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAsyncMemo } from "@/hooks/use-async-memo";
import { useEventCallback } from "@/hooks/use-event-callback";
import { packageService } from "@/package";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import * as monaco from 'monaco-editor';
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface ModifyRawDialogProps {
  isOpen: boolean;
  resolve: () => void;

  /**
   * IRI of the resource to modify.
   */
  iri: string;
}

export const ModifyRawDialog = ({isOpen, resolve, iri}: ModifyRawDialogProps) => {
  const {t} = useTranslation();

  const monaco = useRef<{editor: monaco.editor.IStandaloneCodeEditor}>(undefined);

  // const [dataStores] = useAsyncMemo(() => packageService.getResourceDataStores(iri), [iri]);
  const {data: dataStores, refetch} = useQuery({
    queryKey: ["dataStores", iri],
    queryFn: () => packageService.getResourceDataStores(iri),
  });

  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  useEffect(() => {
    if (dataStores && Object.values(dataStores).length > 0 && selectedModel === null) {
      setSelectedModel(Object.keys(dataStores)[0]);
    }
  }, [dataStores, selectedModel]);

  const [remoteData] = useAsyncMemo(async () => {
    if (selectedModel === null) return "";
    const response = await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(iri) + "&name=" + encodeURIComponent(selectedModel));
    if (!response.ok) return "{\n  \n}";
    return JSON.stringify(await response.json(), null, 2);
  }, [iri, selectedModel]);

  useEffect(() => {
    monaco.current?.editor.setValue(remoteData ?? "");
  }, [remoteData]);

  const tabs = Object.keys(dataStores ?? {});
  if (selectedModel !== null && !tabs.includes(selectedModel)) tabs.push(selectedModel);

  const newTabInput = useRef<HTMLInputElement>(null);

  const save = useEventCallback(async () => {
    if (selectedModel === null) return;
    const value = monaco.current!.editor.getValue();
    await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(iri) + "&name=" + encodeURIComponent(selectedModel), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: value,
    });
    toast(t("successfully saved"));
  });

  const formatJson = useEventCallback(() => {
    const value = monaco.current!.editor.getValue();
    try {
      const json = JSON.parse(value);
      monaco.current!.editor.setValue(JSON.stringify(json, null, 2));
    } catch (e) {
      console.error(e);
    }
  });

  const deleteModel = useEventCallback(async (model: string) => {
    await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(iri) + "&name=" + encodeURIComponent(model), {
      method: "DELETE",
    });
    setSelectedModel(null);
    refetch();
  });

  return (
    // Forbid modal auto close
    <Modal open={isOpen} onOpenChange={state => state || resolve()}>
      <ModalContent className="max-w-none! h-full rounded-none! border-none!">
        <ModalHeader>
          <ModalTitle>{t("modify raw data")}</ModalTitle>
        </ModalHeader>
        <ModalBody className="grow flex flex-col">

          <div className="w-full">
            <div className="flex items-center border-b pb-2">
              <div className="flex-1">
                {tabs.map((tab) => (
                  <button
                    key={tab}
                    className={`cursor-pointer mr-2 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors rounded-md ${
                      selectedModel === tab ? "bg-[rgba(0,0,0,0.1)] dark:bg-[rgba(0,0,0,0.8)] text-dark" : "text-muted-foreground hover:bg-muted/50 border border-muted/50"
                    }`}
                    onClick={() => setSelectedModel(tab)}
                  >
                    {tab}
                    {false && <div className="h-2 w-2 rounded-full bg-yellow-500" />}
                    <button
                      className="cursor-pointer ml-auto text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteModel(tab);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 border-l px-4">
                <Input
                  ref={newTabInput}
                  placeholder={t("ID")}
                  className="h-8 w-32 rounded-md bg-muted text-sm"
                />
                <Button onClick={() => newTabInput.current?.value && setSelectedModel(newTabInput.current?.value)} size="xsm" variant="outline">
                  <Plus className="h-4 w-4" />
                  <span className="sr-only">Create new tab</span>
                </Button>
              </div>
            </div>
            {/* <div className="p-4">{tabs.find((tab) => tab.id === activeTab)?.name || "No active tab"}</div> */}
          </div>

          <MonacoEditor refs={monaco} defaultValue={remoteData ?? ""} language="json"  />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={formatJson}>{t("format as json")}</Button>
          <Button variant="outline" onClick={save} disabled={!selectedModel}>{t("save")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};