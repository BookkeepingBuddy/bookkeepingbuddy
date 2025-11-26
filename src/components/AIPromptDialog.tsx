import { useState } from 'react';
import { Sparkles, Copy, Check, Download, Upload } from 'lucide-react';
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

export function AIPromptDialog() {
  const { exportConfig, transactions, importConfig, applyRules } = useFinanceStore();
  const [copied, setCopied] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');

  const unmatchedTransactions = transactions.filter((t) => !t.category);
  const sampleUnmatched = unmatchedTransactions.slice(0, 20).map((t) => ({
    date: t.dateString,
    year: t.year,
    month: t.month,
    day: t.day,
    amount: t.amount,
    description: t.description,
  }));

  const generatePrompt = () => {
    const configJson = exportConfig();

    const exampleRules = [
      {
        id: "rule-example-1",
        category: "Food",
        subcategory: "Groceries",
        jsCode: 'return row.description.toLowerCase().includes("albert heijn");',
        isValid: true
      },
      {
        id: "rule-example-2",
        category: "Housing",
        subcategory: "Rent",
        jsCode: 'return row.amount < -1000 && row.description.toLowerCase().includes("rent");',
        isValid: true
      },
      {
        id: "rule-example-3",
        category: "Entertainment",
        subcategory: "Streaming",
        jsCode: 'return row.description.toLowerCase().includes("netflix");',
        isValid: true
      },
      {
        id: "rule-example-4",
        category: "Transport",
        subcategory: "Public Transit",
        jsCode: 'return row.description.toLowerCase().includes("ns ") || row.description.toLowerCase().includes("gvb");',
        isValid: true
      },
      {
        id: "rule-example-5",
        category: "Income",
        subcategory: "Salary",
        jsCode: 'return row.amount > 0 && row.description.toLowerCase().includes("salaris");',
        isValid: true
      },
      {
        id: "rule-example-6",
        category: "Cash",
        subcategory: "ATM Withdrawal",
        jsCode: 'return row.description.includes("ATM") && row.amount < 0;',
        isValid: true
      }
    ];

    return `You are helping me categorize financial transactions. I have a rule-based system where each rule has:
- **id**: Unique identifier (use format "rule-{timestamp}")
- **category**: A high-level category (e.g., "Housing", "Food", "Transport")
- **subcategory**: A more specific label (e.g., "Rent", "Groceries", "Public Transit")
- **jsCode**: JavaScript code that returns \`true\` if a transaction matches this rule
- **isValid**: Always set to \`true\` for valid rules

## Rule Interface

Each rule receives a \`row\` object with these properties:
- \`row.year\` - Year as number (e.g., 2024)
- \`row.month\` - Month as number (1-12)
- \`row.day\` - Day as number (1-31)
- \`row.date\` - JavaScript Date object
- \`row.dateString\` - Date as "YYYY-MM-DD" string
- \`row.amount\` - Number (positive = income, negative = expense)
- \`row.description\` - String with the transaction description
- \`row.rawData\` - Object with all original columns (use \`row.rawData.columnName\`)

## Example Rules (JSON structure)

\`\`\`json
${JSON.stringify(exampleRules, null, 2)}
\`\`\`

## IMPORTANT: Rule Ordering

Rules are evaluated in order from top to bottom. The **first rule that matches** assigns the category.
This means:
1. More specific rules should come BEFORE general rules
2. If you have a rule for "Netflix" (Entertainment > Streaming) and a general rule for any subscription, put Netflix first
3. Order matters for correct categorization

## Your Task

**ONLY add new rules** to the existing configuration. Do NOT modify or remove existing rules.

Analyze the unmatched transactions below and suggest new rules that would categorize them appropriately.
IF UNSURE, ASK THE USER TO CONFIRM THE NEW RULES.
Return the complete configuration JSON with:
1. All existing rules preserved in their original order
2. New rules appended at appropriate positions (consider rule ordering!)

## Current Configuration

\`\`\`json
${configJson}
\`\`\`

Please analyze these transactions and provide an updated configuration JSON with new rules added. For each new rule you add, briefly explain why you created it.`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatePrompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownloadUnmatched = () => {
    const data = JSON.stringify(sampleUnmatched, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unmatched-transactions.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = () => {
    try {
      const config = JSON.parse(importText);
      
      // Import rules globally if present
      if (config.rules && Array.isArray(config.rules)) {
        const { rules } = useFinanceStore.getState();
        useFinanceStore.setState({ rules: config.rules });
      }
      
      applyRules();
      toast.success('Configuration imported successfully!');
      setImportText('');
      setShowImport(false);
    } catch (err) {
      toast.error('Invalid JSON. Please check your input.');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Sparkles className="w-4 h-4 mr-1" />
          AI Help
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Rules with AI</DialogTitle>
          <DialogDescription>
            Copy this prompt and paste it into ChatGPT, Claude, or another AI assistant to help generate categorization rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">How to use:</h4>
            <ol className="text-sm space-y-1 text-muted-foreground list-decimal list-inside">
              <li>Click "Copy Prompt" and paste it into your preferred AI chatbot</li>
              <li>Download the unmatched transactions and paste them after the prompt</li>
              <li>The AI will analyze the transactions and suggest new rules</li>
              <li>Copy the returned config JSON and use "Paste Config" below to import it</li>
            </ol>
          </div>

          <div className="bg-muted/50 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Preview:</h4>
              <div className="flex gap-2">
                <Button onClick={handleCopy} size="sm" variant="outline">
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copy Prompt
                    </>
                  )}
                </Button>
                <Button onClick={handleDownloadUnmatched} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-1" />
                  Unmatched ({unmatchedTransactions.length})
                </Button>
              </div>
            </div>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto bg-background p-3 rounded">
              {generatePrompt()}
            </pre>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Note:</strong> The prompt includes your current rules and up to 20 sample unmatched transactions. No transaction data is sent anywhere automatically - you control what you share.</p>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Import AI Response</h4>
              <Button onClick={() => setShowImport(!showImport)} size="sm" variant="outline">
                <Upload className="w-4 h-4 mr-1" />
                {showImport ? 'Hide' : 'Paste Config'}
              </Button>
            </div>
            {showImport && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste the config JSON from the AI here..."
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="font-mono text-xs h-48"
                />
                <Button onClick={handleImportConfig} className="w-full" disabled={!importText.trim()}>
                  Import Configuration
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
