"use client";

import { cn } from "@/lib/utils";

// A modern, lightweight loading spinner component.
// Based on the component from loading-ui.
// MOD: Removed inline style animation and switched to Tailwind utility class.
function ConcentricRing({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      role="status"
      // MOD: The animation is now driven by a utility class defined in tailwind.config.ts
      className={cn("relative inline-block animate-concentric-ring", className)}
      {...props}
    >
      {/* Outer, lighter ring */}
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border-2 border-current"
        style={{ opacity: 0.25 }}
      />
      {/* Inner, moving part of the ring */}
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 rounded-full border-2 border-transparent border-b-current"
        style={{
          width: "83.333%",
          height: "83.333%",
          transform: "translate(-50%, -50%)",
        }}
      />
      <span className="sr-only">Loading...</span>
    </span>
  );
}

export { ConcentricRing };
