import { ScoreCriterion } from "./types";

export const POSTCODES = {
  'Blaenavon': ['NP49AA','NP49AB','NP49AD'], // (Truncated for brevity, logic exists in app)
  'Thornhill & Upper Cwmbran': ['NP441AA','NP441AB'],
  'Trevethin–Penygarn–St Cadoc’s': ['NP48AA','NP48AB']
};

// Full text from PB 1.1 Form
export const MARMOT_PRINCIPLES = [
    "Give every child the best start in life",
    "Enable all to maximise capabilities and have control over their lives",
    "Create fair employment and good work for all",
    "Ensure a healthy standard of living for all",
    "Create and develop healthy/sustainable places",
    "Strengthen the role and impact of ill health prevention"
];

// Full text from PB 1.1 Form
export const WFG_GOALS = [
    "A prosperous Wales",
    "A resilient Wales",
    "A healthier Wales",
    "A more equal Wales",
    "A Wales of cohesive communities",
    "A Wales of vibrant culture and thriving Welsh language",
    "A globally responsible Wales"
];

export const ORG_TYPES = [
    "Community Interest Company",
    "Charitable Incorporated Organisation",
    "Registered Charity",
    "Voluntary / Community Group",
    "Informal / Self-Help Group",
    "Private Business / Limited Company"
];

export const COMMITTEE_DOCS = [
    { title: 'PB 1.1 - EOI Form', desc: 'The main Expression of Interest application form (Part 1).', url: '#' },
    { title: 'PB 1.2 - Priorities Report', desc: 'A report detailing the funding priorities identified by the community.', url: '#' },
    { title: 'PB 1.3 - Application Guidance', desc: 'Guidance notes for completing the Part 1 EOI application.', url: '#' },
    { title: 'PB 2.1 - Full Application', desc: 'The full, detailed application form for shortlisted projects (Part 2).', url: '#' }
];

export const PRIORITY_DATA = {
    blaenavon: { total: 254, data: [{ label: 'Youth Services', value: 120 }, { label: 'Transport', value: 104 }, { label: 'Antisocial Behaviour', value: 70 }, { label: 'Health & Wellbeing', value: 61 }, { label: 'Environment', value: 56 }] },
    thornhill: { total: 382, data: [{ label: 'Health & Wellbeing', value: 140 }, { label: 'Youth Services', value: 129 }, { label: 'Sustainability', value: 75 }, { label: 'Community', value: 74 }, { label: 'Safety', value: 28 }] },
    trevethin: { total: 426, data: [{ label: 'Environment', value: 140 }, { label: 'Youth Services', value: 129 }, { label: 'Health', value: 120 }, { label: 'Older People', value: 100 }, { label: 'Crime', value: 75 }] }
};

export const SCORING_CRITERIA: ScoreCriterion[] = [
  { id: "overview", name: "Project Overview & SMART Objectives", guidance: "Clarity of purpose and objectives.", weight: 15, details: "" },
  { id: "priorities", name: "Alignment with Local Priorities", guidance: "Connection to community needs.", weight: 15, details: "" },
  { id: "benefit", name: "Community Benefit & Outcomes", guidance: "Potential benefits and impact.", weight: 10, details: "" },
  { id: "activities", name: "Activities & Delivery", guidance: "Feasibility of the plan.", weight: 5, details: "" },
  { id: "timeline", name: "Timeline & Scheduling", guidance: "Realistic dates.", weight: 10, details: "" },
  { id: "collab", name: "Collaborations", guidance: "Partnerships strength.", weight: 10, details: "" },
  { id: "risks", name: "Risk Management", guidance: "Mitigation strategies.", weight: 5, details: "" },
  { id: "budget", name: "Budget & Value", guidance: "Transparency and justification.", weight: 10, details: "" },
  { id: "alignment", name: "Marmot & WFG Alignment", guidance: "Practical contribution to goals.", weight: 10, details: "" },
  { id: "cross_area", name: "Cross-Area Specifics", guidance: "Clarity for multi-area projects (if applicable).", weight: 10, details: "" }
];

export const DEMO_USERS = []; // Kept empty to use real DB logic primarily, or populated in firebase.ts
export const DEMO_APPS = [];
