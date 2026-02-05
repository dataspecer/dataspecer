import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { BetterModalProps } from "@/lib/better-modal";
import { packageService, refreshResourceMetadata } from "@/package";
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
      await refreshResourceMetadata(id);
    } catch (e) {
      setIsLoading(false);
      console.error(e);
      toast.error("Reloading model failed. More information in the console.");
      return;
    }

    resolve(true);
    toast.success("Model reloaded successfully.");
  }

  return (
    <Modal open={isOpen} onClose={() => isLoading ? null : resolve(false)} >
      <ModalContent className="max-w-3xl">
        <ModalHeader>
          <ModalTitle>{t("reload-imported.title")}</ModalTitle>
          <ModalDescription>
            Reload contents of external model
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          Are you sure you want to reload the contents of this external model?
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