import { useState } from 'react';
import { Lock } from 'lucide-react';
import { StepIndicator } from '@/components/StepIndicator';
import { Step1Import } from '@/components/steps/Step1Import';
import { Step2Rules } from '@/components/steps/Step2Rules';
import { Step3Analysis } from '@/components/steps/Step3Analysis';

const STEPS = [
  { id: 1, name: 'Import', description: 'Load data & map columns' },
  { id: 2, name: 'Rules', description: 'Categorize transactions' },
  { id: 3, name: 'Analysis', description: 'Visualize & export' },
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">FinanceFlow</h1>
              <p className="text-sm text-muted-foreground">Privacy-First Financial Analysis Tool</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-success/10 text-success rounded-lg">
              <Lock className="w-4 h-4" />
              <span className="text-sm font-medium">100% Client-Side</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <StepIndicator steps={STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />

        <div className="mt-8">
          {currentStep === 1 && <Step1Import onNext={() => setCurrentStep(2)} />}
          {currentStep === 2 && <Step2Rules />}
          {currentStep === 3 && <Step3Analysis />}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>All data processing happens in your browser. No data is ever sent to any server.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
