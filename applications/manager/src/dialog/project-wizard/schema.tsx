import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@/components/modal";
import { LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { createModelInstructions, getSchemaLink } from "@/known-models";
import { BetterModalProps } from "@/lib/better-modal";
import { LOCAL_PACKAGE, V1 } from "@dataspecer/core-v2/model/known-models";
import { useState } from "react";
import { useTranslation } from "react-i18next";


export const Schema = ({ isOpen, resolve, iri }: { iri: string } & BetterModalProps<boolean>) => {
  const {t, i18n} = useTranslation();
  const [loading, setLoading] = useState(false);

  const formSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setLoading(true);

    try {
      const name = (event.target as any)["name"].value;
      const description = (event.target as any)["description"].value;

      // Create package
      const packageIri = await createModelInstructions[LOCAL_PACKAGE].createHook({
        parentIri: iri,
        label: {[i18n.language]: name},
        description: {[i18n.language]: (event.target as any)["description"].value},
      }) as string;

      // Create semantic model
      await createModelInstructions[V1.PIM].createHook({
        parentIri: packageIri,
        label: {en: name},
        description: {en: description},
        modelAlias: name,
      });

      // Redirect to url
      window.location.href = getSchemaLink(packageIri);

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
          <ModalTitle>{t("project-wizard:projects.schema.create-title")}</ModalTitle>
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
              <Label htmlFor="description">{t("form.description.preset")}</Label>
              <RadioGroup defaultValue="sgov" className="">
                <div>
                  <RadioGroupItem value="sgov" id="sgov" className="peer sr-only" />
                  <Label htmlFor="sgov" className="-mx-2 flex items-start space-x-4 rounded-md p-2 transition-all hover:bg-accent hover:text-accent-foreground border-2 border-muted bg-popover peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                    <img src="https://flagcdn.com/w40/cz.png" srcSet="https://flagcdn.com/w80/cz.png 2x" className="mt-px w-5 block" alt="Czechia" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">Czech Semantic Government Vocabulary</p>
                      <p className="text-sm text-muted-foreground">
                        Uses SGOV as a source ontology and local semantic model to store applied changes.
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <LoadingButton type="submit" loading={loading}>{t("form.create-button.name")}</LoadingButton>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};