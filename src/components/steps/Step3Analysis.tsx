import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface PivotData {
  category: string;
  subcategory: string;
  months: Record<string, number>;
  total: number;
  average: number;
}

export function Step3Analysis() {
  const { transactions, selectedMonth, hoveredMonth, setSelectedMonth, setHoveredMonth, exportConfig } =
    useFinanceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());

  // Build pivot data
  const pivotData = useMemo(() => {
    const data: Record<string, Record<string, PivotData>> = {};

    transactions
      .filter((t) => t.category)
      .forEach((t) => {
        const category = t.category!;
        const subcategory = t.subcategory || 'Uncategorized';
        const month = t.date.substring(0, 7); // YYYY-MM

        if (!data[category]) data[category] = {};
        if (!data[category][subcategory]) {
          data[category][subcategory] = {
            category,
            subcategory,
            months: {},
            total: 0,
            average: 0,
          };
        }

        if (!data[category][subcategory].months[month]) {
          data[category][subcategory].months[month] = 0;
        }
        data[category][subcategory].months[month] += Math.abs(t.amount);
        data[category][subcategory].total += Math.abs(t.amount);
      });

    // Calculate averages
    Object.values(data).forEach((subs) => {
      Object.values(subs).forEach((item) => {
        const monthCount = Object.keys(item.months).length;
        item.average = monthCount > 0 ? item.total / monthCount : 0;
      });
    });

    return data;
  }, [transactions]);

  const allMonths = useMemo(() => {
    const months = new Set<string>();
    Object.values(pivotData).forEach((subs) => {
      Object.values(subs).forEach((item) => {
        Object.keys(item.months).forEach((m) => months.add(m));
      });
    });
    return Array.from(months).sort();
  }, [pivotData]);

  const toggleCategory = (category: string) => {
    const newSet = new Set(expandedCategories);
    if (newSet.has(category)) {
      newSet.delete(category);
    } else {
      newSet.add(category);
    }
    setExpandedCategories(newSet);
  };

  const toggleSubcategory = (key: string) => {
    const newSet = new Set(expandedSubcategories);
    if (newSet.has(key)) {
      newSet.delete(key);
    } else {
      newSet.add(key);
    }
    setExpandedSubcategories(newSet);
  };

  // Radar chart data
  const radarDataCategories = useMemo(() => {
    const getDistribution = (month: string | null) => {
      if (!month) return [];
      const categoryTotals: Record<string, number> = {};
      Object.keys(pivotData).forEach((cat) => {
        categoryTotals[cat] = 0;
        Object.values(pivotData[cat]).forEach((sub) => {
          categoryTotals[cat] += sub.months[month] || 0;
        });
      });
      return Object.keys(categoryTotals).map((cat) => ({
        category: cat,
        value: categoryTotals[cat],
      }));
    };

    const selected = getDistribution(selectedMonth);
    const hovered = getDistribution(hoveredMonth);

    // Merge
    const allCats = new Set([...selected.map((d) => d.category), ...hovered.map((d) => d.category)]);
    return Array.from(allCats).map((cat) => ({
      category: cat,
      selected: selected.find((d) => d.category === cat)?.value || 0,
      hovered: hovered.find((d) => d.category === cat)?.value || 0,
    }));
  }, [pivotData, selectedMonth, hoveredMonth]);

  const radarDataSubcategories = useMemo(() => {
    const getDistribution = (month: string | null) => {
      if (!month) return [];
      const subTotals: Record<string, number> = {};
      Object.values(pivotData).forEach((subs) => {
        Object.entries(subs).forEach(([subName, subData]) => {
          subTotals[subName] = (subTotals[subName] || 0) + (subData.months[month] || 0);
        });
      });
      return Object.keys(subTotals).map((sub) => ({
        subcategory: sub,
        value: subTotals[sub],
      }));
    };

    const selected = getDistribution(selectedMonth);
    const hovered = getDistribution(hoveredMonth);

    const allSubs = new Set([...selected.map((d) => d.subcategory), ...hovered.map((d) => d.subcategory)]);
    return Array.from(allSubs).map((sub) => ({
      subcategory: sub,
      selected: selected.find((d) => d.subcategory === sub)?.value || 0,
      hovered: hovered.find((d) => d.subcategory === sub)?.value || 0,
    }));
  }, [pivotData, selectedMonth, hoveredMonth]);

  const handleExportData = () => {
    const csv = [
      ['Date', 'Amount', 'Description', 'Category', 'Subcategory'].join(','),
      ...transactions.map((t) =>
        [t.date, t.amount, `"${t.description}"`, t.category || '', t.subcategory || ''].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transactions.csv';
    a.click();
    toast.success('Data exported');
  };

  const handleExportConfig = () => {
    const config = exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'config.json';
    a.click();
    toast.success('Config exported');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Main Area - Pivot Table */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Pivot Table</h3>
            <div className="flex gap-2">
              <Button onClick={handleExportData} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Export Data
              </Button>
              <Button onClick={handleExportConfig} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-1" />
                Export Config
              </Button>
            </div>
          </div>

          <Input
            placeholder="Search transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-4"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2 border">Category / Subcategory</th>
                  {allMonths.map((month) => (
                    <th
                      key={month}
                      className={cn(
                        'text-right p-2 border cursor-pointer transition-colors',
                        selectedMonth === month && 'bg-primary/20',
                        hoveredMonth === month && 'bg-accent/20'
                      )}
                      onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
                      onMouseEnter={() => setHoveredMonth(month)}
                      onMouseLeave={() => setHoveredMonth(null)}
                    >
                      {month}
                    </th>
                  ))}
                  <th className="text-right p-2 border">Total</th>
                  <th className="text-right p-2 border">Avg</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(pivotData).map((category) => {
                  const isExpanded = expandedCategories.has(category);
                  const categoryTotal = Object.values(pivotData[category]).reduce(
                    (sum, sub) => sum + sub.total,
                    0
                  );
                  const categoryAvg = Object.values(pivotData[category]).reduce(
                    (sum, sub) => sum + sub.average,
                    0
                  );

                  return (
                    <React.Fragment key={category}>
                      <tr className="bg-primary/5 font-semibold hover:bg-primary/10 cursor-pointer">
                        <td className="p-2 border" onClick={() => toggleCategory(category)}>
                          <div className="flex items-center">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 mr-1" />
                            ) : (
                              <ChevronRight className="w-4 h-4 mr-1" />
                            )}
                            {category}
                          </div>
                        </td>
                        {allMonths.map((month) => {
                          const monthTotal = Object.values(pivotData[category]).reduce(
                            (sum, sub) => sum + (sub.months[month] || 0),
                            0
                          );
                          return (
                            <td
                              key={month}
                              className={cn(
                                'text-right p-2 border',
                                selectedMonth === month && 'bg-primary/20',
                                hoveredMonth === month && 'bg-accent/20'
                              )}
                              onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
                              onMouseEnter={() => setHoveredMonth(month)}
                              onMouseLeave={() => setHoveredMonth(null)}
                            >
                              {monthTotal > 0 ? monthTotal.toFixed(2) : '-'}
                            </td>
                          );
                        })}
                        <td className="text-right p-2 border">{categoryTotal.toFixed(2)}</td>
                        <td className="text-right p-2 border">{categoryAvg.toFixed(2)}</td>
                      </tr>

                      {isExpanded &&
                        Object.entries(pivotData[category]).map(([subcategory, subData]) => {
                          const subKey = `${category}-${subcategory}`;
                          const isSubExpanded = expandedSubcategories.has(subKey);

                          return (
                            <React.Fragment key={subKey}>
                              <tr className="bg-secondary/5 hover:bg-secondary/10 cursor-pointer">
                                <td className="p-2 border pl-8" onClick={() => toggleSubcategory(subKey)}>
                                  <div className="flex items-center">
                                    {isSubExpanded ? (
                                      <ChevronDown className="w-4 h-4 mr-1" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 mr-1" />
                                    )}
                                    {subcategory}
                                  </div>
                                </td>
                                {allMonths.map((month) => (
                                  <td
                                    key={month}
                                    className={cn(
                                      'text-right p-2 border',
                                      selectedMonth === month && 'bg-primary/20',
                                      hoveredMonth === month && 'bg-accent/20'
                                    )}
                                    onClick={() => setSelectedMonth(selectedMonth === month ? null : month)}
                                    onMouseEnter={() => setHoveredMonth(month)}
                                    onMouseLeave={() => setHoveredMonth(null)}
                                  >
                                    {subData.months[month] ? subData.months[month].toFixed(2) : '-'}
                                  </td>
                                ))}
                                <td className="text-right p-2 border">{subData.total.toFixed(2)}</td>
                                <td className="text-right p-2 border">{subData.average.toFixed(2)}</td>
                              </tr>

                              {isSubExpanded &&
                                transactions
                                  .filter(
                                    (t) =>
                                      t.category === category &&
                                      (t.subcategory || 'Uncategorized') === subcategory &&
                                      (!searchQuery ||
                                        t.description.toLowerCase().includes(searchQuery.toLowerCase()))
                                  )
                                  .map((t, idx) => (
                                    <tr key={idx} className="hover:bg-muted/50 text-xs">
                                      <td className="p-2 border pl-12 truncate">{t.description}</td>
                                      {allMonths.map((month) => (
                                        <td
                                          key={month}
                                          className={cn(
                                            'text-right p-2 border',
                                            selectedMonth === month && 'bg-primary/20',
                                            hoveredMonth === month && 'bg-accent/20'
                                          )}
                                          onMouseEnter={() => setHoveredMonth(month)}
                                          onMouseLeave={() => setHoveredMonth(null)}
                                        >
                                          {t.date.startsWith(month) ? Math.abs(t.amount).toFixed(2) : '-'}
                                        </td>
                                      ))}
                                      <td className="text-right p-2 border">{Math.abs(t.amount).toFixed(2)}</td>
                                      <td className="text-right p-2 border">-</td>
                                    </tr>
                                  ))}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Right Sidebar - Radar Charts */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">Categories Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarDataCategories}>
              <PolarGrid />
              <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis />
              <Radar
                name="Selected"
                dataKey="selected"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary))"
                fillOpacity={0.6}
              />
              <Radar
                name="Hovered"
                dataKey="hovered"
                stroke="hsl(var(--accent))"
                fill="transparent"
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs mt-2 justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-primary rounded" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-accent rounded" />
              <span>Hovered</span>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-2">Subcategories Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <RadarChart data={radarDataSubcategories}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subcategory" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis />
              <Radar
                name="Selected"
                dataKey="selected"
                stroke="hsl(var(--secondary))"
                fill="hsl(var(--secondary))"
                fillOpacity={0.6}
              />
              <Radar
                name="Hovered"
                dataKey="hovered"
                stroke="hsl(var(--accent))"
                fill="transparent"
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs mt-2 justify-center">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-secondary rounded" />
              <span>Selected</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 border-2 border-accent rounded" />
              <span>Hovered</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-primary-light">
          <h3 className="text-sm font-semibold mb-2">Privacy Notice</h3>
          <p className="text-xs text-muted-foreground">
            All data is processed locally in your browser. Nothing is sent to any server. Your financial information
            remains completely private.
          </p>
        </Card>
      </div>
    </div>
  );
}
