// Generated using copilot

import React, { createContext, useContext, useState } from "react";
import { startManagerTour } from "../components/driver-tutorial-tours/manager-git-tutorial-tour";
import type { ReactNode } from "react";

type ManagerTourApi = {
  startManagerTour: (t: any) => void;
  isManagerTourOn: boolean;
  managerTourStep: number;
  setManagerTourStep: React.Dispatch<React.SetStateAction<number>>;
};

const ManagerTourContext = createContext<ManagerTourApi | undefined>(undefined);

export const ManagerTourProvider = ({ children }: { children: ReactNode }) => {
  const [isManagerTourOn, setIsManagerTourOn] = useState(false);
  const [managerTourStep, setManagerTourStep] = useState(0);

  const startManagerTourWrapper = (t: any) => {
    setIsManagerTourOn(true);
    startManagerTour(t, setManagerTourStep, () => {
      setIsManagerTourOn(false);
      setManagerTourStep(0);
    });
  };

  return (
    <ManagerTourContext.Provider value={{ startManagerTour: startManagerTourWrapper, isManagerTourOn, managerTourStep, setManagerTourStep }}>
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
