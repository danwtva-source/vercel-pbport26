// types.ts

export type Role = 'guest' | 'applicant' | 'committee' | 'admin';
export type Area = 'Blaenavon' | 'Thornhill & Upper Cwmbran' | 'Trevethin, Penygarn & St. Cadocs' | 'Cross-Area';
export type AppStatus = 'Draft' | 'Submitted-Stage1' | 'Rejected-Stage1' | 'Invited-Stage2' | 'Submitted-Stage2' | 'Finalist' | 'Funded' | 'Rejected' | 'Withdrawn';

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
  password?: string; // For demo seeding only
  // Profile
  bio?: string;
  phone?: string;
  photoUrl?: string;
  address?: string;
  roleDescription?: string;
  createdAt?: number;
}

export interface PortalSettings {
    stage1Visible: boolean;
    stage2Visible: boolean;
    votingOpen: boolean;
    scoringThreshold: number;
}

export interface BudgetLine {
    item: string;
    note: string;
    cost: number;
}

export interface ScoreCriterion {
  id: string;
  name: string;
  guidance: string;
  weight: number;
  details: string;
}

// --- NEW: Voting Interface for Stage 1 ---
export interface Vote {
    appId: string;
    voterId: string;
    voterName: string;
    decision: 'yes' | 'no';
    reason?: string;
    timestamp: number;
}

export interface Score {
  appId: string;
  scorerId: string;
  scorerName: string;
  scores: Record<string, number>; // criterionId -> score
  notes: Record<string, string>; // criterionId -> comment
  isFinal: boolean;
  total: number;
  weightedTotal: number;
  timestamp: number;
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
  updatedAt: number;
  ref: string;
  roundId?: string; // Link to specific funding round
  
  submissionMethod: 'digital' | 'upload';
  pdfUrl?: string;
  stage2PdfUrl?: string;

  // Computed fields for Admin View
  voteCountYes?: number;
  voteCountNo?: number;
  averageScore?: number;

  // --- Stage 1 (EOI) Data ---
  formData: {
    applyMultiArea?: boolean;
    
    // Address
    addressStreet?: string;
    addressLocalArea?: string;
    addressTown?: string;
    addressCounty?: string;
    addressPostcode?: string;
    
    // Organisation Type
    orgTypes?: string[]; // Multiple selection
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
    outcome1?: string;
    outcome2?: string;
    outcome3?: string;
    
    // Funding
    otherFundingSources?: string; 
    crossAreaBreakdown?: string; 
    
    // Alignment Selections (Part 1 Checkboxes)
    marmotPrinciples?: string[];
    wfgGoals?: string[];
    
    // Declaration Part 1
    gdprConsent?: boolean;
    declarationTrue?: boolean;
    declarationName?: string;
    declarationDate?: string;
    declarationSignature?: string;

    // --- Stage 2 (Full App) Data ---
    
    // Bank & Reg
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankSortCode?: string;
    charityNumber?: string;
    companyNumber?: string;
    
    // Detailed Project
    smartObjectives?: string;
    activities?: string;
    communityBenefit?: string;
    collaborations?: string;
    riskManagement?: string;
    
    // Justifications (Text for selected Marmot/WFG)
    marmotJustifications?: Record<string, string>; // Principle -> Text
    wfgJustifications?: Record<string, string>; // Goal -> Text
    
    // Detailed Budget
    budgetBreakdown?: BudgetLine[];
    additionalBudgetInfo?: string;
    
    // Checklist
    attachments?: {
        constitution?: boolean;
        safeguarding?: boolean;
        gdpr?: boolean;
        bankStatement?: boolean;
        insurance?: boolean;
    };
    
    // Declaration Part 2
    consentWithdraw?: boolean;
    agreeGdprScrutiny?: boolean;
    confirmOtherFunding?: boolean;
    declarationName2?: string;
    declarationDate2?: string;
    declarationSignature2?: string;
  }
}

export interface AdminDocument {
    id: string;
    name: string;
    type: 'folder' | 'file';
    parentId: string | 'root';
    url?: string;
    category: 'general' | 'minutes' | 'policy' | 'committee-only';
    uploadedBy: string;
    createdAt: number;
}

export interface Round {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  areas: Area[];
  stage1Open: boolean;
  stage2Open: boolean;
  scoringOpen: boolean;
  scoringCriteria?: ScoreCriterion[];
  scoringThreshold?: number;
  createdAt: number;
}

export interface Assignment {
  id: string;
  applicationId: string;
  committeeId: string;
  assignedDate: string;
  dueDate?: string;
  status: 'assigned' | 'draft' | 'submitted' | 'rescore';
}

export interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  timestamp: number;
}
