// src/app/(auth)/layout.tsx

// This layout is minimal because authentication pages don't need the main sidebar or header.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <main>
        {children}
      </main>
  )
}
