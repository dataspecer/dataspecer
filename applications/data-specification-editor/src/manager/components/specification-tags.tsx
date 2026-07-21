import type { DataSpecification } from "@dataspecer/specification/specification";
import { Chip, Stack } from "@mui/material";
import React from "react";

/**
 * Shows tags for given specification by its IRI.
 * @param iri
 * @constructor
 */
export const SpecificationTags: React.FC<{ specification: DataSpecification }> = ({ specification }) => {
  return (
    <Stack direction="row" spacing={1} sx={{ ml: 1 }}>
      {specification?.tags?.map((tag) => (
        <Chip label={tag} key={tag} size="small" />
      ))}
    </Stack>
  );
};
