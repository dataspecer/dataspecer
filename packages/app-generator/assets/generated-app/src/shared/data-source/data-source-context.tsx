import { createContext, useContext, type ReactNode } from 'react';

import type { DataSource } from './data-source.ts';

const DataSourceContext = createContext<DataSource | null>(null);

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
