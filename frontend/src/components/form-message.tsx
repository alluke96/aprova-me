export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-alert/30 bg-alert-tint px-4 py-3 text-sm font-medium text-alert"
    >
      {message}
    </p>
  );
}
