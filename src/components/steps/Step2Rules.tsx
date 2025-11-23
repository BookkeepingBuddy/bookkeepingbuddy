import { useState } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import { useFinanceStore, Rule } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { RuleHelpDialog } from '@/components/RuleHelpDialog';
import { AIPromptDialog } from '@/components/AIPromptDialog';

function SortableRuleItem({ rule }: { rule: Rule }) {
  const { updateRule, deleteRule, applyRules } = useFinanceStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCodeChange = (code: string) => {
    try {
      new Function('row', code);
      updateRule(rule.id, { jsCode: code, isValid: true, error: undefined });
    } catch (err: any) {
      updateRule(rule.id, { jsCode: code, isValid: false, error: err.message });
    }
  };

  const handleBlur = () => {
    if (rule.isValid) {
      applyRules();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-card border rounded-lg p-4 mb-3',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="mt-2 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Category</Label>
              <Input
                value={rule.category}
                onChange={(e) => updateRule(rule.id, { category: e.target.value })}
                placeholder="e.g., Housing"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-xs">Subcategory</Label>
              <Input
                value={rule.subcategory}
                onChange={(e) => updateRule(rule.id, { subcategory: e.target.value })}
                placeholder="e.g., Rent"
                className="h-8"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="text-xs">JavaScript Logic</Label>
              <RuleHelpDialog />
            </div>
            <Textarea
              value={rule.jsCode}
              onChange={(e) => handleCodeChange(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.shiftKey) {
                  e.preventDefault();
                  if (rule.isValid) {
                    applyRules();
                  }
                }
              }}
              placeholder='return row.description.includes("Ticket");\n// or\nreturn row.amount > 1500;'
              className={cn(
                'font-mono text-xs h-24',
                !rule.isValid && 'border-error border-2'
              )}
            />
            {!rule.isValid && rule.error && (
              <p className="text-xs text-error mt-1">{rule.error}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">Press Shift+Enter to apply</p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            deleteRule(rule.id);
            applyRules();
          }}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

export function Step2Rules() {
  const { rules, transactions, addRule, reorderRules, applyRules } = useFinanceStore();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [unmatchedFilter, setUnmatchedFilter] = useState('');
  const [unmatchedSort, setUnmatchedSort] = useState<'date' | 'amount-increasing' | 'amount-decreasing'>('date');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over.id);
      const newOrder = arrayMove(rules, oldIndex, newIndex);
      reorderRules(newOrder);
      applyRules();
    }
  };

  const matchedTransactions = transactions.filter((t) => t.category);
  const unmatchedTransactions = transactions
    .filter((t) => !t.category)
    .filter((t) => !unmatchedFilter || t.description.toLowerCase().includes(unmatchedFilter.toLowerCase()))
    .sort((a, b) => {
      if (unmatchedSort === 'date') {
        // Compare year, then month, then day
        if (a.year !== b.year) return a.year - b.year;
        if (a.month !== b.month) return a.month - b.month;
        return a.day - b.day;
      }
      if (unmatchedSort === 'amount-decreasing') {
        return b.amount - a.amount;
      }
      return a.amount - b.amount;
    });

  const filteredMatched =
    filterCategory === 'all'
      ? matchedTransactions
      : matchedTransactions.filter((t) => t.subcategory === filterCategory);

  const uniqueSubCategories = Array.from(new Set(matchedTransactions.map((t) => t.subcategory)));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
      {/* Left Sidebar - Rules List */}
      <div className="lg:col-span-1">
        <Card className="p-4 h-[calc(100vh-8.5rem)] flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <h3 className="text-lg font-semibold">Rules</h3>
            <div className="flex gap-2">
              <AIPromptDialog />
              <Button onClick={addRule} size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Rule
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rules.map((r) => r.id)} strategy={verticalListSortingStrategy}>
                {rules.map((rule) => (
                  <SortableRuleItem key={rule.id} rule={rule} />
                ))}
              </SortableContext>
            </DndContext>

            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No rules yet. Click "Add Rule" to start categorizing transactions.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* Main Area - Matched/Unmatched Tables */}
      <div className="lg:col-span-2 space-y-2">
        <Card className="p-4 h-[calc(50vh-7rem)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">
              Unmatched Transactions ({unmatchedTransactions.length})
            </h3>
            <div className="flex gap-2">
              <Input
                placeholder="Filter..."
                value={unmatchedFilter}
                onChange={(e) => setUnmatchedFilter(e.target.value)}
                className="w-32 h-8"
              />
              <Select value={unmatchedSort} onValueChange={(val: 'date' | 'amount-increasing' | 'amount-decreasing') => setUnmatchedSort(val)}>
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="amount-increasing">Sort by Amount Increasing</SelectItem>
                  <SelectItem value="amount-decreasing">Sort by Amount Decreasing</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="text-left p-2 w-24">Date</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2 w-24">Amount</th>
                </tr>
              </thead>
              <tbody>
                {unmatchedTransactions.map((t, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50">
                    <td className="p-2 whitespace-nowrap">{t.dateString}</td>
                    <td className="p-2">
                      <div className="break-words">{t.description}</div>
                    </td>
                    <td className="p-2 text-right whitespace-nowrap">{t.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {unmatchedTransactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {unmatchedFilter ? 'No matching transactions' : 'All transactions matched!'}
              </p>
            )}
          </div>
        </Card>

        <Card className="p-4 h-[calc(50vh-2rem)] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">
              Matched Transactions ({matchedTransactions.length})
            </h3>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All SubCategories</SelectItem>
                {uniqueSubCategories.map((cat) => (
                  <SelectItem key={cat} value={cat!}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="sticky top-0 bg-muted">
                <tr>
                  <th className="text-left p-2 w-24">Date</th>
                  <th className="text-left p-2">Description</th>
                  <th className="text-left p-2 w-24">Category</th>
                  <th className="text-left p-2 w-28">Subcategory</th>
                  <th className="text-right p-2 w-20">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatched.map((t, idx) => (
                  <tr key={idx} className="border-b border-border hover:bg-muted/50">
                    <td className="p-2 whitespace-nowrap">{t.dateString}</td>
                    <td className="p-2">
                      <div className="break-words">{t.description}</div>
                    </td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                        {t.category}
                      </span>
                    </td>
                    <td className="p-2 text-muted-foreground">{t.subcategory}</td>
                    <td className="p-2 text-right whitespace-nowrap">{t.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredMatched.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {filterCategory === 'all'
                  ? 'No matched transactions yet.'
                  : 'No transactions in this subcategory.'}
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
