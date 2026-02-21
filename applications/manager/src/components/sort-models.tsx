import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown01, ArrowDown10, ArrowDownAZ, ArrowDownZA } from "lucide-react";
import React, { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from 'usehooks-ts'

export const sortByOptions = {
  "name-az": {
    id: "name-az",
    icon: ArrowDownAZ,
  },
  "name-za": {
    id: "name-za",
    icon: ArrowDownZA,
  },
  "modification-new-first": {
    id: "modification-new-first",
    icon: ArrowDown10,
  },
  "modification-old-first": {
    id: "modification-old-first",
    icon: ArrowDown01,
  },
  "creation-new-first": {
    id: "creation-new-first",
    icon: ArrowDown10,
  },
  "creation-old-first": {
    id: "creation-old-first",
    icon: ArrowDown01,
  },
};

// For i18next parser
// t("name-az")
// t("name-za")
// t("modification-new-first")
// t("modification-old-first")
// t("creation-new-first")
// t("creation-old-first")

const sortByOptionsMenu = [
  "name-az",
  "name-za",
  null,
  "modification-new-first",
  "modification-old-first",
  null,
  "creation-new-first",
  "creation-old-first",
];

export const SortModelsContext = React.createContext<{
  selectedOption: keyof typeof sortByOptions;
  setSelectedOption: React.Dispatch<React.SetStateAction<keyof typeof sortByOptions>>;
}>(null as any);

const useSortModelsContext = () => {
  const [selectedOption, setSelectedOption] = useLocalStorage('sort-models-by', "modification-new-first" as keyof typeof sortByOptions);
  return {selectedOption, setSelectedOption};
}

export const SortModelsProvider: React.FC<PropsWithChildren> = ({children}) => {
  const {selectedOption, setSelectedOption} = useSortModelsContext();
  return <SortModelsContext.Provider value={{selectedOption, setSelectedOption}}>{children}</SortModelsContext.Provider>;
}

export function SortModels() {
  const {t} = useTranslation("default", {keyPrefix: "sort-models"});
  const {selectedOption, setSelectedOption} = React.useContext(SortModelsContext);

  const selected = sortByOptions[selectedOption]!;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="">
          <selected.icon className="h-[1.2rem] w-[1.2rem]" />
          <span className="ml-2">{t(selected.id)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortByOptionsMenu.map(option => {
          if (!option) return <DropdownMenuSeparator />;
          const Icon = sortByOptions[option as keyof typeof sortByOptions]?.icon!;
          return <DropdownMenuItem key={option} onClick={() => setSelectedOption(option as keyof typeof sortByOptions)}>
            <Icon className="h-[1.2rem] w-[1.2rem]" />
            <span className="ml-2">{t(option)}</span>
          </DropdownMenuItem>
         })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
