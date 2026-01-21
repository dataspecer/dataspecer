import { Languages } from "lucide-react";

import { Button } from "@/user-interface/shadcn/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/user-interface/shadcn/dropdown-menu";
import { useUiLanguage } from "@/application/ui-language-provider";

export function UiLanguageToggle() {
  const { setUiLanguage } = useUiLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Toggle UI language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setUiLanguage("en")}>
          English
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setUiLanguage("cs")}>
          Čeština
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
