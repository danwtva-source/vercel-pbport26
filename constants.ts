

import { Application, User, ScoreCriterion } from './types';

export const POSTCODES = {
  'Blaenavon': [
    'NP49AA','NP49AB','NP49AD','NP49AE','NP49AF','NP49AG','NP49AH','NP49AJ','NP49AL','NP49AN','NP49AP','NP49AQ','NP49AR','NP49AS','NP49AT','NP49AU','NP49AW','NP49AX','NP49AY','NP49AZ','NP49BA','NP49BB','NP49BD','NP49BE','NP49BF','NP49BG','NP49BH','NP49BJ','NP49BL','NP49BN','NP49BP','NP49BQ','NP49BR','NP49BS','NP49BT','NP49BU','NP49BW','NP49BX','NP49BY','NP49BZ','NP49DA','NP49DB','NP49DD','NP49DE','NP49DF','NP49DG','NP49DH','NP49DJ','NP49DL','NP49DN','NP49DP','NP49DQ','NP49DR','NP49DS','NP49DT','NP49DU','NP49DW','NP49DX','NP49DY','NP49DZ','NP49EA','NP49EB','NP49ED','NP49EE','NP49EF','NP49EG','NP49EH','NP49EJ','NP49EL','NP49EN','NP49EP','NP49EQ','NP49ER','NP49ES','NP49ET','NP49EU','NP49EW','NP49EX','NP49EY','NP49EZ','NP49FA','NP49FB','NP49FD','NP49FE','NP49FF','NP49FG','NP49FH','NP49FJ','NP49FL','NP49FN','NP49FP','NP49FQ','NP49FR','NP49FS','NP49FT','NP49FU','NP49FW','NP49FX','NP49FY','NP49FZ','NP49GA','NP49GB','NP49GD','NP49GE','NP49GF','NP49GG','NP49GH','NP49GJ','NP49GL','NP49GN','NP49GP','NP49GQ','NP49GR','NP49GS','NP49GT','NP49GU','NP49GW','NP49GX','NP49GY','NP49GZ','NP49HA','NP49HB','NP49HD','NP49HE','NP49HF','NP49HG','NP49HH','NP49HJ','NP49HL','NP49HN','NP49HP','NP49HQ','NP49HR','NP49HS','NP49HT','NP49HU','NP49HW','NP49HX','NP49HY','NP49HZ','NP49JA','NP49JB','NP49JD','NP49JE','NP49JF','NP49JG','NP49JH','NP49JJ','NP49JL','NP49JN','NP49JP','NP49JQ','NP49JR','NP49JS','NP49JT','NP49JU','NP49JW','NP49JX','NP49JY','NP49JZ','NP49LA','NP49LB','NP49LD','NP49LE','NP49LF','NP49LG','NP49LH','NP49LJ','NP49LL','NP49LN','NP49LP','NP49LQ','NP49LR','NP49LS','NP49LT','NP49LU','NP49LW','NP49LX','NP49LY','NP49LZ','NP49NA','NP49NB','NP49ND','NP49NE','NP49NF','NP49NG','NP49NH','NP49NJ','NP49NL','NP49NN','NP49NP','NP49NQ','NP49NR','NP49NS','NP49NT','NP49NU','NP49NW','NP49NX','NP49NY','NP49NZ','NP49PA','NP49PB','NP49PD','NP49PE','NP49PF','NP49PG','NP49PH','NP49PJ','NP49PL','NP49PN','NP49PP','NP49PQ','NP49PR','NP49PS','NP49PT','NP49PU','NP49PW','NP49PX','NP49PY','NP49PZ','NP49QA','NP49QB','NP49QD','NP49QE','NP49QF','NP49QG','NP49QH','NP49QJ','NP49QL','NP49QN','NP49QP','NP49QQ','NP49QR','NP49QS','NP49QT','NP49QU','NP49QW','NP49QX','NP49QY','NP49QZ','NP49RA','NP49RB','NP49RD','NP49RE','NP49RF','NP49RG','NP49RH','NP49RJ','NP49RL','NP49RN','NP49RP','NP49RQ','NP49RR','NP49RS','NP49RT','NP49RU','NP49RW','NP49RX','NP49RY','NP49RZ','NP49SA','NP49SB','NP49SD','NP49SE','NP49SF','NP49SG','NP49SH','NP49SJ','NP49SL','NP49SN','NP49SP','NP49SQ','NP49SR','NP49SS','NP49ST','NP49SU','NP49SW','NP49SX','NP49SY','NP49SZ','NP49TA'
  ],
  'Thornhill & Upper Cwmbran': [
    'NP441AA','NP441AB','NP441AD','NP441AE','NP441AG','NP441AY','NP441AZ','NP441BA','NP441BE','NP441BG','NP441BH','NP441BJ','NP441BL','NP441BN','NP441BP','NP441BS','NP441BT','NP441BU','NP441BW','NP441BX','NP441BY','NP441BZ','NP441DA','NP441DB','NP441DE','NP441DF','NP441DJ','NP441DT','NP441DU','NP441DW','NP441DX','NP441DY','NP441DZ','NP441EA','NP441EB','NP441ED','NP441EE','NP441EF','NP441EG','NP441EH','NP441EL','NP441EN','NP441EP','NP441EQ','NP441ER','NP441ES','NP441ET','NP441EU','NP441EW','NP441EX','NP441EY','NP441EZ','NP441HA','NP441HB','NP441HD','NP441HE','NP441HF','NP441HG','NP441HH','NP441HJ','NP441HL','NP441HN','NP441HP','NP441HQ','NP441HR','NP441HS','NP441HT','NP441HU','NP441HW','NP441HX','NP441HY','NP441HZ','NP441JA','NP441JB','NP441JD','NP441JE','NP441JF','NP441JG','NP441JH','NP441JJ','NP441JL','NP441JN','NP441JP','NP441JR','NP441JS','NP441JT','NP441JU','NP441JW','NP441JX','NP441LA','NP441LB','NP441LD','NP441LE','NP441LG','NP441LH','NP441LJ','NP441LL','NP441LN','NP441LP','NP441LQ','NP441LR','NP441LS','NP441LT','NP441LU','NP441LW','NP441LX','NP441NA','NP441NB','NP441ND','NP441NE','NP441NF','NP441NG','NP441NH','NP441NJ','NP441NL','NP441NN','NP441NP','NP441NQ','NP441NR','NP441NS','NP441NT','NP441NU','NP441NW','NP441QP','NP441QQ','NP441QR','NP441QS','NP441QT','NP441QU','NP441QW','NP441QX','NP441QY','NP441QZ','NP441RA','NP441RB','NP441RD','NP441RE','NP441RF','NP441RG','NP441RH','NP441RJ','NP441RL','NP441RN','NP441RP','NP441RQ','NP441RR','NP441RS','NP441RT','NP441RU','NP441RW','NP441RX','NP441RY','NP441RZ','NP441SE','NP441SF','NP441SH','NP441SJ','NP441SL','NP441SN','NP441SP','NP441SQ','NP441SR','NP441SS','NP441ST','NP441SU','NP441SW','NP441SX','NP441SY','NP441SZ','NP441TD','NP441TE','NP441TF','NP441TG','NP441TH','NP441TJ','NP441TL','NP441TN','NP441TP','NP441TQ','NP441TR','NP441TT','NP441TU','NP441TW','NP441TX','NP441TY','NP441UA','NP441WB','NP445AA','NP445AB','NP445AD','NP445AE','NP445AF','NP445AG','NP445AH','NP445AJ','NP445AL','NP445AN','NP445AP','NP445AQ','NP445AR','NP445AS','NP445AT','NP445AU','NP445AW','NP445AX','NP445AY','NP445AZ','NP445BA','NP445BB','NP445BD','NP445BE','NP445BF','NP445BG','NP445BH','NP445BJ','NP445BL','NP445BN','NP445BP','NP445BQ','NP445BS','NP445BT','NP445BU','NP445BW','NP445BX','NP445BY','NP445BZ','NP445DA','NP445DB','NP445DD','NP445DE','NP445DF','NP445DG','NP445DH','NP445DJ','NP445DL','NP445DN','NP445DP','NP445DQ','NP445DR','NP445DS','NP445DT','NP445DU','NP445DW','NP445DX','NP445DY','NP445DZ','NP445EA','NP445EB','NP445ED','NP445EE','NP445EF','NP445EG','NP445EH','NP445EJ','NP445EL','NP445EN','NP445EP','NP445EQ','NP445ER','NP445ES','NP445ET','NP445EU','NP445EW','NP445EX','NP445EY','NP445EZ','NP445FA','NP445FB','NP445FD','NP445FE','NP445FF','NP445FG','NP445FH','NP445FJ','NP445FL','NP445FN','NP445FP','NP445FQ','NP445FR','NP445FS','NP445FT','NP445FU','NP445HA','NP445HB','NP445HD','NP445HE','NP445HF','NP445HG','NP445HH','NP445HJ','NP445HL','NP445HN','NP445HP','NP445HQ','NP445HR','NP445HS','NP445HT','NP445HU','NP445HW','NP445HX','NP445HY','NP445HZ','NP445JA','NP445JB','NP445JD','NP445JE','NP445JF','NP445JG','NP445JH','NP445JJ','NP445JL','NP445JN','NP445JP','NP445JQ','NP445JR','NP445JS','NP445JT','NP445JU','NP445JW','NP445JX','NP445JY','NP445JZ','NP445LA','NP445LB','NP445LD','NP445LE','NP445LF','NP445LG','NP445LH','NP445LJ','NP445LL','NP445LN','NP445LP','NP445LQ','NP445LR','NP445LS','NP445LT','NP445LU','NP445LW','NP445LX','NP445LY','NP445LZ','NP445NA','NP445NB','NP445ND','NP445NE','NP445NF','NP445NG','NP445NH','NP445NJ','NP445NL','NP445NN','NP445NP','NP445NQ','NP445NR','NP445NS','NP445NT','NP445NU','NP445NW','NP445NX','NP445NY','NP445NZ','NP445PA','NP445PB','NP445PD','NP445PE','NP445PF','NP445PG','NP445PH','NP445PJ','NP445PL','NP445PN','NP445PP','NP445PQ','NP445PR','NP445PS','NP445PT','NP445PU','NP445PW','NP445PX','NP445PY','NP445PZ','NP445QA','NP445QB','NP445QD','NP445QE','NP445QF','NP445QG','NP445QH','NP445QJ','NP445QL','NP445QN','NP445QP','NP445QQ','NP445QR','NP445QS','NP445QT','NP445QU','NP445QW','NP445QX','NP445QY','NP445QZ','NP445RA','NP445RB','NP445RD','NP445RE','NP445RF','NP445RG','NP445RH','NP445RJ','NP445RL','NP445RN','NP445RP','NP445RQ','NP445RR','NP445RS','NP445RT','NP445RU','NP445RW','NP445RX','NP445RY','NP445SA','NP445SB','NP445SD','NP445SE','NP445SF','NP445SG','NP445SH','NP445SJ','NP445SL','NP445SN','NP445SP','NP445SQ','NP445SR','NP445SS','NP445ST','NP445SU','NP445SW','NP445SX','NP445SY','NP445TA','NP445TB','NP445TD','NP445TE','NP445TF','NP445TG','NP445TH','NP445TJ','NP445TL','NP445TN','NP445TP','NP445TQ','NP445TR','NP445TS','NP445TT','NP445TU','NP445TW','NP445TX','NP445TY','NP445TZ','NP445UA','NP445UB','NP445UD','NP445UE','NP445UF','NP445UG','NP445UH','NP445UJ','NP445UL','NP445UN','NP445UP','NP445UQ','NP445UR','NP445US','NP445UT','NP445UU','NP445UW','NP445UX','NP445UY'
  ],
  'Trevethin, Penygarn & St. Cadocs': [
    'NP48AA','NP48AB','NP48AD','NP48AE','NP48AF','NP48AG','NP48AH','NP48AJ','NP48AL','NP48AN','NP48AP','NP48AQ','NP48AR','NP48AS','NP48AT','NP48AU','NP48AW','NP48AX','NP48AZ','NP48BB','NP48BD','NP48BG','NP48BN','NP48BP','NP48BQ','NP48BR','NP48BS','NP48BT','NP48BU','NP48BW','NP48BX','NP48BY','NP48BZ','NP48DA','NP48DD','NP48DG','NP48DH','NP48DJ','NP48DL','NP48DN','NP48DP','NP48DQ','NP48DR','NP48DS','NP48DT','NP48DU','NP48DW','NP48DX','NP48DY','NP48DZ','NP48EA','NP48EB','NP48ED','NP48EE','NP48EF','NP48EG','NP48EH','NP48EJ','NP48EL','NP48EN','NP48EP','NP48EW','NP48EY','NP48EZ','NP48FD','NP48GA','NP48HA','NP48HB','NP48HD','NP48HE','NP48HF','NP48HG','NP48HH','NP48HJ','NP48HL','NP48HP','NP48HQ','NP48HR','NP48HS','NP48HT','NP48HU','NP48HW','NP48HX','NP48HY','NP48HZ','NP48JA','NP48JB','NP48JD','NP48JE','NP48JF','NP48JG','NP48JH','NP48JJ','NP48JL','NP48JN','NP48JP','NP48JQ','NP48JR','NP48JS','NP48JT','NP48JU','NP48JW','NP48JX','NP48JY','NP48JZ','NP48LA','NP48LB','NP48LD','NP48LE','NP48LF','NP48LG','NP48LH','NP48LJ','NP48LL','NP48LN','NP48LP','NP48LQ','NP48LR','NP48LS','NP48LT','NP48LU','NP48LW','NP48LX','NP48LY','NP48NA','NP48NB','NP48ND','NP48NE','NP48NF','NP48NG','NP48NH','NP48NJ','NP48NL','NP48NN','NP48NP','NP48NQ','NP48NR','NP48NS','NP48NT','NP48NU','NP48NW','NP48NX','NP48NY','NP48PA','NP48PB','NP48PD','NP48PE','NP48PF','NP48PG','NP48PH','NP48PJ','NP48PL','NP48PN','NP48PP','NP48PQ','NP48PR','NP48PS','NP48PT','NP48PU','NP48PW','NP48PX','NP48PY','NP48PZ','NP48QA','NP48QB','NP48QD','NP48QE','NP48QF','NP48QG','NP48QH','NP48QJ','NP48QL','NP48QN','NP48QP','NP48QQ','NP48QR','NP48QS','NP48QT','NP48QU','NP48QW','NP48QX','NP48QY','NP48RA','NP48RB','NP48RD','NP48RE','NP48RF','NP48RG','NP48RH','NP48RJ','NP48RL','NP48RN','NP48RP','NP48RQ','NP48RR','NP48RS','NP48RT','NP48RU','NP48RW','NP48RX','NP48RY','NP48RZ','NP48SA','NP48SB','NP48SD','NP48SE','NP48SF','NP48SG','NP48SH','NP48SJ','NP48SL','NP48SN','NP48SP','NP48SQ','NP48SR','NP48SS','NP48ST','NP48SU','NP48SW','NP48SX','NP48SY','NP48SZ','NP48TA','NP48TB','NP48TD','NP48TE','NP48TF','NP48TG','NP48TH','NP48TJ','NP48TL','NP48TN','NP48TP','NP48TQ','NP48TR','NP48TS','NP48TT','NP48TU','NP48TW','NP48TX','NP48TY','NP48TZ','NP48UA','NP48UB','NP48UD','NP48UE','NP48UF','NP48UG','NP48UH','NP48UJ','NP48UL','NP48UN','NP48UP','NP48UQ','NP48UR','NP48UT','NP48UU','NP48UW','NP48UX','NP48UY','NP48UZ','NP48WA','NP48WB','NP48WD','NP48WE','NP48WF','NP48WG','NP48WH','NP48WJ','NP48WL','NP48WN','NP48WP','NP48WQ','NP48WR','NP48WS','NP48WT','NP48WU','NP48WW','NP48WX','NP48WY','NP48WZ','NP48XA','NP48XB','NP48XD','NP48XF','NP48XG','NP48XH','NP48XJ','NP48XL','NP48XN','NP48XP','NP48XQ','NP48XR','NP48XS','NP48XT','NP48XU','NP48XW','NP48XX','NP48XY','NP48XZ','NP48YA','NP48YB','NP48YD','NP48YE','NP48YF','NP48YG','NP48YH','NP48YJ','NP48YL','NP48YN','NP48YP','NP48YQ','NP48YR','NP48YS','NP48YT','NP48YU','NP48YW','NP48YX','NP48YY','NP48YZ','NP48ZA','NP48ZB','NP48ZD'
  ]
};

export const MARMOT_PRINCIPLES = [
    "Give every child the best start in life",
    "Enable all to maximise capabilities and have control over their lives",
    "Create fair employment and good work for all",
    "Ensure a healthy standard of living for all",
    "Create and develop healthy/sustainable places",
    "Strengthen the role and impact of ill health prevention"
];

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
    "Private Business / Limited Company",
    "Other"
];

export const ROLE_PERMISSIONS = {
  guest: { 
      canSubmit: false, 
      canScore: false, 
      canManage: false, 
      canExport: false, 
      canVote: true,
      viewRestricted: false 
  },
  applicant: { 
      canSubmit: true, 
      canScore: false, 
      canManage: false, 
      canExport: false, 
      canVote: true,
      viewRestricted: false 
  },
  committee: { 
      canSubmit: false, 
      canScore: true, 
      canManage: false, 
      canExport: false, 
      canVote: false, // Committee members usually abstain from public vote or vote as residents
      viewRestricted: true 
  },
  admin: { 
      canSubmit: true, 
      canScore: true, 
      canManage: true, 
      canExport: true, 
      canVote: true,
      viewRestricted: true 
  }
};

// Seeded Committee Members based on original data
// Password for all is 'demo'
// Login can be done via Email OR Username
export const DEMO_USERS: User[] = [
  // Admins
  { email: 'admin@torfaen.gov.uk', username: 'admin', password: 'demo', role: 'admin', uid: 'admin_01', displayName: 'System Admin', bio: 'Portal Administrator' },
  
  // Applicant
  { email: 'applicant@gmail.com', username: 'applicant', password: 'demo', role: 'applicant', uid: 'app_01', displayName: 'Local Hero' },

  // Blaenavon Committee
  { email: 'louise.white@committee.local', username: 'louise.white', password: 'demo', role: 'committee', uid: 'comm_bln_01', area: 'Blaenavon', displayName: 'Louise White' },
  { email: 'sharon.ford@committee.local', username: 'sharon.ford', password: 'demo', role: 'committee', uid: 'comm_bln_02', area: 'Blaenavon', displayName: 'Sharon Ford' },
  { email: 'boyd.paynter@committee.local', username: 'boyd.paynter', password: 'demo', role: 'committee', uid: 'comm_bln_03', area: 'Blaenavon', displayName: 'Boyd Paynter' },
  { email: 'sarah.charles@committee.local', username: 'sarah.charles', password: 'demo', role: 'committee', uid: 'comm_bln_04', area: 'Blaenavon', displayName: 'Sarah J Charles' },
  { email: 'karen.lang@committee.local', username: 'karen.lang', password: 'demo', role: 'committee', uid: 'comm_bln_05', area: 'Blaenavon', displayName: 'Karen Lang' },
  { email: 'richard.lang@committee.local', username: 'richard.lang', password: 'demo', role: 'committee', uid: 'comm_bln_06', area: 'Blaenavon', displayName: 'Richard Lang' },
  { email: 'pauline.griffiths@committee.local', username: 'pauline.griffiths', password: 'demo', role: 'committee', uid: 'comm_bln_07', area: 'Blaenavon', displayName: 'Pauline Griffiths' },

  // Thornhill & Upper Cwmbran Committee
  { email: 'tracey.daniels@committee.local', username: 'tracey.daniels', password: 'demo', role: 'committee', uid: 'comm_thn_01', area: 'Thornhill & Upper Cwmbran', displayName: 'Tracey Daniels' },
  { email: 'adele.bishop@committee.local', username: 'adele.bishop', password: 'demo', role: 'committee', uid: 'comm_thn_02', area: 'Thornhill & Upper Cwmbran', displayName: 'Adele Bishop' },
  { email: 'clare.roche@committee.local', username: 'clare.roche', password: 'demo', role: 'committee', uid: 'comm_thn_03', area: 'Thornhill & Upper Cwmbran', displayName: 'Clare Roche' },
  { email: 'lara.biggs@committee.local', username: 'lara.biggs', password: 'demo', role: 'committee', uid: 'comm_thn_04', area: 'Thornhill & Upper Cwmbran', displayName: 'Lara Biggs' },
  { email: 'steven.evans@committee.local', username: 'steven.evans', password: 'demo', role: 'committee', uid: 'comm_thn_05', area: 'Thornhill & Upper Cwmbran', displayName: 'Steven Evans' },
  { email: 'leanne.lloyd@committee.local', username: 'leanne.lloyd', password: 'demo', role: 'committee', uid: 'comm_thn_06', area: 'Thornhill & Upper Cwmbran', displayName: 'Leanne Lloyd-Tolman' },

  // Trevethin, Penygarn & St. Cadocs Committee
  { email: 'hannah.davies@committee.local', username: 'hannah.davies', password: 'demo', role: 'committee', uid: 'comm_tre_01', area: 'Trevethin, Penygarn & St. Cadocs', displayName: 'Hannah Davies' },
  { email: 'louise.johnson@committee.local', username: 'louise.johnson', password: 'demo', role: 'committee', uid: 'comm_tre_02', area: 'Trevethin, Penygarn & St. Cadocs', displayName: 'Louise Johnson' },
  { email: 'toniann.phillips@committee.local', username: 'toniann.phillips', password: 'demo', role: 'committee', uid: 'comm_tre_03', area: 'Trevethin, Penygarn & St. Cadocs', displayName: 'Toniann Phillips' },
  { email: 'sue.malson@committee.local', username: 'sue.malson', password: 'demo', role: 'committee', uid: 'comm_tre_04', area: 'Trevethin, Penygarn & St. Cadocs', displayName: 'Sue Malson' },
  { email: 'john.marks@committee.local', username: 'john.marks', password: 'demo', role: 'committee', uid: 'comm_tre_05', area: 'Trevethin, Penygarn & St. Cadocs', displayName: 'John Marks' },
  { email: 'denise.strange@committee.local', username: 'denise.strange', password: 'demo', role: 'committee', uid: 'comm_tre_06', area: 'Trevethin, Penygarn & St. Cadocs', displayName: 'Denise Strange' },
];

export const DEMO_APPS: Application[] = [
  {
    id: 'app_PBBLN001',
    userId: 'app_02',
    applicantName: 'Blaenavon Blues FC',
    orgName: 'Blaenavon Blues FC',
    projectTitle: 'Pitch Improvements',
    area: 'Blaenavon',
    summary: 'Improving the playing surface and drainage to allow for year-round youth football.',
    amountRequested: 4500,
    totalCost: 6000,
    status: 'Submitted-Stage2',
    priority: 'Health & Wellbeing',
    createdAt: Date.now() - 10000000,
    ref: 'PBBLN001',
    submissionMethod: 'upload',
    pdfUrl: 'https://cdn.jsdelivr.net/gh/danwtva-source/applications-test@main/PBBLN001.pdf',
    stage2PdfUrl: 'https://cdn.jsdelivr.net/gh/danwtva-source/applications-test@main/PBBLN001.pdf'
  },
  {
    id: 'app_PBBLN003',
    userId: 'app_03',
    applicantName: 'Blaenavon Community Museum',
    orgName: 'Museum Trust',
    projectTitle: 'Interactive History Display',
    area: 'Blaenavon',
    summary: 'Creating a new digital interactive display for local mining history.',
    amountRequested: 2800,
    totalCost: 3500,
    status: 'Submitted-Stage1',
    priority: 'Heritage & Tourism',
    createdAt: Date.now() - 9000000,
    ref: 'PBBLN003',
    submissionMethod: 'upload',
    pdfUrl: 'https://cdn.jsdelivr.net/gh/danwtva-source/applications-test@main/PBBLN003.pdf'
  },
  {
    id: 'app_PBTUP001',
    userId: 'app_04',
    applicantName: 'Able',
    orgName: 'Able Community',
    projectTitle: 'Accessible Gardening',
    area: 'Thornhill & Upper Cwmbran',
    summary: 'Raised beds and accessible pathways for the community garden.',
    amountRequested: 2000,
    totalCost: 2500,
    status: 'Invited-Stage2',
    priority: 'Health & Wellbeing',
    createdAt: Date.now() - 5000000,
    ref: 'PBTUP001',
    submissionMethod: 'upload',
    pdfUrl: 'https://cdn.jsdelivr.net/gh/danwtva-source/applications-test@main/PBTUP001.pdf'
  },
  {
    id: 'app_PBTPS002',
    userId: 'app_05',
    applicantName: 'CBF - MUGA',
    orgName: 'Community Benefit Fund',
    projectTitle: 'MUGA Floodlights',
    area: 'Trevethin, Penygarn & St. Cadocs',
    summary: 'Installing new LED floodlights for the Multi-Use Games Area.',
    amountRequested: 8500,
    totalCost: 12000,
    status: 'Submitted-Stage2',
    priority: 'Community Safety',
    createdAt: Date.now() - 2000000,
    ref: 'PBTPS002',
    submissionMethod: 'upload',
    pdfUrl: 'https://cdn.jsdelivr.net/gh/danwtva-source/applications-test@main/PBTPS002.pdf',
    stage2PdfUrl: 'https://cdn.jsdelivr.net/gh/danwtva-source/applications-test@main/PBTPS002.pdf'
  }
];

export const COMMITTEE_DOCS = [
    { title: 'PB 1.1 - EOI Form', desc: 'The main Expression of Interest application form (Part 1).', url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.1%20-%20EOI%20Form%20(Part%201).pdf' },
    { title: 'PB 1.2 - Priorities Report', desc: 'A report detailing the funding priorities identified by the community.', url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.2%20-%20Our%20Priorities%20Report.pdf' },
    { title: 'PB 1.3 - Application Guidance', desc: 'Guidance notes for completing the Part 1 EOI application.', url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.3%20-%20Application%20Guidance.pdf' },
    { title: 'PB 2.1 - Full Application', desc: 'The full, detailed application form for shortlisted projects (Part 2).', url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%202.1%20-%20Full%20Application%20Form%20(Part%202)%20final.pdf' },
    { title: 'PB 2.3 - Advisory Template', desc: 'Advisory template for the People\'s Committee assessment process.', url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%202.3%20Peoples%20Committee%20Advisory%20Template.pdf' }
];

export const SCORING_CRITERIA: ScoreCriterion[] = [
  {
      id: "overview_objectives",
      name: "Project Overview & SMART Objectives",
      guidance: "Assesses the clarity and quality of the project's overview and objectives.",
      weight: 15,
      details: "<b>0:</b> No clear overview or objectives; lacks purpose or beneficiaries.<br><b>1:</b> Basic overview with vague objectives; generic language.<br><b>2:</b> Clear overview with mostly SMART objectives; minor gaps.<br><b>3:</b> Concise, compelling overview; fully SMART objectives and clear beneficiaries."
  },
  {
      id: "local_priorities",
      name: "Alignment with Local Priorities",
      guidance: "How well does the project connect to the identified needs and priorities of the local area?",
      weight: 15,
      details: "<b>0:</b> No explicit link to local priorities; off-scope.<br><b>1:</b> Mentions a relevant priority but connection is weak or generic.<br><b>2:</b> Good linkage to one or more priorities with some specific examples.<br><b>3:</b> Direct, specific alignment to the top local priorities with strong evidence."
  },
  {
      id: "community_benefit",
      name: "Community Benefit & Outcomes",
      guidance: "Evaluates the project's potential benefits and the clarity of its short and long-term outcomes.",
      weight: 10,
      details: "<b>0:</b> Benefits not described or unclear; no outcomes.<br><b>1:</b> Benefits noted but outcomes vague; little distinction between short/long-term.<br><b>2:</b> Clear benefits and plausible outcomes; some indicators described.<br><b>3:</b> Compelling benefits with specific short and long-term outcomes and simple indicators."
  },
  {
      id: "activities_milestones",
      name: "Activities, Milestones & Delivery Responsibilities",
      guidance: "Assesses the coherence and feasibility of the project's activity plan, milestones, and role allocation.",
      weight: 5,
      details: "<b>0:</b> Activities absent or not credible; no milestones; roles unclear.<br><b>1:</b> Some activities listed; milestones or responsibilities partly defined.<br><b>2:</b> Coherent activities with milestones and named roles; feasible plan.<br><b>3:</b> Comprehensive activity plan with realistic milestones and clear owners; delivery-ready."
  },
  {
      id: "timeline_realism",
      name: "Timeline & Scheduling Realism",
      guidance: "How realistic and well-structured is the project's timeline?",
      weight: 10,
      details: "<b>0:</b> No timeline or dates unrealistic.<br><b>1:</b> Basic dates provided; feasibility uncertain.<br><b>2:</b> Realistic start/end/duration aligned to activities.<br><b>3:</b> Robust timeline with sequencing that clearly supports delivery and review points."
  },
  {
      id: "collaborations_partnerships",
      name: "Collaborations & Partnerships",
      guidance: "Evaluates the strength and clarity of partnerships that enhance the project's reach and delivery.",
      weight: 10,
      details: "<b>0:</b> No partners identified; opportunities not explored.<br><b>1:</b> Potential partners named but roles vague or tentative.<br><b>2:</b> Relevant partners named with defined roles and mutual benefits.<br><b>3:</b> Strong partnership model (centres/groups named) clearly strengthening reach and delivery."
  },
  {
      id: "risk_management",
      name: "Risk Management & Feasibility",
      guidance: "Assesses the identification of key risks and the credibility of the proposed mitigation strategies.",
      weight: 5,
      details: "<b>0:</b> No risks identified; feasibility not addressed.<br><b>1:</b> Some risks listed; mitigations generic or partial.<br><b>2:</b> Key risks identified with credible mitigations.<br><b>3:</b> Comprehensive risk register with proportionate mitigations and clear owners."
  },
  {
      id: "budget_value",
      name: "Budget Transparency & Value for Money",
      guidance: "How transparent, justified, and proportionate is the project's budget?",
      weight: 10,
      details: "<b>0:</b> Insufficient or unclear costs; poor justification.<br><b>1:</b> Headline costs given; some justification but gaps remain.<br><b>2:</b> Transparent line-by-line costs with reasonable assumptions.<br><b>3:</b> Fully justified budget (rates × hours/quotes), lean and proportionate to outcomes."
  },
  {
      id: "cross_area_specificity",
      name: "Cross-Area Specificity & Venues (if applicable)",
      guidance: "For cross-area projects, assesses the clarity of the budget and venue details for each area.",
      weight: 10,
      details: "<b>0:</b> No area split or venues named where cross-area is claimed.<br><b>1:</b> Partial split: venue(s) or local costs unclear.<br><b>2:</b> Clear area split and notes; key local delivery costs included.<br><b>3:</b> Complete area split with named venues/rooms and reconciles to main budget."
  },
  {
      id: "marmot_wfg",
      name: "Alignment with Marmot Principles & WFG Goals",
      guidance: "How well does the project demonstrate practical alignment with these principles and goals?",
      weight: 10,
      details: "<b>0:</b> No justification beyond ticks or irrelevant claims.<br><b>1:</b> Basic justifications; generic statements.<br><b>2:</b> Specific, credible examples for selected principles/goals.<br><b>3:</b> Strong, practical examples tying activities to selected principles/goals and outcomes."
  }
];

export const PRIORITY_DATA = {
    blaenavon: {
        total: 254,
        data: [
            { label: 'Youth Services', value: 120 },
            { label: 'Transport', value: 104 },
            { label: 'Antisocial Behaviour', value: 70 },
            { label: 'Health & Wellbeing', value: 61 },
            { label: 'Environment', value: 56 }
        ]
    },
    thornhill: {
        total: 382,
        data: [
            { label: 'Health & Wellbeing', value: 140 },
            { label: 'Youth Services', value: 129 },
            { label: 'Sustainability', value: 75 },
            { label: 'Community', value: 74 },
            { label: 'Safety', value: 28 }
        ]
    },
    trevethin: {
        total: 426,
        data: [
            { label: 'Environment', value: 140 },
            { label: 'Youth Services', value: 129 },
            { label: 'Health', value: 120 },
            { label: 'Older People', value: 100 },
            { label: 'Crime', value: 75 }
        ]
    }
};