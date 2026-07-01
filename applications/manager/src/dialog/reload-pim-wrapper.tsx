import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { requestLoadPackage } from "@/package";
import { Loader } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface ReloadPimWrapperProps {
  id: string;
  parentId: string;
}

export const ReloadPimWrapper = ({ id, parentId, isOpen, resolve }: ReloadPimWrapperProps & BetterModalProps<boolean>) => {
  const {t} = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const doReload = async () => {
    setIsLoading(true);

    const result = await fetch(import.meta.env.VITE_BACKEND + "/resources/reload?iri=" + encodeURIComponent(id), {
      method: "POST",
    });

    if (result.ok) {
      await requestLoadPackage(parentId, true);
      toast.success(t("reload-pim-wrapper.success"));
    } else {
      toast.error(t("reload-pim-wrapper.error"), { "richColors": true });
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
          {t("reload-pim-wrapper.confirm")}
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
