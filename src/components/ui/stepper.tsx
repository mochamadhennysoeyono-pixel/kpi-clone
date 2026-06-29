"use client"

import { cn } from "@/lib/utils"
import { Check, type LucideIcon } from "lucide-react"
import * as React from "react"

interface Step {
  label: string
  icon: LucideIcon
}

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[]
  activeStep: number
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  (props, ref) => {
    const { className, steps, activeStep, ...divProps } = props

    return (
      <div
        ref={ref}
        className={cn(
          "flex w-full items-center justify-center gap-x-2 gap-y-4", // Base styles
          className // Styles from props can override, e.g. add flex-wrap
        )}
        {...divProps}
      >
        {steps.map((step, i) => {
          const Icon = step.icon
          const isCompleted = activeStep > i

          return (
            <div
              key={i}
              className={cn(
                "flex flex-1 items-center justify-center gap-3 transition-colors min-w-[120px]",
                i !== 0 &&
                  "before:h-px before:w-full before:bg-border before:content-['']",
                "before:data-[completed=true]:bg-primary"
              )}
              data-completed={isCompleted}
              data-active={activeStep === i}
            >
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-full border text-xs text-muted-foreground",
                  "data-[completed=true]:border-primary data-[completed=true]:bg-primary data-[completed=true]:text-white",
                  "data-[active=true]:border-primary"
                )}
                data-completed={isCompleted}
                data-active={activeStep === i}
              >
                {isCompleted ? <Check /> : <Icon />}
              </div>
              <div className="hidden sm:inline-block">
                <p
                  className={cn(
                    "text-sm",
                    isCompleted && "text-primary",
                    activeStep === i && "font-semibold text-primary"
                  )}
                >
                  {step.label}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }
)

Stepper.displayName = "Stepper"

export { Stepper, type Step }
