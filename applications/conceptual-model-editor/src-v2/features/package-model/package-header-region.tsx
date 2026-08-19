import { useCallback, useState } from "react";
import { ChevronDown, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { ModelIdentifier } from "@dataspecer/core/model";

import { Button } from "@user-interface/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@user-interface/ui/dropdown-menu";
import { cn } from "@user-interface/lib/utils";

import { useLabelSelector } from "../../infrastructure/i18n";
import { useCmeCommandExecutor, } from "../../core/cme-command";
import { useGuarderCmeProviders } from "../../core/cme-provider";
import { HeaderRegionProps } from "../../core/header";
import { LanguageString } from "../../shared/types";
import {
  CmeModelMetadata, CmePackageStateEvent, isCmePackageStateEvent
} from "./cme-package-provider";
import { setActiveVisualModelCommand } from "../../application/commands";

/**
 * TODO : This needs to be refactored into model, view, presenter design pattern.
 */
export function PackageHeaderRegion(props: HeaderRegionProps) {
  const labelSelector = useLabelSelector();
  const commandExecutor = useCmeCommandExecutor();

  const [state, setState] = useState(createEmptyState);

  const onEvent = useCallback((event: CmePackageStateEvent) => setState({
    packageLabel: event.package.label,
    visualModels: event.visualModels,
  }), [setState]);

  useGuarderCmeProviders(isCmePackageStateEvent, onEvent);

  const activeVisualModel = state.visualModels
    .find(item => item.id === props.activeVisualModel) ?? null;

  const onSetActiveVisualModel = (identifier: ModelIdentifier) =>
    commandExecutor.execute(setActiveVisualModelCommand({
      visualModel: identifier,
    }));

  const onCreateVisualModel = () => {
    // TODO
  };

  const onEditVisualModel = (_identifier: ModelIdentifier) => {
    // TODO
  };

  const onDeleteVisualModel = (_identifier: ModelIdentifier) => {
    // TODO
  };

  return (
    <>
      {/* Package info */}
      <div className="flex min-w-0 items-baseline gap-1.5 pl-1">
        <span className="shrink-0 text-muted-foreground">Package</span>
        <span className="truncate font-medium text-foreground">
          {labelSelector.langString(state.packageLabel)}
        </span>
      </div>

      {/* View selector */}
      <div className="flex shrink-0 items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="sm" className="gap-1.5 px-2" />}
          >
            <span className="text-muted-foreground">View</span>
            <span className="font-medium">
              {activeVisualModel === null ? "---" :
                labelSelector.langString(activeVisualModel.label)}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Visual models</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {state.visualModels.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  onClick={() => onSetActiveVisualModel(item.id)}
                  className={cn(
                    "group flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent",
                    item.id === props.activeVisualModel && "bg-accent/60"
                  )}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-violet-600",
                      item.id !== props.activeVisualModel && "opacity-0"
                    )}
                  />
                  {labelSelector.langString(item.label)}
                  <div className="flex-1" />
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      onClick={() => onEditVisualModel(item.id)}
                      className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Rename ${labelSelector.langString(item.label)}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteVisualModel(item.id)}
                      className="rounded-sm p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Remove ${labelSelector.langString(item.label)}`}
                      disabled={state.visualModels.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onCreateVisualModel}
          aria-label="Add view"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}

function createEmptyState(): PackageHeaderRegionState {
  return {
    packageLabel: {},
    visualModels: [],
  };
}

interface PackageHeaderRegionState {

  packageLabel: LanguageString;

  visualModels: CmeModelMetadata[];

}
