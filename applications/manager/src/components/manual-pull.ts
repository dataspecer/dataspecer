// TODO RadStr: Maybe put somewhere else, this directory might be for .tsx

import { requestLoadPackage } from "@/package";
import { toast } from "sonner";

export async function manualPull(iri: string) {
  const fetchUrl = import.meta.env.VITE_BACKEND + "/git/pull?iri=" + encodeURIComponent(iri);

  const response = await fetch(fetchUrl, {
    method: "GET",
  });


  if (response.ok) {
    toast.success("git pull went ok, there were no conflicts");
  }
  else {
    toast.error("There were conflicts in the git pull, resolve them in DS");
  }
  requestLoadPackage(iri, true);
}