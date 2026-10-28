/** Confirmação curta depois de salvar ou excluir. */
export function Notice({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="status"
      className="rounded-md border border-cedula/30 bg-cedula-tint px-4 py-3 text-sm font-medium text-cedula"
    >
      {children}
    </p>
  );
}
