import React, { memo, useContext } from "react";
import { RowSlots } from "../base-row";
import { ObjectContext } from "../data-psm-row";
import { useInheritanceOr } from "../common/use-inheritance-or";
import { DataPsmUnknownItem } from "./unknown";
import { SettingsContext } from "../../settings/settings";
import { RegularOr } from "./regular-or";
import { InheritanceOr } from "./inheritance-or";

/**
 * Every OR uses this component which decides whether to render it as inheritance OR or regular OR.
 */
export const DataPsmOrItem: React.FC<{ iri: string } & ObjectContext & RowSlots> = memo((props) => {
  const { useInheritanceUiInsteadOfOr } = useContext(SettingsContext);

  if (useInheritanceUiInsteadOfOr) {
    return <PossibleInheritanceOr {...props} />;
  } else {
    return <RegularOr {...props} />;
  }
});

const PossibleInheritanceOr: React.FC<{ iri: string } & ObjectContext & RowSlots> = memo((props) => {
  const [inheritanceOr] = useInheritanceOr(props.iri);

  if (inheritanceOr === undefined) {
    return <DataPsmUnknownItem {...props} />;
  }

  if (inheritanceOr) {
    return <InheritanceOr {...props} inheritanceOrTree={inheritanceOr} />;
  } else {
    return <RegularOr {...props} />;
  }
});
