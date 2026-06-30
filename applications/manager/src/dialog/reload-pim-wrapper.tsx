import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAsyncMemo } from "@/hooks/use-async-memo";
import { BetterModalProps } from "@/lib/better-modal";
import { requestLoadPackage } from "@/package";
import { Loader } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface ReloadPimWrapperProps {
  id: string;
  parentId: string;
}

export const ReloadPimWrapper = ({ id, parentId, isOpen, resolve }: ReloadPimWrapperProps & BetterModalProps<boolean>) => {
  const {t} = useTranslation();
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [currentUrls] = useAsyncMemo(async () => {
    const response = await fetch(import.meta.env.VITE_BACKEND + "/resources/blob?iri=" + encodeURIComponent(id));
    if (!response.ok) return "";
    const data = await response.json() as { urls?: string[] };
    return (data.urls ?? []).join("\n");
  }, [id]);

  const [isLoading, setIsLoading] = useState(false);
  const doReload = async () => {
    setIsLoading(true);

    const urls = (textareaRef.current?.value ?? "").split("\n").map(u => u.trim()).filter(Boolean);

    const result = await fetch(import.meta.env.VITE_BACKEND + "/resources/reload?iri=" + encodeURIComponent(id), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });

    if (result.ok) {
      await requestLoadPackage(parentId, true);
      toast.success(t("reload-pim-wrapper.success"));
    } else {
      toast.error(t("reload-pim-wrapper.error"));
    }

    resolve(true);
  }

  return (
    <Modal open={isOpen} onClose={() => isLoading ? null : resolve(false)} >
      <ModalContent className="max-w-3xl">
        <ModalHeader>
          <ModalTitle>{t("reload-imported.title")}</ModalTitle>
          <ModalDescription>
            {t("reload-pim-wrapper.description")}
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <div className="grid gap-2">
            <Label htmlFor={textareaId}>{t("reload-pim-wrapper.urls")}</Label>
            <Textarea id={textareaId} ref={textareaRef} defaultValue={currentUrls} key={currentUrls} rows={5} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="destructive" onClick={doReload} disabled={isLoading}>
            {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {t("reload-imported.reload")}
          </Button>
          <Button variant="outline" onClick={() => resolve(false)} disabled={isLoading}>{t("close")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}