import React, { memo, useMemo } from "react";
import { ObjectContext, ORContext } from "../data-psm-row";
import { InheritanceOrTree } from "../common/use-inheritance-or";
import { RowSlots } from "../base-row";
import { Span, sxStyles } from "../styles";
import { DataPsmClassItem } from "./class";
import { useTranslation } from "react-i18next";
import { ReplaceClassWithReference } from "../references/replace-class-with-referemce";

/**
 * Represents OR that meets conditions to be an inheritance OR.
 */
export const InheritanceOr: React.FC<{ iri: string; inheritanceOrTree: InheritanceOrTree } & ObjectContext & RowSlots> = memo((props) => {
  const { t } = useTranslation("psm");

  const thisEndRow = (
    <>
      <Span sx={sxStyles.or}> {t("with specializations")}</Span>
    </>
  );

  const endRow = props.endRow ? [thisEndRow, ...props.endRow] : [thisEndRow];

  const orContext = useMemo(
    () =>
      ({
        contextType: "or",
        parentDataPsmOrIri: props.iri,
      }) as ORContext,
    [props.iri],
  );

  return (
    <DataPsmClassItem
      {...props}
      menu={[...(props?.menu ?? []), <ReplaceClassWithReference structuralClassId={props.iri} owningStructuralEntityId={(props as ORContext).parentDataPsmOrIri} />]}
      iri={props.inheritanceOrTree.dataPsmObjectIri}
      endRow={endRow}
      {...orContext}
    />
  );
});
