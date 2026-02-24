import { RequiredFieldsPartialMap } from "@/dialog/set-git-remote-configuration-dialog";
import { useMemo, useRef, RefObject } from "react";

type UseRequiredFieldsForGitConfigReturnType = {
  publicationBranchRef: RefObject<HTMLInputElement | null>;
  requiredGitConfigFieldsMap: RequiredFieldsPartialMap;
}

export function useRequiredFieldsForGitConfig(): UseRequiredFieldsForGitConfigReturnType {
  const publicationBranchRef = useRef<HTMLInputElement | null>(null);

  const requiredGitConfigFieldsMap: RequiredFieldsPartialMap = useMemo(() => {
    return {
      publicationBranch: publicationBranchRef,
    };
  }, []);

  return {
    publicationBranchRef,
    requiredGitConfigFieldsMap,
  };
}