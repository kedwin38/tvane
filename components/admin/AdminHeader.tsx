"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/brand/Mark";

const TABS = [
  { href: "/admin", label: "Health" },
  { href: "/admin/credentials", label: "Credentials" },
];

export function AdminHeader() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-hairline px-6 py-3">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Mark size={20} />
          <span className="text-sm font-semibold text-text-1">Tidevane Admin</span>
        </div>
        <nav className="flex items-center gap-1">
          {TABS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                pathname === t.href ? "bg-panel-raised text-text-1" : "text-text-3 hover:text-text-1"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      <form action="/api/admin/logout" method="POST">
        <button className="label-caps text-text-3 hover:text-text-1">Sign out</button>
      </form>
    </header>
  );
}
