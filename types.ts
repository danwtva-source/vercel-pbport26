export type Role = 'guest' | 'applicant' | 'committee' | 'admin';
export type Area = 'Blaenavon' | 'Thornhill & Upper Cwmbran' | 'Trevethin, Penygarn & St. Cadocs' | 'Cross-Area';
export type AppStatus = 'Draft' | 'Submitted-Stage1' | 'Rejected-Stage1' | 'Invited-Stage2' | 'Submitted-Stage2' | 'Finalist' | 'Funded' | 'Rejected';

export const AREAS: Area[] = [
  'Blaenavon',
  'Thornhill & Upper Cwmbran',
  'Trevethin, Penygarn & St. Cadocs'
];

export interface User {
  uid: string;
  email: string;
  username?: string;
  role: Role;
  area?: Area;
  displayName?: string;
  password?: string;
  // Profile
  bio?: string;
  phone?: string;
  photoUrl?: string;
  address?: string;
  roleDescription?: string;
}

export interface PortalSettings {
    stage1Visible: boolean;
    stage2Visible: boolean;
    votingOpen: boolean;
}

export interface BudgetLine {
    item: string;
    note: string;
    cost: number;
}

export interface ScoreCriterion {
  id: string;
  name: string;
  guidance: string; // Tooltip summary
  weight: number;
  details: string; // Full HTML guidance
}

// Admin Document System
export interface AdminDocument {
    id: string;
    name: string;
    type: 'folder' | 'file';
    parentId: string | 'root'; // 'root' or folder ID
    url?: string; // Only for files
    category: 'general' | 'minutes' | 'policy' | 'committee-only'; // Permissions
    uploadedBy: string;
    createdAt: number;
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
  ref: string;
  
  submissionMethod: 'digital' | 'upload';
  pdfUrl?: string;
  stage2PdfUrl?: string;

  formData?: {
    // --- Stage 1 (EOI) Matches PB 1.1 ---
    applyMultiArea?: boolean;
    
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
    
    // Outcomes (1, 2, 3 from PDF)
    outcome1?: string;
    outcome2?: string;
    outcome3?: string;
    
    // Funding
    otherFundingSources?: string; // Section 6b
    crossAreaBreakdown?: string; // Section 6c
    
    // Alignment
    marmotPrinciples?: string[];
    wfgGoals?: string[];
    
    // Declaration (Section 8)
    gdprConsent?: boolean;
    declarationTrue?: boolean;
    declarationName?: string;
    declarationDate?: string;
    declarationSignature?: string; // Text signature

    // --- Stage 2 (Full App) Matches PB 2.1 ---
    
    // Bank & Reg
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankSortCode?: string;
    charityNumber?: string;
    companyNumber?: string;
    
    // Project Detail
    projectOverview?: string; // Sec 2.2
    activities?: string; // Sec 2.3
    communityBenefit?: string; // Sec 2.4
    collaborations?: string; // Sec 2.5
    risks?: string; // Sec 2.6
    
    // Alignment Explanations
    marmotExplanations?: Record<string, string>;
    wfgExplanations?: Record<string, string>;
    
    // Budget
    budgetBreakdown?: BudgetLine[];
    additionalBudgetInfo?: string; // 4.2
    
    // Checklists & Declarations (4.4 & 4.5)
    checklist?: string[]; // Constitution, Equality Policy etc.
    declarationStatements?: string[]; // Consent to withdraw, True/Accurate, GDPR etc.
    declarationName2?: string;
    declarationDate2?: string;
    declarationSignature2?: string;
  }
}

export interface Score {
  appId: string;
  scorerId: string;
  scorerName: string;
  scores: Record<string, number>;
  notes: Record<string, string>;
  isFinal: boolean;
  total: number;
  timestamp: number;
}
