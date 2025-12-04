
export type Role = 'guest' | 'applicant' | 'committee' | 'admin';
export type Area = 'Blaenavon' | 'Thornhill & Upper Cwmbran' | 'Trevethin, Penygarn & St. Cadocs' | 'Cross-Area';
export type AppStatus = 'Draft' | 'Submitted-Stage1' | 'Rejected-Stage1' | 'Invited-Stage2' | 'Submitted-Stage2' | 'Finalist' | 'Funded' | 'Rejected';

export interface User {
  uid: string;
  email: string;
  username?: string; // For easier login
  role: Role;
  area?: Area; // For committee members
  displayName?: string;
  password?: string; // Only for mock auth handling
  // Profile fields
  bio?: string;
  phone?: string;
  photoUrl?: string;
  address?: string;
  roleDescription?: string; // e.g. "Chairperson" or "Treasurer" or "Lead Applicant"
}

export interface PortalSettings {
    stage1Visible: boolean; // Can committee see EOI?
    stage2Visible: boolean; // Can committee see/score Full Apps?
    votingOpen: boolean;    // Is public voting active?
}

export interface BudgetLine {
    item: string;
    note: string;
    cost: number;
}

export interface Application {
  id: string;
  userId: string;
  applicantName: string; // Contact Name
  orgName: string;
  projectTitle: string;
  area: Area;
  summary: string;
  amountRequested: number;
  totalCost: number;
  status: AppStatus;
  priority?: string;
  createdAt: number;
  ref: string; // e.g. PB-26-001
  
  submissionMethod: 'digital' | 'upload';
  
  // File Upload Mode
  pdfUrl?: string; // URL to PDF (Stage 1 EOI)
  stage2PdfUrl?: string; // URL to PDF (Stage 2 Full App)

  // Digital Mode - Detailed Data
  formData?: {
    // --- Stage 1 (EOI) ---
    applyMultiArea?: boolean; // "Do you intend to apply for funding in more than one area?"
    
    // Address
    addressStreet?: string;
    addressLocalArea?: string;
    addressTown?: string;
    addressCounty?: string;
    addressPostcode?: string;
    
    // Organisation Type
    orgType?: string;
    orgTypeOther?: string;
    
    contactPosition?: string;
    contactEmail?: string;
    contactPhone?: string;

    // Priorities & Timeline
    projectTheme?: string;
    startDate?: string;
    endDate?: string;
    duration?: string;
    
    // Outcomes
    positiveOutcomes?: string[]; // [Outcome 1, Outcome 2, Outcome 3]
    
    // Funding
    otherFundingSources?: string;
    crossAreaBreakdown?: string;
    
    // Alignment
    marmotPrinciples?: string[]; // List of selected IDs
    wfgGoals?: string[]; // List of selected IDs
    
    // Declaration
    declarationName?: string;
    declarationDate?: string;
    declarationSigned?: boolean;

    // --- Stage 2 (Full App) additions ---
    
    // Bank & Reg
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankSortCode?: string;
    charityNumber?: string;
    companyNumber?: string;
    
    // Project Detail
    projectOverview?: string; // SMART Objectives (Sec 2.2)
    activities?: string; // Sec 2.3
    communityBenefit?: string; // Sec 2.4
    collaborations?: string; // Sec 2.5
    risks?: string; // Sec 2.6
    
    // Alignment Explanations (Justify the ticks from Part 1)
    marmotExplanations?: Record<string, string>; // Principle Name -> Justification Text
    wfgExplanations?: Record<string, string>; // Goal Name -> Justification Text
    
    // Budget
    budgetBreakdown?: BudgetLine[];
    additionalBudgetInfo?: string;
    
    // Checklists & Declarations
    checklist?: string[]; // Attachments included
    declarationStatements?: string[]; // Ticked declaration boxes
    declarationName2?: string;
    declarationDate2?: string;
  }
}

export interface ScoreCriterion {
  id: string;
  name: string;
  guidance: string; // Tooltip summary
  weight: number;
  details: string; // Full HTML guidance
}

export interface Score {
  appId: string;
  scorerId: string;
  scorerName: string;
  scores: Record<string, number>; // criterionId -> score (0-3)
  notes: Record<string, string>; // criterionId -> justification
  isFinal: boolean;
  total: number; // calculated
  timestamp: number;
}

export const AREAS: Area[] = [
  'Blaenavon',
  'Thornhill & Upper Cwmbran',
  'Trevethin, Penygarn & St. Cadocs'
];
