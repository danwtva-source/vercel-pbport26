// types.ts - Comprehensive Type Definitions for Participatory Budgeting Portal

// --- ROLE-BASED ACCESS CONTROL ---

// Enum-based roles (from v8) for stricter type checking
export enum UserRole {
  PUBLIC = 'PUBLIC',
  COMMUNITY = 'COMMUNITY',
  APPLICANT = 'APPLICANT',
  COMMITTEE = 'COMMITTEE',
  ADMIN = 'ADMIN'
}

// String union type for backwards compatibility and flexibility (UI-facing)
export type Role = 'community' | 'applicant' | 'committee' | 'admin';
// Canonical storage role values (PRD) - always normalized in persistence
export type StoredRole = 'admin' | 'committee' | 'applicant';

// --- GEOGRAPHIC AREAS ---

export type Area = 'Blaenavon' | 'Thornhill & Upper Cwmbran' | 'Trevethin, Penygarn & St. Cadocs' | 'Cross-Area';

export const AREAS: Area[] = [
  'Blaenavon',
  'Thornhill & Upper Cwmbran',
  'Trevethin, Penygarn & St. Cadocs'
];

// --- APPLICATION STATUS (Two-Stage Lifecycle) ---

export type ApplicationStatus =
  | 'Draft'
  | 'Submitted-Stage1'
  | 'Rejected-Stage1'
  | 'Invited-Stage2'
  | 'Submitted-Stage2'
  | 'Funded'
  | 'Not-Funded'
  | 'Submitted' // Legacy status for backwards compatibility
  | 'Scored';   // Legacy status for backwards compatibility

// --- USER INTERFACE ---

export interface User {
  uid: string;
  email: string;
  username?: string;
  role: Role;
  area?: Area | null;  // Area assignment (required for committee members)
  /**
   * Canonical PRD field: areaId (slug). Legacy "area" name is retained for UI.
   * Mapping strategy: services/firebase.ts maps area <-> areaId on read/write.
   */
  areaId?: string | null;
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
    // Stage 1 (EOI) Controls
    stage1Visible: boolean;          // EOI submission form visible to applicants
    stage1VotingOpen?: boolean;      // Committee can vote on Stage 1 EOIs

    // Stage 2 (Full Application) Controls
    stage2Visible: boolean;          // Stage 2 form visible to invited applicants
    stage2ScoringOpen?: boolean;     // Committee can score Stage 2 applications

    // Public Voting Controls
    votingOpen: boolean;             // Public voting is active
    publicVotingStartDate?: number;  // Public voting start date (timestamp)
    publicVotingEndDate?: number;    // Public voting end date (timestamp)

    // Results & Threshold
    scoringThreshold: number;        // Minimum score percentage for funding consideration
    resultsReleased?: boolean;       // Part 2 results visible to applicants
}

// System Settings (from v8) - Alternative/extended settings interface
export interface SystemSettings {
  scoringThreshold: number;
  activeRoundId: string;
  isEOIOpen: boolean;
  isPart2Open: boolean;
  isVotingOpen: boolean;
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
  score?: number; // Optional score value (from v8)
  notes?: string; // Optional notes (from v8)
}

// Alias for backwards compatibility
export type Criterion = ScoreCriterion;

// --- VOTING (Stage 1) ---

export interface Vote {
  id: string;
  // Legacy fields kept for backwards compatibility
  appId: string;
  voterId: string;
  // Canonical PRD fields
  applicationId?: string;
  committeeId?: string;
  /** Mapping strategy: services/firebase.ts mirrors appId <-> applicationId and voterId <-> committeeId. */
  voterName?: string;
  decision: 'yes' | 'no';
  reason?: string;
  createdAt: string;
}

// --- SCORING (Stage 2) ---

export interface ScoreBreakdown {
  [criterionKey: string]: number; // 0–3 per PRD
}

export interface Score {
  id: string;
  // Legacy fields kept for backwards compatibility
  appId: string;
  scorerId: string;
  // Canonical PRD fields
  applicationId?: string;
  committeeId?: string;
  scorerName?: string;
  weightedTotal: number; // 0–100
  breakdown: ScoreBreakdown;
  /**
   * Canonical PRD field for per-criterion scoring.
   * Mapping strategy: criterionScores <-> breakdown in services/firebase.ts.
   */
  criterionScores?: ScoreBreakdown;
  notes?: Record<string, string>; // criterionId -> comment
  isFinal?: boolean;
  createdAt: string;
}

// Scoring State (from v8) - Alternative scoring representation
export interface ScoringState {
  ref: string;
  criteria: ScoreCriterion[];
  isFinal: boolean;
  scorer: string;
  scorerUid?: string;
  updatedAt: string;
}

// --- APPLICATION ---

export interface Application {
  id: string;
  /**
   * Canonical PRD identifiers (applicationId/applicantId/areaId) map to legacy fields.
   * Mapping strategy: services/firebase.ts mirrors applicationId <-> id,
   * applicantId <-> userId, areaId <-> area.
   */
  applicationId?: string;
  applicantId?: string;
  areaId?: string;
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

  // --- Public Vote Pack (for successful Part 2 applicants) ---
  publicVoteImage?: string; // URL to image for public voting display
  publicVoteBlurb?: string; // Short description for public voting (max 200 words)
  publicVotePackComplete?: boolean; // True when both image and blurb submitted
  blurbApproved?: boolean; // Whether blurb is approved for voting page

  // --- Reach Data for Coefficient Calculation ---
  reachData?: ReachData;

  // --- Voting Data (with coefficient adjustment) ---
  votingData?: VotingData;

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
        // URLs for uploaded files
        constitutionUrl?: string;
        bankStatementUrl?: string;
        otherUrl?: string;
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

// --- DOCUMENTS (Folders + Files) ---

export type DocumentVisibility = 'public' | 'committee' | 'admin';

export interface DocumentFolder {
  id: string;
  name: string;
  slug?: string;  // URL-friendly identifier
  visibility: DocumentVisibility;
  createdAt: number;
  createdBy: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  folderId: string | 'root' | null;
  visibility: DocumentVisibility;
  url?: string;
  filePath: string;
  uploadedBy: string;
  createdAt: number;
}

// Document Resource (from v8) - Alternative document representation
export interface DocumentResource {
  id: string;
  title: string;
  category: 'Guidance' | 'Policy' | 'Template';
  url: string;
  size: string;
  uploadedAt: string;
}

// --- FUNDING ROUNDS ---

/**
 * Represents a funding round in the participatory budgeting process. A round may apply to one
 * or more geographic areas and has its own open/close windows for each stage. Admins can
 * configure scoring criteria and thresholds per round.
 */
export interface Round {
  id: string;
  /** Human‑readable name, e.g. "Communities' Choice 2026" */
  name: string;
  /** Year of the funding round */
  year: number;
  /** Status of the round */
  status: 'planning' | 'open' | 'scoring' | 'voting' | 'closed';
  /** ISO date string when this round starts accepting applications */
  startDate: string;
  endDate: string;
  /** Areas this round applies to; if empty, applies to all areas */
  areas: Area[];
  /** Whether Stage 1 (EOI) is open for this round */
  stage1Open?: boolean;
  /** Whether Stage 2 (Full Application) is open for this round */
  stage2Open?: boolean;
  /** Whether scoring is open for this round */
  scoringOpen?: boolean;
  /** Optional list of scoring criteria specific to this round */
  scoringCriteria?: ScoreCriterion[];
  scoringThreshold?: number;
  /** Timestamp when the round was created */
  createdAt?: number;

  // --- Financial Management ---
  /** Total budget allocated for this round (GBP) */
  budget?: number;
  /** Budget allocation per area */
  budgetByArea?: Record<string, number>;

  // --- Coefficient Settings ---
  /** Coefficient calculation settings for digital voting */
  coefficientSettings?: CoefficientSettings;
}

// --- ASSIGNMENTS ---

/**
 * An assignment links an application to a committee member. Assignments drive the
 * Committee dashboard task list and allow per‑member progress tracking and due dates.
 */
export interface Assignment {
  /** Canonical document ID: `${applicationId}_${committeeId}` */
  id: string;
  applicationId: string;
  committeeId: string;
  assignedDate: string;
  dueDate?: string;
  status: 'assigned' | 'draft' | 'submitted' | 'rescore';
}

// --- AUDIT LOGGING ---

/**
 * Captures an administrative action in the system, providing an audit trail. Important
 * actions such as toggling stage windows, adjusting scoring thresholds or deleting
 * applications should be logged here.
 */
export interface AuditLog {
  id: string;
  adminId: string;
  /** Human readable description of the action, e.g. 'APP_STATUS_CHANGE', 'ROUND_UPDATE' */
  action: string;
  /** Target ID (e.g. application or round id) */
  targetId: string;
  /** Timestamp when the action occurred */
  timestamp: number;
  /** Additional details about the action */
  details?: Record<string, unknown>;
}

// --- AREA DATA (from v8) ---

export interface AreaData {
  name: string;
  formUrl: string;
  postcodes: string[];
}

// --- PRIORITY DATA (from v8) ---

export interface PriorityEntry {
  name: string;
  score: number;
  description: string;
}

export interface PriorityData {
  totalResponses: number;
  priorities: PriorityEntry[];
}

// --- MASTER TASKS (from v8) ---

export interface MasterTask {
  id: string;
  type: 'review_eoi' | 'score_app' | 'approve_final' | 'system_check';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  area?: string;
  targetRef?: string;
}

// --- COEFFICIENT CALCULATION (Reach/Impact Weighting) ---

export type CoefficientTier = 'small' | 'medium' | 'large';

export interface CoefficientTierConfig {
  /** Maximum reach value for this tier (inclusive). For 'large' tier, this is Infinity */
  maxReach: number;
  /** Coefficient factor to apply (e.g., 1.0, 1.1, 1.2) */
  factor: number;
}

export interface CoefficientSettings {
  /** Whether coefficient weighting is enabled for this round */
  enabled: boolean;
  /** Whether to apply weighting to in-person votes (default: false, digital only) */
  applyToInPerson: boolean;
  /** Tier configuration */
  tiers: {
    small: CoefficientTierConfig;   // Default: maxReach 24, factor 1.2
    medium: CoefficientTierConfig;  // Default: maxReach 100, factor 1.1
    large: CoefficientTierConfig;   // Default: maxReach Infinity, factor 1.0
  };
}

export interface ReachData {
  /** Estimated reach figure (membership, mailing list, or social following) */
  reachFigure: number;
  /** URL to evidence (screenshot, profile link, etc.) */
  evidenceUrl?: string;
  /** Path to uploaded evidence file */
  evidenceFilePath?: string;
  /** Whether applicant has confirmed the declaration */
  declarationConfirmed: boolean;
  /** Calculated tier based on reach figure */
  tier?: CoefficientTier;
  /** Applied coefficient factor */
  coefficientFactor?: number;
  /** Admin audit flag (if evidence is questionable) */
  auditFlag?: boolean;
  /** Admin override coefficient (if auditFlag is true) */
  adminOverrideFactor?: number;
  /** Admin notes for audit */
  adminNotes?: string;
}

export interface VotingData {
  /** Raw digital vote count */
  rawDigitalVotes: number;
  /** Coefficient factor applied */
  coefficientFactor: number;
  /** Adjusted digital votes (raw × coefficient) */
  adjustedDigitalVotes: number;
  /** In-person vote count (recorded separately) */
  inPersonVotes: number;
  /** Total votes (adjusted digital + in-person, or raw if coefficient disabled) */
  totalVotes: number;
}

// --- FINANCIAL MANAGEMENT ---

export interface FinancialRecord {
  id: string;
  roundId: string;
  /** Total funding allocated for this round */
  totalFunding: number;
  /** Total funding spent to date */
  totalSpent: number;
  /** Remaining pot (totalFunding - totalSpent) */
  remainingPot: number;
  /** Spend breakdown by geographic area */
  spendByArea: Record<string, number>;
  /** Spend breakdown by priority category */
  spendByPriority: Record<string, number>;
  /** Last updated timestamp */
  updatedAt: number;
  /** Who last updated */
  updatedBy: string;
}

export interface AreaFinancials {
  area: Area;
  allocated: number;
  spent: number;
  remaining: number;
  round1Spend?: number;
  projectCount: number;
  pendingRequests: number;
}

export interface FundingSimulation {
  /** Application ID being simulated */
  applicationId: string;
  /** Amount requested */
  amountRequested: number;
  /** Impact on remaining budget */
  remainingAfterApproval: number;
  /** Whether this would exceed budget */
  exceedsBudget: boolean;
  /** Priority category impact */
  priorityImpact: {
    category: string;
    currentSpend: number;
    newSpend: number;
  };
}

// --- ANNOUNCEMENTS ---

export type AnnouncementCategory = 'general' | 'deadline' | 'update' | 'event' | 'result' | 'news';
export type AnnouncementVisibility = 'all' | 'applicants' | 'committee' | 'admin';
export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  /** Target audience */
  visibility: AnnouncementVisibility;
  /** Priority level */
  priority: AnnouncementPriority;
  /** Pin to top of announcements */
  pinned?: boolean;
  /** Call to action button */
  actionLabel?: string;
  actionUrl?: string;
  /** Display date range (optional) */
  startDate?: number;
  endDate?: number;
  /** Timestamps */
  createdAt?: number;
  updatedAt?: number;
  /** Author */
  createdBy?: string;
  /** View tracking */
  readCount?: number;
}

// --- DISCUSSION BOARD ---

export interface DiscussionThread {
  id: string;
  title: string;
  /** Topic category aligned with priority areas */
  category: string;
  /** Thread starter UID */
  authorId: string;
  authorName: string;
  /** Initial post content */
  content: string;
  /** Number of replies */
  replyCount: number;
  /** Last activity timestamp */
  lastActivityAt: number;
  createdAt: number;
  /** Moderation status */
  status: 'pending' | 'approved' | 'rejected' | 'closed';
  /** Whether thread is locked for new replies */
  locked?: boolean;
  /** Pinned threads appear at top */
  pinned?: boolean;
}

export interface DiscussionPost {
  id: string;
  threadId: string;
  /** Author UID */
  authorId: string;
  authorName: string;
  content: string;
  /** Parent post ID for threaded replies */
  parentId?: string;
  createdAt: number;
  updatedAt?: number;
  /** Moderation status */
  status: 'pending' | 'approved' | 'rejected';
  /** Number of likes/upvotes */
  likes?: number;
}

// --- HAVE YOUR SAY SUGGESTIONS ---

export interface PrioritySuggestion {
  id: string;
  /** Submitter UID */
  submitterId: string;
  submitterName: string;
  /** Suggested priority title */
  title: string;
  /** Description of the suggestion */
  description: string;
  /** Which area this suggestion applies to */
  area?: Area | 'all';
  /** Admin review status */
  status: 'pending' | 'under_review' | 'accepted' | 'rejected';
  /** Admin feedback/notes */
  adminNotes?: string;
  /** If accepted, which priority it became */
  linkedPriorityId?: string;
  /** Notification sent to submitter */
  notificationSent?: boolean;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
}

// --- AI BLURB GENERATION ---

export interface BlurbGeneration {
  id: string;
  applicationId: string;
  /** Generated blurb content */
  generatedBlurb: string;
  /** Edited version (if modified by applicant) */
  editedBlurb?: string;
  /** Final submitted blurb */
  submittedBlurb?: string;
  /** Generation timestamp */
  generatedAt: number;
  /** Submission timestamp */
  submittedAt?: number;
  /** Approval status */
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'revision_requested';
  /** Reviewer UID */
  reviewedBy?: string;
  /** Reviewer feedback */
  reviewerNotes?: string;
  reviewedAt?: number;
}
