interface PageLayoutProps {
  children: React.ReactNode
}

export function PageLayout({ children }: PageLayoutProps) {
  return <div className="max-w-4xl mx-auto py-10 px-6">{children}</div>
}
