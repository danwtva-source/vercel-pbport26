import { AreaData, PriorityData, Application, User, UserRole, Criterion, ScoreCriterion, CoefficientSettings, Round, Assignment, Announcement, FinancialRecord, AuditLog } from './types';

// ============================================================================
// WFG & MARMOT DEFINITIONS
// ============================================================================

export const WFG_GOALS = [
  { id: 'prosperous', label: 'A Prosperous Wales', desc: 'An innovative, productive and low carbon society which recognises the limits of the global environment.' },
  { id: 'resilient', label: 'A Resilient Wales', desc: 'A nation which maintains and enhances a biodiverse natural environment.' },
  { id: 'healthier', label: 'A Healthier Wales', desc: 'A society in which people\'s physical and mental well-being is maximised.' },
  { id: 'equal', label: 'A More Equal Wales', desc: 'A society that enables people to fulfil their potential no matter what their background.' },
  { id: 'cohesive', label: 'A Wales of Cohesive Communities', desc: 'Attractive, viable, safe and well-connected communities.' },
  { id: 'culture', label: 'A Wales of Vibrant Culture & Welsh Language', desc: 'A society that promotes and protects culture, heritage and the Welsh language.' },
  { id: 'global', label: 'A Globally Responsible Wales', desc: 'A nation which, when doing anything to improve the economic, social, environmental and cultural well-being of Wales, takes account of whether doing such a thing may make a positive contribution to global well-being.' }
];

export const MARMOT_PRINCIPLES = [
  { id: 'child_start', label: 'Give every child the best start in life' },
  { id: 'control_lives', label: 'Enable all people to maximise their capabilities and have control over their lives' },
  { id: 'fair_employment', label: 'Create fair employment and good work for all' },
  { id: 'healthy_standard', label: 'Ensure a healthy standard of living for all' },
  { id: 'sustainable_places', label: 'Create and develop healthy and sustainable places and communities' },
  { id: 'prevention', label: 'Strengthen the role and impact of ill health prevention' },
  { id: 'env_sustainability', label: 'Pursue environmental sustainability and health equity' },
  { id: 'discrimination', label: 'Tackle racism, discrimination and their outcomes' }
];

// ============================================================================
// GEOGRAPHIC AREAS & POSTCODES
// ============================================================================

export const AREA_DATA: Record<string, AreaData> = {
  'blaenavon': {
    name: 'Blaenavon',
    formUrl: 'https://forms.office.com/e/FTQ4s8EK84',
    postcodes: ["NP49AA","NP49AB","NP49AD","NP49AE","NP49AF","NP49AG","NP49AH","NP49AJ","NP49AL","NP49AN","NP49AP","NP49AQ","NP49AR","NP49AS","NP49AT","NP49AU","NP49AW","NP49AX","NP49AY","NP49AZ","NP49BA","NP49BB","NP49BD","NP49BE","NP49BF","NP49BG","NP49BH","NP49BJ","NP49BL","NP49BN","NP49BP","NP49BQ","NP49BR","NP49BS","NP49BT","NP49BU","NP49BW","NP49BX","NP49BY","NP49BZ","NP49DA","NP49DB","NP49DD","NP49DE","NP49DF","NP49DG","NP49DH","NP49DJ","NP49DL","NP49DN","NP49DP","NP49DQ","NP49DR","NP49DS","NP49DT","NP49DU","NP49DW","NP49DX","NP49DY","NP49DZ","NP49EA","NP49EB","NP49ED","NP49EE","NP49EF","NP49EG","NP49EH","NP49EJ","NP49EL","NP49EN","NP49EP","NP49EQ","NP49ER","NP49ES","NP49ET","NP49EU","NP49EW","NP49EX","NP49EY","NP49EZ","NP49FA","NP49FB","NP49FD","NP49FE","NP49FF","NP49FG","NP49FH","NP49FJ","NP49FL","NP49FN","NP49FP","NP49FQ","NP49FR","NP49FS","NP49FT","NP49FU","NP49FW","NP49FX","NP49FY","NP49FZ","NP49GA","NP49GB","NP49GD","NP49GE","NP49GF","NP49GG","NP49GH","NP49GJ","NP49GL","NP49GN","NP49GP","NP49GQ","NP49GR","NP49GS","NP49GT","NP49GU","NP49GW","NP49GX","NP49GY","NP49GZ","NP49HA","NP49HB","NP49HD","NP49HE","NP49HF","NP49HG","NP49HH","NP49HJ","NP49HL","NP49HN","NP49HP","NP49HQ","NP49HR","NP49HS","NP49HT","NP49HU","NP49HW","NP49HX","NP49HY","NP49HZ","NP49JA","NP49JB","NP49JD","NP49JE","NP49JF","NP49JG","NP49JH","NP49JJ","NP49JL","NP49JN","NP49JP","NP49JQ","NP49JR","NP49JS","NP49JT","NP49JU","NP49JW","NP49JX","NP49JY","NP49JZ","NP49LA","NP49LB","NP49LD","NP49LE","NP49LF","NP49LG","NP49LH","NP49LJ","NP49LL","NP49LN","NP49LP","NP49LQ","NP49LR","NP49LS","NP49LT","NP49LU","NP49LW","NP49LX","NP49LY","NP49LZ","NP49NA","NP49NB","NP49ND","NP49NE","NP49NF","NP49NG","NP49NH","NP49NJ","NP49NL","NP49NN","NP49NP","NP49NQ","NP49NR","NP49NS","NP49NT","NP49NU","NP49NW","NP49NX","NP49NY","NP49NZ","NP49PA","NP49PB","NP49PD","NP49PE","NP49PF","NP49PG","NP49PH","NP49PJ","NP49PL","NP49PN","NP49PP","NP49PQ","NP49PR","NP49PS","NP49PT","NP49PU","NP49PW","NP49PX","NP49PY","NP49PZ","NP49QA","NP49QB","NP49QD","NP49QE","NP49QF","NP49QG","NP49QH","NP49QJ","NP49QL","NP49QN","NP49QP","NP49QQ","NP49QR","NP49QS","NP49QT","NP49QU","NP49QW","NP49QX","NP49QY","NP49QZ","NP49RA","NP49RB","NP49RD","NP49RE","NP49RF","NP49RG","NP49RH","NP49RJ","NP49RL","NP49RN","NP49RP","NP49RQ","NP49RR","NP49RS","NP49RT","NP49RU","NP49RW","NP49RX","NP49RY","NP49RZ","NP49SA","NP49SB","NP49SD","NP49SE","NP49SF","NP49SG","NP49SH","NP49SJ","NP49SL","NP49SN","NP49SP","NP49SQ","NP49SR","NP49SS","NP49ST","NP49SU","NP49SW","NP49SX","NP49SY","NP49SZ","NP49TA"]
  },
  'thornhill': {
    name: 'Thornhill & Upper Cwmbran',
    formUrl: 'https://forms.office.com/e/n0jg5xdAwS',
    postcodes: ["NP441AA","NP441AB","NP441AD","NP441AE","NP441AG","NP441AY","NP441AZ","NP441BA","NP441BE","NP441BG","NP441BH","NP441BJ","NP441BL","NP441BN","NP441BP","NP441BS","NP441BT","NP441BU","NP441BW","NP441BX","NP441BY","NP441BZ","NP441DA","NP441DB","NP441DE","NP441DF","NP441DJ","NP441DT","NP441DU","NP441DW","NP441DX","NP441DY","NP441DZ","NP441EA","NP441EB","NP441ED","NP441EE","NP441EF","NP441EG","NP441EH","NP441EL","NP441EN","NP441EP","NP441EQ","NP441ER","NP441ES","NP441ET","NP441EU","NP441EW","NP441EX","NP441EY","NP441EZ","NP441HA","NP441HB","NP441HD","NP441HE","NP441HF","NP441HG","NP441HH","NP441HJ","NP441HL","NP441HN","NP441HP","NP441HQ","NP441HR","NP441HS","NP441HT","NP441HU","NP441HW","NP441HX","NP441HY","NP441HZ","NP441JA","NP441JB","NP441JD","NP441JE","NP441JF","NP441JG","NP441JH","NP441JJ","NP441JL","NP441JN","NP441JP","NP441JR","NP441JS","NP441JT","NP441JU","NP441JW","NP441JX","NP441LA","NP441LB","NP441LD","NP441LE","NP441LG","NP441LH","NP441LJ","NP441LL","NP441LN","NP441LP","NP441LQ","NP441LR","NP441LS","NP441LT","NP441LU","NP441LW","NP441LX","NP441NA","NP441NB","NP441ND","NP441NE","NP441NF","NP441NG","NP441NH","NP441NJ","NP441NL","NP441NN","NP441NP","NP441NQ","NP441NR","NP441NS","NP441NT","NP441NU","NP441NW","NP441QP","NP441QQ","NP441QR","NP441QS","NP441QT","NP441QU","NP441QW","NP441QX","NP441QY","NP441QZ","NP441RA","NP441RB","NP441RD","NP441RE","NP441RF","NP441RG","NP441RH","NP441RJ","NP441RL","NP441RN","NP441RP","NP441RQ","NP441RR","NP441RS","NP441RT","NP441RU","NP441RW","NP441RX","NP441RY","NP441RZ","NP441SE","NP441SF","NP441SH","NP441SJ","NP441SL","NP441SN","NP441SP","NP441SQ","NP441SR","NP441SS","NP441ST","NP441SU","NP441SW","NP441SX","NP441SY","NP441SZ","NP441TD","NP441TE","NP441TF","NP441TG","NP441TH","NP441TJ","NP441TL","NP441TN","NP441TP","NP441TQ","NP441TR","NP441TT","NP441TU","NP441TW","NP441TX","NP441TY","NP441UA","NP441WB","NP445AA","NP445AB","NP445AD","NP445AE","NP445AF","NP445AG","NP445AH","NP445AJ","NP445AL","NP445AN","NP445AP","NP445AQ","NP445AR","NP445AS","NP445AT","NP445AU","NP445AW","NP445AX","NP445AY","NP445AZ","NP445BA","NP445BB","NP445BD","NP445BE","NP445BF","NP445BG","NP445BH","NP445BJ","NP445BL","NP445BN","NP445BP","NP445BQ","NP445BS","NP445BT","NP445BU","NP445BW","NP445BX","NP445BY","NP445BZ","NP445DA","NP445DB","NP445DD","NP445DE","NP445DF","NP445DG","NP445DH","NP445DJ","NP445DL","NP445DN","NP445DP","NP445DQ","NP445DR","NP445DS","NP445DT","NP445DU","NP445DW","NP445DX","NP445DY","NP445DZ","NP445EA","NP445EB","NP445ED","NP445EE","NP445EF","NP445EG","NP445EH","NP445EJ","NP445EL","NP445EN","NP445EP","NP445EQ","NP445ER","NP445ES","NP445ET","NP445EU","NP445EW","NP445EX","NP445EY","NP445EZ","NP445FA","NP445FB","NP445FD","NP445FE","NP445FF","NP445FG","NP445FH","NP445FJ","NP445FL","NP445FN","NP445FP","NP445FQ","NP445FR","NP445FS","NP445FT","NP445FU","NP445HA","NP445HB","NP445HD","NP445HE","NP445HF","NP445HG","NP445HH","NP445HJ","NP445HL","NP445HN","NP445HP","NP445HQ","NP445HR","NP445HS","NP445HT","NP445HU","NP445HW","NP445HX","NP445HY","NP445HZ","NP445JA","NP445JB","NP445JD","NP445JE","NP445JF","NP445JG","NP445JH","NP445JJ","NP445JL","NP445JN","NP445JP","NP445JQ","NP445JR","NP445JS","NP445JT","NP445JU","NP445JW","NP445JX","NP445JY","NP445JZ","NP445LA","NP445LB","NP445LD","NP445LE","NP445LF","NP445LG","NP445LH","NP445LJ","NP445LL","NP445LN","NP445LP","NP445LQ","NP445LR","NP445LS","NP445LT","NP445LU","NP445LW","NP445LX","NP445LY","NP445LZ","NP445NA","NP445NB","NP445ND","NP445NE","NP445NF","NP445NG","NP445NH","NP445NJ","NP445NL","NP445NN","NP445NP","NP445NQ","NP445NR","NP445NS","NP445NT","NP445NU","NP445NW","NP445NX","NP445NY","NP445NZ","NP445PA","NP445PB","NP445PD","NP445PE","NP445PF","NP445PG","NP445PH","NP445PJ","NP445PL","NP445PN","NP445PP","NP445PQ","NP445PR","NP445PS","NP445PT","NP445PU","NP445PW","NP445PX","NP445PY","NP445PZ","NP445QA","NP445QB","NP445QD","NP445QE","NP445QF","NP445QG","NP445QH","NP445QJ","NP445QL","NP445QN","NP445QP","NP445QQ","NP445QR","NP445QS","NP445QT","NP445QU","NP445QW","NP445QX","NP445QY","NP445QZ","NP445RA","NP445RB","NP445RD","NP445RE","NP445RF","NP445RG","NP445RH","NP445RJ","NP445RL","NP445RN","NP445RP","NP445RQ","NP445RR","NP445RS","NP445RT","NP445RU","NP445RW","NP445RX","NP445RY","NP445SA","NP445SB","NP445SD","NP445SE","NP445SF","NP445SG","NP445SH","NP445SJ","NP445SL","NP445SN","NP445SP","NP445SQ","NP445SR","NP445SS","NP445ST","NP445SU","NP445SW","NP445SX","NP445SY","NP445TA","NP445TB","NP445TD","NP445TE","NP445TF","NP445TG","NP445TH","NP445TJ","NP445TL","NP445TN","NP445TP","NP445TQ","NP445TR","NP445TS","NP445TT","NP445TU","NP445TW","NP445TX","NP445TY","NP445TZ","NP445UA","NP445UB","NP445UD","NP445UE","NP445UF","NP445UG","NP445UH","NP445UJ","NP445UL","NP445UN","NP445UP","NP445UQ","NP445UR","NP445US","NP445UT","NP445UU","NP445UW","NP445UX","NP445UY"]
  },
  'trevethin': {
    name: 'Trevethin, Penygarn & St. Cadocs',
    formUrl: 'https://forms.office.com/e/ZAhvh5VnEg',
    postcodes: ["NP48AA","NP48AB","NP48AD","NP48AE","NP48AF","NP48AG","NP48AH","NP48AJ","NP48AL","NP48AN","NP48AP","NP48AQ","NP48AR","NP48AS","NP48AT","NP48AU","NP48AW","NP48AX","NP48AZ","NP48BB","NP48BD","NP48BG","NP48BN","NP48BP","NP48BQ","NP48BR","NP48BS","NP48BT","NP48BU","NP48BW","NP48BX","NP48BY","NP48BZ","NP48DA","NP48DD","NP48DG","NP48DH","NP48DJ","NP48DL","NP48DN","NP48DP","NP48DQ","NP48DR","NP48DS","NP48DT","NP48DU","NP48DW","NP48DX","NP48DY","NP48DZ","NP48EA","NP48EB","NP48ED","NP48EE","NP48EF","NP48EG","NP48EH","NP48EJ","NP48EL","NP48EN","NP48EP","NP48EW","NP48EY","NP48EZ","NP48FD","NP48GA","NP48HA","NP48HB","NP48HD","NP48HE","NP48HF","NP48HG","NP48HH","NP48HJ","NP48HL","NP48HP","NP48HQ","NP48HR","NP48HS","NP48HT","NP48HU","NP48HW","NP48HX","NP48HY","NP48HZ","NP48JA","NP48JB","NP48JD","NP48JE","NP48JF","NP48JG","NP48JH","NP48JJ","NP48JL","NP48JN","NP48JP","NP48JQ","NP48JR","NP48JS","NP48JT","NP48JU","NP48JW","NP48JX","NP48JY","NP48JZ","NP48LA","NP48LB","NP48LD","NP48LE","NP48LF","NP48LG","NP48LH","NP48LJ","NP48LL","NP48LN","NP48LP","NP48LQ","NP48LR","NP48LS","NP48LT","NP48LU","NP48LW","NP48LX","NP48LY","NP48NA","NP48NB","NP48ND","NP48NE","NP48NF","NP48NG","NP48NH","NP48NJ","NP48NL","NP48NN","NP48NP","NP48NQ","NP48NR","NP48NS","NP48NT","NP48NU","NP48NW","NP48NX","NP48NY","NP48PA","NP48PB","NP48PD","NP48PE","NP48PF","NP48PG","NP48PH","NP48PJ","NP48PL","NP48PN","NP48PP","NP48PQ","NP48PR","NP48PS","NP48PT","NP48PU","NP48PW","NP48PX","NP48PY","NP48PZ","NP48QA","NP48QB","NP48QD","NP48QE","NP48QF","NP48QG","NP48QH","NP48QJ","NP48QL","NP48QN","NP48QP","NP48QQ","NP48QR","NP48QS","NP48QT","NP48QU","NP48QW","NP48QX","NP48QY","NP48RA","NP48RB","NP48RD","NP48RE","NP48RF","NP48RG","NP48RH","NP48RJ","NP48RL","NP48RN","NP48RP","NP48RQ","NP48RR","NP48RS","NP48RT","NP48RU","NP48RW","NP48RX","NP48RY","NP48RZ","NP48SA","NP48SB","NP48SD","NP48SE","NP48SF","NP48SG","NP48SH","NP48SJ","NP48SL","NP48SN","NP48SP","NP48SQ","NP48SR","NP48SS","NP48ST","NP48SU","NP48SW","NP48SX","NP48SY","NP48SZ","NP48TA","NP48TB","NP48TD","NP48TE","NP48TF","NP48TG","NP48TH","NP48TJ","NP48TL","NP48TN","NP48TP","NP48TQ","NP48TR","NP48TS","NP48TT","NP48TU","NP48TW","NP48TX","NP48TY","NP48TZ","NP48UA","NP48UB","NP48UD","NP48UE","NP48UF","NP48UG","NP48UH","NP48UJ","NP48UL","NP48UN","NP48UP","NP48UQ","NP48UR","NP48US","NP48UT","NP48UU","NP48UW","NP48UX","NP48UY","NP48UZ","NP48WA","NP48WB","NP48WD","NP48WE","NP48WF","NP48WG","NP48WH","NP48WJ","NP48WL","NP48WN","NP48WP","NP48WQ","NP48WR","NP48WS","NP48WT","NP48WU","NP48WW","NP48WX","NP48WY","NP48WZ","NP48XA","NP48XB","NP48XD","NP48XF","NP48XG","NP48XH","NP48XJ","NP48XL","NP48XN","NP48XP","NP48XQ","NP48XR","NP48XS","NP48XT","NP48XU","NP48XW","NP48XX","NP48XY","NP48XZ","NP48YA","NP48YB","NP48YD","NP48YE","NP48YF","NP48YG","NP48YH","NP48YJ","NP48YL","NP48YN","NP48YP","NP48YQ","NP48YR","NP48YS","NP48YT","NP48YU","NP48YW","NP48YX","NP48YY","NP48YZ","NP48ZA","NP48ZB","NP48ZD"]
  }
};

// Backward compatibility: Legacy POSTCODES export
export const POSTCODES = {
  'Blaenavon': AREA_DATA.blaenavon.postcodes,
  'Thornhill & Upper Cwmbran': AREA_DATA.thornhill.postcodes,
  'Trevethin, Penygarn & St. Cadocs': AREA_DATA.trevethin.postcodes
};

// ============================================================================
// AREA COLOURS (PRD - sub-colours for visual distinction)
// ============================================================================

export const AREA_COLORS: Record<string, string> = {
  'Blaenavon': '#FFD447',                        // Yellow
  'Thornhill & Upper Cwmbran': '#2FBF71',        // Green
  'Trevethin, Penygarn & St. Cadocs': '#3A86FF', // Blue
  'Cross-Area': '#9333EA',                        // Purple (for cross-area projects)
  // Slug-based keys for flexibility
  'blaenavon': '#FFD447',
  'thornhill': '#2FBF71',
  'trevethin': '#3A86FF',
  'cross-area': '#9333EA'
};

// Helper to get area colour (with fallback)
export const getAreaColor = (area: string | null | undefined): string => {
  if (!area) return '#9333EA'; // Default purple
  return AREA_COLORS[area] || AREA_COLORS[area.toLowerCase()] || '#9333EA';
};

// Area display names for UI
export const AREA_NAMES = [
  'Blaenavon',
  'Thornhill & Upper Cwmbran',
  'Trevethin, Penygarn & St. Cadocs'
] as const;

// ============================================================================
// COMMUNITY PRIORITIES DATA
// ============================================================================

export const PRIORITIES_DATA: Record<string, PriorityData> = {
  blaenavon: {
    totalResponses: 254,
    priorities: [
      { name: "Youth Services & Activities", score: 120, description: "Providing more engaging activities and dedicated spaces for young people to socialise and learn new skills." },
      { name: "Transport", score: 104, description: "Improving local transport links and accessibility to make it easier for residents to travel for work, health, and leisure." },
      { name: "Antisocial Behaviour", score: 70, description: "Tackling issues of vandalism and disruptive behaviour to create a safer environment for everyone." },
      { name: "Health & Wellbeing", score: 61, description: "Supporting mental and physical health through community initiatives, workshops, and access to services." },
      { name: "Environment & Place (Maintenance)", score: 56, description: "Enhancing the local environment by maintaining public spaces, improving parks, and tackling litter." },
      { name: "Heritage & Tourism", score: 48, description: "Celebrating and promoting Blaenavon's rich history to boost local pride and attract visitors." }
    ]
  },
  thornhill: {
    totalResponses: 382,
    priorities: [
      { name: "Health & Wellbeing", score: 140, description: "Focusing on initiatives that support both the mental and physical health of the community residents." },
      { name: "Youth Services & Activities", score: 129, description: "Creating positive opportunities and safe spaces for young people to thrive." },
      { name: "Environmental Sustainability", score: 75, description: "Promoting green initiatives, recycling, and protecting local natural spaces for future generations." },
      { name: "Building Stronger Communities", score: 74, description: "Fostering a sense of belonging and connection through local events and collaborative projects." },
      { name: "Antisocial Behaviour", score: 28, description: "Addressing concerns about safety and nuisance to improve the quality of life for all residents." },
      { name: "Education & Skills", score: 23, description: "Providing learning opportunities for all ages, from digital literacy to practical life skills." }
    ]
  },
  trevethin: {
    totalResponses: 426,
    priorities: [
      { name: "Environment & Place (Maintenance)", score: 140, description: "Improving the appearance and usability of public spaces through better maintenance and community clean-ups." },
      { name: "Youth Services & Activities", score: 129, description: "Investing in facilities and programmes that offer constructive and engaging activities for young people." },
      { name: "Health & Wellbeing", score: 120, description: "Promoting healthy lifestyles and providing accessible support for the physical and mental wellbeing of residents." },
      { name: "Older People's Activities", score: 100, description: "Creating social opportunities and activities to combat isolation and support the older members of our community." },
      { name: "Crime & Community Safety", score: 75, description: "Working together to reduce crime and improve safety, making the area a more secure place to live." },
      { name: "Education & Skills", score: 74, description: "Offering programmes that help residents of all ages to learn new skills and improve their opportunities." }
    ]
  }
};

// Legacy PRIORITY_DATA export for backward compatibility
export const PRIORITY_DATA = {
  blaenavon: {
    total: 254,
    data: [
      { label: 'Youth Services & Activities', value: 120 },
      { label: 'Transport', value: 104 },
      { label: 'Antisocial Behaviour', value: 70 },
      { label: 'Health & Wellbeing', value: 61 },
      { label: 'Environment & Place (Maintenance)', value: 56 },
      { label: 'Heritage & Tourism', value: 48 }
    ]
  },
  thornhill: {
    total: 382,
    data: [
      { label: 'Health & Wellbeing', value: 140 },
      { label: 'Youth Services & Activities', value: 129 },
      { label: 'Environmental Sustainability', value: 75 },
      { label: 'Building Stronger Communities', value: 74 },
      { label: 'Antisocial Behaviour', value: 28 },
      { label: 'Education & Skills', value: 23 }
    ]
  },
  trevethin: {
    total: 426,
    data: [
      { label: 'Environment & Place (Maintenance)', value: 140 },
      { label: 'Youth Services & Activities', value: 129 },
      { label: 'Health & Wellbeing', value: 120 },
      { label: 'Older People\'s Activities', value: 100 },
      { label: 'Crime & Community Safety', value: 75 },
      { label: 'Education & Skills', value: 74 }
    ]
  }
};

// ============================================================================
// SCORING CRITERIA (10 Categories)
// ============================================================================

export const SCORING_CRITERIA: Criterion[] = [
  {
    id: "overview_objectives",
    name: "1. Project Overview & SMART Objectives",
    guidance: "Assesses the clarity and quality of the project's overview and objectives.",
    weight: 10,
    details: "<b>0:</b> No clear overview or objectives.<br><b>1:</b> Basic overview with vague objectives.<br><b>2:</b> Clear overview with mostly SMART objectives.<br><b>3:</b> Concise, compelling overview; fully SMART objectives."
  },
  {
    id: "need_evidence",
    name: "2. Evidence of Need",
    guidance: "Is there clear evidence that this project is needed in the community?",
    weight: 10,
    details: "<b>0:</b> No evidence provided.<br><b>1:</b> Anecdotal evidence only.<br><b>2:</b> Some statistical or consultation data.<br><b>3:</b> Strong, localized evidence base demonstrating clear need."
  },
  {
    id: "local_priorities",
    name: "3. Alignment with Local Priorities",
    guidance: "How well does the project connect to the identified priorities of the area?",
    weight: 15,
    details: "<b>0:</b> No link to priorities.<br><b>1:</b> Weak or generic link.<br><b>2:</b> Good linkage to specific priorities.<br><b>3:</b> Direct, core alignment to top local priorities."
  },
  {
    id: "wfg_contribution",
    name: "4. WFG Goals Contribution",
    guidance: "Does the project contribute meaningfully to the Well-being of Future Generations goals?",
    weight: 10,
    details: "<b>0:</b> No mention of WFG goals.<br><b>1:</b> Superficial tick-box exercise.<br><b>2:</b> Meaningful contribution to selected goals.<br><b>3:</b> Deep integration of sustainable development principles."
  },
  {
    id: "marmot_principles",
    name: "5. Marmot Principles",
    guidance: "How does the project address health inequalities via Marmot Principles?",
    weight: 10,
    details: "<b>0:</b> No reference to health equity.<br><b>1:</b> Vague reference.<br><b>2:</b> Clear alignment with specific principles.<br><b>3:</b> Strong focus on tackling root causes of inequality."
  },
  {
    id: "community_benefit",
    name: "6. Community Benefit & Outcomes",
    guidance: "Evaluates the project's potential benefits and clarity of outcomes.",
    weight: 15,
    details: "<b>0:</b> Unclear benefits.<br><b>1:</b> Vague outcomes.<br><b>2:</b> Clear benefits and plausible outcomes.<br><b>3:</b> Compelling benefits with measurable short/long-term outcomes."
  },
  {
    id: "collaboration",
    name: "7. Collaboration & Partnership",
    guidance: "Is the project working in isolation or building partnerships?",
    weight: 5,
    details: "<b>0:</b> Isolation.<br><b>1:</b> Some intent to partner.<br><b>2:</b> Confirmed partners.<br><b>3:</b> Strong, strategic cross-sector partnerships."
  },
  {
    id: "management_budget",
    name: "8. Project Management & Value for Money",
    guidance: "Is the budget realistic and the delivery plan robust?",
    weight: 10,
    details: "<b>0:</b> Unrealistic budget/plan.<br><b>1:</b> Basic budget, weak plan.<br><b>2:</b> Realistic budget and sound plan.<br><b>3:</b> Detailed, costed budget and professional delivery plan."
  },
  {
    id: "sustainability",
    name: "9. Sustainability & Legacy",
    guidance: "What happens after the funding ends?",
    weight: 10,
    details: "<b>0:</b> No future plan.<br><b>1:</b> Dependent on future grant funding.<br><b>2:</b> Some sustainability planning.<br><b>3:</b> Clear exit strategy or self-sustaining model."
  },
  {
    id: "inclusion",
    name: "10. Equalities & Inclusion",
    guidance: "Is the project accessible and inclusive to all?",
    weight: 5,
    details: "<b>0:</b> No consideration of barriers.<br><b>1:</b> Basic statement.<br><b>2:</b> Good practice in accessibility.<br><b>3:</b> Proactive inclusion strategy for marginalized groups."
  }
];

// ============================================================================
// ORGANIZATION TYPES
// ============================================================================

export const ORG_TYPES = [
  "Community Interest Company",
  "Charitable Incorporated Organisation",
  "Registered Charity",
  "Voluntary / Community Group",
  "Informal / Self-Help Group",
  "Private Business / Limited Company"
];

// ============================================================================
// DOCUMENT RESOURCES
// ============================================================================

// Public Documents - Temporary seed list for design/dev previews
export const PUBLIC_DOCS = [
  {
    title: 'PB 1.1 - EOI Form (Part 1)',
    desc: 'Expression of Interest application form',
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.1%20-%20EOI%20Form%20(Part%201).pdf',
    category: 'Part 1'
  },
  {
    title: 'PB 1.2 - Our Priorities Report',
    desc: 'Community priorities identified through consultation',
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.2%20-%20Our%20Priorities%20Report.pdf',
    category: 'Part 1'
  },
  {
    title: 'PB 1.3 - Application Guidance',
    desc: 'Guidance for completing Part 1 applications',
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.3%20-%20Application%20Guidance.pdf',
    category: 'Part 1'
  },
  {
    title: 'PB 2.1 - Full Application Form (Part 2)',
    desc: 'Detailed application for shortlisted projects',
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%202.1%20-%20Full%20Application%20Form%20(Part%202)%20final.pdf',
    category: 'Part 2'
  },
  {
    title: 'PB 2.2 - Cross-Area Budget Template',
    desc: 'Budget template for multi-area projects',
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%202.2%20-%20Cross-Area%20Application%20Budget%20Template%20(draft%20v2).pdf',
    category: 'Part 2'
  },
  {
    title: "PB 2.3 - People's Committee Advisory Template",
    desc: 'Template for committee feedback and advisory notes',
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%202.3%20Peoples%20Committee%20Advisory%20Template.pdf',
    category: 'Part 2'
  },
  {
    title: 'PB 2.4 - Application Guidance (Part 2)',
    desc: 'Guidance for completing Part 2 full applications',
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%202.4%20Application%20Guidance%20(Part%202).pdf',
    category: 'Part 2'
  }
];

// Committee Documents - Internal resources for committee members
export const COMMITTEE_DOCS = [
  {
    title: 'Scoring Matrix Guide',
    desc: 'Detailed guide for scoring Stage 2 applications',
    url: '#'
  },
  {
    title: 'Committee Meeting Minutes',
    desc: 'Minutes from committee meetings and decisions',
    url: '#'
  }
];

// ============================================================================
// DEMO MODE DATA
// ============================================================================

// Note: Demo data uses legacy field names for backwards compatibility
// These are mapped to canonical fields in firebase.ts when loaded
export const DEMO_APPLICATIONS: any[] = [
  {
    ref: "DEMO-001",
    applicant: "Blaenavon Blues FC",
    contactName: "John Smith",
    email: "john@blaenavonblues.co.uk",
    phone: "01495 123456",
    address: "The Pitch, Blaenavon",
    area: "Blaenavon",
    status: 'Submitted',
    stage: 'Part 2',
    applicantUid: 'demo-app-1',
    projectTitle: "Youth Football Academy Expansion",
    projectSummary: "Expanding our academy to include girls' teams and disability coaching.",
    amountRequest: 4500,
    totalCost: 6000,
    beneficiaries: "Local youth aged 6-16, approx 150 children.",
    timescale: "6 months",
    selectedWfgGoals: ['healthier', 'equal', 'cohesive'],
    selectedMarmotPrinciples: ['child_start', 'healthy_standard'],
    projectPlan: "Q1: Recruitment of coaches. Q2: Equipment purchase. Q3: Launch of new sessions.",
    communityInvolvement: "Consulted with local schools and parents via survey.",
    collaboration: "Working with Torfaen Leisure Trust.",
    sustainability: "Fees from new members will cover ongoing costs.",
    inclusionStrategy: "Free sessions for low-income families.",
    monitoringEvaluation: "Attendance records and feedback surveys.",
    risksChallenges: "Lack of qualified coaches - solved by internal training.",
    budgetBreakdown: [{item: "Equipment", amount: 2000}, {item: "Coach Training", amount: 1500}, {item: "Pitch Hire", amount: 1000}]
  },
  {
    ref: "DEMO-002",
    applicant: "Blaenavon Community Museum",
    contactName: "Sarah Evans",
    email: "info@blaenavonmuseum.org",
    phone: "01495 765432",
    address: "Broad Street, Blaenavon",
    area: "Blaenavon",
    status: 'Scored',
    stage: 'Part 2',
    applicantUid: 'demo-app-2',
    projectTitle: "Digital Heritage Archive",
    projectSummary: "Digitising local history for online access.",
    amountRequest: 2000,
    totalCost: 2500,
    beneficiaries: "All residents and global visitors.",
    timescale: "12 months",
    selectedWfgGoals: ['culture', 'resilient'],
    selectedMarmotPrinciples: ['control_lives'],
    projectPlan: "Scanning docs, website update.",
    communityInvolvement: "Volunteers from local history group.",
    collaboration: "Torfaen Museum Service.",
    sustainability: "Hosted on council servers post-launch.",
    inclusionStrategy: "Accessible web design for older users.",
    monitoringEvaluation: "Website traffic and download stats.",
    risksChallenges: "Copyright issues - being vetted by legal team.",
    budgetBreakdown: [{item: "Scanner", amount: 500}, {item: "Web dev", amount: 1500}]
  },
  {
    ref: "DEMO-003",
    applicant: "Thornhill Youth Club",
    contactName: "Dave Williams",
    email: "dave@thornhillyc.org",
    phone: "01633 888999",
    address: "Leadon Court, Thornhill",
    area: "Thornhill & Upper Cwmbran",
    status: 'Submitted',
    stage: 'Part 2',
    applicantUid: 'demo-app-3',
    projectTitle: "Summer Activities Program",
    projectSummary: "6 weeks of summer activities for teens.",
    amountRequest: 5000,
    totalCost: 5000,
    beneficiaries: "Teens 13-19.",
    timescale: "July - August 2025",
    selectedWfgGoals: ['healthier', 'cohesive'],
    selectedMarmotPrinciples: ['child_start', 'prevention'],
    projectPlan: "Weekly schedule of trips and workshops.",
    communityInvolvement: "Youth council helped design the schedule.",
    collaboration: "Cwmbran Centre for Young People.",
    sustainability: "Pilot for year-round Friday night sessions.",
    inclusionStrategy: "Outreach in high-deprivation streets.",
    monitoringEvaluation: "Pre and post activity well-being surveys.",
    risksChallenges: "Low turnout - addressed via social media campaign.",
    budgetBreakdown: [{item: "Transport", amount: 2000}, {item: "Venue", amount: 1000}, {item: "Staff", amount: 2000}]
  },
  {
    ref: "DEMO-004",
    applicant: "St Cadocs Green Team",
    contactName: "Mary Jones",
    email: "mary@stcadocs.community",
    phone: "01495 555444",
    address: "St Cadocs Vicarage, Trevethin",
    area: "Trevethin, Penygarn & St. Cadocs",
    status: 'Submitted',
    stage: 'Part 2',
    applicantUid: 'demo-app-4',
    projectTitle: "Community Garden Refurb",
    projectSummary: "Restoring the old allotment for community use.",
    amountRequest: 3000,
    totalCost: 3500,
    beneficiaries: "Local residents, elderly.",
    timescale: "Spring 2025",
    selectedWfgGoals: ['resilient', 'healthier', 'cohesive'],
    selectedMarmotPrinciples: ['sustainable_places', 'env_sustainability'],
    projectPlan: "Clearance, planting, fence repair.",
    communityInvolvement: "Neighbourhood work days.",
    collaboration: "Bron Afon Housing.",
    sustainability: "Plot fees will cover seeds and repairs.",
    inclusionStrategy: "Raised beds for wheelchair access.",
    monitoringEvaluation: "Number of active gardeners.",
    risksChallenges: "Vandalism - improved fencing included in budget.",
    budgetBreakdown: [{item: "Tools", amount: 500}, {item: "Plants", amount: 1000}, {item: "Materials", amount: 1500}]
  },
  {
    ref: "DEMO-005",
    applicant: "Valley Arts Group",
    contactName: "Gareth Pugh",
    email: "gareth@valleyarts.wales",
    phone: "01495 222111",
    address: "Arts Centre, Pontypool",
    area: "Blaenavon",
    status: 'Draft',
    stage: 'EOI',
    applicantUid: 'demo-app-5',
    projectTitle: "Art for All",
    projectSummary: "Weekly art classes.",
    amountRequest: 1000,
    totalCost: 1000,
    beneficiaries: "General public.",
    timescale: "Continuous",
    selectedWfgGoals: [],
    selectedMarmotPrinciples: [],
    projectPlan: "",
    communityInvolvement: "",
    collaboration: "",
    sustainability: "",
    inclusionStrategy: "",
    monitoringEvaluation: "",
    risksChallenges: "",
    budgetBreakdown: []
  },
];

export const DEMO_USERS: User[] = [
  { uid: 'demo-admin', displayName: 'Demo Admin', email: 'admin@demo.com', role: 'admin' },
  { uid: 'demo-comm-bl', displayName: 'Demo Comm (Blaenavon)', email: 'blaenavon@demo.com', role: 'committee', area: 'Blaenavon' },
  { uid: 'demo-comm-th', displayName: 'Demo Comm (Thornhill)', email: 'thornhill@demo.com', role: 'committee', area: 'Thornhill & Upper Cwmbran' },
  { uid: 'demo-comm-tr', displayName: 'Demo Comm (Trevethin)', email: 'trevethin@demo.com', role: 'committee', area: 'Trevethin, Penygarn & St. Cadocs' },
  { uid: 'demo-app', displayName: 'Demo Applicant', email: 'applicant@demo.com', role: 'applicant', area: 'Blaenavon' },
];

// Demo Document Folders for demo mode
export const DEMO_DOCUMENT_FOLDERS = [
  { id: 'folder-committee', name: 'Committee Resources', visibility: 'committee' as const, createdAt: Date.now() - 86400000, createdBy: 'demo-admin' },
  { id: 'folder-public', name: 'Public Information', visibility: 'public' as const, createdAt: Date.now() - 172800000, createdBy: 'demo-admin' },
  { id: 'folder-admin', name: 'Admin Documents', visibility: 'admin' as const, createdAt: Date.now() - 259200000, createdBy: 'demo-admin' },
];

// Demo Documents for demo mode
export const DEMO_DOCUMENTS = [
  {
    id: 'doc-1',
    name: 'Scoring Matrix Guide',
    folderId: 'folder-committee',
    visibility: 'committee' as const,
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.3%20-%20Application%20Guidance.pdf',
    filePath: 'documents/scoring-guide.pdf',
    createdAt: Date.now() - 86400000,
    uploadedBy: 'demo-admin'
  },
  {
    id: 'doc-2',
    name: 'Committee Meeting Minutes - January 2025',
    folderId: 'folder-committee',
    visibility: 'committee' as const,
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.2%20-%20Our%20Priorities%20Report.pdf',
    filePath: 'documents/minutes-jan-2025.pdf',
    createdAt: Date.now() - 172800000,
    uploadedBy: 'demo-admin'
  },
  {
    id: 'doc-3',
    name: 'Application Guidelines',
    folderId: 'folder-public',
    visibility: 'public' as const,
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.3%20-%20Application%20Guidance.pdf',
    filePath: 'documents/application-guidelines.pdf',
    createdAt: Date.now() - 259200000,
    uploadedBy: 'demo-admin'
  },
  {
    id: 'doc-4',
    name: 'Community Priorities Report 2024',
    folderId: 'folder-public',
    visibility: 'public' as const,
    url: 'https://github.com/DanWTVA-Source/pdf-host/raw/main/PB%201.2%20-%20Our%20Priorities%20Report.pdf',
    filePath: 'documents/priorities-report-2024.pdf',
    createdAt: Date.now() - 345600000,
    uploadedBy: 'demo-admin'
  },
];

// Legacy export for backward compatibility
export const DEMO_APPS = DEMO_APPLICATIONS;

// ============================================================================
// COEFFICIENT CALCULATION DEFAULTS (PRD 4.4.4)
// ============================================================================

/**
 * Default coefficient settings for reach/impact weighting in digital voting.
 * Tiers: Small (0-24) = 1.2x, Medium (25-100) = 1.1x, Large (101+) = 1.0x
 */
export const DEFAULT_COEFFICIENT_SETTINGS: CoefficientSettings = {
  enabled: false,
  applyToInPerson: false,
  tiers: {
    small: { maxReach: 24, factor: 1.2 },
    medium: { maxReach: 100, factor: 1.1 },
    large: { maxReach: Infinity, factor: 1.0 }
  }
};

// ============================================================================
// ANNOUNCEMENT CATEGORIES
// ============================================================================

export const ANNOUNCEMENT_CATEGORIES = [
  'general',
  'deadline',
  'update',
  'event',
  'result',
  'news'
] as const;

// ============================================================================
// DISCUSSION BOARD CATEGORIES
// ============================================================================

export const DISCUSSION_CATEGORIES = [
  'Community Spaces',
  'Youth Services',
  'Environment',
  'Health & Wellbeing',
  'Arts & Culture',
  'General Discussion'
] as const;

// ============================================================================
// FINANCIAL DEFAULTS
// ============================================================================

export const DEFAULT_AREA_BUDGETS: Record<string, number> = {
  'Blaenavon': 50000,
  'Thornhill & Upper Cwmbran': 50000,
  'Trevethin, Penygarn & St. Cadocs': 50000
};

export const PRIORITY_CATEGORIES = [
  'Community Spaces',
  'Youth Services',
  'Environment',
  'Health & Wellbeing',
  'Arts & Culture',
  'Education & Skills',
  'Transport & Connectivity',
  'Other'
] as const;

// ============================================================================
// DEMO DATA - ROUNDS, ASSIGNMENTS, ANNOUNCEMENTS, FINANCIALS, AUDIT LOGS
// ============================================================================

export const DEMO_ROUNDS: Round[] = [
  {
    id: 'round_2026',
    name: "Communities' Choice 2026",
    year: 2026,
    status: 'open',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    areas: [],
    stage1Open: true,
    stage2Open: false,
    scoringOpen: false,
    scoringThreshold: 50,
    createdAt: Date.now(),
    budget: 150000,
    budgetByArea: { ...DEFAULT_AREA_BUDGETS },
    coefficientSettings: DEFAULT_COEFFICIENT_SETTINGS
  },
  {
    id: 'round_2025',
    name: "Communities' Choice 2025",
    year: 2025,
    status: 'scoring',
    startDate: '2025-01-01',
    endDate: '2025-06-30',
    areas: [],
    stage1Open: false,
    stage2Open: true,
    scoringOpen: true,
    scoringThreshold: 55,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 365,
    budget: 150000,
    budgetByArea: { ...DEFAULT_AREA_BUDGETS },
    coefficientSettings: DEFAULT_COEFFICIENT_SETTINGS
  }
];

export const DEMO_ASSIGNMENTS: Assignment[] = [
  {
    id: 'demo_app_1_demo-comm-bl',
    applicationId: 'demo_app_1',
    committeeId: 'demo-comm-bl',
    assignedDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().split('T')[0],
    status: 'assigned',
    area: 'Blaenavon',
    stage: 'stage1',
    assignedBy: 'demo-admin'
  },
  {
    id: 'demo_app_2_demo-comm-th',
    applicationId: 'demo_app_2',
    committeeId: 'demo-comm-th',
    assignedDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 21).toISOString().split('T')[0],
    status: 'draft',
    area: 'Thornhill & Upper Cwmbran',
    stage: 'stage2',
    assignedBy: 'demo-admin'
  }
];

export const DEMO_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'announcement_1',
    title: 'Stage 1 Applications Now Open',
    content: 'Expression of Interest submissions are now open. Please submit your project ideas by the end of this month.',
    category: 'deadline',
    visibility: 'all',
    priority: 'high',
    pinned: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    createdBy: 'admin'
  },
  {
    id: 'announcement_2',
    title: 'Committee Scoring Guidance Updated',
    content: 'Committee members can access new scoring guidance documents in the portal. Please review before scoring.',
    category: 'update',
    visibility: 'committee',
    priority: 'normal',
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    createdBy: 'admin'
  }
];

export const DEMO_FINANCIALS: FinancialRecord[] = [
  {
    id: 'round_2026',
    roundId: 'round_2026',
    totalFunding: 150000,
    totalSpent: 45000,
    remainingPot: 105000,
    budgetByArea: { ...DEFAULT_AREA_BUDGETS },
    spendByArea: {
      Blaenavon: 15000,
      'Thornhill & Upper Cwmbran': 15000,
      'Trevethin, Penygarn & St. Cadocs': 15000
    },
    spendByPriority: {
      'Community Spaces': 15000,
      'Youth Services': 10000,
      Environment: 8000,
      'Health & Wellbeing': 12000,
      'Arts & Culture': 0,
      'Education & Skills': 0,
      'Transport & Connectivity': 0,
      Other: 0
    },
    updatedAt: Date.now() - 1000 * 60 * 60 * 24,
    updatedBy: 'admin'
  }
];

export const DEMO_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'audit_1',
    adminId: 'admin',
    action: 'SETTINGS_UPDATE',
    targetId: 'global',
    timestamp: Date.now() - 1000 * 60 * 60 * 6,
    details: { stage1Visible: true, stage1VotingOpen: true }
  },
  {
    id: 'audit_2',
    adminId: 'admin',
    action: 'ROUND_UPDATE',
    targetId: 'round_2026',
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    details: { status: 'open' }
  }
];
