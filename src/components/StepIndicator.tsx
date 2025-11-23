import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  name: string;
  description: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  onStepClick: (stepId: number) => void;
  compact?: boolean;
}

export function StepIndicator({ steps, currentStep, onStepClick, compact = false }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className={compact ? "" : "mb-8"}>
      <ol className={cn("flex items-center justify-center", compact ? "space-x-2" : "space-x-4")}>
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center">
            {index > 0 && (
              <div className={cn("h-0.5 bg-border", compact ? "w-6 mx-1" : "w-12 mx-2")} />
            )}
            <button
              onClick={() => onStepClick(step.id)}
              className={cn(
                "group flex flex-col items-center focus:outline-none",
                "transition-all duration-200"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center rounded-full border-2 transition-all",
                  compact ? "h-7 w-7" : "h-10 w-10",
                  currentStep === step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "border-success bg-success text-white"
                    : "border-border bg-background text-muted-foreground group-hover:border-primary"
                )}
              >
                {currentStep > step.id ? (
                  <Check className={compact ? "h-3 w-3" : "h-5 w-5"} />
                ) : (
                  <span className={cn("font-semibold", compact ? "text-xs" : "text-sm")}>{step.id}</span>
                )}
              </div>
              <div className={cn("text-center", compact ? "mt-1" : "mt-2")}>
                <p
                  className={cn(
                    "font-medium",
                    compact ? "text-xs" : "text-sm",
                    currentStep === step.id
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </p>
                {!compact && (
                  <p className="text-xs text-muted-foreground max-w-[120px]">
                    {step.description}
                  </p>
                )}
              </div>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
