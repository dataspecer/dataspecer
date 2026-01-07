import { lng } from "@/Dir";
import { Modal, ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePreviousValue } from "@/hooks/use-previous-value";
import { BetterModalProps } from "@/lib/better-modal";
import { ResourcesContext, deleteResource, requestLoadPackage, packageService } from "@/package";
import { Loader } from "lucide-react";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface ReloadImportedProps {
  id: string;
  parentId: string;
}

export const ReloadImported = ({ id, parentId, isOpen, resolve }: ReloadImportedProps & BetterModalProps<boolean>) => {
  const {t} = useTranslation();
  const resources = useContext(ResourcesContext);
  const resource = usePreviousValue(resources[id]!);

  // @ts-ignore
  const originalImportedUrl = resource.userMetadata.importedFromUrl as string;

  const [url, setUrl] = useState(originalImportedUrl);
  const [isLoading, setIsLoading] = useState(false);
  const doReload = async () => {
    setIsLoading(true);

    // Update the URL in userMetadata if it has changed
    if (url !== originalImportedUrl) {
      await packageService.updatePackage(id, {
        userMetadata: {
          ...resource.userMetadata,
          importedFromUrl: url,
        },
      });
    }

    const result = await fetch(import.meta.env.VITE_BACKEND + "/resources/import?parentIri=" + encodeURIComponent(parentId) + "&url=" + encodeURIComponent(url), {
      method: "POST",
    });

    if (result.ok) {
      await deleteResource(id);
      await requestLoadPackage(parentId, true);
      toast.success(t("reload-imported.success"));
    }

    resolve(true);
  }

  const name = lng(resource.userMetadata?.label);

  return (
    <Modal open={isOpen} onClose={() => isLoading ? null : resolve(false)} >
      <ModalContent className="max-w-3xl">
        <ModalHeader>
          <ModalTitle>{t("reload-imported.title")}</ModalTitle>
          <ModalDescription>
            {name ? t("reload-imported.warning", {name}) : t("reload-imported.warning-no-name")}
          </ModalDescription>
        </ModalHeader>
        <ModalBody>
          <div className="grid gap-2">
            <Label htmlFor="url">{t("reload-imported.url")}</Label>
            <Input 
              id="url" 
              value={url} 
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
            />
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