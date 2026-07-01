import { lng } from "@/Dir";
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { usePreviousValue } from "@/hooks/use-previous-value";
import { modelTypeToName } from "@/known-models";
import { BetterModalProps } from "@/lib/better-modal";
import { ResourcesContext, deleteResource } from "@/package";
import { Loader } from "lucide-react";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";

export const DeleteResource = ({ iri, isOpen, resolve }: { iri: string } & BetterModalProps<boolean>) => {
  const {t} = useTranslation();
  const resources = useContext(ResourcesContext);
  const resource = usePreviousValue(resources[iri]!);

  const [isLoading, setIsLoading] = useState(false);
  const doDelete = async () => {
    setIsLoading(true);
    await deleteResource(iri);
    resolve(true);
  }

  const name = lng(resource.userMetadata?.label);
  const type = modelTypeToName[resource.types?.[0]];

  return (
    <Modal open={isOpen} onClose={() => isLoading ? null : resolve(false)}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("delete-resource.title")}</ModalTitle>
          <ModalDescription>
            {name ? t("delete-resource.warning", {name, type}) : t("delete-resource.warning-no-name", {type})}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant="destructive" onClick={doDelete} disabled={isLoading}>
            {isLoading && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            {t("remove")}
          </Button>
          <Button variant="outline" onClick={() => resolve(false)} disabled={isLoading}>{t("close")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
