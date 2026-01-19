import React, { useState, useEffect } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, PieChart,
  Edit, Save, X, AlertCircle, Calculator, RefreshCw
} from 'lucide-react';
import { Card, Button, Input, Badge } from './UI';
import { FinancialRecord, AreaFinancials, Area, Application, FundingSimulation } from '../types';
import { formatCurrency } from '../utils';
import { DEFAULT_AREA_BUDGETS, PRIORITY_CATEGORIES, getAreaColor } from '../constants';

interface FinancialDashboardProps {
  roundId: string;
  userRole: 'admin' | 'committee';
  userArea?: Area;
  financials?: FinancialRecord;
  applications?: Application[];
  onSaveFinancials?: (financials: FinancialRecord) => Promise<void>;
}

/**
 * Financial Management Dashboard (PRD 4.4)
 * Admin: Full edit access to all financial figures
 * Committee: Read-only view filtered to their area
 */
export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  roundId,
  userRole,
  userArea,
  financials,
  applications = [],
  onSaveFinancials
}) => {
  const isAdmin = userRole === 'admin';
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<FinancialRecord>>({});
  const [saving, setSaving] = useState(false);
  const [simulationApp, setSimulationApp] = useState<string | null>(null);

  const buildAreaMap = (base: Record<string, number>, overrides?: Record<string, number>) => {
    const merged: Record<string, number> = { ...base };
    if (overrides) {
      Object.entries(overrides).forEach(([area, value]) => {
        merged[area] = value;
      });
    }
    return merged;
  };

  const sumValues = (values: Record<string, number>) =>
    Object.values(values).reduce((total, value) => total + value, 0);

  const calculateSpendByAreaFromApps = () => {
    const spendTotals: Record<string, number> = {};

    Object.keys(DEFAULT_AREA_BUDGETS).forEach(area => {
      spendTotals[area] = 0;
    });

    applications.forEach(app => {
      if (app.status === 'Funded') {
        spendTotals[app.area] = (spendTotals[app.area] || 0) + app.amountRequested;
      }
    });

    return spendTotals;
  };

  const baseBudgetByArea = financials?.budgetByArea || DEFAULT_AREA_BUDGETS;
  const computedSpendByArea = calculateSpendByAreaFromApps();
  const hasStoredSpendByArea = financials?.spendByArea && Object.keys(financials.spendByArea).length > 0;
  const baseSpendByArea = hasStoredSpendByArea ? financials!.spendByArea : computedSpendByArea;
  const mergedBudgetByArea = buildAreaMap(baseBudgetByArea, editData.budgetByArea);
  const mergedSpendByArea = buildAreaMap(baseSpendByArea, editData.spendByArea);
  const effectiveBudgetByArea = isEditing ? mergedBudgetByArea : baseBudgetByArea;
  const effectiveSpendByArea = isEditing ? mergedSpendByArea : baseSpendByArea;

  // Calculate area financials from applications and configured budgets
  const calculateAreaFinancials = (): AreaFinancials[] => {
    const areas: Record<string, AreaFinancials> = {};

    Object.entries(DEFAULT_AREA_BUDGETS).forEach(([area]) => {
      const allocated = effectiveBudgetByArea[area] ?? DEFAULT_AREA_BUDGETS[area];
      const spent = effectiveSpendByArea[area] ?? 0;

      areas[area] = {
        area: area as Area,
        allocated,
        spent,
        remaining: allocated - spent,
        projectCount: 0,
        pendingRequests: 0
      };
    });

    // Calculate project counts from applications
    applications.forEach(app => {
      const area = app.area;
      if (areas[area]) {
        if (app.status === 'Funded') {
          areas[area].projectCount += 1;
        } else if (app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2') {
          areas[area].pendingRequests += app.amountRequested;
        }
      }
    });

    // Filter for committee view
    if (!isAdmin && userArea) {
      return Object.values(areas).filter(a => a.area === userArea);
    }

    return Object.values(areas);
  };

  // Calculate spend by priority
  const calculatePrioritySpend = (): Record<string, number> => {
    const byPriority: Record<string, number> = {};

    PRIORITY_CATEGORIES.forEach(cat => {
      byPriority[cat] = 0;
    });

    applications
      .filter(app => app.status === 'Funded')
      .forEach(app => {
        const priority = app.priority || 'Other';
        byPriority[priority] = (byPriority[priority] || 0) + app.amountRequested;
      });

    return byPriority;
  };

  // Simulate funding impact
  const simulateFunding = (appId: string): FundingSimulation | null => {
    const app = applications.find(a => a.id === appId);
    if (!app) return null;

    const areaFinancials = calculateAreaFinancials().find(a => a.area === app.area);
    const prioritySpend = calculatePrioritySpend();

    return {
      applicationId: appId,
      amountRequested: app.amountRequested,
      remainingAfterApproval: (areaFinancials?.remaining || 0) - app.amountRequested,
      exceedsBudget: app.amountRequested > (areaFinancials?.remaining || 0),
      priorityImpact: {
        category: app.priority || 'Other',
        currentSpend: prioritySpend[app.priority || 'Other'] || 0,
        newSpend: (prioritySpend[app.priority || 'Other'] || 0) + app.amountRequested
      }
    };
  };

  const areaFinancials = calculateAreaFinancials();
  const prioritySpend = calculatePrioritySpend();
  const derivedTotalBudget = sumValues(effectiveBudgetByArea);
  const derivedTotalSpent = sumValues(effectiveSpendByArea);
  const totalBudget = financials?.budgetByArea ? derivedTotalBudget : (financials?.totalFunding || derivedTotalBudget);
  const totalSpent = hasStoredSpendByArea ? derivedTotalSpent : (financials?.totalSpent || derivedTotalSpent);
  const displayTotalBudget = isEditing ? derivedTotalBudget : totalBudget;
  const displayTotalSpent = isEditing ? derivedTotalSpent : totalSpent;
  const remaining = displayTotalBudget - displayTotalSpent;

  // Start editing mode
  const handleStartEdit = () => {
    setEditData({
      totalFunding: totalBudget,
      totalSpent: totalSpent,
      budgetByArea: baseBudgetByArea,
      spendByArea: baseSpendByArea,
      spendByPriority: financials?.spendByPriority || prioritySpend
    });
    setIsEditing(true);
  };

  // Save changes
  const handleSave = async () => {
    if (!onSaveFinancials) return;

    setSaving(true);
    try {
      const nextBudgetByArea = buildAreaMap(baseBudgetByArea, editData.budgetByArea);
      const nextSpendByArea = buildAreaMap(baseSpendByArea, editData.spendByArea);
      const nextTotalFunding = sumValues(nextBudgetByArea);
      const nextTotalSpent = sumValues(nextSpendByArea);

      await onSaveFinancials({
        id: roundId,
        roundId,
        totalFunding: nextTotalFunding,
        totalSpent: nextTotalSpent,
        remainingPot: nextTotalFunding - nextTotalSpent,
        budgetByArea: nextBudgetByArea,
        spendByArea: nextSpendByArea,
        spendByPriority: editData.spendByPriority || prioritySpend,
        updatedAt: Date.now(),
        updatedBy: 'admin'
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save financials:', error);
    } finally {
      setSaving(false);
    }
  };

  // Get simulation result
  const simulation = simulationApp ? simulateFunding(simulationApp) : null;

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-purple-900">Financial Dashboard</h2>
          <p className="text-gray-600">
            {isAdmin ? 'Manage funding allocation and track spending' : `Budget overview for ${userArea}`}
          </p>
        </div>
        {isAdmin && !isEditing && (
          <Button onClick={handleStartEdit}>
            <Edit size={18} />
            Edit Figures
          </Button>
        )}
        {isAdmin && isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setIsEditing(false)}>
              <X size={18} />
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Budget */}
        <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign size={24} />
            <span className="text-sm font-semibold text-purple-200">Total Budget</span>
          </div>
          {isEditing ? (
            <Input
              type="number"
              value={displayTotalBudget}
              readOnly
              className="text-2xl font-bold bg-white/20 border-white/30 text-white"
            />
          ) : (
            <div className="text-3xl font-bold">{formatCurrency(displayTotalBudget)}</div>
          )}
        </Card>

        {/* Total Spent */}
        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp size={24} />
            <span className="text-sm font-semibold text-amber-200">Total Spent</span>
          </div>
          {isEditing ? (
            <Input
              type="number"
              value={displayTotalSpent}
              readOnly
              className="text-2xl font-bold bg-white/20 border-white/30 text-white"
            />
          ) : (
            <div className="text-3xl font-bold">{formatCurrency(displayTotalSpent)}</div>
          )}
          <div className="text-sm text-amber-200 mt-1">
            {Math.round((displayTotalSpent / displayTotalBudget) * 100)}% of budget
          </div>
        </Card>

        {/* Remaining */}
        <Card className={`bg-gradient-to-br ${remaining >= 0 ? 'from-teal-500 to-teal-600' : 'from-red-500 to-red-600'} text-white`}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown size={24} />
            <span className="text-sm font-semibold text-teal-200">Remaining</span>
          </div>
          <div className="text-3xl font-bold">{formatCurrency(remaining)}</div>
          {remaining < 0 && (
            <div className="flex items-center gap-1 text-sm text-red-200 mt-1">
              <AlertCircle size={14} />
              Over budget!
            </div>
          )}
        </Card>
      </div>

      {/* Area Breakdown */}
      <Card>
        <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
          <PieChart size={20} />
          Budget by Area
        </h3>
        <div className="space-y-4">
          {areaFinancials.map(area => {
            const percentage = area.allocated > 0 ? (area.spent / area.allocated) * 100 : 0;
            const isOverBudget = area.spent > area.allocated;
            const areaColor = getAreaColor(area.area);

            return (
              <div key={area.area} className="space-y-2 p-3 rounded-lg border-l-4" style={{ borderLeftColor: areaColor, backgroundColor: `${areaColor}08` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: areaColor }} />
                    <span className="font-semibold text-gray-800">{area.area}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>Budget</span>
                          <Input
                            type="number"
                            value={effectiveBudgetByArea[area.area] ?? 0}
                            onChange={(e) =>
                              setEditData(prev => ({
                                ...prev,
                                budgetByArea: {
                                  ...(prev.budgetByArea || baseBudgetByArea),
                                  [area.area]: Number(e.target.value)
                                }
                              }))
                            }
                            className="w-28 text-sm"
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>Spent</span>
                          <Input
                            type="number"
                            value={effectiveSpendByArea[area.area] ?? 0}
                            onChange={(e) =>
                              setEditData(prev => ({
                                ...prev,
                                spendByArea: {
                                  ...(prev.spendByArea || baseSpendByArea),
                                  [area.area]: Number(e.target.value)
                                }
                              }))
                            }
                            className="w-28 text-sm"
                          />
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-600">
                        {formatCurrency(area.spent)} / {formatCurrency(area.allocated)}
                      </span>
                    )}
                    <Badge variant={isOverBudget ? 'red' : percentage > 80 ? 'amber' : 'green'}>
                      {Math.round(percentage)}%
                    </Badge>
                  </div>
                </div>
                <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="absolute h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: isOverBudget ? '#ef4444' : areaColor
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{area.projectCount} funded project{area.projectCount !== 1 ? 's' : ''}</span>
                  <span>{formatCurrency(area.remaining)} remaining</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Priority Category Breakdown */}
      <Card>
        <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
          <TrendingUp size={20} />
          Spend by Priority Category
        </h3>
        <div className="space-y-3">
          {Object.entries(prioritySpend)
            .filter(([_, spend]) => spend > 0)
            .sort(([, a], [, b]) => b - a)
            .map(([category, spend]) => {
              const percentage = totalSpent > 0 ? (spend / totalSpent) * 100 : 0;

              return (
                <div key={category} className="flex items-center gap-4">
                  <div className="w-40 text-sm font-medium text-gray-700 truncate">
                    {category}
                  </div>
                  <div className="flex-1 relative h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute h-full bg-purple-500 rounded-lg transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-semibold">
                      {formatCurrency(spend)} ({Math.round(percentage)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          {Object.values(prioritySpend).every(v => v === 0) && (
            <p className="text-gray-500 text-center py-4">No funded projects yet</p>
          )}
        </div>
      </Card>

      {/* Budget Simulation (Admin Only) */}
      {isAdmin && (
        <Card>
          <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
            <Calculator size={20} />
            Budget Simulation
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            Select an application to simulate the budget impact of approval.
          </p>
          <select
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 outline-none mb-4"
            value={simulationApp || ''}
            onChange={(e) => setSimulationApp(e.target.value || null)}
          >
            <option value="">Select an application...</option>
            {applications
              .filter(app => app.status === 'Submitted-Stage2' || app.status === 'Invited-Stage2')
              .map(app => (
                <option key={app.id} value={app.id}>
                  {app.ref} - {app.projectTitle} ({formatCurrency(app.amountRequested)})
                </option>
              ))}
          </select>

          {simulation && (
            <div className={`p-4 rounded-xl ${simulation.exceedsBudget ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                {simulation.exceedsBudget ? (
                  <>
                    <AlertCircle className="text-red-600" size={20} />
                    <span className="font-bold text-red-800">Exceeds Budget</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="text-green-600" size={20} />
                    <span className="font-bold text-green-800">Within Budget</span>
                  </>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Amount Requested:</span>
                  <div className="font-bold">{formatCurrency(simulation.amountRequested)}</div>
                </div>
                <div>
                  <span className="text-gray-600">Remaining After:</span>
                  <div className={`font-bold ${simulation.remainingAfterApproval < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(simulation.remainingAfterApproval)}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Priority Impact ({simulation.priorityImpact.category}):</span>
                  <div className="font-bold">
                    {formatCurrency(simulation.priorityImpact.currentSpend)} → {formatCurrency(simulation.priorityImpact.newSpend)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default FinancialDashboard;
