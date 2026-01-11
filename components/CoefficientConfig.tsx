import React, { useState, useEffect } from 'react';
import { Settings, Calculator, Info, Save, X, AlertTriangle } from 'lucide-react';
import { Card, Button, Input, Badge } from './UI';
import { CoefficientSettings, CoefficientTier } from '../types';
import { DEFAULT_COEFFICIENT_SETTINGS } from '../constants';
import { formatCoefficientFactor, getTierLabel, calculateCoefficientTier } from '../utils';

interface CoefficientConfigProps {
  roundId: string;
  roundName?: string;
  settings?: CoefficientSettings;
  onSave: (settings: CoefficientSettings) => Promise<void>;
  onCancel?: () => void;
}

/**
 * Coefficient Configuration Component (PRD 4.4.4)
 * Allows admin to configure reach/impact weighting settings per round
 */
export const CoefficientConfig: React.FC<CoefficientConfigProps> = ({
  roundId,
  roundName,
  settings,
  onSave,
  onCancel
}) => {
  const [localSettings, setLocalSettings] = useState<CoefficientSettings>(
    settings || DEFAULT_COEFFICIENT_SETTINGS
  );
  const [saving, setSaving] = useState(false);
  const [testReach, setTestReach] = useState<number>(50);
  const [hasChanges, setHasChanges] = useState(false);

  // Track changes
  useEffect(() => {
    const original = settings || DEFAULT_COEFFICIENT_SETTINGS;
    const changed = JSON.stringify(localSettings) !== JSON.stringify(original);
    setHasChanges(changed);
  }, [localSettings, settings]);

  // Handle save
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(localSettings);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save coefficient settings:', error);
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = () => {
    setLocalSettings(DEFAULT_COEFFICIENT_SETTINGS);
  };

  // Calculate test tier and factor
  const testTier = calculateCoefficientTier(testReach, localSettings);
  const testFactor = localSettings.tiers[testTier].factor;
  const testAdjusted = Math.round(100 * testFactor * 10) / 10; // Assume 100 votes

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-purple-900 flex items-center gap-2">
            <Calculator size={24} />
            Coefficient Settings
          </h2>
          <p className="text-gray-600">
            Configure reach/impact weighting for digital voting
            {roundName && <span className="font-semibold"> - {roundName}</span>}
          </p>
        </div>
        {hasChanges && (
          <Badge variant="amber">Unsaved Changes</Badge>
        )}
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">About Coefficient Weighting</p>
          <p>
            To ensure fairness in public digital voting, smaller organisations receive a modest
            boost to their vote counts. This prevents larger organisations with bigger audiences
            from disproportionately influencing results through mobilisation advantage.
          </p>
        </div>
      </div>

      {/* Enable/Disable Toggle */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">Enable Coefficient Weighting</h3>
            <p className="text-sm text-gray-600">
              Apply reach-based adjustments to digital vote counts
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.enabled}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                enabled: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </Card>

      {/* Tier Configuration */}
      <Card className={!localSettings.enabled ? 'opacity-50 pointer-events-none' : ''}>
        <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
          <Settings size={20} />
          Tier Configuration
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Tier</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Reach Range</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Coefficient Factor</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Effect</th>
              </tr>
            </thead>
            <tbody>
              {/* Small Tier */}
              <tr className="border-b border-gray-100">
                <td className="py-4 px-4">
                  <Badge variant="green">Small</Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">0 -</span>
                    <Input
                      type="number"
                      value={localSettings.tiers.small.maxReach}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        tiers: {
                          ...localSettings.tiers,
                          small: {
                            ...localSettings.tiers.small,
                            maxReach: Number(e.target.value)
                          }
                        }
                      })}
                      className="w-20 text-center"
                      min={0}
                    />
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Input
                    type="number"
                    value={localSettings.tiers.small.factor}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      tiers: {
                        ...localSettings.tiers,
                        small: {
                          ...localSettings.tiers.small,
                          factor: Number(e.target.value)
                        }
                      }
                    })}
                    className="w-20 text-center"
                    min={1}
                    max={2}
                    step={0.1}
                  />
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  Votes × {localSettings.tiers.small.factor} = +{Math.round((localSettings.tiers.small.factor - 1) * 100)}% boost
                </td>
              </tr>

              {/* Medium Tier */}
              <tr className="border-b border-gray-100">
                <td className="py-4 px-4">
                  <Badge variant="amber">Medium</Badge>
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{localSettings.tiers.small.maxReach + 1} -</span>
                    <Input
                      type="number"
                      value={localSettings.tiers.medium.maxReach}
                      onChange={(e) => setLocalSettings({
                        ...localSettings,
                        tiers: {
                          ...localSettings.tiers,
                          medium: {
                            ...localSettings.tiers.medium,
                            maxReach: Number(e.target.value)
                          }
                        }
                      })}
                      className="w-20 text-center"
                      min={localSettings.tiers.small.maxReach + 1}
                    />
                  </div>
                </td>
                <td className="py-4 px-4">
                  <Input
                    type="number"
                    value={localSettings.tiers.medium.factor}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      tiers: {
                        ...localSettings.tiers,
                        medium: {
                          ...localSettings.tiers.medium,
                          factor: Number(e.target.value)
                        }
                      }
                    })}
                    className="w-20 text-center"
                    min={1}
                    max={2}
                    step={0.1}
                  />
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  Votes × {localSettings.tiers.medium.factor} = +{Math.round((localSettings.tiers.medium.factor - 1) * 100)}% boost
                </td>
              </tr>

              {/* Large Tier */}
              <tr>
                <td className="py-4 px-4">
                  <Badge variant="purple">Large</Badge>
                </td>
                <td className="py-4 px-4">
                  <span className="text-gray-600">{localSettings.tiers.medium.maxReach + 1}+</span>
                </td>
                <td className="py-4 px-4">
                  <Input
                    type="number"
                    value={localSettings.tiers.large.factor}
                    onChange={(e) => setLocalSettings({
                      ...localSettings,
                      tiers: {
                        ...localSettings.tiers,
                        large: {
                          ...localSettings.tiers.large,
                          factor: Number(e.target.value)
                        }
                      }
                    })}
                    className="w-20 text-center"
                    min={1}
                    max={2}
                    step={0.1}
                  />
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">
                  {localSettings.tiers.large.factor === 1
                    ? 'No adjustment (baseline)'
                    : `Votes × ${localSettings.tiers.large.factor} = +${Math.round((localSettings.tiers.large.factor - 1) * 100)}% boost`
                  }
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* In-Person Votes Option */}
      <Card className={!localSettings.enabled ? 'opacity-50 pointer-events-none' : ''}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">Apply to In-Person Votes</h3>
            <p className="text-sm text-gray-600">
              By default, only digital votes are weighted. Enable this to also apply
              coefficient to in-person event votes.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={localSettings.applyToInPerson}
              onChange={(e) => setLocalSettings({
                ...localSettings,
                applyToInPerson: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {localSettings.applyToInPerson && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-amber-800">
              Applying coefficients to in-person votes may affect transparency.
              Consider whether this aligns with your community's expectations.
            </p>
          </div>
        )}
      </Card>

      {/* Test Calculator */}
      <Card className={!localSettings.enabled ? 'opacity-50 pointer-events-none' : ''}>
        <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
          <Calculator size={20} />
          Test Calculator
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter a reach figure to see how it would be classified and what coefficient would apply.
        </p>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Test Reach Figure
            </label>
            <Input
              type="number"
              value={testReach}
              onChange={(e) => setTestReach(Number(e.target.value))}
              placeholder="Enter reach figure..."
              min={0}
            />
          </div>

          <div className="flex-1 bg-purple-50 rounded-xl p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-600">Tier:</span>
                <div className="font-bold text-purple-900 capitalize">{testTier}</div>
              </div>
              <div>
                <span className="text-sm text-gray-600">Factor:</span>
                <div className="font-bold text-purple-900">{formatCoefficientFactor(testFactor)}</div>
              </div>
              <div className="col-span-2 pt-2 border-t border-purple-200">
                <span className="text-sm text-gray-600">Example (100 raw votes):</span>
                <div className="font-bold text-purple-900">
                  100 × {testFactor} = <span className="text-teal-600">{testAdjusted}</span> adjusted votes
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <Button variant="ghost" onClick={handleReset}>
          Reset to Defaults
        </Button>
        <div className="flex gap-3">
          {onCancel && (
            <Button variant="ghost" onClick={onCancel}>
              <X size={18} />
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
          >
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CoefficientConfig;
