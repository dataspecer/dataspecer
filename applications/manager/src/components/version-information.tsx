import { useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { Github } from "./github-link";

const commit: string | null = import.meta.env.VITE_GIT_COMMIT ?? null;
const ref: string | null = import.meta.env.VITE_GIT_REF ?? null;
const date: Date | null = import.meta.env.VITE_GIT_COMMIT_DATE ? new Date(import.meta.env.VITE_GIT_COMMIT_DATE) : null;
const number: number | null = import.meta.env.VITE_GIT_COMMIT_NUMBER ? parseInt(import.meta.env.VITE_GIT_COMMIT_NUMBER) : null;

export function VersionInformation() {
  const {t} = useTranslation();

  const [isOpen, setIsOpen] = useState(false);

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);
  const handleClick = () => setIsOpen((prev) => !prev);

  if (!commit && !ref && !date && !number) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-9 px-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <Info className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Version Information</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Version{ref && `: ${ref}`}</h4>
            {date &&
              <p className="text-sm text-muted-foreground">
                Version from: {t("$datetime", {val: date})}
              </p>
            }
          </div>
          <div className="grid gap-2">
            {number &&
              <div className="grid grid-cols-2 items-center gap-4">
                <span className="text-sm font-medium">Commit number:</span>
                <span className="text-sm">{number}</span>
              </div>
            }
            {commit &&
              <div className="grid grid-cols-2 items-center gap-4">
                <span className="text-sm font-medium">Commit hash:</span>
                <span className="text-sm">
                  <a href={`https://github.com/dataspecer/dataspecer/commit/${commit}`} className="flex items-center" target="_blank">
                    <Github className="h-[.9rem] w-[.9rem] mr-1" />
                    {commit.substring(0, 8)}
                  </a>
                </span>
              </div>
            }
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
