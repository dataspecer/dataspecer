import { LOCAL_SEMANTIC_MODEL } from "@dataspecer/core-v2/model/known-models";
import type { Entity } from "@dataspecer/core/entity-model";
import { createUpdateEntityOperation } from "@dataspecer/core/operation";
import { useModelStoreEntity } from "@dataspecer/model-store/react";
import type { ProjectModelEntity } from "@dataspecer/project-model";
import { ModelCompositionConfigurationApplicationProfile, ModelCompositionConfigurationMerge } from "@dataspecer/specification/model-hierarchy";
import { Alert, Box, Button, Card, CardContent, Checkbox, Divider, FormControlLabel, Radio, RadioGroup, Typography } from "@mui/material";
import { useSnackbar } from "notistack";
import { FC, useContext, useState } from "react";
import { LanguageStringText } from "../../../editor/components/helper/LanguageStringComponents";
import { PROJECT_MODEL_ID, SpecificationContext, useModelStore } from "./specification";

const ModelResourceLabel: FC<{ modelId: string; fallback: string }> = ({ modelId, fallback }) => {
  // To lookup the model by its id we need to find ENTITY in the project model
  const entity = useModelStoreEntity<ProjectModelEntity>(PROJECT_MODEL_ID, modelId);
  return <LanguageStringText from={entity?.label} fallback={fallback} />;
};

export const ConceptualModelTargets: FC = () => {
  const specification = useContext(SpecificationContext);
  const modelStore = useModelStore();

  const { enqueueSnackbar } = useSnackbar();

  const mainProfile = (specification?.modelCompositionConfiguration ?? null) as ModelCompositionConfigurationApplicationProfile;

  const [selectedModel, setSelectedModel] = useState<string | null>((mainProfile?.model ?? null) as string);

  const [allowModifications, setAllowModifications] = useState<boolean>(mainProfile?.canModify ?? true);
  const [allowAddingProfiles, setAllowAddingProfiles] = useState<boolean>(mainProfile?.canAddEntities ?? true);

  const handleSave = async () => {
    const newConfiguration = {
      modelType: "application-profile",
      model: selectedModel,
      canAddEntities: allowModifications && allowAddingProfiles,
      canModify: allowModifications,
      profiles: {
        modelType: "merge",
        models: null,
      } as ModelCompositionConfigurationMerge,
    } satisfies ModelCompositionConfigurationApplicationProfile;
    const transaction = modelStore.transaction([{
      modelId: specification.id,
      operation: createUpdateEntityOperation({ id: specification.id, modelCompositionConfiguration: newConfiguration } as Partial<Entity> & Pick<Entity, "id">),
    }], {});
    await transaction.confirmation;
    enqueueSnackbar("Source configuration saved", { variant: "success" });
  };

  return (
    <>
      <Typography variant="h5" component="div" gutterBottom sx={{ mt: 5 }}>
        Source configuration
      </Typography>

      <Alert severity="info" sx={{ mt: 3 }}>
        Select the model with application profile that will be used for structure modeling.
      </Alert>

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <RadioGroup value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}>
            {specification?.subResources
              .filter((resource) => resource.types.includes(LOCAL_SEMANTIC_MODEL))
              .map((resource) => (
                <FormControlLabel key={resource.iri} control={<Radio value={resource.iri} />} label={<ModelResourceLabel modelId={resource.iri} fallback={resource.iri} />} />
              ))}
          </RadioGroup>
          <Divider style={{ margin: "1rem 0 1rem 0" }} />
          <Box sx={{ display: "flex" }}>
            <div>
              <FormControlLabel
                control={<Checkbox checked={allowModifications} onChange={(e) => setAllowModifications(e.target.checked)} />}
                label="Allow making modifications to profiled entities."
              />
              <FormControlLabel
                disabled={!allowModifications}
                control={
                  <Checkbox checked={allowAddingProfiles && allowModifications} indeterminate={!allowModifications} onChange={(e) => setAllowAddingProfiles(e.target.checked)} />
                }
                label="Allow adding new profiles to the model by selecting entities from profiled vocabularies."
              />
            </div>

            <div style={{ flexGrow: 1 }} />

            <div>
              <Button variant="contained" onClick={handleSave}>
                Save
              </Button>
            </div>
          </Box>
        </CardContent>
      </Card>
    </>
  );
};
