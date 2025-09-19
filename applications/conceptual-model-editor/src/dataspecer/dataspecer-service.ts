import { EntityModel } from "@dataspecer/core-v2";
import { BackendPackageService } from "@dataspecer/core-v2/project";
import { VisualModel } from "@dataspecer/visual-model";
import { httpFetch } from "@dataspecer/core/io/fetch/fetch-browser";

// We keep one instance-wide copy of backend service.
const BACKEND_URL = import.meta.env.VITE_PUBLIC_APP_BACKEND!;
const dataspecer = new BackendPackageService(BACKEND_URL, httpFetch)

export function loadPackageModels(packageIdentifier: string) {
  return dataspecer.constructSemanticModelPackageModels(packageIdentifier);
}

export function savePackageModels(
  packageIdentifier: string,
  semanticModels: EntityModel[],
  visualModels: VisualModel[]) {
  return dataspecer.updateSemanticModelPackageModels(
    packageIdentifier, semanticModels, visualModels);
}
