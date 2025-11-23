import { useState } from 'react';
import { Lock, Github, ChevronRight } from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Step1Import } from '@/components/steps/Step1Import';
import { Step2Rules } from '@/components/steps/Step2Rules';
import { Step3Analysis } from '@/components/steps/Step3Analysis';
import { StorageManager } from '@/components/StorageManager';
import { ConfigEditor } from '@/components/ConfigEditor';
import { Button } from '@/components/ui/button';
import { useFinanceStore } from '@/store/useFinanceStore';

const STEPS = [
  { id: 1, name: 'Import', description: 'Load data & map columns' },
  { id: 2, name: 'Rules', description: 'Categorize transactions' },
  { id: 3, name: 'Analysis', description: 'Visualize & export' },
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const { applyRules } = useFinanceStore();

  const handleNext = () => {
    applyRules();
    setCurrentStep(currentStep + 1);
  };

  return (
    <div className="h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="px-6 py-3">
          <div className="flex items-center">
            <div className="flex items-center gap-3 flex-1">
              <div>
                <h1 className="text-xl font-bold text-foreground">Bookkeeping Buddy</h1>
                <p className="text-xs text-muted-foreground">Privacy-First Financial Analysis</p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success rounded-lg">
                <Lock className="w-3 h-3" />
                <span className="text-xs font-medium">100% Client-Side</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} compact />
            </div>
            <div className="flex items-center gap-3 flex-1 justify-end">
              {currentStep === 1 && (
                <Button size="sm" onClick={handleNext}>
                  Next: Configure Rules
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {currentStep === 2 && (
                <Button size="sm" onClick={handleNext}>
                  Next: Analyze Transactions
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              <ConfigEditor />
              <StorageManager />
              <a
                href="https://github.com/BookkeepingBuddy/bookkeepingbuddy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-2 py-2">
        <div>
          {currentStep === 1 && <Step1Import onNext={() => setCurrentStep(2)} />}
          {currentStep === 2 && <Step2Rules />}
          {currentStep === 3 && <Step3Analysis />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-2 py-2">
        <div className="px-6 text-center text-sm text-muted-foreground">
          <p>All data processing happens in your browser. No data is ever sent to any server.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
