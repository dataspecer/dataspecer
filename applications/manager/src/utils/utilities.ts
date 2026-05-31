import { TFunction } from "i18next";
import { toast } from "sonner";

export function gitOperationResultToast(t: TFunction<"translation", undefined>, response: Response) {
  if (response.ok) {
    toast.success(t("Git operation was successful"));
  }
  else {
    toast.error(t("Git operation failed. Check console for more info."), { "richColors": true });
  }
}
