import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, ModalTitle } from "@/components/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseTags } from "@/components/tag-field";
import { BetterModalProps } from "@/lib/better-modal";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const ModifyTagsDialog = ({ tags = [], isOpen, resolve }: { tags?: string[] } & BetterModalProps<string[] | null>) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(tags.join(", "));

  return (
    <Modal open={isOpen} onOpenChange={(open) => (open ? null : resolve(null))}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>{t("modify-tags.title")}</ModalTitle>
        </ModalHeader>
        <ModalBody className="grid gap-2">
          <Label htmlFor="resource-tags">{t("tags")}</Label>
          <Input id="resource-tags" value={value} onChange={(event) => setValue(event.target.value)} placeholder={t("tags-instruction")} />
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => resolve(null)}>
            {t("rename-resource.cancel")}
          </Button>
          <Button onClick={() => resolve(parseTags(value))}>{t("rename-resource.save-changes")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
