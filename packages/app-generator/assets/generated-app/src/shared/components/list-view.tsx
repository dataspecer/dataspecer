import { useEffect, useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  DataGrid,
  type GridColDef,
  type GridPaginationModel,
  type GridSortModel,
} from '@mui/x-data-grid';

import {
  DEFAULT_READ_LIST_SORT,
  isListFieldSortable,
  type ReadListResult,
  type ReadListSort,
} from '../data-source/data-source.ts';
import { useDataSource } from '../data-source/data-source-context.tsx';
import {
  entityIdFromValue,
  hrefForAction,
  type AssociationNavigationActionDescriptor,
  type NavigationActionDescriptor,
  type OperationNavigationDescriptor,
} from '../navigation/navigation.ts';
import { errorMessage } from '../operations/operation-result.ts';
import { invokeOperation, type OperationStrategy } from '../operations/operation-strategy.ts';
import { DEFAULT_PAGE_SIZE } from '../operations/read-list-strategy.ts';
import type {
  AggregateDescriptor,
  AggregateDescriptorMap,
  EntityModel,
  FieldDescriptor,
} from '../types/aggregate.ts';
import { ActionLinks } from './action-links.tsx';
import { FieldLabel } from './field-label.tsx';
import { formatFieldValue } from '../forms/field-value.ts';
import { isCompositionField } from '../forms/entity-target.ts';
import { displayLanguagePreferences } from '../forms/multilingual-value.ts';

export interface ListViewProps<TModel extends EntityModel> {
  title: string;
  aggregate: AggregateDescriptor<TModel>;
  aggregateRegistry: AggregateDescriptorMap;
  strategy: OperationStrategy<TModel, ReadListResult<TModel>>;
  navigation: OperationNavigationDescriptor;
  languages: readonly string[];
}

export function ListView<TModel extends EntityModel>(props: ListViewProps<TModel>) {
  const dataSource = useDataSource();
  const navigate = useNavigate();
  const { title, aggregate, aggregateRegistry, strategy, navigation } = props;
  const detailAction = navigation.rowActions.find((action) => action.operation === 'ReadDetail');
  const [items, setItems] = useState<TModel[]>([]);
  const [total, setTotal] = useState(0);
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [sort, setSort] = useState<ReadListSort>(DEFAULT_READ_LIST_SORT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const preferredLanguages = useMemo(
    () => displayLanguagePreferences(props.languages),
    [props.languages],
  );
  const columns = useMemo(
    () =>
      buildColumns<TModel>(
        aggregate.fields,
        navigation.rowActions,
        navigation.associationActions,
        preferredLanguages,
      ),
    [aggregate.fields, navigation.rowActions, navigation.associationActions, preferredLanguages],
  );
  const gridSortModel = useMemo(() => toGridSortModel(sort), [sort]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    invokeOperation(strategy, {
      aggregate,
      aggregateRegistry,
      datasource: dataSource,
      params: {
        // the data grid counts pages from zero, the operation from one
        page: paginationModel.page + 1,
        pageSize: paginationModel.pageSize,
        sort,
      },
    })
      .then((result) => {
        if (!active) {
          return;
        }
        if (result.ok) {
          setItems(result.data.items);
          setTotal(result.data.total);
        } else {
          setError(result.issues.map((issue) => issue.message).join(', '));
        }
      })
      .catch((caught: unknown) => {
        if (!active) {
          return;
        }
        console.error(caught);
        setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [aggregate, aggregateRegistry, dataSource, paginationModel, sort, strategy]);

  return (
    <Stack spacing={2}>
      <Stack
        direction="row"
        spacing={2}
        sx={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <Typography variant="h5" component="h2" noWrap>
          {title}
        </Typography>
        <ActionLinks actions={navigation.pageActions} />
      </Stack>
      {error !== null ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <DataGrid
          aria-label={title}
          autoHeight
          sx={{
            bgcolor: 'background.paper',
            ...(detailAction ? { '& .MuiDataGrid-row': { cursor: 'pointer' } } : {}),
          }}
          onRowClick={(params, event) => {
            if (
              !detailAction ||
              (event.target as HTMLElement).closest('a, button') ||
              hasSelectedTextWithin(event.currentTarget)
            ) {
              return;
            }
            const href = hrefForAction(detailAction, String(params.id));
            if (href) {
              void navigate(href);
            }
          }}
          columns={columns}
          rows={items}
          rowCount={total}
          loading={loading}
          paginationMode="server"
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          pageSizeOptions={[10, 20, 50]}
          sortingMode="server"
          sortModel={gridSortModel}
          onSortModelChange={(model: GridSortModel) => {
            setSort(fromGridSortModel(model));
            // a different order makes the current page meaningless
            setPaginationModel((current) => ({ ...current, page: 0 }));
          }}
          disableColumnFilter
          rowSelection={false}
          localeText={{ noRowsLabel: 'No items found.' }}
        />
      )}
    </Stack>
  );
}

function hasSelectedTextWithin(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return false;
  }
  return Boolean(
    (selection.anchorNode && element.contains(selection.anchorNode)) ||
    (selection.focusNode && element.contains(selection.focusNode)),
  );
}

function buildColumns<TModel extends EntityModel>(
  fields: FieldDescriptor[],
  rowActions: readonly NavigationActionDescriptor[],
  associationActions: readonly AssociationNavigationActionDescriptor[],
  languages: readonly string[],
): GridColDef<TModel>[] {
  const columns: GridColDef<TModel>[] = fields
    .filter((field) => !isCompositionField(field))
    .map((field) => ({
      field: field.path,
      headerName: field.label,
      renderHeader: () => <FieldLabel field={field} />,
      flex: 1,
      minWidth: 160,
      sortable: isListFieldSortable(field),
      renderCell: (params) => (
        <FieldCell
          field={field}
          value={params.row[field.propertyName as keyof TModel]}
          action={associationActions.find((action) => action.fieldPath === field.path)}
          languages={languages}
          tabIndex={params.tabIndex}
        />
      ),
    }));

  if (rowActions.length > 0) {
    columns.push({
      field: '__actions',
      headerName: 'Actions',
      minWidth: 140,
      sortable: false,
      disableColumnMenu: true,
      renderCell: (params) => (
        <ActionLinks
          actions={rowActions}
          entityId={params.row.id}
          compact
          tabIndex={params.tabIndex}
        />
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
  languages: readonly string[];
}

function FieldCell(props: FieldCellProps) {
  if (typeof props.value === 'boolean') {
    return (
      <Chip
        size="small"
        label={props.value ? 'Yes' : 'No'}
        color={props.value ? 'success' : 'default'}
      />
    );
  }
  if (!props.action) {
    return <>{formatFieldValue(props.field, props.value, props.languages)}</>;
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
              languages={props.languages}
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
      languages={props.languages}
    />
  );
}

interface LinkedFieldValueProps {
  field: FieldDescriptor;
  value: unknown;
  action: AssociationNavigationActionDescriptor;
  tabIndex: number;
  languages: readonly string[];
}

function LinkedFieldValue(props: LinkedFieldValueProps) {
  const entityId = entityIdFromValue(props.value);
  const label = formatFieldValue(props.field, props.value, props.languages);
  const href = entityId ? hrefForAction(props.action, entityId) : undefined;
  return href ? (
    <Link component={RouterLink} to={href} tabIndex={props.tabIndex} underline="hover">
      {label || entityId}
    </Link>
  ) : (
    <>{label}</>
  );
}
