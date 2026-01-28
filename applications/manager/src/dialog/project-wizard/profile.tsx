import { Modal, ModalBody, ModalContent, ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import { LoadingButton } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getCMELink } from "@/known-models";
import { BetterModalProps } from "@/lib/better-modal";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export const Profile = ({ isOpen, resolve, iri }: { iri: string } & BetterModalProps<boolean>) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const formSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setLoading(true);

    try {
      const urls = (event.target as any)["url"].value
        .split("\n")
        .map((url: string) => url.trim())
        .filter((url: string) => url.length > 0);

      if (urls.length === 0) {
        setLoading(false);
        return;
      }

      const label = (event.target as any)["name"].value;
      const description = (event.target as any)["description"].value;
      const baseIri = (event.target as any)["base-url"].value;
      const autoProfile = (event.target as any)["auto-profile"].checked;

      // Call the API endpoint
      const response = await fetch(import.meta.env.VITE_BACKEND + "/new/application-profile?parentIri=" + encodeURIComponent(iri), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          specifications: urls.map((url: string) => ({ url })),
          label: label || undefined,
          description: description || undefined,
          baseIri: baseIri,
          autoProfile: autoProfile,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("API Error:", error);
        setLoading(false);
        return;
      }

      const result = await response.json();

      // Redirect to CME with the created profile
      window.location.href = getCMELink(result.packageIri, result.viewIri);

      // Never resolve as we need to redirect!
      // resolve(true);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  return (
    <Modal open={isOpen} onOpenChange={(value: boolean) => (value ? null : resolve(false))}>
      <ModalContent className="max-w-lg">
        <ModalHeader>
          <ModalTitle>{t("project-wizard:projects.profile.create-title")}</ModalTitle>
        </ModalHeader>
        <ModalDescription>{t("project-wizard:projects.profile.help")}</ModalDescription>
        <ModalBody className="mt-auto flex flex-col gap-2 p-4">
          <form className="grid gap-4" onSubmit={formSubmit}>
            <div className="grid gap-2">
              <Label htmlFor="url">
                {t("form.url.name")}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea id="url" placeholder={t("form.url.instruction")} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="auto-profile" className="grow">
                Autoprofile
              </Label>
              <div className="flex items-center space-x-5">
                <Switch id="auto-profile" defaultChecked />
                <p className="text-muted-foreground text-sm">Automatically create default profile of all concepts from profiled specifications including all structures, if any.</p>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">{t("form.name.name")}</Label>
              <Input id="name" placeholder={t("form.name.instruction")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t("form.description.name")}</Label>
              <Textarea id="description" placeholder={t("form.description.instruction")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="base-url">
                {t("form.base-iri.name")}
                <span className="text-red-500">*</span>
              </Label>
              <Input id="base-url" placeholder={t("form.base-iri.instruction")} defaultValue="https://example.com/profile/vocabulary#" />
            </div>
            {/* <div className="grid gap-2">
              <Label htmlFor="documentation-url">{t("form.documentation-base-url.name")}</Label>
              <Input id="documentation-url" placeholder={t("form.documentation-base-url.instruction")} defaultValue="https://example.com/profile/" />
            </div> */}
            <LoadingButton type="submit" loading={loading}>
              {t("form.create-button.name")}
            </LoadingButton>
          </form>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
