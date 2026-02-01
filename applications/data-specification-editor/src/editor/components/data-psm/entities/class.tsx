import { ExtendedSemanticModelClass, SemanticModelClass, SemanticModelEntity } from "@dataspecer/core-v2/semantic-model/concepts";
import { DataPsmClass, DataPsmContainer } from "@dataspecer/core/data-psm/model";
import { useFederatedObservableStore } from "@dataspecer/federated-observable-store-react/store";
import { useResource } from "@dataspecer/federated-observable-store-react/use-resource";
import AddIcon from "@mui/icons-material/Add";
import { MenuItem } from "@mui/material";
import React, { memo, useCallback, useContext, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useDialog } from "../../../dialog";
import { useDataPsmAndInterpretedPim } from "../../../hooks/use-data-psm-and-interpreted-pim";
import { useToggle } from "../../../hooks/use-toggle";
import { AddClassSurroundings } from "../../../operations/add-class-surroundings";
import { CreateNonInterpretedAssociationToClass } from "../../../operations/create-non-interpreted-association";
import { CreateContainer } from "../../../operations/create-container";
import { CreateInclude } from "../../../operations/create-include";
import { AddInterpretedSurroundingsDialog, WikidataAddInterpretedSurroundingsDialog } from "../../add-interpreted-surroundings";
import { ConfigurationContext } from "../../App";
import { AddSpecializationDialog } from "../add-specialization/add-specialization-dialog";
import { DataPsmBaseRow, RowSlots } from "../base-row";
import { DataPsmGetLabelAndDescription } from "../common/DataPsmGetLabelAndDescription";
import { InheritanceOrTree } from "../common/use-inheritance-or";
import { ClassPartContext, ObjectContext, ORContext } from "../data-psm-row";
import { ReplaceAlongInheritanceDialog } from "../replace-along-inheritance/replace-along-inheritance-dialog";
import { Span, sxStyles } from "../styles";
import { DataPsmClassSubtree } from "../subtrees/class-subtree";
import { SearchDialog } from "../../cim-search/search-dialog";
import { getCardinality } from "../common/cardinality";
import Inventory2TwoToneIcon from '@mui/icons-material/Inventory2TwoTone';
import { CreateNonInterpretedAttribute } from "../../../operations/create-non-interpreted-attribute";
import { MakeConcrete } from "../../../operations/make-concrete";
import { MakeAbstract } from "../../../operations/make-abstract";
import { ProfileInformation } from "../profiling/profile-information";

/**
 * Because classes and containers are so similar, they share this component to make implementation simpler.
 */
export const DataPsmClassItem: React.FC<{
  iri: string,
  inheritanceOrTree?: InheritanceOrTree
} & RowSlots & (ObjectContext | ClassPartContext)> = memo((props) => {
  const {t} = useTranslation("psm");


  // Decide on the type of the entity
  let type: string | null = null;
  const {resource: bareEntity} = useResource(props.iri);
  if (bareEntity && DataPsmClass.is(bareEntity)) { type = "class"; }
  if (bareEntity && DataPsmContainer.is(bareEntity)) { type = "container"; }
  const container = bareEntity as DataPsmContainer;
  const objectContext = props as ObjectContext;
  const partContext = props as ClassPartContext;

  const {dataSpecificationIri, dataSpecifications, operationContext, semanticModelAggregator} = useContext(ConfigurationContext);

  const {dataPsmResource: dataPsmClass, pimResource: pimClass} = useDataPsmAndInterpretedPim<DataPsmClass, ExtendedSemanticModelClass>(type === "class" ? props.iri : (type === "container" ? partContext.parentDataPsmClassIri : null));
  const readOnly = false;
  const isPrimitive = dataPsmClass?.dataPsmParts.length === 0 && dataPsmClass?.dataPsmEmptyAsComplex !== true;

  // @ts-ignore
  const unwrappedAdapter = {}; //sourceSemanticModel?.model?.cimAdapter ?? {};
  const AddSurroundings = useDialog(false ? WikidataAddInterpretedSurroundingsDialog : AddInterpretedSurroundingsDialog, ["dataPsmClassIri", "forPimClassIri"]); // isWikidataAdapter(unwrappedAdapter)

  const store = useFederatedObservableStore();
  const include = useCallback(() =>
      props.iri && store.executeComplexOperation(new CreateInclude(prompt("Insert data-psm class iri") as string, props.iri))
    , [store, props.iri]);
  const addNonInterpretedAssociationClass = useCallback(() =>
    props.iri && store.executeComplexOperation(new CreateNonInterpretedAssociationToClass(props.iri))
  , [store, props.iri, operationContext]);
  const addContainer = useCallback((type: string) => store.executeComplexOperation(new CreateContainer(props.iri, type)), [store, props.iri]);

  const searchDialogToggle = useToggle();
  const selectedClassFromSearchDialog = useCallback(async (semanticClassId: string) => {
    const op = new CreateNonInterpretedAssociationToClass(props.iri, semanticClassId);
    op.setContext(operationContext);
    op.setSemanticStore(semanticModelAggregator);
    store.executeComplexOperation(op).then();
  }, [store, props, operationContext, dataSpecifications, dataSpecificationIri, semanticModelAggregator]);

  const addNonInterpretedAttribute = () => store.executeComplexOperation(
    new CreateNonInterpretedAttribute(props.iri)
  );

  const collapseSubtree = useToggle(objectContext.contextType !== "reference");

  const isAbstractClassInOr = type === "class" && props.inheritanceOrTree?.isAbstract === true;
  const isConcreteClassInOr = type === "class" && props.inheritanceOrTree?.isAbstract === false;

  const thisStartRow = <>
    {type === "class" &&
        <Span sx={isAbstractClassInOr ? sxStyles.abstractClass : null}>
            {isAbstractClassInOr && <Span>{t("abstract class")}{" "}</Span>}
            <DataPsmGetLabelAndDescription dataPsmResourceIri={props.iri}>
              {(label, description) =>
                <Span sx={sxStyles.class} title={description}>{label ?? "[class]"}</Span>
              }
            </DataPsmGetLabelAndDescription>

          {typeof dataPsmClass?.dataPsmTechnicalLabel === "string" && dataPsmClass?.dataPsmTechnicalLabel.length > 0 &&
              <> (<Span sx={sxStyles.technicalLabel}>{dataPsmClass?.dataPsmTechnicalLabel}</Span>)</>
          }

          <ProfileInformation id={props.iri} />
        </Span>
    }
    {type === "container" && <>
      <Span sx={sxStyles.container}>{container.dataPsmContainerType}{" "}{t("container")}</Span>
      {" " + getCardinality(container.dataPsmCardinality, [0, 1])}
    </>}
  </>;

  const psmClassForSurroundings = (objectContext?.contextType === "association" && !pimClass) ? objectContext.parentDataPsmClassIri : dataPsmClass?.iri;
  const {pimResource: pimClassForSurroundings} = useDataPsmAndInterpretedPim<DataPsmClass, SemanticModelClass>(psmClassForSurroundings);
  const pimClassIdForSurroundings = pimClassForSurroundings?.id;

  const addSurroundings = (operation: {
    resourcesToAdd: [string, boolean][],
    forDataPsmClass: DataPsmClass,
  }) => {
    const addClassSurroundings = new AddClassSurroundings(operation.forDataPsmClass, operation.resourcesToAdd);
    addClassSurroundings.setContext(operationContext);
    addClassSurroundings.setSemanticStore(semanticModelAggregator);
    store.executeComplexOperation(addClassSurroundings).then();
  };

  const thisMenu = <>
    {pimClassIdForSurroundings && !readOnly && <MenuItem onClick={() => AddSurroundings.open({
      selected: addSurroundings
    })} title={t("button add")}><AddIcon/></MenuItem>}
  </>;

  const ReplaceAlongHierarchy = useDialog(ReplaceAlongInheritanceDialog);
  const AddSpecialization = useDialog(AddSpecializationDialog, ["wrappedOrIri"]);

  const thisHiddenMenu = useMemo(() => (close: () => void) => <>
    {isAbstractClassInOr && <MenuItem onClick={() => { close(); store.executeComplexOperation(new MakeConcrete((objectContext as ORContext).parentDataPsmOrIri, props.iri)); }}>{t("make class non-abstract")}</MenuItem>}
    {isConcreteClassInOr && <MenuItem onClick={() => { close(); store.executeComplexOperation(new MakeAbstract((objectContext as ORContext).parentDataPsmOrIri, props.iri)); }}>{t("make class abstract")}</MenuItem>}
    <MenuItem
      onClick={() => {
        close();
        dataPsmClass?.iri && ReplaceAlongHierarchy.open({dataPsmClassIri: dataPsmClass.iri});
      }}
      title={t("button replace along inheritance")}>
      {t("button replace along inheritance")}
    </MenuItem>
    <MenuItem
      onClick={() => {
        close();
        dataPsmClass?.iri && AddSpecialization.open({dataPsmClassIri: dataPsmClass.iri});
      }}
      title={t("button add specialization")}>
      {t("button add specialization")}
    </MenuItem>
    <MenuItem
      onClick={() => {
        close();
        include();
      }}>
      {t("Add import")}
    </MenuItem>
    <MenuItem onClick={() => { close(); addNonInterpretedAssociationClass(); }}>{t("add non-interpreted class")}</MenuItem>
    <MenuItem onClick={() => { close(); addNonInterpretedAttribute(); }}>{t("add non-interpreted attribute")}</MenuItem>
    <MenuItem onClick={() => { close(); searchDialogToggle.open(); }}>{t("add interpreted class")}</MenuItem>
    <MenuItem onClick={() => { close(); addContainer("sequence"); }}>{t("add xs sequence container")}</MenuItem>
    <MenuItem onClick={() => { close(); addContainer("choice"); }}>{t("add xs choice container")}</MenuItem>
    {/* <MenuItem onClick={() => { close(); addContainer("all"); }}>{t("Add xs:all container")}</MenuItem> */}
  </>, [t, dataPsmClass?.iri, ReplaceAlongHierarchy, AddSpecialization, include]);

  const startRow = props.startRow ? [...props.startRow, thisStartRow] : [thisStartRow];
  const menu = props.menu ? [thisMenu, ...props.menu] : [thisMenu];
  const hiddenMenu = props.hiddenMenu ? [...props.hiddenMenu, thisHiddenMenu] : [thisHiddenMenu];

  const iris = useMemo(() => [...props.iris ?? [], props.iri as string], [props.iris, props.iri]);

  return <>
    <DataPsmBaseRow
      {...props}
      startRow={startRow}
      subtree={<DataPsmClassSubtree
        {...props as ObjectContext}
        iri={props.iri}
        parentDataPsmClassIri={dataPsmClass?.iri}
        isOpen={collapseSubtree.isOpen}
        inheritanceOrTree={props.inheritanceOrTree ?? undefined}
        // @ts-ignore
        parentContainerId={type === "container" ? objectContext.nearestContainerIri : (objectContext.parentDataPsmClassIri ?? null)}
      />}
      collapseToggle={!isPrimitive ? collapseSubtree : undefined}
      menu={menu}
      hiddenMenu={hiddenMenu}
      iris={iris}
      icon={type === "container" ? <Inventory2TwoToneIcon style={{verticalAlign: "middle"}} /> : props.icon}
    />

    <AddSurroundings.Component dataPsmClassIri={props.iri} forPimClassIri={pimClassIdForSurroundings} />
    <ReplaceAlongHierarchy.Component />
    <AddSpecialization.Component wrappedOrIri={objectContext.contextType === "or" ? objectContext.parentDataPsmOrIri : undefined} />
    <SearchDialog isOpen={searchDialogToggle.isOpen} close={searchDialogToggle.close} selected={selectedClassFromSearchDialog}/>
  </>;
});
