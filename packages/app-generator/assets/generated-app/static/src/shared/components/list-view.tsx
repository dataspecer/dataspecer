import { useMemo } from 'react';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridSortModel,
} from '@mui/x-data-grid';

import {
  DEFAULT_READ_LIST_SORT,
  isListFieldSortable,
  type ReadListSort,
} from '../datasource/data-source.ts';
import {
  entityIdFromValue,
  hrefForAction,
  type AssociationNavigationActionDescriptor,
  type NavigationActionDescriptor,
} from '../navigation/navigation.ts';
import type { EntityModel, FieldDescriptor } from '../types/aggregate.ts';
import { ActionLinks } from './action-links.tsx';
import { formatFieldValue } from './field-value.ts';

export interface ListViewProps<TModel extends EntityModel> {
  title: string;
  fields: FieldDescriptor[];
  items: TModel[];
  total: number;
  paginationModel: GridPaginationModel;
  sort: ReadListSort;
  loading: boolean;
  error: string | null;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  onSortChange: (sort: ReadListSort) => void;
  pageActions?: readonly NavigationActionDescriptor[];
  rowActions?: readonly NavigationActionDescriptor[];
  associationActions?: readonly AssociationNavigationActionDescriptor[];
}

export function ListView<TModel extends EntityModel>(props: ListViewProps<TModel>) {
  const pageActions = props.pageActions ?? [];
  const rowActions = props.rowActions ?? [];
  const associationActions = props.associationActions ?? [];
  const columns = useMemo(
    () => buildColumns<TModel>(props.fields, rowActions, associationActions),
    [props.fields, rowActions, associationActions]
  );
  const gridSortModel = useMemo(() => toGridSortModel(props.sort), [props.sort]);

  return (
    <section>
      <h2>{props.title}</h2>
      <ActionLinks actions={pageActions} />
      {props.error ? (
        <p role="alert">{props.error}</p>
      ) : (
        <DataGrid
          aria-label={props.title}
          autoHeight
          className="data-grid"
          columns={columns}
          rows={props.items}
          rowCount={props.total}
          loading={props.loading}
          paginationMode="server"
          paginationModel={props.paginationModel}
          onPaginationModelChange={props.onPaginationModelChange}
          pageSizeOptions={[10, 20, 50]}
          sortingMode="server"
          sortModel={gridSortModel}
          onSortModelChange={(model: GridSortModel) => props.onSortChange(fromGridSortModel(model))}
          disableColumnFilter
          rowSelection={false}
          localeText={{ noRowsLabel: 'No items found.' }}
        />
      )}
    </section>
  );
}

function buildColumns<TModel extends EntityModel>(
  fields: FieldDescriptor[],
  rowActions: readonly NavigationActionDescriptor[],
  associationActions: readonly AssociationNavigationActionDescriptor[]
): GridColDef<TModel>[] {
  const columns: GridColDef<TModel>[] = fields.map((field) => ({
    field: field.path,
    headerName: field.label,
    flex: 1,
    minWidth: 160,
    sortable: isListFieldSortable(field),
    renderCell: (params) => (
      <FieldCell
        field={field}
        value={params.row[field.propertyName as keyof TModel]}
        action={associationActions.find((action) => action.fieldPath === field.path)}
        tabIndex={params.tabIndex}
      />
    ),
  }));

  if (rowActions.length > 0) {
    columns.push({
      field: '__actions',
      headerName: 'Actions',
      minWidth: 180,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <ActionLinks actions={rowActions} entityId={params.row.id} tabIndex={params.tabIndex} />
      ),
    });
  }

  return columns;
}

function toGridSortModel(sort: ReadListSort): GridSortModel {
  return sort.kind === 'field' ? [{ field: sort.fieldPath, sort: sort.direction }] : [];
}

function fromGridSortModel(model: GridSortModel): ReadListSort {
  const item = model[0];
  return item?.sort
    ? { kind: 'field', fieldPath: item.field, direction: item.sort }
    : DEFAULT_READ_LIST_SORT;
}

interface FieldCellProps {
  field: FieldDescriptor;
  value: unknown;
  action?: AssociationNavigationActionDescriptor;
  tabIndex: number;
}

function FieldCell(props: FieldCellProps) {
  if (!props.action) {
    return <>{formatFieldValue(props.field, props.value)}</>;
  }

  const action = props.action;
  if (Array.isArray(props.value)) {
    return (
      <>
        {(props.value as unknown[]).map((entry, index) => (
          <span key={index}>
            {index > 0 ? ', ' : null}
            <LinkedFieldValue
              field={props.field}
              value={entry}
              action={action}
              tabIndex={props.tabIndex}
            />
          </span>
        ))}
      </>
    );
  }

  return (
    <LinkedFieldValue
      field={props.field}
      value={props.value}
      action={action}
      tabIndex={props.tabIndex}
    />
  );
}

interface LinkedFieldValueProps {
  field: FieldDescriptor;
  value: unknown;
  action: AssociationNavigationActionDescriptor;
  tabIndex: number;
}

function LinkedFieldValue(props: LinkedFieldValueProps) {
  const entityId = entityIdFromValue(props.value);
  const label = formatFieldValue(props.field, props.value);
  const href = entityId ? hrefForAction(props.action, entityId) : undefined;
  return href ? (
    <a href={href} tabIndex={props.tabIndex}>
      {label || entityId}
    </a>
  ) : (
    <>{label}</>
  );
}
