
import { InfoIcon } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";


type PopOverGitGeneralComponentProps = {
  children: React.ReactNode;
  moreDetailChildren?: React.ReactNode;
  timeForMoreDetailChildren?: number;   // In ms
}

/**
 * The general component that is used for the popovers (the info "buttons" with hints).
 */
export function PopOverGitGeneralComponent({ children, moreDetailChildren, timeForMoreDetailChildren }: PopOverGitGeneralComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [shouldShowMoreDetailedChildren, setShouldShowMoreDetailedChildren] = useState<boolean>(false);

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => setIsOpen(false);
  const handleClick = () => setIsOpen((prev) => !prev);

    useEffect(() => {
      if (timeForMoreDetailChildren === undefined) {
        return;
      }
      if (!isOpen) {
        return;
      }

      const timer = setTimeout(() => {
        setShouldShowMoreDetailedChildren(true);
      }, timeForMoreDetailChildren);

      return () => {
        clearTimeout(timer);
        setShouldShowMoreDetailedChildren(false);
      };
    }, [isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="w-9 px-0 pb-6 focus-visible:ring-0 focus-visible:ring-offset-0"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
        >
          <InfoIcon />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="md:w-full md-max:w-80 z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
        {(shouldShowMoreDetailedChildren || timeForMoreDetailChildren === undefined) ?
          null : <p><br/>More detail will be shown in {Math.ceil(timeForMoreDetailChildren / 1000)} seconds</p>
        }
        {shouldShowMoreDetailedChildren ? moreDetailChildren : null}
      </PopoverContent>
    </Popover>
  );
}
