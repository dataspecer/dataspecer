import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@/components/modal";
import { LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createModelInstructions, getCMELink } from "@/known-models";
import { BetterModalProps } from "@/lib/better-modal";
import { LOCAL_PACKAGE, LOCAL_SEMANTIC_MODEL, VISUAL_MODEL } from "@dataspecer/core-v2/model/known-models";
import { useState } from "react";
import { useTranslation } from "react-i18next";


export const Vocabulary = ({ isOpen, resolve, iri }: { iri: string } & BetterModalProps<boolean>) => {
  const {t, i18n} = useTranslation();
  const [loading, setLoading] = useState(false);

  const formSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setLoading(true);

    try {
      const name = (event.target as any)["name"].value;

      // Create package
      const packageIri = await createModelInstructions[LOCAL_PACKAGE].createHook({
        parentIri: iri,
        label: {[i18n.language]: name},
        description: {[i18n.language]: (event.target as any)["description"].value},
        //documentBaseUrl: (event.target as any)["documentation-url"].value ?? undefined,
      }) as string;

      // Create semantic model
      await createModelInstructions[LOCAL_SEMANTIC_MODEL].createHook({
        parentIri: packageIri,
        label: {en: name},
        description: {en: "Semantic model for the vocabulary"},
        baseIri: (event.target as any)["base-url"].value,
        //documentBaseUrl: (event.target as any)["documentation-url"].value ?? undefined,
        modelAlias: name,
      });

      // Create view model
      const viewIri = await createModelInstructions[VISUAL_MODEL].createHook({
        parentIri: packageIri,
        label: {en: "Main view"},
        description: {en: "View model for the vocabulary"},
      }) as string;

      // Redirect to url
      window.location.href = getCMELink(packageIri, viewIri);

      // Never resolve as we need to redirect!
      // resolve(true);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => value ? null : resolve(false)}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>{t("project-wizard:projects.vocabulary.create-title")}</ModalTitle>
        </ModalHeader>
        <ModalBody className="mt-auto flex flex-col gap-2 p-4">
          <form className="grid gap-4" onSubmit={formSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="name">{t("form.name.name")}<span className="text-red-500">*</span></Label>
              <Input id="name" placeholder={t("form.name.instruction")} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t("form.description.name")}</Label>
              <Textarea id="description" placeholder={t("form.description.instruction")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="base-url">{t("form.base-iri.name")}</Label>
              <Input id="base-url" placeholder={t("form.base-iri.instruction")} defaultValue="https://example.com/vocabulary#" />
            </div>
            {/* <div className="grid gap-2">
              <Label htmlFor="documentation-url">{t("form.documentation-base-url.name")}</Label>
              <Input id="documentation-url" placeholder={t("form.documentation-base-url.instruction")} defaultValue="https://example.com/" />
            </div> */}
            {/* <div className="grid gap-2">
              <Label htmlFor="authors">{t("form.authors.name")}</Label>
              <Textarea id="authors" placeholder={t("form.authors.instruction")} />
            </div> */}
            <LoadingButton type="submit" loading={loading}>{t("form.create-button.name")}</LoadingButton>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};