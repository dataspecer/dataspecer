import { FileDown, LogOut, Save, Settings2 } from "lucide-react";

import { Button } from "@user-interface/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@user-interface/ui/dropdown-menu";

import { useCmeCommandExecutor } from "../../core/cme-command";
import {
  savePackageAndCloseCommand,
  savePackageCommand,
} from "./commands";

type ExportType = "svg" | "rdfs/owl" | "dsv" | "shacl";

/**
 * Save / export action cluster contributed to the header "end" slot. Owned by
 * this feature because it names concrete commands; the shell only positions it.
 */
export function ApplicationHeaderActions() {
  const commandExecutor = useCmeCommandExecutor();

  const onSave = () =>
    commandExecutor.execute(savePackageCommand());

  const onSaveAndClose = () =>
    commandExecutor.execute(savePackageAndCloseCommand());

  const onExport = (_type: ExportType) => {
    // TODO Should be replaced with a dialog.
  };

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Button
        variant="outline" size="sm"
        className="gap-1.5"
        onClick={onSave}
      >
        <Save className="h-3.5 w-3.5" />
        Save
      </Button>
      <Button
        variant="outline" size="sm"
        onClick={onSaveAndClose}
      >
        <LogOut className="h-3.5 w-3.5" />
        Save and leave
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Export" />
          }
        >
          <Settings2 className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Export</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" onClick={() => onExport("svg")}>
              <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              Export SVG
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => onExport("rdfs/owl")}>
              <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              Export RDFS/OWL
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => onExport("dsv")}>
              <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              Export DSV
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2" onClick={() => onExport("shacl")}>
              <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              Export SHACL
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
