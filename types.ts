// types.ts

// --- STRICT ROLE-BASED ACCESS CONTROL ---
export type Role = 'applicant' | 'committee' | 'admin';

// --- GEOGRAPHIC AREAS ---
export type Area = 'Blaenavon' | 'Thornhill & Upper Cwmbran' | 'Trevethin–Penygarn–St Cadoc’s' | 'Cross-Area';

export const AREAS: Area[] = [
  'Blaenavon',
  'Thornhill & Upper Cwmbran',
  'Trevethin–Penygarn–St Cadoc’s'
];

// --- APPLICATION STATUS (Two-Stage Lifecycle) ---
export type ApplicationStatus =
  | 'Draft'
  | 'Submitted-Stage1'
  | 'Rejected-Stage1'
  | 'Invited-Stage2'
  | 'Submitted-Stage2'
  | 'Funded'
  | 'Not-Funded';

// --- USER INTERFACE ---
export interface User {
  uid: string;
  email: string;
  username?: string;
  role: Role;
  area?: Area | null;  // Area assignment (required for committee members)
  displayName?: string;
  password?: string; // For demo seeding only, never store in production

  // Profile fields
  bio?: string;
  phone?: string;
  photoUrl?: string;
  address?: string;
  roleDescription?: string;
  createdAt?: number;
  isActive?: boolean;
}

// --- PORTAL SETTINGS ---
export interface PortalSettings {
    stage1Visible: boolean;
    stage2Visible: boolean;
    votingOpen: boolean;
    scoringThreshold: number;
}

// --- BUDGET LINE ---
export interface BudgetLine {
    item: string;
    note: string;
    cost: number;
}

// --- SCORING CRITERION ---
export interface ScoreCriterion {
  id: string;
  name: string;
  guidance: string;
  weight: number;
  details: string;
}

// --- VOTING (Stage 1) ---
export interface Vote {
    id: string;
    appId: string;
    voterId: string;
    voterName?: string;
    decision: 'yes' | 'no';
    reason?: string;
    createdAt: string;
}

// --- SCORING (Stage 2) ---
export interface ScoreBreakdown {
  [criterionKey: string]: number; // 0–100
}

export interface Score {
  id: string;
  appId: string;
  scorerId: string;
  scorerName?: string;
  weightedTotal: number; // 0–100
  breakdown: ScoreBreakdown;
  notes?: Record<string, string>; // criterionId -> comment
  isFinal?: boolean;
  createdAt: string;
}

// --- APPLICATION ---
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
  status: ApplicationStatus;
  priority?: string;
  createdAt: number;
  updatedAt: number;
  ref: string;
  roundId?: string; // Link to specific funding round

  submissionMethod: 'digital' | 'upload';
  pdfUrl?: string;
  stage2PdfUrl?: string;

  // Feedback from Admins/Committee to Applicant
  feedback?: string;

  // Computed fields for Admin View
  voteCountYes?: number;
  voteCountNo?: number;
  averageScore?: number;
  scoreCount?: number;

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

    // Checklist / Uploads
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

// --- ADMIN DOCUMENTS ---
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

// --- ROUND MANAGEMENT ---
export interface Round {
  id: string;
  name: string;
  year: number;
  status: 'planning' | 'open' | 'scoring' | 'voting' | 'closed';
  startDate: string;
  endDate: string;
  areas: Area[]; // Areas covered by this round
  stage1Open?: boolean;
  stage2Open?: boolean;
  scoringOpen?: boolean;
  scoringCriteria?: ScoreCriterion[];
  scoringThreshold?: number;
  createdAt?: number;
}

// --- ASSIGNMENTS ---
export interface Assignment {
  id: string;
  applicationId: string;
  committeeId: string;
  assignedDate: string;
  dueDate?: string;
  status: 'assigned' | 'draft' | 'submitted' | 'rescore';
}

// --- AUDIT LOGGING ---
export interface AuditLog {
  id: string;
  adminId: string;
  action: string;    // e.g. 'APP_STATUS_CHANGE', 'ROUND_UPDATE'
  targetId: string;  // e.g. application or round id
  timestamp: number;
  details?: Record<string, unknown>;
}
