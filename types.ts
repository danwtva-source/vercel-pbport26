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
  
  submissionMethod: 'digital' | 'upload';
  pdfUrl?: string;
  stage2PdfUrl?: string;

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

/**
 * Represents a funding round in the participatory budgeting process. A round may apply to one
 * or more geographic areas and has its own open/close windows for each stage. Admins can
 * configure scoring criteria and thresholds per round.
 */
export interface Round {
  /** Unique identifier for the round (document ID) */
  id: string;
  /** Human‑readable name, e.g. "Communities’ Choice 2026" */
  name: string;
  /** ISO date string when this round starts accepting applications */
  startDate: string;
  /** ISO date string when this round closes to new applications */
  endDate: string;
  /** Areas this round applies to; if empty, applies to all areas */
  areas: Area[];
  /** Whether Stage 1 (EOI) is open for this round */
  stage1Open: boolean;
  /** Whether Stage 2 (Full Application) is open for this round */
  stage2Open: boolean;
  /** Whether scoring is open for this round */
  scoringOpen: boolean;
  /** Optional list of scoring criteria specific to this round */
  scoringCriteria?: ScoreCriterion[];
  /** Optional scoring threshold (0–100) for this round */
  scoringThreshold?: number;
  /** Timestamp when the round was created */
  createdAt: number;
}

/**
 * An assignment links an application to a committee member. Assignments drive the
 * Committee dashboard task list and allow per‑member progress tracking and due dates.
 */
export interface Assignment {
  /** Unique identifier for the assignment (document ID) */
  id: string;
  /** ID of the application to be scored */
  applicationId: string;
  /** ID of the committee member assigned to score the application */
  committeeId: string;
  /** ISO date string when the assignment was made */
  assignedDate: string;
  /** Optional ISO date string when the score is due */
  dueDate?: string;
  /** Status of this assignment for the committee member */
  status: 'assigned' | 'draft' | 'submitted' | 'rescore';
}

/**
 * Captures an administrative action in the system, providing an audit trail. Important
 * actions such as toggling stage windows, adjusting scoring thresholds or deleting
 * applications should be logged here.
 */
export interface AuditLog {
  /** Unique identifier for the audit entry */
  id: string;
  /** UID of the admin who performed the action */
  adminId: string;
  /** Human readable description of the action */
  action: string;
  /** Optional target ID (e.g. applicationId, userId, roundId) */
  targetId?: string;
  /** Timestamp when the action occurred */
  timestamp: number;
}
