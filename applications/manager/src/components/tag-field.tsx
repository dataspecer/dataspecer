import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";

export function TagField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2">
      <Label htmlFor="tags">{t("tags")}</Label>
      <Input id="tags" name="tags" value={value} onChange={(event) => onChange(event.target.value)} placeholder={t("tags-instruction")} />
    </div>
  );
}

export function parseTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  );
}
