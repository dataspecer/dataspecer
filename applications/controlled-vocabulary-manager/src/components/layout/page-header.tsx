interface PageHeaderProps {
  title: string
  icon?: React.ReactNode
  children?: React.ReactNode
}

export function PageHeader({ title, icon, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="flex items-center gap-2 text-page-title font-semibold">
        {icon}
        {title}
      </h1>
      {children && <div className="flex gap-2">{children}</div>}
    </div>
  )
}
