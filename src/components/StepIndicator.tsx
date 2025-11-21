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
}

export function StepIndicator({ steps, currentStep, onStepClick }: StepIndicatorProps) {
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-center">
            {index > 0 && (
              <div className="w-12 h-0.5 bg-border mx-2" />
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
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  currentStep === step.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : currentStep > step.id
                    ? "border-success bg-success text-white"
                    : "border-border bg-background text-muted-foreground group-hover:border-primary"
                )}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p
                  className={cn(
                    "text-sm font-medium",
                    currentStep === step.id
                      ? "text-primary"
                      : "text-muted-foreground"
                  )}
                >
                  {step.name}
                </p>
                <p className="text-xs text-muted-foreground max-w-[120px]">
                  {step.description}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
