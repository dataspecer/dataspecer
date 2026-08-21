import { useCallback, useMemo, useState } from "react";

import {
  Save, LogOut, ChevronDown, Plus, Pencil, Trash2, Check, Settings2,
  FileDown, Sun, Moon, MoonStar, Monitor, Languages,
} from "lucide-react";
import { Button } from "@user-interface/ui/button";
import { Separator } from "@user-interface/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@user-interface/ui/dropdown-menu";
import { cn } from "@user-interface/lib/utils";
import { useTheme } from "@user-interface/theme-provider";
import {
  createEmptyHeaderState,
  updateHeaderStateWithCmePackage,
} from "./header-state";
import { CmePackageEvent } from "../../features/package-model";
import { useLabelSelector } from "../../infrastructure/i18n";
import { createHeaderPresenter } from "./header-presenter";
import { useCmeCommandExecutor } from "../../core/cme-command";
import { useGuarderCmeProviders } from "../../core/cme-provider";
import {
  isCmePackageEvent
} from "../../features/package-model/cme-package-provider";

export function Header(props: {
  activeVisualModel: string | null,
}) {
  const labelSelector = useLabelSelector();

  const commandExecutor = useCmeCommandExecutor();

  const { theme, setTheme } = useTheme();

  const [state, setState] = useState(createEmptyHeaderState);

  const updateState = useCallback((value: CmePackageEvent) =>
    setState(previous => updateHeaderStateWithCmePackage(
      previous, value)),
    [setState]);

  useGuarderCmeProviders(isCmePackageEvent, updateState);

  const visualModel = state.visualModels
    .find(item => item.id === props.activeVisualModel) ?? null;

  const presenter = useMemo(
    () => createHeaderPresenter(commandExecutor),
    [commandExecutor]);

  // Rendering section ...

  return (
    <header className="flex h-14 w-full shrink-0 items-center gap-3 border-b bg-background px-4 text-sm">

      {/* Logo */}
      <div className="flex shrink-0 items-center gap-1.5 pr-3">
        <span className="text-xl font-bold leading-none tracking-tight text-foreground">
          Dataspecer
        </span>
        <div className="text-[15px] font-semibold text-[#ff5964]">cme</div>
      </div>

      <Separator orientation="vertical" />

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
              {visualModel === null ? "---" :
                labelSelector.langString(visualModel.label)}
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
                  onClick={() => presenter.onSetActiveVisualModel(item.id)}
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
                      onClick={() => presenter.onEditVisualModel(item.id)}
                      className="rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label={`Rename ${labelSelector.langString(item.label)}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => presenter.onDeleteVisualModel(item.id)}
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
          onClick={presenter.onCreateVisualModel}
          aria-label="Add view"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Separator orientation="vertical" />

      {/* Save actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Button
          variant="outline" size="sm"
          className="gap-1.5"
          onClick={presenter.onSave}
        >
          <Save className="h-3.5 w-3.5" />
          Save
        </Button>
        <Button
          variant="outline" size="sm"
          onClick={presenter.onSaveAndClose}
        >
          <LogOut className="h-3.5 w-3.5" />
          Save and leave
        </Button>
      </div>

      <div className="flex-1" />

      {/* Language toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="sm" className="shrink-0 gap-1.5 px-2" />}
        >
          <Languages className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-medium">{labelSelector.t(labelSelector.language)}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          {labelSelector.languages.map((item) => (
            <DropdownMenuItem
              key={item}
              onClick={() => labelSelector.setLanguage(item)}
              className="justify-between"
            >
              {labelSelector.t(item)}
              {item === labelSelector.language
                ? <Check className="h-3.5 w-3.5 text-violet-600" />
                : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Theme toggle */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Theme" />
          }
        >
          {theme === "dark" ? <Moon className="h-4 w-4" />
            : theme === "light" ? <Sun className="h-4 w-4" />
              : <MoonStar className="h-4 w-4" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-between"
              onClick={() => setTheme("light")}
            >
              <span className="flex items-center gap-2">
                <Sun className="h-3.5 w-3.5 text-muted-foreground" />
                Light
              </span>
              {theme === "light" ? <Check className="h-3.5 w-3.5 text-violet-600" /> : null}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="justify-between"
              onClick={() => setTheme("dark")}
            >
              <span className="flex items-center gap-2">
                <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                Dark
              </span>
              {theme === "dark" ? <Check className="h-3.5 w-3.5 text-violet-600" /> : null}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="justify-between"
              onClick={() => setTheme("system")}
            >
              <span className="flex items-center gap-2">
                <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
                System
              </span>
              {theme === "system" ? <Check className="h-3.5 w-3.5 text-violet-600" /> : null}
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Export menu */}
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
            <DropdownMenuItem
              className="gap-2"
              onClick={() => presenter.onExport("svg")}
            >
              <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              Export SVG
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={() => presenter.onExport("rdfs/owl")}
            >
              <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              Export RDFS/OWL
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={() => presenter.onExport("dsv")}
            >
              <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              Export DSV
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2"
              onClick={() => presenter.onExport("shacl")}
            >
              <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              Export SHACL
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
