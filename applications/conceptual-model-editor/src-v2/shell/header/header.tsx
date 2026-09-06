import {
  Check, Sun, Moon, MoonStar, Monitor, Languages, ChevronDown,
} from "lucide-react";
import { Button } from "@user-interface/ui/button";
import { Separator } from "@user-interface/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@user-interface/ui/dropdown-menu";
import { useTheme } from "@user-interface/theme-provider";
import { useLabelSelector } from "../../infrastructure/i18n";
import {
  HeaderRegionContribution, HeaderRegionSlot, headerRegionRegistry,
} from "../../core/header";

export function Header(props: {
  activeVisualModel: string | null,
}) {
  const labelSelector = useLabelSelector();

  const { theme, setTheme } = useTheme();

  const regions = headerRegionRegistry.list();
  const startRegions = regionsForSlot(regions, "start");
  const endRegions = regionsForSlot(regions, "end");

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

      {/* Feature-contributed regions, next to the logo. */}
      {startRegions.map(contribution => (
        <contribution.component
          key={contribution.id}
          activeVisualModel={props.activeVisualModel}
        />
      ))}

      <Separator orientation="vertical" />

      {/* Feature-contributed action regions (save, export, ...). */}
      {endRegions.map(contribution => (
        <contribution.component
          key={contribution.id}
          activeVisualModel={props.activeVisualModel}
        />
      ))}

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
    </header>
  );
}

function regionsForSlot(
  regions: HeaderRegionContribution[],
  slot: HeaderRegionSlot,
): HeaderRegionContribution[] {
  return regions
    .filter(region => (region.slot ?? "start") === slot)
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));
}
