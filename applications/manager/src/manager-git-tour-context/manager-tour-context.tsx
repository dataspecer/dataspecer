// Generated using copilot

import React, { createContext, useContext, useState } from "react";
import { startGitManagerInitialTour } from "../components/driver-tutorial-tours/manager-git-initial-tutorial-tour";
import type { ReactNode } from "react";


export enum ManagerTourType {
  None,
  GitInitial,
  GitMergeStatesAndActions
}


type ManagerTourApi = {
  startManagerTour: (t: any, managerTourType: ManagerTourType) => void;
  managerGitTourType: ManagerTourType;
  managerTourStep: number;
  setManagerTourStep: React.Dispatch<React.SetStateAction<number>>;
};

const ManagerTourContext = createContext<ManagerTourApi | undefined>(undefined);

export const ManagerTourProvider = ({ children }: { children: ReactNode }) => {
  const [managerGitTourType, setManagerGitTourType] = useState<ManagerTourType>(ManagerTourType.None);
  const [managerTourStep, setManagerTourStep] = useState(0);

  const startManagerTourWrapper = (t: any, managerTourType: ManagerTourType) => {
    setManagerGitTourType(managerTourType);
    startGitManagerInitialTour(t, setManagerTourStep, () => {
      setManagerGitTourType(ManagerTourType.None);
      setManagerTourStep(0);
    });
  };

  return (
    <ManagerTourContext.Provider value={{ startManagerTour: startManagerTourWrapper, managerTourStep, setManagerTourStep, managerGitTourType }}>
      {children}
    </ManagerTourContext.Provider>
  );
};

export const useManagerTour = () => {
  const ctx = useContext(ManagerTourContext);
  if (!ctx) {
    throw new Error("useManagerTour must be used within ManagerTourProvider");
  }
  return ctx;
};
