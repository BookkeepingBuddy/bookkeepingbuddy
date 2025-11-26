import { HelpCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const EXAMPLES = [
  {
    code: 'return row.description.includes("Ticket");',
    explanation: 'Match if description contains "Ticket"',
  },
  {
    code: 'return row.amount > 1500;',
    explanation: 'Match if amount is greater than 1500',
  },
  {
    code: 'return row.description.toLowerCase().includes("amazon");',
    explanation: 'Case-insensitive search for "amazon" in description',
  },
  {
    code: 'return row.amount < 0;',
    explanation: 'Match negative amounts (expenses)',
  },
  {
    code: 'return row.amount > 0;',
    explanation: 'Match positive amounts (income)',
  },
  {
    code: 'return row.filename === "personal";',
    explanation: 'Match transactions only from the file named "personal"',
  },
  {
    code: 'return row.description.match(/\\d{4}/);',
    explanation: 'Match if description contains a 4-digit number',
  },
  {
    code: 'return row.month === 1;',
    explanation: 'Match transactions in January',
  },
  {
    code: 'return row.year === 2024 && row.month === 12;',
    explanation: 'Match transactions from December 2024',
  },
  {
    code: 'return row.description.includes("ATM") && row.amount < 0;',
    explanation: 'Match ATM withdrawals',
  },
  {
    code: 'return row.amount >= 100 && row.amount <= 500;',
    explanation: 'Match amounts between 100 and 500',
  },
  {
    code: 'return row.description.startsWith("PAYPAL");',
    explanation: 'Match if description starts with "PAYPAL"',
  },
];

export function RuleHelpDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6">
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>JavaScript Rule Examples</DialogTitle>
          <DialogDescription>
            Write JavaScript code that returns true/false to match transactions. Use Shift+Enter to apply rules.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Available Properties:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li><code className="bg-background px-1 rounded">row.year</code> - Year as number (e.g., 2024)</li>
              <li><code className="bg-background px-1 rounded">row.month</code> - Month as number (1-12)</li>
              <li><code className="bg-background px-1 rounded">row.day</code> - Day as number (1-31)</li>
              <li><code className="bg-background px-1 rounded">row.date</code> - JavaScript Date object</li>
              <li><code className="bg-background px-1 rounded">row.dateString</code> - Date as YYYY-MM-DD string</li>
              <li><code className="bg-background px-1 rounded">row.amount</code> - Number (positive for income, negative for expenses)</li>
              <li><code className="bg-background px-1 rounded">row.description</code> - String with transaction description</li>
              <li><code className="bg-background px-1 rounded">row.filename</code> - String with the file name (useful for multi-file imports)</li>
              <li><code className="bg-background px-1 rounded">row.rawData.col0, row.rawData.col1, ...</code> - Raw column values by index</li>
              <li><code className="bg-background px-1 rounded">row.rawData.ColumnName, ...</code> - Raw column values by header name (if available)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Example Rules:</h4>
            <div className="space-y-3">
              {EXAMPLES.map((example, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <code className="text-sm bg-muted px-2 py-1 rounded block mb-2">
                    {example.code}
                  </code>
                  <p className="text-sm text-muted-foreground">{example.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
