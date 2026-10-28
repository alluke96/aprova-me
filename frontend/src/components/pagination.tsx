import Link from 'next/link';

interface PaginationProps {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  noun: [singular: string, plural: string];
}

export function Pagination({ basePath, page, totalPages, total, noun }: PaginationProps) {
  const label = total === 1 ? noun[0] : noun[1];

  return (
    <nav aria-label="Paginação" className="flex items-center justify-between gap-4 pt-4 text-sm">
      <p className="text-muted">
        {total} {label}, página {page} de {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={`${basePath}?page=${page - 1}`} className="btn-secondary py-1.5">
            Anterior
          </Link>
        ) : (
          <span className="btn-secondary py-1.5 opacity-50" aria-disabled="true">
            Anterior
          </span>
        )}
        {page < totalPages ? (
          <Link href={`${basePath}?page=${page + 1}`} className="btn-secondary py-1.5">
            Próxima
          </Link>
        ) : (
          <span className="btn-secondary py-1.5 opacity-50" aria-disabled="true">
            Próxima
          </span>
        )}
      </div>
    </nav>
  );
}
