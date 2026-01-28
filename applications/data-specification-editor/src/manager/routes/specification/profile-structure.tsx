import { BackendConnectorContext } from "@/application";
import { Checkbox } from "@/components/ui/checkbox";
import { CloseDialogButton } from "@/editor/components/detail/components/close-dialog-button";
import { dialog } from "@/editor/dialog";
import { useAsyncMemo } from "@/editor/hooks/use-async-memo";
import type { Configuration } from "@/generators/configuration/configuration";
import { getConfiguration } from "@/generators/configuration/provided-configuration";
import { cn } from "@/lib/utils";
import type { DataSpecificationStructure, StructureEditorBackendService } from "@dataspecer/backend-utils/connectors/specification";
import type { ApplicationProfileAggregator } from "@dataspecer/core-v2/hierarchical-semantic-aggregator";
import { V1 } from "@dataspecer/core-v2/model/known-models";
import type { LanguageString } from "@dataspecer/core/core/core-resource";
import { DataPsmSchema } from "@dataspecer/core/data-psm/model/data-psm-schema";
import { createStructureProfile } from "@dataspecer/structure-model/profile";
import { Alert, Button, CircularProgress, DialogActions, DialogContent, DialogTitle } from "@mui/material";
import { ChevronDown, ChevronRight, MinusIcon } from "lucide-react";
import { useContext, useState } from "react";
import { useTranslation } from "react-i18next";
import { SpecificationContext } from "./specification";

interface ProfileStructureDialogProps {
  dataSpecificationId: string;
}

/**
 * Renders a dialog for profiling structure models for the given specification.
 * @todo It reloads all data from the backend instead of using local data.
 */
export const ProfileStructureDialog = dialog<ProfileStructureDialogProps>({ maxWidth: "md", fullWidth: true }, ({ isOpen, close, dataSpecificationId }) => {
  const { t } = useTranslation("ui");

  const [configuration, isLoading] = useAsyncMemo(() => (isOpen ? getConfiguration(dataSpecificationId, "") : null), [dataSpecificationId, isOpen], null);
  const data = configuration ? getStructuresToProfile(configuration) : [];

  const [selectedStructures, setSelectedStructures] = useState<Set<string>>(new Set());

  const backendConnector = useContext(BackendConnectorContext);
  const [specification, updateSpecification] = useContext(SpecificationContext);
  const dataSpecificationIri = specification.id;
  const profile = async () => {
    await profileStructures(Array.from(selectedStructures), dataSpecificationIri, configuration!, backendConnector, (newStructures) => {
      updateSpecification({
        ...specification,
        dataStructures: [...specification.dataStructures, ...newStructures],
      });
    });

    close();
  };
  return (
    <>
      <DialogTitle>
        {t("profile")}
        <CloseDialogButton onClick={close} />
      </DialogTitle>
      <DialogContent>
        <Alert severity="info">
          Select structures you want to profile. First, you need to create a profile of all classes and relations that are used in the selected structures otherwise the profiling
          fails. References between selected structures will be updated to use the newly created structures. References to structures that are not selected will remain unchanged.
        </Alert>

        {isLoading && (
          <div className="flex flex-row mt-[2cm] justify-center">
            <CircularProgress />
          </div>
        )}

        {!isLoading && (
          <div className="todo-mui-reset mt-4">
            <StructuresCheckboxList data={data} selectedStructures={selectedStructures} onSelectionChange={setSelectedStructures} />
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={close} variant="text">
          {t("discard")}
        </Button>
        <Button onClick={profile} color="primary" variant="contained" disabled={selectedStructures.size === 0 || isLoading}>
          {t("profile")}
        </Button>
      </DialogActions>
    </>
  );
});

type StructuresToProfileList = {
  iri: string;
  name: LanguageString;
  description: LanguageString;

  structures: {
    iri: string;

    name: LanguageString;
    description: LanguageString;
  }[];
}[];

function getStructuresToProfile(configuration: Configuration) {
  const result: StructuresToProfileList = [];

  for (const specification of Object.values(configuration.dataSpecifications)) {
    if (specification.dataStructures.length > 0) {
      result.push({
        iri: specification.id,
        name: specification.userMetadata?.label || {},
        description: specification.userMetadata?.description || {},

        structures: specification.dataStructures.map((structure) => ({
          iri: structure.id,
          name: structure.label,
          description: {}, // todo
        })),
      });
    }
  }

  return result;
}

// ----

interface StructuresCheckboxListProps {
  data: StructuresToProfileList;
  selectedStructures: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  language?: string;
  className?: string;
}

// Helper function
function getLocalizedString(langString: LanguageString, language: string): string {
  return langString[language] || langString["en"] || Object.values(langString)[0] || "";
}

export function StructuresCheckboxList({ data, selectedStructures, onSelectionChange, language = "en", className }: StructuresCheckboxListProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set(data.map((group) => group.iri)));

  const toggleGroupExpanded = (groupIri: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupIri)) {
        next.delete(groupIri);
      } else {
        next.add(groupIri);
      }
      return next;
    });
  };

  const getGroupCheckState = (group: StructuresToProfileList[number]): "checked" | "unchecked" | "indeterminate" => {
    const structureIris = group.structures.map((s) => s.iri);
    const selectedCount = structureIris.filter((iri) => selectedStructures.has(iri)).length;

    if (selectedCount === 0) return "unchecked";
    if (selectedCount === structureIris.length) return "checked";
    return "indeterminate";
  };

  const handleGroupToggle = (group: StructuresToProfileList[number]) => {
    const structureIris = group.structures.map((s) => s.iri);
    const currentState = getGroupCheckState(group);
    const newSelected = new Set(selectedStructures);

    if (currentState === "checked") {
      // Uncheck all structures in this group
      structureIris.forEach((iri) => newSelected.delete(iri));
    } else {
      // Check all structures in this group
      structureIris.forEach((iri) => newSelected.add(iri));
    }

    onSelectionChange(newSelected);
  };

  const handleStructureToggle = (structureIri: string) => {
    const newSelected = new Set(selectedStructures);

    if (newSelected.has(structureIri)) {
      newSelected.delete(structureIri);
    } else {
      newSelected.add(structureIri);
    }

    onSelectionChange(newSelected);
  };

  return (
    <div className={cn("space-y-2", className)}>
      {data.map((group) => {
        const isExpanded = expandedGroups.has(group.iri);
        const groupState = getGroupCheckState(group);

        return (
          <div key={group.iri} className="rounded-lg border border-border bg-card">
            {/* Group Header */}
            <div className="flex items-center gap-3 p-3">
              <button
                type="button"
                onClick={() => toggleGroupExpanded(group.iri)}
                className="cursor-pointer flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                aria-label={isExpanded ? "Collapse group" : "Expand group"}
              >
                {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>

              <div className="relative flex items-center">
                <Checkbox
                  id={`group-${group.iri}`}
                  checked={groupState === "checked"}
                  onCheckedChange={() => handleGroupToggle(group)}
                  aria-label={`Select all structures in ${getLocalizedString(group.name, language)}`}
                />
                {groupState === "indeterminate" && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="size-4 rounded-lg bg-primary flex items-center justify-center">
                      <MinusIcon className="size-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <label htmlFor={`group-${group.iri}`} className="block cursor-pointer font-medium text-card-foreground">
                  {getLocalizedString(group.name, language)}
                </label>
                {group.description && Object.keys(group.description).length > 0 && (
                  <p className="text-sm text-muted-foreground truncate">{getLocalizedString(group.description, language)}</p>
                )}
              </div>

              <span className="text-sm text-muted-foreground">
                {group.structures.filter((s) => selectedStructures.has(s.iri)).length}/{group.structures.length}
              </span>
            </div>

            {/* Structures List */}
            {isExpanded && group.structures.length > 0 && (
              <div className="border-t border-border bg-muted/30">
                {group.structures.map((structure, index) => (
                  <button
                    type="button"
                    key={structure.iri}
                    onClick={() => handleStructureToggle(structure.iri)}
                    className={cn(
                      "flex w-full items-start gap-3 py-2.5 px-3 pl-12 transition-colors hover:bg-accent/50 text-left cursor-pointer",
                      index !== group.structures.length - 1 && "border-b border-border/50",
                    )}
                  >
                    <Checkbox
                      checked={selectedStructures.has(structure.iri)}
                      onCheckedChange={() => handleStructureToggle(structure.iri)}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-0.5 pointer-events-none"
                      tabIndex={-1}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm text-card-foreground">{getLocalizedString(structure.name, language)}</span>
                      {structure.description && Object.keys(structure.description).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">{getLocalizedString(structure.description, language)}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Empty state */}
            {isExpanded && group.structures.length === 0 && <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">No structures available</div>}
          </div>
        );
      })}

      {data.length === 0 && <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">No structure groups available</div>}
    </div>
  );
}

async function profileStructures(
  structureIris: string[],
  specificationIri: string,
  configuration: Configuration,

  backendConnector: StructureEditorBackendService,
  callbackNewStructures: (newStructures: DataSpecificationStructure[]) => void,
) {
  const structureModelsToProfile = structureIris.map((iri) => {
    const structureModel = configuration.structureModels[iri];
    // @ts-ignore
    const resources = structureModel.resources;
    return Object.values(resources);
  });

  const newIriMapping: Record<string, string> = {};
  for (const structureModel of structureModelsToProfile) {
    const schema = structureModel.find(DataPsmSchema.is);
    const resource = await backendConnector.createResource(specificationIri, { type: V1.PSM });
    newIriMapping[schema!.iri] = resource.iri!;
  }

  const getByProfiling: (externalEntityIri: string) => string | null = (externalEntityIri: string) => {
    const apAggregator = configuration.semanticModelAggregator as ApplicationProfileAggregator;

    apAggregator.getByProfiling(externalEntityIri);
    const localEntities = apAggregator.getByProfiling(externalEntityIri);
    if (localEntities.length > 0) {
      return localEntities[0]!.id;
    } else {
      return null;
    }
  };

  const newStructures = await createStructureProfile(structureModelsToProfile, getByProfiling, { newIriMapping });

  const newSpecifications: DataSpecificationStructure[] = [];
  for (const newStructure of newStructures) {
    const schema = newStructure.find(DataPsmSchema.is);
    await backendConnector.setResourceJsonData(schema!.iri!, {
      operations: [],
      resources: Object.fromEntries(newStructure.map((r) => [r.iri!, r])),
    });
    newSpecifications.push({
      id: schema!.iri!,
      label: schema.dataPsmHumanLabel,
    });
  }

  callbackNewStructures(newSpecifications);
}
