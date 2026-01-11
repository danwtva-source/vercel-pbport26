import React, { useState } from 'react';
import { Users, Upload, Link as LinkIcon, CheckCircle, AlertCircle, Info, Send } from 'lucide-react';
import { Card, Button, Input, Badge } from './UI';
import { ReachData, CoefficientSettings } from '../types';
import { calculateCoefficientTier, getCoefficientFactor, getTierLabel, formatCoefficientFactor } from '../utils';
import { DEFAULT_COEFFICIENT_SETTINGS } from '../constants';
import { uploadFile, validateFile } from '../services/firebase';

interface ReachDataFormProps {
  applicationId: string;
  existingData?: ReachData;
  coefficientSettings?: CoefficientSettings;
  onSubmit: (data: ReachData) => Promise<void>;
  disabled?: boolean;
}

/**
 * Reach Data Form Component (PRD 4.4.4 Section B)
 * Allows Part 2 approved applicants to submit their reach/membership data
 * for coefficient calculation in public digital voting.
 */
export const ReachDataForm: React.FC<ReachDataFormProps> = ({
  applicationId,
  existingData,
  coefficientSettings = DEFAULT_COEFFICIENT_SETTINGS,
  onSubmit,
  disabled = false
}) => {
  const [reachFigure, setReachFigure] = useState<string>(
    existingData?.reachFigure?.toString() || ''
  );
  const [evidenceUrl, setEvidenceUrl] = useState<string>(existingData?.evidenceUrl || '');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [declarationConfirmed, setDeclarationConfirmed] = useState<boolean>(
    existingData?.declarationConfirmed || false
  );
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(
    existingData?.evidenceFilePath || null
  );

  // Calculate preview tier and factor
  const reachNum = parseInt(reachFigure) || 0;
  const previewTier = reachNum > 0 ? calculateCoefficientTier(reachNum, coefficientSettings) : null;
  const previewFactor = previewTier ? getCoefficientFactor(previewTier, coefficientSettings) : null;

  // Validation
  const isValidReach = reachNum >= 0;
  const hasEvidence = evidenceUrl.trim() !== '' || uploadedFilePath !== null;
  const isValid = isValidReach && hasEvidence && declarationConfirmed && reachNum > 0;

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setEvidenceFile(file);
    setError(null);

    // Upload immediately
    setUploading(true);
    try {
      const path = `reach-evidence/${applicationId}_${Date.now()}_${file.name}`;
      const url = await uploadFile(path, file);
      setUploadedFilePath(path);
      setEvidenceUrl(url);
      setError(null);
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!isValid) {
      setError('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const tier = calculateCoefficientTier(reachNum, coefficientSettings);
      const factor = getCoefficientFactor(tier, coefficientSettings);

      const reachData: ReachData = {
        reachFigure: reachNum,
        evidenceUrl: evidenceUrl || undefined,
        evidenceFilePath: uploadedFilePath || undefined,
        declarationConfirmed: true,
        tier,
        coefficientFactor: factor
      };

      await onSubmit(reachData);
    } catch (err) {
      setError('Failed to submit. Please try again.');
      console.error('Submit error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // If already submitted, show read-only view
  if (existingData?.declarationConfirmed && disabled) {
    return (
      <Card className="bg-green-50 border-green-200">
        <div className="flex items-center gap-3 mb-4">
          <CheckCircle className="text-green-600" size={24} />
          <h3 className="text-lg font-bold text-green-800">Reach Data Submitted</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Reach Figure:</span>
            <div className="font-bold text-gray-800">{existingData.reachFigure}</div>
          </div>
          <div>
            <span className="text-gray-600">Tier:</span>
            <div className="font-bold text-gray-800 capitalize">{existingData.tier}</div>
          </div>
          <div>
            <span className="text-gray-600">Coefficient:</span>
            <div className="font-bold text-gray-800">
              {formatCoefficientFactor(existingData.coefficientFactor || 1)}
            </div>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <Badge variant={existingData.auditFlag ? 'amber' : 'green'}>
              {existingData.auditFlag ? 'Under Review' : 'Verified'}
            </Badge>
          </div>
        </div>
        {existingData.auditFlag && existingData.adminNotes && (
          <div className="mt-4 p-3 bg-amber-100 rounded-lg">
            <p className="text-sm text-amber-800">
              <strong>Admin Note:</strong> {existingData.adminNotes}
            </p>
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center gap-3 mb-4">
        <Users className="text-purple-600" size={24} />
        <div>
          <h3 className="text-lg font-bold text-purple-900">Organisation Reach Information</h3>
          <p className="text-sm text-gray-600">
            Required for public voting - helps ensure fair representation
          </p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3">
        <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-blue-800">
          <p>
            To ensure fairness in public voting, we apply a small adjustment based on your
            organisation's reach. Smaller organisations receive a modest boost to ensure
            they're not disadvantaged against larger groups who can mobilise more voters.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Reach Figure Input */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Estimated Reach Figure <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-600 mb-2">
            Enter the largest of: active membership count, mailing list size, or primary
            social media follower count.
          </p>
          <Input
            type="number"
            value={reachFigure}
            onChange={(e) => setReachFigure(e.target.value)}
            placeholder="e.g., 150"
            min={0}
            disabled={disabled}
          />

          {/* Preview Tier */}
          {previewTier && (
            <div className="mt-3 p-3 bg-purple-50 rounded-lg flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-600">Your tier: </span>
                <Badge variant={
                  previewTier === 'small' ? 'green' :
                  previewTier === 'medium' ? 'amber' : 'purple'
                }>
                  {getTierLabel(previewTier)}
                </Badge>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Coefficient: </span>
                <span className="font-bold text-purple-900">
                  {formatCoefficientFactor(previewFactor || 1)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Evidence Section */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Evidence <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-600 mb-3">
            Upload a screenshot of your membership records, mailing list stats, or social
            media analytics. Alternatively, provide a link to your public social profile.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-purple-400 transition">
              <Upload className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-gray-600 mb-2">Upload evidence file</p>
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-bold transition">
                  {uploading ? 'Uploading...' : 'Choose File'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                  onChange={handleFileSelect}
                  disabled={disabled || uploading}
                />
              </label>
              {uploadedFilePath && (
                <p className="text-sm text-green-600 mt-2 flex items-center justify-center gap-1">
                  <CheckCircle size={14} />
                  File uploaded
                </p>
              )}
            </div>

            {/* URL Input */}
            <div className="border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="text-gray-400" size={20} />
                <span className="text-sm font-medium text-gray-700">Or provide a link</span>
              </div>
              <Input
                type="url"
                value={evidenceUrl}
                onChange={(e) => setEvidenceUrl(e.target.value)}
                placeholder="https://facebook.com/yourpage"
                disabled={disabled}
              />
              <p className="text-xs text-gray-500 mt-2">
                e.g., Facebook page, Twitter profile, or public statistics page
              </p>
            </div>
          </div>
        </div>

        {/* Declaration Checkbox */}
        <div className="border-t border-gray-200 pt-6">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={declarationConfirmed}
              onChange={(e) => setDeclarationConfirmed(e.target.checked)}
              className="mt-1 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
              disabled={disabled}
            />
            <div>
              <span className="font-bold text-gray-800">
                Declaration <span className="text-red-500">*</span>
              </span>
              <p className="text-sm text-gray-600 mt-1">
                I confirm that the reach figure provided is accurate to the best of my knowledge.
                I understand that this information may be verified and that deliberate
                misreporting may result in removal of weighting and/or disqualification from
                digital voting.
              </p>
            </div>
          </label>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-800">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!isValid || submitting || disabled}
          >
            <Send size={18} />
            {submitting ? 'Submitting...' : 'Submit Reach Data'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default ReachDataForm;
