// Generated using copilot

import React, { createContext, useContext, useState } from "react";
import { startGitManagerInitialTour } from "../components/driver-tutorial-tours/manager-git-initial-tutorial-tour";
import type { ReactNode } from "react";
import { startGitManagerMergeStatesAndGitActionsTour } from "@/components/driver-tutorial-tours/manager-git-actions-and-merge-states-tour";


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
    setManagerTourStep(0);
    switch(managerTourType) {
      case ManagerTourType.None:
        break;
      case ManagerTourType.GitInitial:
        startGitManagerInitialTour(t, setManagerTourStep, () => {
          setManagerGitTourType(ManagerTourType.None);
          setManagerTourStep(0);
        });
        break;
      case ManagerTourType.GitMergeStatesAndActions:
        startGitManagerMergeStatesAndGitActionsTour(t, setManagerTourStep, () => {
          setManagerGitTourType(ManagerTourType.None);
          setManagerTourStep(0);
        });
        break;
      default:
        throw new Error(`Programmer error, unknown manager tour type - ${managerTourType}`)
    }
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
