import { lng } from "@/Dir";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncMemo } from "@/hooks/use-async-memo";
import { usePreviousValue } from "@/hooks/use-previous-value";
import { BetterModalProps } from "@/lib/better-modal";
import { getEvolutionReviewLink, getHistoryLink } from "@/known-models";
import { ResourcesContext, requestLoadPackage } from "@/package";
import { RDFS_MODEL } from "@dataspecer/core-v2/model/known-models";
import { AlertCircleIcon, ChevronDown, Loader } from "lucide-react";
import { useContext, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface ReloadResourceProps {
  id: string;
  parentId: string;
}

export const ReloadResource = ({ id, parentId, isOpen, resolve }: ReloadResourceProps & BetterModalProps<boolean>) => {
  const { t } = useTranslation();
  const resources = useContext(ResourcesContext);
  const resource = usePreviousValue(resources[id]!);

  // The RDFS wrapper model reloads from a list of URLs (textarea), any other
  // reloadable resource (an imported specification) reloads from a single URL.
  const isMultiUrl = resource.types.includes(RDFS_MODEL);

  const urlInputFormId = useId();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // @ts-ignore
  const importedUrl = resource.userMetadata?.importedFromUrl as string | undefined;

  const [currentUrls] = useAsyncMemo(async () => {
    if (!isMultiUrl) {
      return "";
    }
    const response = await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(id));
    if (!response.ok) return "";
    const data = (await response.json()) as { urls?: string[] };
    return (data.urls ?? []).join("\n");
  }, [id, isMultiUrl]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doReload = async (apply: boolean) => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams({ iri: id });
    if (apply) {
      params.set("apply", "true");
    }

    let body: string | undefined;
    const headers: Record<string, string> = {};
    if (isMultiUrl) {
      const urls = (textareaRef.current?.value ?? "").split("\n").map((u) => u.trim()).filter(Boolean);
      headers["Content-Type"] = "application/json";
      body = JSON.stringify({ urls });
    } else {
      params.set("url", (document.getElementById(urlInputFormId)! as HTMLInputElement).value);
    }

    const result = await fetch(import.meta.env.VITE_BACKEND + "/resources/reload?" + params.toString(), {
      method: "POST",
      headers,
      body,
    });

    if (result.ok) {
      await requestLoadPackage(parentId, true);
      toast.success(t("reload-resource.success"));
      resolve(true);
      if (!apply) {
        const data = (await result.json().catch(() => null)) as { evolutionBranchId?: number | null } | null;
        window.location.href =
          data?.evolutionBranchId != null ? getEvolutionReviewLink(parentId, data.evolutionBranchId) : getHistoryLink(parentId);
      }
      return;
    }

    const data = await result.json().catch(() => null) as { error?: string } | null;
    setError(data?.error || t("reload-resource.error"));
    setIsLoading(false);
  };

  const name = lng(resource.userMetadata?.label);

  return (
    <Modal open={isOpen} onClose={() => (isLoading ? null : resolve(false))}>
      <ModalContent className="max-w-3xl!">
        <ModalHeader>
          <ModalTitle>{t("reload-resource.title")}</ModalTitle>
          <ModalDescription>{name ? t("reload-resource.warning", { name }) : t("reload-resource.warning-no-name")}</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {isMultiUrl ? (
            <div className="grid gap-2">
              <Label htmlFor={textareaId}>{t("reload-resource.urls")}</Label>
              <Textarea id={textareaId} ref={textareaRef} defaultValue={currentUrls} key={currentUrls} rows={5} />
            </div>
          ) : (
            <div className="grid gap-2">
              <Label htmlFor={urlInputFormId}>{t("reload-resource.url")}</Label>
              <Input id={urlInputFormId} defaultValue={importedUrl} />
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertTitle>{t("reload-resource.error-title")}</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <div className="flex">
            <Button variant="default" className="rounded-r-none" onClick={() => doReload(false)} disabled={isLoading}>
              {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
              {t("reload-resource.reload")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" className="rounded-l-none border-l border-l-destructive-foreground/30 px-2" disabled={isLoading}>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => doReload(true)}>{t("reload-resource.reload-apply")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button variant="outline" onClick={() => resolve(false)} disabled={isLoading}>
            {t("close")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
