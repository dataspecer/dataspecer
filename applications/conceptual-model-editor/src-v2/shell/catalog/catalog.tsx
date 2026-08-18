import { useCallback, useEffect, useMemo, useState } from "react";
import { List, AutoSizer } from "react-virtualized";
import { useCmeProviders } from "../../core/cme-provider";
import { CmeProviderEvent } from "../../core/cme-provider/cme-provider";
import { CatalogItem } from "../../core/catalog/catalog-model";
import { catalogItemRegistry } from "../../core/catalog";
import { useLogger } from "../../infrastructure/logger";
import { LabelSelector, useLabelSelector } from "../../infrastructure/i18n";
import { useApplicationState } from "../../core/application/application-react";
import { SelectedEntity } from "../../core/application/application-state";
import {
  CaseSensitive, CheckSquare, ChevronDown, ChevronRight, Copy, LucideIcon,
  MoreHorizontal, Search, Square, WholeWord, X,
} from "lucide-react";

export function Catalog() {

  const logger = useLogger();

  const labelsSelector = useLabelSelector();

  const [items, setItems] = useState<CatalogItem[]>([]);

  const [selection, setSelection] = useState<SelectedEntity[]>([]);

  //
  // Instantiate registered item providers and use them to collect entities.
  //

  const providers = useMemo(
    () => catalogItemRegistry.list().map(item => item.createCatalogItemSource({ logger })),
    [logger]);

  const updateState = useCallback((event: CmeProviderEvent) => {
    for (const provider of providers) {
      const { created, changed, removed } = provider.onProviderDidChange(event);
      // TODO Temporary implementation by AI.
      if (created.length === 0 && changed.length === 0 && removed.length === 0) {
        continue;
      }
      setItems(previous => {
        const updatedAndRemoved = new Set([
          ...changed.map(item => item.identifier),
          ...removed,
        ]);
        const items = previous.filter(item => !updatedAndRemoved.has(item.identifier));
        items.push(...created, ...changed);
        return items;
      });
      //
    }
  }, [providers, setItems]);

  useCmeProviders(updateState);

  //
  // React to changes from application.
  //

  const application = useApplicationState();
  useEffect(
    () => setSelection(application.state.selection),
    [setSelection, application])

  //
  // React to click event.
  //

  const selectionApi = application.selectionApi;
  const onClick = useCallback((event: any) => {
    // Get the item user clicked to.
    let index: number | undefined = undefined;
    let target = event.target;
    do {
      index = target.dataset.index;
      if (index !== undefined) {
        break;
      }
      target = target.parentElement;
    } while (target !== undefined);
    //
    if (index === undefined) {
      return;
    }
    //
    const item = items[index];
    if (event.shiftKey) {
      selectionApi.toggleWithShift(item.model, item.entityIdentifier);
    } else {
      selectionApi.toggle(item.model, item.entityIdentifier);
    }
  }, [items, selectionApi]);

  //
  //
  //

  const rowRenderer = (props: any) =>
    renderCatalogItem(labelsSelector, items, selection, props);

  //

  const [query, setQuery] = useState("");
  // Active search options.
  const [searchOptions, setSearchOptions] = useState(new Set());
  // Search filters.
  const [activeFilters, setActiveFilters] = useState(new Set(["class", "profile"]));

  const SEARCH_OPTIONS = [
    { key: "caseSensitive", icon: CaseSensitive, label: "Match case" },
    { key: "wholeWord", icon: WholeWord, label: "Match whole word" },
  ];

  // TODO Accent colors are hardcoded hex values tuned for dark mode; provide separate light/dark variants.
  const FILTERS = {
    class: { icon: Square, accent: "#f2b84b", label: "Class" },
    profile: { icon: Copy, accent: "#c084fc", label: "Profile" }
  };

  const toggleSearchOption = (key: string) => setSearchOptions((prev) => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const toggleFilter = (type: string) => setActiveFilters((prev) => {
    const next = new Set(prev);
    next.has(type) ? next.delete(type) : next.add(type);
    return next;
  });

  selection

  return (
    <div className="flex h-full w-full flex-col overflow-hidden border-r border-border bg-background font-sans text-foreground">
      {/* Toolbar */}
      <div className="flex flex-col gap-2 border-b border-border px-3 py-2.5">
        {/* Query search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={13}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search catalog…"
              style={{ paddingRight: query ? 116 : 92 }}
              className="w-full rounded-md border border-border bg-muted/40 py-1.5 pl-7 text-[12.5px] text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
            />
            <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
              {query && (
                <>
                  <button
                    onClick={() => setQuery("")}
                    className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    <X size={13} />
                  </button>
                  <span className="mx-0.5 h-4 w-px bg-border" />
                </>
              )}
              {SEARCH_OPTIONS.map(({ key, icon: Icon, label }) => {
                const active = searchOptions.has(key);
                return (
                  <button
                    key={key}
                    type="button"
                    title={`${label} (placeholder)`}
                    onClick={() => toggleSearchOption(key)}
                    className={[
                      "flex h-5 w-5 items-center justify-center rounded border text-[11px]",
                      active
                        ? "border-ring bg-accent text-accent-foreground"
                        : "border-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    ].join(" ")}
                  >
                    <Icon size={13} strokeWidth={2} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-1.5">
          {Object.entries(FILTERS).map(([id, filter]) => {
            const Icon = filter.icon;
            const active = activeFilters.has(id);
            return (
              <button
                key={id}
                onClick={() => toggleFilter(id)}
                className={[
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] transition-colors",
                  active
                    ? "border-ring bg-accent text-accent-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {/* TODO Filter accent colors are hardcoded hex values (see FILTERS below); provide separate light/dark variants. */}
                <Icon size={11} style={{ color: active ? filter.accent : undefined }} />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>
      {/* Bulk selection bar. */}
      <div
        className={[
          "flex items-center justify-between border-b px-3 py-1.5 text-[12px] transition-colors",
          selection.length > 0
            ? "border-border bg-destructive/5"
            : "border-border bg-background",
        ].join(" ")}
      >
        <span className={selection.length > 0 ? "text-foreground" : "text-muted-foreground"}>
          {selection.length > 0 ? `${selection.length} selected` : "No items selected"}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => selectionApi.set([])}
            disabled={selection.length === 0}
            className="text-muted-foreground hover:text-foreground disabled:cursor-default disabled:opacity-50 disabled:hover:text-muted-foreground"
          >
            Deselect all
          </button>
          {/* We can add action here . */}
        </div>
      </div>
      {/* Items */}
      <div onClick={onClick} className="h-full relative flex-1 overflow-y-auto">
        <AutoSizer>
          {({ width, height }) => (
            <List
              height={height}
              rowCount={items.length}
              rowHeight={48}
              rowRenderer={rowRenderer}
              width={width}
            />
          )}
        </AutoSizer>
      </div>
    </div>
  )
}

function renderCatalogItem(
  labelsSelector: LabelSelector,
  /**
   * Full state of the catalog to draw items from.
   */
  items: CatalogItem[],
  /**
   * Active selection.
   */
  selection: SelectedEntity[],
  /**
   * Properties from the React virtualized library.
   */
  props: {
    /**
     * Unique key within array of rows.
     */
    key: string,
    /**
     * Index of row within collection.
     */
    index: number,
    /**
     * The List is currently being scrolled.
     */
    isScrolling: boolean,
    /**
     * This row is visible within the List, e.g. it is not an over-scanned row.
     */
    isVisible: boolean,
    /**
     * Style object to be applied to row to position it.
     */
    style: React.CSSProperties;
  },) {
  // Grab the item we need to render.
  const item = items[props.index];
  const itemType = item.type;

  // Compute derived state.
  const isSelected = selection.find(selected =>
    selected.model === item.model && selected.entity === item.entityIdentifier)
    !== undefined;

  const isHighlighted = false;

  // Prepare for rendering.
  const style: Record<string, any> = {
    ...props.style,
    // backgroundColor: isSelected ? "blue" : undefined
  };

  const hasChildren = true;
  const isCollapsed = true;

  const TypeIcon: LucideIcon = itemType.icon;

  return (
    <div
      key={props.key}
      style={style}
      data-index={props.index}
      className={[
        "group flex items-center gap-1.5 pr-2 border-l-2 cursor-default select-none",
        isSelected
          ? "bg-destructive/10 border-l-destructive"
          : isHighlighted
            ? "bg-amber-400/10 border-l-transparent"
            : "border-l-transparent hover:bg-accent/60",
      ].join(" ")}
    >
      {/* Expand caret. */}
      <button
        type="button"
        onClick={(event) => {
          // TODO : toggle collapse
        }}
        className="flex h-5 w-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {hasChildren ?
          (isCollapsed ?
            <ChevronRight size={13} /> :
            <ChevronDown size={13} />)
          : null}
      </button>
      {/* Selection checkbox. */}
      <button
        type="button"
        onClick={(e) => {
          // TODO : update selection
        }}
        className="flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {isSelected ?
          <CheckSquare size={14} className="text-destructive" /> :
          <Square size={14} />}
      </button>
      {/* Type icon */}
      {/* TODO typeAccent is a hardcoded hex value (see below); provide separate light/dark variants. */}
      <span
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
        style={{ color: itemType.iconColor }}
      >
        <TypeIcon size={13} strokeWidth={2} />
      </span>
      {/* Label */}
      <div className="flex min-w-0 flex-1 items-baseline gap-2 truncate text-[13px]">
        {labelsSelector.langString(item.label)}
      </div>
      {/* Actions */}
      <div className="flex shrink-0 items-center gap-0.5">
        {/* TODO Pinned actions here ! */}
        <button
          type="button"
          onClick={(event) => {
            // Show more !
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>
    </div>
  )
}

function ActionButton(props: {

}) {
  const definition: any = undefined;
  if (definition === undefined) {
    return null;
  }
  const Icon = definition.icon;
  return (
    <button
      type="button"
      title={definition.label}
      className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  );
}
