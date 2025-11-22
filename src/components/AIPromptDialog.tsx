import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useFinanceStore } from '@/store/useFinanceStore';

export function AIPromptDialog() {
  const { exportConfig, transactions } = useFinanceStore();
  const [copied, setCopied] = useState(false);

  const unmatchedTransactions = transactions.filter((t) => !t.category);
  const sampleUnmatched = unmatchedTransactions.slice(0, 20).map((t) => ({
    date: t.dateString,
    amount: t.amount,
    description: t.description,
  }));

  const generatePrompt = () => {
    const configJson = exportConfig();

    return `You are helping me categorize financial transactions. I have a rule-based system where each rule has:
- **category**: A high-level category (e.g., "Housing", "Food", "Transport")
- **subcategory**: A more specific label (e.g., "Rent", "Groceries", "Public Transit")
- **jsCode**: JavaScript code that returns \`true\` if a transaction matches this rule

## Rule Interface

Each rule receives a \`row\` object with these properties:
- \`row.date\` - JavaScript Date object
- \`row.dateString\` - Date as "YYYY-MM-DD" string
- \`row.amount\` - Number (positive = income, negative = expense)
- \`row.description\` - String with the transaction description
- \`row.rawData\` - Object with all original columns (use \`row.rawData.columnName\`)

The jsCode must return \`true\` or \`false\`. Example:
\`\`\`javascript
return row.description.toLowerCase().includes("albert heijn");
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
              <li>Click the "Copy Prompt" button below</li>
              <li>Paste it into your preferred AI chatbot together with your transaction data</li>
              <li>The AI will analyze your unmatched transactions and suggest rules</li>
              <li>Copy the returned config JSON and import it using the config drop zone in Step 1</li>
            </ol>
          </div>

          <div className="bg-muted/50 border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-sm">Preview:</h4>
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
            </div>
            <pre className="text-xs overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto bg-background p-3 rounded">
              {generatePrompt()}
            </pre>
          </div>

          <div className="text-sm text-muted-foreground">
            <p><strong>Note:</strong> The prompt includes your current rules and up to 20 sample unmatched transactions. No transaction data is sent anywhere automatically - you control what you share.</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
