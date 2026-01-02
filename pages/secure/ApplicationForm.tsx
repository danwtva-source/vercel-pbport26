import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { SecureLayout } from '../../components/Layout';
import { Button, Card, Input, Badge } from '../../components/UI';
import { api, api as AuthService } from '../../services/firebase';
import { Application, UserRole, Area, ApplicationStatus, BudgetLine, AREAS, Round, PortalSettings } from '../../types';
import { MARMOT_PRINCIPLES, WFG_GOALS, ORG_TYPES } from '../../constants';
import { formatCurrency, ROUTES } from '../../utils';
import { Save, Send, ArrowLeft, FileText, Upload, AlertCircle, CheckCircle } from 'lucide-react';

// Helper to convert lowercase role string to UserRole enum
const roleToUserRole = (role: string | undefined): UserRole => {
  const normalized = (role || '').toUpperCase();
  switch (normalized) {
    case 'ADMIN': return UserRole.ADMIN;
    case 'COMMITTEE': return UserRole.COMMITTEE;
    case 'APPLICANT': return UserRole.APPLICANT;
    default: return UserRole.PUBLIC;
  }
};

const ApplicationForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = AuthService.getCurrentUser();
  const isNew = id === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [formStage, setFormStage] = useState<'eoi' | 'part2'>('eoi');
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [portalSettings, setPortalSettings] = useState<PortalSettings | null>(null);

  // Application state
  const [application, setApplication] = useState<Partial<Application>>({
    area: undefined,
    orgName: '',
    projectTitle: '',
    applicantName: '',
    summary: '',
    amountRequested: 0,
    totalCost: 0,
    status: 'Draft',
    formData: {},
    submissionMethod: 'digital'
  });

  useEffect(() => {
    if (!currentUser) {
      navigate(ROUTES.PUBLIC.LOGIN);
      return;
    }

    // Load round and settings data
    const loadRoundData = async () => {
      try {
        const [rounds, settings] = await Promise.all([
          api.getRounds(),
          api.getPortalSettings()
        ]);
        // Find active/open round
        const active = rounds.find(r => r.status === 'open') || rounds[0] || null;
        setActiveRound(active);
        setPortalSettings(settings);
      } catch (err) {
        console.error('Error loading round data:', err);
      }
    };
    loadRoundData();

    if (!isNew && id) {
      loadApplication(id);
    } else {
      // Set default user info for new applications
      setApplication(prev => ({
        ...prev,
        userId: currentUser.uid,
        applicantName: currentUser.displayName || '',
        formData: {
          ...prev.formData,
          contactEmail: currentUser.email || '',
          declarationName: currentUser.displayName || ''
        }
      }));
      setLoading(false);
    }
  }, [id, isNew]);

  const loadApplication = async (appId: string) => {
    try {
      setLoading(true);
      const apps = await api.getApplications('All');
      const app = apps.find(a => a.id === appId);

      if (!app) {
        setError('Application not found');
        setTimeout(() => navigate(ROUTES.PORTAL.APPLICATIONS), 2000);
        return;
      }

      // Check permissions - applicants can only view their own applications
      if (roleToUserRole(currentUser?.role) === UserRole.APPLICANT && app.userId !== currentUser.uid) {
        setError('You do not have permission to view this application');
        setTimeout(() => navigate(ROUTES.PORTAL.APPLICATIONS), 2000);
        return;
      }

      setApplication(app);

      // Determine which stage to show
      if (app.status === 'Invited-Stage2' || app.status === 'Submitted-Stage2') {
        setFormStage('part2');
      }
    } catch (err) {
      console.error('Error loading application:', err);
      setError('Failed to load application');
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (key: string, value: any) => {
    setApplication(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [key]: value
      }
    }));
  };

  const updateBudgetLine = (index: number, field: keyof BudgetLine, value: any) => {
    const budget = application.formData?.budgetBreakdown || [];
    const updated = [...budget];
    updated[index] = { ...updated[index], [field]: value };

    // Recalculate total
    const total = updated.reduce((sum, line) => sum + (line.cost || 0), 0);

    setApplication(prev => ({
      ...prev,
      totalCost: total,
      amountRequested: total,
      formData: {
        ...prev.formData,
        budgetBreakdown: updated
      }
    }));
  };

  const addBudgetLine = () => {
    const budget = application.formData?.budgetBreakdown || [];
    updateFormData('budgetBreakdown', [...budget, { item: '', note: '', cost: 0 }]);
  };

  const removeBudgetLine = (index: number) => {
    const budget = application.formData?.budgetBreakdown || [];
    const updated = budget.filter((_, i) => i !== index);
    const total = updated.reduce((sum, line) => sum + (line.cost || 0), 0);

    setApplication(prev => ({
      ...prev,
      totalCost: total,
      amountRequested: total,
      formData: {
        ...prev.formData,
        budgetBreakdown: updated
      }
    }));
  };

  const toggleArrayField = (fieldName: string, value: string) => {
    const current = (application.formData?.[fieldName] as string[]) || [];
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    updateFormData(fieldName, updated);
  };

  const validateForm = (): boolean => {
    if (formStage === 'eoi') {
      if (!application.area) {
        setError('Please select an area');
        return false;
      }
      if (!application.orgName?.trim()) {
        setError('Please enter your organisation name');
        return false;
      }
      if (!application.projectTitle?.trim()) {
        setError('Please enter a project title');
        return false;
      }
      if (!application.applicantName?.trim()) {
        setError('Please enter the contact name');
        return false;
      }
      if (!application.summary?.trim()) {
        setError('Please provide a project summary');
        return false;
      }
      if (!application.amountRequested || application.amountRequested <= 0) {
        setError('Please enter a valid amount requested');
        return false;
      }
      if (!application.formData?.gdprConsent) {
        setError('You must consent to the GDPR policy');
        return false;
      }
      if (!application.formData?.declarationTrue) {
        setError('You must confirm that the information provided is true');
        return false;
      }
    }

    if (formStage === 'part2') {
      if (!application.formData?.smartObjectives?.trim()) {
        setError('Please provide SMART objectives');
        return false;
      }
      if (!application.formData?.activities?.trim()) {
        setError('Please describe your activities and delivery plan');
        return false;
      }
      if (!application.formData?.budgetBreakdown || application.formData.budgetBreakdown.length === 0) {
        setError('Please add at least one budget line');
        return false;
      }
      if (!application.formData?.consentWithdraw || !application.formData?.agreeGdprScrutiny) {
        setError('You must agree to all declarations');
        return false;
      }
    }

    setError('');
    return true;
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const now = Date.now();
      const appData: Application = {
        ...application,
        id: application.id || `app_${now}`,
        ref: application.ref || `PB-${application.area?.substring(0, 3).toUpperCase() || 'NEW'}-${Math.floor(Math.random() * 900 + 100)}`,
        userId: currentUser?.uid || '',
        status: 'Draft',
        createdAt: application.createdAt || now,
        updatedAt: now
      } as Application;

      if (isNew) {
        await api.createApplication(appData);
        setSuccess('Draft saved successfully!');
        setTimeout(() => navigate(ROUTES.PORTAL.APPLICATIONS), 1500);
      } else {
        await api.updateApplication(appData.id, appData);
        setSuccess('Draft updated successfully!');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      setError('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Check if submission is allowed based on round settings
  const isSubmissionAllowed = (): { allowed: boolean; reason?: string } => {
    const isAdmin = roleToUserRole(currentUser?.role) === UserRole.ADMIN;

    // Admin can always submit (override)
    if (isAdmin) return { allowed: true };

    // Check portal settings first
    if (portalSettings) {
      if (formStage === 'eoi' && !portalSettings.stage1Visible) {
        return { allowed: false, reason: 'Stage 1 applications are currently closed.' };
      }
      if (formStage === 'part2' && !portalSettings.stage2Visible) {
        return { allowed: false, reason: 'Stage 2 applications are currently closed.' };
      }
    }

    // Check active round settings
    if (activeRound) {
      if (formStage === 'eoi' && !activeRound.stage1Open) {
        return { allowed: false, reason: 'Stage 1 submissions are closed for the current round.' };
      }
      if (formStage === 'part2' && !activeRound.stage2Open) {
        return { allowed: false, reason: 'Stage 2 submissions are closed for the current round.' };
      }
    }

    return { allowed: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Check round-based availability
    const submissionCheck = isSubmissionAllowed();
    if (!submissionCheck.allowed) {
      setError(submissionCheck.reason || 'Submissions are currently closed.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const now = Date.now();
      const status: ApplicationStatus = formStage === 'eoi' ? 'Submitted-Stage1' : 'Submitted-Stage2';

      const appData: Application = {
        ...application,
        id: application.id || `app_${now}`,
        ref: application.ref || `PB-${application.area?.substring(0, 3).toUpperCase() || 'NEW'}-${Math.floor(Math.random() * 900 + 100)}`,
        userId: currentUser?.uid || '',
        roundId: activeRound?.id, // Link application to active round
        status,
        createdAt: application.createdAt || now,
        updatedAt: now
      } as Application;

      if (isNew || !application.id) {
        await api.createApplication(appData);
        setSuccess(`${formStage === 'eoi' ? 'Expression of Interest' : 'Full Application'} submitted successfully!`);
      } else {
        await api.updateApplication(appData.id, appData);
        setSuccess(`${formStage === 'eoi' ? 'Expression of Interest' : 'Full Application'} submitted successfully!`);
      }

      setTimeout(() => navigate(ROUTES.PORTAL.APPLICATIONS), 2000);
    } catch (err) {
      console.error('Error submitting application:', err);
      setError('Failed to submit application. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  // Determine if form is read-only
  const isReadOnly = () => {
    const userRole = roleToUserRole(currentUser?.role);
    if (userRole === UserRole.ADMIN) return false;
    if (userRole === UserRole.COMMITTEE) return true;
    if (userRole === UserRole.APPLICANT) {
      if (application.status === 'Draft') return false;
      if (application.status === 'Invited-Stage2' && formStage === 'part2') return false;
      return true;
    }
    return true;
  };

  const readOnly = isReadOnly();

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <SecureLayout userRole={roleToUserRole(currentUser.role)}>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-bold">Loading application...</p>
        </div>
      </SecureLayout>
    );
  }

  return (
    <SecureLayout userRole={roleToUserRole(currentUser.role)}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.PORTAL.APPLICATIONS)}>
            <ArrowLeft size={18} />
            Back to Applications
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-purple-900 font-display flex items-center gap-3">
              <FileText size={32} className="text-purple-600" />
              {isNew ? 'New Application' : application.projectTitle || 'Application'}
            </h1>
            {application.ref && (
              <p className="text-gray-600 font-mono text-sm mt-1">Ref: {application.ref}</p>
            )}
          </div>
          {application.status && <Badge>{application.status}</Badge>}
        </div>

        {/* Stage Tabs */}
        {!isNew && (
          <div className="flex gap-2 bg-white p-2 rounded-xl shadow">
            <button
              onClick={() => setFormStage('eoi')}
              className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all ${
                formStage === 'eoi'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Stage 1: EOI
            </button>
            <button
              onClick={() => setFormStage('part2')}
              className={`flex-1 px-4 py-2 rounded-lg font-bold transition-all ${
                formStage === 'part2'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              disabled={application.status === 'Draft' || application.status === 'Submitted-Stage1'}
            >
              Stage 2: Full Application
            </button>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 font-medium">{error}</p>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800 font-medium">{success}</p>
          </div>
        )}

        {readOnly && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <p className="text-sm text-blue-800 font-medium">
              This application is in read-only mode. {roleToUserRole(currentUser.role) === UserRole.COMMITTEE && 'Committee members can view but not edit applications.'}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {formStage === 'eoi' && (
            <>
              {/* Section 1: Area & Applicant */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  1. Area & Applicant Information
                </h2>

                <div className="space-y-6">
                  {/* Area Selection */}
                  <div>
                    <label className="block font-bold text-sm mb-3 text-gray-700">
                      Select Area <span className="text-red-500">*</span>
                    </label>
                    <div className="grid md:grid-cols-3 gap-4">
                      {AREAS.map(area => (
                        <label
                          key={area}
                          className={`border-2 p-4 rounded-xl flex items-center gap-3 cursor-pointer transition-all ${
                            application.area === area
                              ? 'bg-purple-50 border-purple-600 shadow-md'
                              : 'border-gray-200 hover:border-purple-300'
                          } ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="radio"
                            name="area"
                            checked={application.area === area}
                            onChange={() => setApplication({ ...application, area })}
                            disabled={readOnly}
                            className="accent-purple-600 w-5 h-5"
                          />
                          <span className="font-bold text-gray-700">{area}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Multi-Area */}
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={application.formData?.applyMultiArea || false}
                      onChange={(e) => updateFormData('applyMultiArea', e.target.checked)}
                      disabled={readOnly}
                      className="w-5 h-5 accent-purple-600"
                    />
                    <span className="font-bold text-blue-800">Applying for funding in more than one area?</span>
                  </div>

                  {application.formData?.applyMultiArea && (
                    <textarea
                      placeholder="Describe logistics/cost breakdown for each area..."
                      className="w-full p-4 border rounded-xl h-24"
                      value={application.formData?.crossAreaBreakdown || ''}
                      onChange={(e) => updateFormData('crossAreaBreakdown', e.target.value)}
                      disabled={readOnly}
                    />
                  )}

                  {/* Contact Details */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      label="Organisation Name"
                      required
                      value={application.orgName || ''}
                      onChange={(e) => setApplication({ ...application, orgName: e.target.value })}
                      disabled={readOnly}
                    />
                    <Input
                      label="Position / Job Title"
                      value={application.formData?.contactPosition || ''}
                      onChange={(e) => updateFormData('contactPosition', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Contact Name"
                      required
                      value={application.applicantName || ''}
                      onChange={(e) => setApplication({ ...application, applicantName: e.target.value })}
                      disabled={readOnly}
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      required
                      value={application.formData?.contactEmail || ''}
                      onChange={(e) => updateFormData('contactEmail', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Phone Number"
                      value={application.formData?.contactPhone || ''}
                      onChange={(e) => updateFormData('contactPhone', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>

                  {/* Address */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <Input
                      label="Street"
                      value={application.formData?.addressStreet || ''}
                      onChange={(e) => updateFormData('addressStreet', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Town/City"
                      value={application.formData?.addressTown || ''}
                      onChange={(e) => updateFormData('addressTown', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Postcode"
                      value={application.formData?.addressPostcode || ''}
                      onChange={(e) => updateFormData('addressPostcode', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </Card>

              {/* Section 2: Organisation Type */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  2. Organisation Type
                </h2>

                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  {ORG_TYPES.map(type => (
                    <label
                      key={type}
                      className="flex gap-3 text-sm items-center cursor-pointer p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={application.formData?.orgTypes?.includes(type)}
                        onChange={() => toggleArrayField('orgTypes', type)}
                        disabled={readOnly}
                        className="accent-purple-600"
                      />
                      <span>{type}</span>
                    </label>
                  ))}
                </div>

                <Input
                  label="Other (please describe)"
                  value={application.formData?.orgTypeOther || ''}
                  onChange={(e) => updateFormData('orgTypeOther', e.target.value)}
                  disabled={readOnly}
                />
              </Card>

              {/* Section 3: Priorities & Timeline */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  3. Priorities & Timeline
                </h2>

                <div className="space-y-6">
                  <Input
                    label="Main Project Theme (see Priorities Report)"
                    value={application.formData?.projectTheme || ''}
                    onChange={(e) => updateFormData('projectTheme', e.target.value)}
                    disabled={readOnly}
                  />

                  <div className="grid md:grid-cols-3 gap-6">
                    <Input
                      label="Start Date"
                      type="date"
                      value={application.formData?.startDate || ''}
                      onChange={(e) => updateFormData('startDate', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="End Date"
                      type="date"
                      value={application.formData?.endDate || ''}
                      onChange={(e) => updateFormData('endDate', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Duration"
                      placeholder="e.g. 6 months"
                      value={application.formData?.duration || ''}
                      onChange={(e) => updateFormData('duration', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </Card>

              {/* Section 4: Project Details */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  4. Project Details
                </h2>

                <div className="space-y-6">
                  <Input
                    label="Project Title"
                    required
                    value={application.projectTitle || ''}
                    onChange={(e) => setApplication({ ...application, projectTitle: e.target.value })}
                    disabled={readOnly}
                  />

                  <div>
                    <label className="block font-bold text-sm mb-2 text-gray-700">
                      Project Summary (Max 250 words) <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full p-4 border border-gray-200 rounded-xl h-40 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                      value={application.summary || ''}
                      onChange={(e) => setApplication({ ...application, summary: e.target.value })}
                      disabled={readOnly}
                      required
                    />
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <label className="block font-bold text-lg mb-4 text-gray-800">
                      Positive Outcomes
                    </label>
                    <div className="space-y-4">
                      <Input
                        placeholder="Outcome 1: What will change?"
                        value={application.formData?.outcome1 || ''}
                        onChange={(e) => updateFormData('outcome1', e.target.value)}
                        disabled={readOnly}
                      />
                      <Input
                        placeholder="Outcome 2: Who will benefit?"
                        value={application.formData?.outcome2 || ''}
                        onChange={(e) => updateFormData('outcome2', e.target.value)}
                        disabled={readOnly}
                      />
                      <Input
                        placeholder="Outcome 3: Long term impact?"
                        value={application.formData?.outcome3 || ''}
                        onChange={(e) => updateFormData('outcome3', e.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Section 5: Budget */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  5. Budget
                </h2>

                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                    <Input
                      label="Total Project Cost (£)"
                      type="number"
                      required
                      value={application.totalCost || 0}
                      onChange={(e) => setApplication({ ...application, totalCost: Number(e.target.value) })}
                      disabled={readOnly}
                      className="text-xl font-bold"
                    />
                  </div>
                  <div className="bg-teal-50 p-6 rounded-xl border border-teal-100">
                    <Input
                      label="Amount Requested (£)"
                      type="number"
                      required
                      value={application.amountRequested || 0}
                      onChange={(e) => setApplication({ ...application, amountRequested: Number(e.target.value) })}
                      disabled={readOnly}
                      className="text-xl font-bold"
                    />
                  </div>
                </div>

                <Input
                  label="Other Funding Sources"
                  placeholder="e.g. £500 from Town Council"
                  value={application.formData?.otherFundingSources || ''}
                  onChange={(e) => updateFormData('otherFundingSources', e.target.value)}
                  disabled={readOnly}
                />
              </Card>

              {/* Section 6: Alignment */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  6. Alignment with Strategic Priorities
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                  Tick all that apply. You will be asked to justify these selections in Part 2.
                </p>

                <div className="grid md:grid-cols-2 gap-8">
                  {/* Marmot Principles */}
                  <div className="bg-purple-50 p-6 rounded-xl border border-purple-100">
                    <h3 className="font-bold text-purple-900 text-lg mb-4">Marmot Principles</h3>
                    <div className="space-y-3">
                      {MARMOT_PRINCIPLES.map(principle => (
                        <label
                          key={principle.id}
                          className="flex gap-3 text-sm items-start cursor-pointer hover:bg-purple-100 p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={application.formData?.marmotPrinciples?.includes(principle.label)}
                            onChange={() => toggleArrayField('marmotPrinciples', principle.label)}
                            disabled={readOnly}
                            className="mt-1 accent-purple-600"
                          />
                          <span>{principle.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* WFG Goals */}
                  <div className="bg-teal-50 p-6 rounded-xl border border-teal-100">
                    <h3 className="font-bold text-teal-900 text-lg mb-4">Well-being of Future Generations Goals</h3>
                    <div className="space-y-3">
                      {WFG_GOALS.map(goal => (
                        <label
                          key={goal.id}
                          className="flex gap-3 text-sm items-start cursor-pointer hover:bg-teal-100 p-2 rounded transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={application.formData?.wfgGoals?.includes(goal.label)}
                            onChange={() => toggleArrayField('wfgGoals', goal.label)}
                            disabled={readOnly}
                            className="mt-1 accent-teal-600"
                          />
                          <span>{goal.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Section 7: Declarations */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  7. Declarations
                </h2>

                <div className="space-y-6">
                  <label className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      checked={application.formData?.gdprConsent || false}
                      onChange={(e) => updateFormData('gdprConsent', e.target.checked)}
                      disabled={readOnly}
                      required
                      className="mt-1"
                    />
                    <span>
                      I confirm that I have read, understood and consent to the GDPR Policy. <span className="text-red-500">*</span>
                    </span>
                  </label>

                  <label className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      checked={application.formData?.declarationTrue || false}
                      onChange={(e) => updateFormData('declarationTrue', e.target.checked)}
                      disabled={readOnly}
                      required
                      className="mt-1"
                    />
                    <span>
                      I declare that the information provided is true and correct. <span className="text-red-500">*</span>
                    </span>
                  </label>

                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Input
                      label="Name"
                      value={application.formData?.declarationName || ''}
                      onChange={(e) => updateFormData('declarationName', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Typed Signature"
                      value={application.formData?.declarationSignature || ''}
                      onChange={(e) => updateFormData('declarationSignature', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Date"
                      type="date"
                      value={application.formData?.declarationDate || new Date().toISOString().split('T')[0]}
                      onChange={(e) => updateFormData('declarationDate', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </Card>
            </>
          )}

          {formStage === 'part2' && (
            <>
              {/* Part 2: Section 1 - Organisation & Bank Details */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  1. Organisation & Bank Details
                </h2>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <Input
                      label="Charity Number (if applicable)"
                      value={application.formData?.charityNumber || ''}
                      onChange={(e) => updateFormData('charityNumber', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Company Number (if applicable)"
                      value={application.formData?.companyNumber || ''}
                      onChange={(e) => updateFormData('companyNumber', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>

                  <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h4 className="font-bold mb-4 flex items-center gap-2">Bank Account Details</h4>
                    <div className="grid md:grid-cols-3 gap-6">
                      <Input
                        label="Account Name"
                        value={application.formData?.bankAccountName || ''}
                        onChange={(e) => updateFormData('bankAccountName', e.target.value)}
                        disabled={readOnly}
                      />
                      <Input
                        label="Sort Code"
                        value={application.formData?.bankSortCode || ''}
                        onChange={(e) => updateFormData('bankSortCode', e.target.value)}
                        disabled={readOnly}
                      />
                      <Input
                        label="Account Number"
                        value={application.formData?.bankAccountNumber || ''}
                        onChange={(e) => updateFormData('bankAccountNumber', e.target.value)}
                        disabled={readOnly}
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Part 2: Section 2 - Detailed Project */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  2. Detailed Project Plan
                </h2>

                <div className="space-y-6">
                  {[
                    { key: 'smartObjectives', label: 'SMART Objectives', hint: 'Specific, Measurable, Achievable, Relevant, Time-bound.', required: true },
                    { key: 'activities', label: 'Activities & Delivery Plan', hint: 'What exactly will you do?', required: true },
                    { key: 'communityBenefit', label: 'Community Benefit', hint: 'How does it help?', required: false },
                    { key: 'collaborations', label: 'Collaborations', hint: 'Who are you working with?', required: false },
                    { key: 'riskManagement', label: 'Risk Management', hint: 'What could go wrong and how will you manage it?', required: false }
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block font-bold text-lg mb-1">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </label>
                      <p className="text-sm text-gray-500 mb-2">{field.hint}</p>
                      <textarea
                        className="w-full p-4 border rounded-xl h-32"
                        value={(application.formData as any)?.[field.key] || ''}
                        onChange={(e) => updateFormData(field.key, e.target.value)}
                        disabled={readOnly}
                        required={field.required}
                      />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Part 2: Section 3 - Alignment Justification */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  3. Alignment (Justification)
                </h2>
                <p className="text-gray-500 mb-4">
                  Please explain how your project contributes to the priorities you selected in Part 1.
                </p>

                {/* Marmot Justifications */}
                {application.formData?.marmotPrinciples?.map(principle => (
                  <div key={principle} className="bg-purple-50 p-4 rounded-xl mb-4 border border-purple-100">
                    <h4 className="font-bold text-purple-900 mb-2">{principle}</h4>
                    <textarea
                      className="w-full p-3 border rounded-lg bg-white"
                      placeholder="Explain how your project addresses this principle..."
                      value={application.formData?.marmotJustifications?.[principle] || ''}
                      onChange={(e) => {
                        const current = application.formData?.marmotJustifications || {};
                        updateFormData('marmotJustifications', { ...current, [principle]: e.target.value });
                      }}
                      disabled={readOnly}
                    />
                  </div>
                ))}

                {/* WFG Justifications */}
                {application.formData?.wfgGoals?.map(goal => (
                  <div key={goal} className="bg-teal-50 p-4 rounded-xl mb-4 border border-teal-100">
                    <h4 className="font-bold text-teal-900 mb-2">{goal}</h4>
                    <textarea
                      className="w-full p-3 border rounded-lg bg-white"
                      placeholder="Explain how your project contributes to this goal..."
                      value={application.formData?.wfgJustifications?.[goal] || ''}
                      onChange={(e) => {
                        const current = application.formData?.wfgJustifications || {};
                        updateFormData('wfgJustifications', { ...current, [goal]: e.target.value });
                      }}
                      disabled={readOnly}
                    />
                  </div>
                ))}
              </Card>

              {/* Part 2: Section 4 - Detailed Budget */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  4. Detailed Budget Breakdown
                </h2>

                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 space-y-3 mb-6">
                  {(application.formData?.budgetBreakdown || []).map((line, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5">
                        <input
                          className="w-full p-3 border rounded-lg"
                          placeholder="Item Name"
                          value={line.item}
                          onChange={(e) => updateBudgetLine(i, 'item', e.target.value)}
                          disabled={readOnly}
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          className="w-full p-3 border rounded-lg"
                          placeholder="Justification"
                          value={line.note}
                          onChange={(e) => updateBudgetLine(i, 'note', e.target.value)}
                          disabled={readOnly}
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          className="w-full p-3 border rounded-lg font-bold"
                          type="number"
                          placeholder="0.00"
                          value={line.cost}
                          onChange={(e) => updateBudgetLine(i, 'cost', Number(e.target.value))}
                          disabled={readOnly}
                        />
                      </div>
                      <div className="col-span-1">
                        {!readOnly && (
                          <button
                            type="button"
                            onClick={() => removeBudgetLine(i)}
                            className="text-red-400 hover:text-red-600 p-2"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {!readOnly && (
                    <Button type="button" variant="secondary" size="sm" onClick={addBudgetLine}>
                      + Add Budget Line
                    </Button>
                  )}
                </div>

                <div className="text-right font-bold text-xl mb-4">
                  Total: {formatCurrency(application.totalCost || 0)}
                </div>

                <textarea
                  className="w-full p-4 border rounded-xl"
                  placeholder="Additional Budget Information..."
                  value={application.formData?.additionalBudgetInfo || ''}
                  onChange={(e) => updateFormData('additionalBudgetInfo', e.target.value)}
                  disabled={readOnly}
                />
              </Card>

              {/* Part 2: Section 5 - Declarations */}
              <Card>
                <h2 className="text-2xl font-bold text-purple-900 mb-6 pb-4 border-b border-gray-200">
                  5. Final Declarations
                </h2>

                <div className="space-y-6">
                  <label className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      checked={application.formData?.consentWithdraw || false}
                      onChange={(e) => updateFormData('consentWithdraw', e.target.checked)}
                      disabled={readOnly}
                      required
                      className="mt-1"
                    />
                    <span>I consent to withdrawal at discretion if necessary. <span className="text-red-500">*</span></span>
                  </label>

                  <label className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      checked={application.formData?.agreeGdprScrutiny || false}
                      onChange={(e) => updateFormData('agreeGdprScrutiny', e.target.checked)}
                      disabled={readOnly}
                      required
                      className="mt-1"
                    />
                    <span>I agree to GDPR policy and scrutiny. <span className="text-red-500">*</span></span>
                  </label>

                  <label className="flex gap-3 items-start">
                    <input
                      type="checkbox"
                      checked={application.formData?.confirmOtherFunding || false}
                      onChange={(e) => updateFormData('confirmOtherFunding', e.target.checked)}
                      disabled={readOnly}
                      className="mt-1"
                    />
                    <span>I confirm details of other funding sources are accurate.</span>
                  </label>

                  <div className="grid md:grid-cols-3 gap-4 mt-4">
                    <Input
                      label="Name"
                      value={application.formData?.declarationName2 || ''}
                      onChange={(e) => updateFormData('declarationName2', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Typed Signature"
                      value={application.formData?.declarationSignature2 || ''}
                      onChange={(e) => updateFormData('declarationSignature2', e.target.value)}
                      disabled={readOnly}
                    />
                    <Input
                      label="Date"
                      type="date"
                      value={application.formData?.declarationDate2 || new Date().toISOString().split('T')[0]}
                      onChange={(e) => updateFormData('declarationDate2', e.target.value)}
                      disabled={readOnly}
                    />
                  </div>
                </div>
              </Card>
            </>
          )}

          {/* Form Actions */}
          {!readOnly && (
            <div className="flex gap-4 pt-8 border-t border-gray-200 sticky bottom-0 bg-white p-6 -mx-6 shadow-inner-top rounded-b-2xl">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={saving}
                className="flex-1"
              >
                <Save size={18} />
                Save as Draft
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={saving}
                className="flex-1"
              >
                <Send size={18} />
                {saving ? 'Submitting...' : `Submit ${formStage === 'eoi' ? 'EOI' : 'Full Application'}`}
              </Button>
            </div>
          )}
        </form>
      </div>
    </SecureLayout>
  );
};

export default ApplicationForm;
