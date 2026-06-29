// src/app/(main)/master-data/layout.tsx
"use client";

export default function MasterDataLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  return (
    <div className="space-y-6">
        <div>{children}</div>
    </div>
  );
}
