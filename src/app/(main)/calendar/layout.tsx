// src/app/(main)/calendar/layout.tsx

export default function CalendarLayout({ children }: { children: React.ReactNode; }) {
  return (
    <div className="flex flex-col flex-1 h-full">
        {children}
    </div>
  );
}
