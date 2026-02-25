import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { packageService } from "@/package";
import { Loader } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createRdfsModel } from "@dataspecer/core-v2/semantic-model/simplified";
import { toast } from "sonner";

export interface ReloadPimWrapperProps {
  id: string;
}

export const ReloadPimWrapper = ({ id, isOpen, resolve }: ReloadPimWrapperProps & BetterModalProps<boolean>) => {
  const {t} = useTranslation();

  const [isLoading, setIsLoading] = useState(false);
  const doReload = async () => {
    setIsLoading(true);

    try {
      const data = await packageService.getResourceJsonData(id)! as {urls: string[]};
      const urls = data.urls;
      const newModel = await createRdfsModel(urls, fetch);

      // We need to override its id
      newModel.id = id;

      await packageService.setResourceJsonData(id, newModel.serializeModel());
    } catch (e) {
      setIsLoading(false);
      console.error(e);
      toast.error(t("reload-pim-wrapper.error"));
      return;
    }

    resolve(true);
    toast.success(t("reload-pim-wrapper.success"));
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