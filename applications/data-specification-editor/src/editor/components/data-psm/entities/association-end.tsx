import React, {memo, useMemo} from "react";
import {Span, sxStyles} from "../styles";
import {DataPsmAssociationEnd, DataPsmClass, DataPsmClassReference} from "@dataspecer/core/data-psm/model";
import {useTranslation} from "react-i18next";
import {DataPsmGetLabelAndDescription} from "../common/DataPsmGetLabelAndDescription";
import {RowSlots} from "../base-row";
import {useDataPsmAndInterpretedPim} from "../../../hooks/use-data-psm-and-interpreted-pim";
import {LanguageStringUndefineable} from "../../helper/LanguageStringComponents";
import {LanguageString} from "@dataspecer/core/core";
import ListRoundedIcon from "@mui/icons-material/ListRounded";
import AccountTreeTwoToneIcon from "@mui/icons-material/AccountTreeTwoTone";
import {AssociationContext, ClassPartContext, DataPsmObjectType} from "../data-psm-row";
import {getCardinalityFromResource} from "../common/cardinality";
import {useDialog} from "../../../dialog";
import {ReplaceWithReferenceDialog} from "../references/replace-with-reference-dialog";
import {ReplaceAssociationEndWithReference} from "../references/replace-association-end-with-reference";
import { ExtendedSemanticModelClass, SemanticModelRelationship } from "@dataspecer/core-v2/semantic-model/concepts";
import RemoveIcon from "@mui/icons-material/Remove";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";

const StrikeOut: React.FC<{
  children: React.ReactNode,
  strikeOut?: boolean,
}> = ({children, strikeOut}) =>
  strikeOut ? <del>{children}</del> : <>{children}</>;

export const DataPsmAssociationEndItem: React.FC<{iri: string} & RowSlots & ClassPartContext> = memo((props) => {
  const {t} = useTranslation("psm");
  //const store = useFederatedObservableStore();

  // Data PSM association end

  const {dataPsmResource: dataPsmAssociationEnd, pimResource: pimSemanticRelationship} = useDataPsmAndInterpretedPim<DataPsmAssociationEnd, SemanticModelRelationship>(props.iri);
  //const readOnly = false;

  // PIM Association and check if it is backward association

  const isBackwardsAssociation = dataPsmAssociationEnd?.dataPsmIsReverse === true;
  const correctEnd = pimSemanticRelationship?.ends[isBackwardsAssociation ? 0 : 1];
  const incorrectEnd = pimSemanticRelationship?.ends[isBackwardsAssociation ? 1 : 0];

  const {resource: psmClassOrReference} = useResource<DataPsmClass | DataPsmClassReference>(dataPsmAssociationEnd?.dataPsmPart);
  const {resource: pimClass} = useResource<ExtendedSemanticModelClass>(DataPsmClass.is(psmClassOrReference) ? psmClassOrReference.dataPsmInterpretation : null);

  const isCodelist = pimClass?.isCodelist ?? false;
  const isPrimitive = DataPsmClass.is(psmClassOrReference) && psmClassOrReference?.dataPsmParts.length === 0 && psmClassOrReference?.dataPsmEmptyAsComplex !== true;

  const isDematerialized = !!dataPsmAssociationEnd?.dataPsmIsDematerialize && !isPrimitive;

  const associationPointsToIri = dataPsmAssociationEnd?.dataPsmPart ?? null;

  // We need to decide whether there is a human label on Data PSM association end or PIM association end.
  // If no, we show a label of PIM association with extra information about the direction.

  const associationEndHumanLabel: LanguageString = useMemo(() => ({...correctEnd?.name, ...dataPsmAssociationEnd?.dataPsmHumanLabel}), [correctEnd?.name, dataPsmAssociationEnd?.dataPsmHumanLabel]);
  const hasHumanLabelOnAssociationEnd = Object.keys(associationEndHumanLabel).length > 0;

  const ReplaceDialog = useDialog(ReplaceWithReferenceDialog);

  const thisMenu = <>
    <ReplaceAssociationEndWithReference dataPsmAssociationEnd={props.iri} open={ReplaceDialog.open} />
  </>;

  const thisStartRow = <>
    <StrikeOut strikeOut={isDematerialized}>
      {hasHumanLabelOnAssociationEnd ?
        <DataPsmGetLabelAndDescription dataPsmResourceIri={props.iri}>
          {(label, description) =>
            <Span title={description} sx={isPrimitive ? sxStyles.attribute : sxStyles.association}>{label ?? "[association]"}</Span>
          }
        </DataPsmGetLabelAndDescription>
        :
        <LanguageStringUndefineable from={incorrectEnd?.name ?? null}>
          {label =>
            <LanguageStringUndefineable from={incorrectEnd?.description ?? null}>
              {description => <>
                {isBackwardsAssociation && <strong>{t("backwards association")}{" "}</strong>}
                <Span title={description} sx={isPrimitive ? sxStyles.attribute : sxStyles.association}>{label ?? "[association]"}</Span>
              </>}
            </LanguageStringUndefineable>
          }
        </LanguageStringUndefineable>
      }
      {" "}

      {!!(dataPsmAssociationEnd?.dataPsmTechnicalLabel && dataPsmAssociationEnd.dataPsmTechnicalLabel.length) &&
          <>(<Span sx={sxStyles.technicalLabel}>{dataPsmAssociationEnd.dataPsmTechnicalLabel}</Span>)</>
      }
      {":"}
    </StrikeOut>
    {" "}
    {isDematerialized && ` [${t("is dematerialized")}] `}
  </>;

  const thisEndRow = <>
    {pimSemanticRelationship && (" " + getCardinalityFromResource(dataPsmAssociationEnd, pimSemanticRelationship, !isBackwardsAssociation))}
  </>;

  const startRow = props.startRow ? [...props.startRow, thisStartRow] : [thisStartRow];
  const endRow = props.endRow ? [thisEndRow, ...props.endRow] : [thisEndRow];
  const menu = props.menu ? [thisMenu, ...props.menu] : [thisMenu];

  const iris = useMemo(() => [...props.iris ?? [], props.iri as string], [props.iris, props.iri]);

  const typePimClassIri = correctEnd?.concept;

  const context = useMemo(() => ({
    contextType: "association",
    parentDataPsmAssociationEndIri: props.iri,
    parentTypePimIri: typePimClassIri,
    parentDataPsmClassIri: props.parentDataPsmClassIri,
  } as AssociationContext), [props.iri, typePimClassIri]);

  return <>
    <DataPsmObjectType
      {...props}
      {...context}
      iri={associationPointsToIri}
      startRow={startRow}
      endRow={endRow}
      icon={isCodelist ? <ListRoundedIcon style={{verticalAlign: "middle"}} /> : (isPrimitive ? <RemoveIcon style={{verticalAlign: "middle"}} /> : <AccountTreeTwoToneIcon style={{verticalAlign: "middle"}} />)}
      menu={menu}
      iris={iris}
    />

    <ReplaceDialog.Component />
  </>;
});
