export type Role = 'guest' | 'applicant' | 'committee' | 'admin';
export type Area = 'Blaenavon' | 'Thornhill & Upper Cwmbran' | 'Trevethin, Penygarn & St. Cadocs' | 'Cross-Area';
export type AppStatus = 'Draft' | 'Submitted-Stage1' | 'Rejected-Stage1' | 'Invited-Stage2' | 'Submitted-Stage2' | 'Finalist' | 'Funded' | 'Rejected' | 'Withdrawn';

export interface User {
  uid: string;
  email: string;
  username?: string;
  role: Role;
  area?: Area;
  displayName?: string;
  password?: string;
  bio?: string;
  phone?: string;
  photoUrl?: string;
  address?: string;
  roleDescription?: string;
}

export interface PortalSettings {
    part1Live: boolean;     // Is the EOI open for new applications?
    part2Live: boolean;     // Is the Full App open for invited applicants?
    scoringLive: boolean;   // Can committee members see and score apps?
}

export interface BudgetLine {
    item: string;
    note: string;
    cost: number;
}

export interface Application {
  id: string;
  userId: string;
  applicantName: string;
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
  
  // Method branching
  submissionMethod: 'digital' | 'upload';
  
  // File Upload Mode URLs
  pdfUrl?: string;       // Stage 1 PDF
  stage2PdfUrl?: string; // Stage 2 PDF

  // Digital Mode Data
  formData?: {
    // Stage 1
    applyMultiArea?: boolean;
    addressStreet?: string;
    addressLocalArea?: string;
    addressTown?: string;
    addressCounty?: string;
    addressPostcode?: string;
    orgType?: string;
    orgTypeOther?: string;
    contactPosition?: string;
    contactEmail?: string;
    contactPhone?: string;
    projectTheme?: string;
    startDate?: string;
    endDate?: string;
    duration?: string;
    positiveOutcomes?: string[];
    otherFundingSources?: string;
    crossAreaBreakdown?: string;
    marmotPrinciples?: string[];
    wfgGoals?: string[];
    declarationName?: string;
    declarationDate?: string;
    declarationSigned?: boolean;

    // Stage 2
    bankAccountName?: string;
    bankAccountNumber?: string;
    bankSortCode?: string;
    charityNumber?: string;
    companyNumber?: string;
    projectOverview?: string;
    activities?: string;
    communityBenefit?: string;
    collaborations?: string;
    risks?: string;
    marmotExplanations?: Record<string, string>;
    wfgExplanations?: Record<string, string>;
    budgetBreakdown?: BudgetLine[];
    additionalBudgetInfo?: string;
    checklist?: string[];
    declarationStatements?: string[];
    declarationName2?: string;
    declarationDate2?: string;
  }
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
  scores: Record<string, number>;
  notes: Record<string, string>;
  isFinal: boolean;
  total: number;
  timestamp: number;
}

export const AREAS: Area[] = [
  'Blaenavon',
  'Thornhill & Upper Cwmbran',
  'Trevethin, Penygarn & St. Cadocs'
];
