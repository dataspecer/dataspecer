import { DataSpecification } from "@dataspecer/backend-utils/connectors/specification";
import { Package } from "@dataspecer/core-v2/project";
import { Chip, Stack } from "@mui/material";
import React from "react";

/**
 * Shows tags for given specification by its IRI.
 * @param iri
 * @constructor
 */
export const SpecificationTags: React.FC<{ specification: DataSpecification & Package }> = ({ specification }) => {
  return (
    <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
      {specification?.tags?.map((tag) => (
        <Chip label={tag} key={tag} size="small" />
      ))}
    </Stack>
  );
};
