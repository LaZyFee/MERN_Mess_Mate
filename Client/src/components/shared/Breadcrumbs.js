"use client";

import { generateBreadcrumbs } from "@/helper/breadcrumbs";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Breadcrumbs() {
 const pathname = usePathname();
 const breadcrumbs = generateBreadcrumbs(pathname);

 return (
  <nav
   className="text-xs text-(--tm) mb-6 flex items-center gap-1.5"
   aria-label="Breadcrumb"
  >
   {breadcrumbs.map((breadcrumb, index) => (
    <span key={breadcrumb.href} className="flex items-center gap-1.5">
     {/* Separator */}
     {index > 0 && <span className="text-(--tm)">›</span>}

     {/* Last Item */}
     {index === breadcrumbs.length - 1 ? (
      <span className="text-(--tm)">{breadcrumb.label}</span>
     ) : (
      <Link
       href={breadcrumb.href}
       className="text-(--p) hover:underline font-medium"
      >
       {breadcrumb.label}
      </Link>
     )}
    </span>
   ))}
  </nav>
 );
}
