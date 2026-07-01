interface BreadcrumbItem {
  label: string
  onClick?: () => void
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 mb-1">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-caption text-border">/</span>}
            {isLast ? (
              <span className="text-caption text-foreground font-medium">{item.label}</span>
            ) : item.href ? (
              <a
                className="text-caption text-muted-foreground hover:underline"
                href={item.href}
              >
                {item.label}
              </a>
            ) : (
              <button
                className="text-caption text-muted-foreground hover:underline"
                onClick={item.onClick}
              >
                {item.label}
              </button>
            )}
          </span>
        )
      })}
    </div>
  )
}
