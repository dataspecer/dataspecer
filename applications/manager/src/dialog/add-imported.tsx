import { Modal, ModalBody, ModalContent, ModalHeader, ModalTitle } from "@/components/modal";
import { LoadingButton } from "@/components/ui/button";
import { CardDescription } from "@/components/ui/card";
import { Dropzone } from "@/components/ui/dropzone";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { BetterModalProps } from "@/lib/better-modal";
import { requestLoadPackage } from "@/package";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export interface AddImportedProps {
  id: string;
}

enum URLImportType {
  ClassicUrl,
  Git,
};

export const AddImported = ({ id, isOpen, resolve }: AddImportedProps & BetterModalProps<boolean>) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const getURLsToImport: (event: React.FormEvent, relevantFormKey: string) => string[] = (event: React.FormEvent, relevantFormKey: string) => {
    const urls = (event.target as any)[relevantFormKey].value
      .split("\n")
      .map((url: string) => url.trim())
      .filter((url: string) => url.length > 0);

    if (urls.length === 0) {
      setLoading(false);
      return [];
    }

    return urls;
  }

  const importURLs = async (event: React.FormEvent, relevantFormKey: string, importType: URLImportType) => {
    try {
      event.preventDefault();
      event.stopPropagation();
      setLoading(true);

      const urls = getURLsToImport(event, relevantFormKey);
      if (urls.length === 0) {
        return;
      }

      // Import
      const importResults = [];
      for (const url of urls) {
        switch(importType) {
          case URLImportType.ClassicUrl:
            importResults.push(
              await fetch(import.meta.env.VITE_BACKEND + "/resources/import?parentIri=" + encodeURIComponent(id) + "&url=" + encodeURIComponent(url), {
                method: "POST",
              })
            );
            break;
          case URLImportType.Git:
            importResults.push(
              await fetch(import.meta.env.VITE_BACKEND + "/resources/importFromGit?parentIri=" + encodeURIComponent(id) + "&gitURL=" + encodeURIComponent(url), {
                method: "POST",
              })
            );
            break;
          default:
            console.error("Forgot to add new type of import, programmer error");
            setLoading(false);
            return;
        }
      }

      await requestLoadPackage(id, true);

      if (importResults.every((r) => r.ok)) {
        toast.success(t("add-imported.success"));
      } else {
        toast.error(t("add-imported.error"));
      }

      resolve(true);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  }

  const urlsSubmit = async (event: React.FormEvent) => {
    await importURLs(event, "url", URLImportType.ClassicUrl);
  };

  const fileSubmit = async (file: File) => {
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    const result = await fetch(import.meta.env.VITE_BACKEND + "/resources/import-zip", {
      method: "POST",
      body: formData,
    });

    if (result.ok) {
      toast.success(t("add-imported.success"));
      requestLoadPackage("http://dataspecer.com/packages/local-root", true);
      resolve(true);
    } else {
      toast.error(t("add-imported.error"));
    }

    setLoading(false);
  };

  const gitLinksSubmit = async (event: React.FormEvent) => {
    await importURLs(event, "git-url", URLImportType.Git);
  };

  return (
    <Modal open={isOpen} onClose={() => (loading ? null : resolve(false))}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("add-imported.title")}</ModalTitle>
        </ModalHeader>
        <ModalBody className="mt-auto flex flex-col gap-2 p-4">
          <Tabs defaultValue="account">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="URL">URL</TabsTrigger>
              <TabsTrigger value="git-URL">Git URL</TabsTrigger>
              <TabsTrigger value="file">File</TabsTrigger>
            </TabsList>
            <TabsContent value="URL">
              <form className="grid gap-4 mt-4" onSubmit={urlsSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="url">
                    {t("form.url.name")}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea id="url" placeholder={t("form.url.instruction")} required />
                </div>

                <LoadingButton type="submit" loading={loading}>
                  {t("add-imported.import")}
                </LoadingButton>
              </form>
            </TabsContent>
            <TabsContent value="git-URL">
              <form className="grid gap-4 mt-4" onSubmit={gitLinksSubmit}>
                <div className="grid gap-2">
                  <Label htmlFor="git-url">
                    {t("form.git-url.name")}
                    <span className="text-red-500">*</span>
                  </Label>
                  <Textarea id="git-url" placeholder={t("form.git-url.instruction")} required />
                </div>

                <LoadingButton type="submit" loading={loading}>
                  {t("add-imported.import")}
                </LoadingButton>
              </form>
            </TabsContent>
            <TabsContent value="file">
              <CardDescription className="">Use this dialog to drop ZIP file with file exported from Dataspecer.</CardDescription>
              <CardDescription className="mb-2 text-red-700">This is still an experimental feature. The imported package must not exists otherwise the import fails. The import/export functionality cannot be used to create copies, only backups.</CardDescription>
              <Dropzone
                accept={{
                  "application/zip": [],
                  "application/x-zip-compressed": [],
                }}
                isLoading={loading}
                maxFiles={1}
                onDrop={(files) => fileSubmit(files[0])}
              />
            </TabsContent>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
