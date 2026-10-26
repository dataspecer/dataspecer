import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@/components/modal";
import { LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { getSchemaLink } from "@/known-models";
import { BetterModalProps } from "@/lib/better-modal";
import { getSpecificationService } from "@/package";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { TagField, parseTags } from "@/components/tag-field";
import { OfnVocabularies } from "./ofn-vocabularies";

export const Schema = ({ isOpen, resolve, iri, defaultTag }: { iri: string; defaultTag?: string } & BetterModalProps<boolean>) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState(defaultTag ?? "");
  const [preset, setPreset] = useState("sgov");
  const [selection, setSelection] = useState<string[]>([]);
  const [error, setError] = useState("");

  const formSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (loading || (preset === "ofn" && selection.length === 0)) return;
    setLoading(true);
    setError("");

    try {
      const name = (event.target as any)["name"].value;
      //const description = (event.target as any)["description"].value;

      const metadata = { label: { [i18n.language]: name }, tags: parseTags(tags) };
      const dataSpecificationId = await getSpecificationService(iri).createDataSpecification({
        ...metadata,
        includeSgov: preset !== "ofn",
      });
      if (preset === "ofn") {
        try {
          await fetch(import.meta.env.VITE_BACKEND + "/resources/import?parentIri=" + encodeURIComponent(dataSpecificationId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ofnVocabularies: selection,
            }),
          });
        } catch (importError) {
          try {
            const response = await fetch(import.meta.env.VITE_BACKEND + "/resources/packages?iri=" + encodeURIComponent(dataSpecificationId), {
              method: "DELETE",
            });
            if (!response.ok) throw new Error(response.statusText);
          } catch (cleanupError) {
            throw new Error(`${String(importError)}. ${t("project-wizard:ofn.cleanup-error")} (${dataSpecificationId}): ${String(cleanupError)}`);
          }
          throw importError;
        }
      }

      // Redirect to url
      window.location.href = getSchemaLink(dataSpecificationId);

      // Never resolve as we need to redirect!
      // resolve(true);
    } catch (error) {
      console.error(error);
      setError(String(error));
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => (value ? null : resolve(false))}>
      <ModalContent
        className={`max-h-[90vh] overflow-y-auto [--schema-form-width:calc(var(--container-lg)-3rem-2px)] ${preset === "ofn" ? "md:max-w-[min(64rem,calc(100%-2rem))]" : "sm:max-w-lg"}`}
      >
        <ModalHeader>
          <ModalTitle>{t("project-wizard:projects.schema.create-title")}</ModalTitle>
        </ModalHeader>
        <ModalBody className="mt-auto flex flex-col gap-2 p-4">
          <form className="grid gap-4" onSubmit={formSubmit}>
            <fieldset
              disabled={loading}
              className={`grid min-w-0 gap-6 ${preset === "ofn" ? "md:grid-cols-[var(--schema-form-width)_minmax(0,1fr)]" : ""}`}
            >
              <div className="grid content-start gap-4 md:w-(--schema-form-width)">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    {t("form.name.name")}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input id="name" placeholder={t("form.name.instruction")} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">{t("form.description.name")}</Label>
                  <Textarea id="description" placeholder={t("form.description.instruction")} />
                </div>
                <TagField value={tags} onChange={setTags} />
                <div className="grid gap-2">
                  <Label id="schema-preset-label">{t("form.description.preset")}</Label>
                  <RadioGroup
                    aria-labelledby="schema-preset-label"
                    disabled={loading}
                    value={preset}
                    onValueChange={(value) => {
                      setPreset(value);
                      setSelection([]);
                      setError("");
                    }}
                  >
                    <div>
                      <RadioGroupItem value="sgov" id="sgov" className="peer sr-only" />
                      <Label
                        htmlFor="sgov"
                        className="flex cursor-pointer items-start space-x-4 rounded-md p-3 transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-muted bg-popover peer-data-[state=checked]:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                      >
                        <img src="https://flagcdn.com/w40/cz.png" srcSet="https://flagcdn.com/w80/cz.png 2x" className="mt-px w-5 shrink-0 block" alt="" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{t("project-wizard:projects.schema.sgov-title")}</p>
                          <p className="text-sm text-muted-foreground">{t("project-wizard:projects.schema.sgov-description")}</p>
                        </div>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem value="ofn" id="ofn" className="peer sr-only" />
                      <Label
                        htmlFor="ofn"
                        className="flex cursor-pointer items-start space-x-4 rounded-md p-3 transition-colors hover:bg-accent hover:text-accent-foreground border-2 border-muted bg-popover peer-data-[state=checked]:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring"
                      >
                        <img src="https://flagcdn.com/w40/cz.png" srcSet="https://flagcdn.com/w80/cz.png 2x" className="mt-px w-5 shrink-0 block" alt="" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium leading-none">{t("project-wizard:ofn.title")}</p>
                          <p className="text-sm text-muted-foreground">{t("project-wizard:ofn.description")}</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
              {preset === "ofn" && (
                <div className="min-w-0 border-t pt-6 md:border-t-0 md:border-l md:pt-0 md:pl-6">
                  <OfnVocabularies selected={selection} onChange={setSelection} disabled={loading} />
                </div>
              )}
            </fieldset>
            {error && (
              <p role="alert" className="text-red-600 md:max-w-(--schema-form-width)">
                {error}
              </p>
            )}
            <LoadingButton className="w-full md:max-w-(--schema-form-width)" type="submit" loading={loading} disabled={preset === "ofn" && selection.length === 0}>
              {t("form.create-button.name")}
            </LoadingButton>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
