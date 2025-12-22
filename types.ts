
export enum UserRole {
  PUBLIC = 'PUBLIC',
  APPLICANT = 'APPLICANT',
  COMMITTEE = 'COMMITTEE',
  ADMIN = 'ADMIN'
}

export interface User {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  area: string; 
  createdAt?: any;
  photoUrl?: string; 
  bio?: string;
  phone?: string;
}

export interface BudgetLine {
  item: string;
  amount: number;
}

export interface Application {
  ref: string;
  applicant: string; 
  contactName: string;
  email: string;
  phone: string;
  address: string;
  area: string;
  
  // Status Tracking
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Scored' | 'Approved' | 'Rejected' | 'Finalised';
  stage: 'EOI' | 'Part 2';
  
  // Part 1: EOI Fields
  projectTitle: string;
  projectSummary: string; 
  amountRequest: number;
  totalCost: number;
  beneficiaries: string; 
  timescale: string;
  
  // Logic Connections
  selectedWfgGoals: string[]; 
  selectedMarmotPrinciples: string[]; 
  
  // Part 2: Full Application Fields
  wfgJustifications?: Record<string, string>; // For justifying selections from Part 1
  marmotJustifications?: Record<string, string>; // For justifying selections from Part 1
  projectPlan: string; 
  communityInvolvement: string; 
  collaboration: string; 
  sustainability: string; 
  inclusionStrategy: string; 
  monitoringEvaluation: string;
  risksChallenges: string;
  budgetBreakdown: BudgetLine[];
  
  // Meta
  applicantUid?: string;
  createdAt?: string;
  submittedAt?: string;
  adminNotes?: string;
}

export interface Criterion {
  id: string;
  name: string;
  guidance: string;
  weight: number;
  details: string;
  score?: number;
  notes?: string;
}

export interface ScoringState {
  ref: string;
  criteria: Criterion[];
  isFinal: boolean;
  scorer: string;
  scorerUid?: string;
  updatedAt: string;
}

export interface AreaData {
  name: string;
  formUrl: string;
  postcodes: string[];
}

export interface PriorityEntry {
  name: string;
  score: number;
  description: string;
}

export interface PriorityData {
  totalResponses: number;
  priorities: PriorityEntry[];
}

export interface SystemSettings {
  scoringThreshold: number; 
  activeRoundId: string;
  isEOIOpen: boolean;
  isPart2Open: boolean;
  isVotingOpen: boolean;
}

export interface Round {
  id: string;
  name: string;
  status: 'planning' | 'open' | 'scoring' | 'voting' | 'closed';
  startDate: string;
  endDate: string;
}

export interface DocumentResource {
  id: string;
  title: string;
  category: 'Guidance' | 'Policy' | 'Template';
  url: string;
  size: string;
  uploadedAt: string;
}

export interface MasterTask {
  id: string;
  type: 'review_eoi' | 'score_app' | 'approve_final' | 'system_check';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  area?: string;
  targetRef?: string;
}
