import { Dispatch, SetStateAction, useEffect, useState } from "react";

export type MergeActorsType = {
  mergeFrom: string | null;
  setMergeFrom: Dispatch<SetStateAction<string | null>>;
  mergeTo: string | null;
  setMergeTo: Dispatch<SetStateAction<string | null>>;
  isChoosingMergeTo: boolean;
};

export type MergeActor = {
  iri: string;
  isBranch: boolean;
} | null;

/**
 * @deprecated It works, however we use simple dialog where we choose the merge from package, instead of setting it all within the manager's main page.
 */
export const useMergeActors: (() => MergeActorsType) = () => {
  const [mergeFrom, setMergeFrom] = useState<string | null>(null);
  const [mergeTo, setMergeTo] = useState<string | null>(null);
  const [isChoosingMergeTo, setIsChoosingMergeTo] = useState<boolean>(false);

  useEffect(() => {
    if (mergeFrom === null) {
      setIsChoosingMergeTo(false);
    }
    else {
      setIsChoosingMergeTo(true);
    }
  }, [mergeFrom]);

  useEffect(() => {
    setIsChoosingMergeTo(false);
  }, [mergeTo]);

  return {
    mergeFrom, setMergeFrom,
    mergeTo, setMergeTo,
    isChoosingMergeTo,
  };
};