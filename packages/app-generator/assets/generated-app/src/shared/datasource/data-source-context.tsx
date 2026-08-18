import { createContext, useContext, type ReactNode } from 'react';

import type { DataSource } from './data-source.ts';

const DataSourceContext = createContext<DataSource | null>(null);

/**
 * Supplies the data source the components below read and write through. The application provides
 * one in `main.tsx`, and nesting another provider gives a part of the tree a different source.
 */
export function DataSourceProvider(props: { value: DataSource; children: ReactNode }) {
  return (
    <DataSourceContext.Provider value={props.value}>{props.children}</DataSourceContext.Provider>
  );
}

export function useDataSource(): DataSource {
  const dataSource = useContext(DataSourceContext);
  if (dataSource === null) {
    throw new Error('Components that read data must be rendered inside a DataSourceProvider.');
  }
  return dataSource;
}
