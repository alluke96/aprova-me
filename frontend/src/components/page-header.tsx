interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  back?: React.ReactNode;
}

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-2">
        {back}
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h1>
        {description && <p className="max-w-[60ch] text-[15px] text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}
