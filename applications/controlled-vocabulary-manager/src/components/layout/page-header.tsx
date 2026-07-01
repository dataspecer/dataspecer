interface PageHeaderProps {
  title: string
  children?: React.ReactNode
}

export function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-page-title font-semibold">{title}</h1>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  )
}
