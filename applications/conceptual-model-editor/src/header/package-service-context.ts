import { useEffect, useState } from "react";

import { type Package } from "@dataspecer/core-v2/project";

import { useQueryParamsContext } from "../context/query-params-context";
import { packageService } from "./package-service";

export interface UsePackageServiceType {
  /**
   * Identifier of the current package.
   */
  currentPackageIdentifier: string | null;
  /**
   * Current package.
   */
  currentPackage: Package | null;
}

/**
 * Expose PackageService using a context.
 */
export const usePackageService = (): UsePackageServiceType => {
  const { packageId } = useQueryParamsContext();
  const [currentPackage, setCurrentPackage] = useState<Package | null>(null);

  useEffect(() => fetchCurrentPackage(packageId, setCurrentPackage), [packageId]);

  return {
    currentPackageIdentifier: packageId,
    currentPackage,
  };
};

const fetchCurrentPackage = (
  packageId: string | null,
  setCurrentPackage: (nextPackage: Package | null) => void,
): void => {
  if (packageId === null) {
    return;
  }
  void (async () => {
    const nextPackage = await packageService.getPackage(packageId);
    setCurrentPackage(nextPackage);
  })();
};
