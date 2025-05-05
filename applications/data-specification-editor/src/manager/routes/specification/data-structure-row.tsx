import { DataSpecification } from "@dataspecer/backend-utils/connectors/specification";
import { Package } from "@dataspecer/core-v2/project";
import { Button, Card, CardActions, CardContent, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getEditorLink } from "../../shared/get-schema-generator-link";
import { LanguageStringText } from "../../../editor/components/helper/LanguageStringComponents";

export interface DataStructureRowProps {
  specification: DataSpecification & Package;
  dataStructureIri: string;
  onDelete: () => void;
}

export const DataStructureBox: React.FC<DataStructureRowProps> = ({ specification, dataStructureIri, onDelete }) => {
  const { t } = useTranslation("ui");

  const specificationIri = specification.iri;
  const dataStructure = specification?.dataStructures.find((structure) => structure.id === dataStructureIri);

  return (
    <Card variant="outlined" sx={{ height: "4.75cm" }}>
      <CardContent>
        <Typography
          variant="h5"
          component="div"
          sx={{
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          <LanguageStringText from={dataStructure?.label} fallback={dataStructureIri} />
        </Typography>
        <Typography sx={{ mb: 1.5 }} color="text.secondary">
          {t("data structure")}
        </Typography>
      </CardContent>
      <CardActions>
        <div style={{ flexGrow: 1 }} />
        <Button color="error" onClick={onDelete} sx={{ mr: 1 }}>
          {t("delete")}
        </Button>
        <Button component={Link} to={getEditorLink(specificationIri, dataStructureIri)} variant={"outlined"}>
          {t("open data structure")}
        </Button>
      </CardActions>
    </Card>
  );
};
