'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`block rounded-md px-3 py-2 text-[15px] font-medium transition-colors ${
        active ? 'bg-paper/12 text-paper' : 'text-paper/75 hover:bg-paper/8 hover:text-paper'
      }`}
    >
      {children}
    </Link>
  );
}
