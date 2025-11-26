import { useState, useEffect } from 'react';
import { Settings, Save, AlertCircle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFinanceStore } from '@/store/useFinanceStore';
import { toast } from 'sonner';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateConfig(configJson: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const config = JSON.parse(configJson);

    // Check for rules array
    if (!config.rules) {
      errors.push('Config must have "rules" property');
    } else if (!Array.isArray(config.rules)) {
      errors.push('rules must be an array');
    } else {
      config.rules.forEach((rule: any, index: number) => {
        if (!rule.id) {
          warnings.push(`Rule ${index + 1}: missing id`);
        }
        if (!rule.category) {
          warnings.push(`Rule ${index + 1}: missing category`);
        }
        if (!rule.jsCode) {
          warnings.push(`Rule ${index + 1}: missing jsCode`);
        } else {
          // Try to validate the JavaScript code
          try {
            new Function('row', rule.jsCode);
          } catch (e) {
            errors.push(`Rule ${index + 1} (${rule.category || 'unnamed'}): Invalid JavaScript - ${e}`);
          }
        }
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  } catch (e) {
    return { valid: false, errors: [`Invalid JSON: ${e}`], warnings: [] };
  }
}

export function ConfigEditor() {
  const { exportConfig, importConfig, applyRules } = useFinanceStore();
  const [open, setOpen] = useState(false);
  const [configText, setConfigText] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);

  useEffect(() => {
    if (open) {
      setConfigText(exportConfig());
      setValidation(null);
    }
  }, [open, exportConfig]);

  const handleValidate = () => {
    const result = validateConfig(configText);
    setValidation(result);
    return result.valid;
  };

  const handleSave = () => {
    const result = validateConfig(configText);
    setValidation(result);

    if (!result.valid) {
      toast.error('Config has errors. Please fix them before saving.');
      return;
    }

    try {
      importConfig(configText);
      applyRules();
      toast.success('Config saved and applied!');
      setOpen(false);
    } catch (err) {
      toast.error('Failed to import config');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Rules Configuration</DialogTitle>
          <DialogDescription>
            Edit your categorization rules directly as JSON. Column mappings are stored with each file.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4 mt-4">
          <Textarea
            value={configText}
            onChange={(e) => {
              setConfigText(e.target.value);
              setValidation(null);
            }}
            className="font-mono text-xs flex-1 min-h-[300px] resize-none"
            placeholder="Paste or edit your config JSON here..."
          />

          {validation && (
            <div className={`p-3 rounded-lg text-sm ${validation.valid ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
              {validation.valid ? (
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4" />
                  <span>Config is valid!</span>
                  {validation.warnings.length > 0 && (
                    <span className="text-muted-foreground">
                      ({validation.warnings.length} warning{validation.warnings.length > 1 ? 's' : ''})
                    </span>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    <span>Validation failed</span>
                  </div>
                  <ul className="list-disc list-inside text-xs space-y-0.5 ml-6">
                    {validation.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validation.warnings.length > 0 && validation.valid && (
                <div className="mt-2 text-xs text-muted-foreground">
                  <p className="font-medium">Warnings:</p>
                  <ul className="list-disc list-inside ml-2">
                    {validation.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleValidate}>
              Validate
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" />
              Save & Apply
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
