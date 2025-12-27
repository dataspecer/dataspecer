import { toast } from "sonner";

export function gitOperationResultToast(response: Response) {
  if (response.ok) {
    toast.success("Git operation was successful");
  }
  else {
    toast.error("Git operation failed");
  }
}
