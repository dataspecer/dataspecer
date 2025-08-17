import { Dispatch, SetStateAction, useEffect, useState } from "react";

export type MergeActorsType = {
  mergeFrom: string | null;
  setMergeFrom: Dispatch<SetStateAction<string | null>>;
  mergeTo: string | null;
  setMergeTo: Dispatch<SetStateAction<string | null>>;
  isChoosingMergeTo: boolean;
};

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