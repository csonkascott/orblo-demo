/* Kindred demo: scripted sample data. Every person, company, page and number here is made up.
   Sources use .example addresses. Dates are counted against SAMPLE_DAY so "8 days ago" stays true. */
window.KD = (function () {
  const SAMPLE_DAY = '2026-10-30';

  const ME = { name: 'Scott Csonka', first: 'Scott', initials: 'SC', company: 'Shiftwell', site: 'shiftwell.example' };

  // ---- Setup: one read of your website ----
  const SITE_PAGES = [
    { url: 'shiftwell.example', label: 'Home page' },
    { url: 'shiftwell.example/pricing', label: 'Pricing' },
    { url: 'shiftwell.example/customers', label: 'Customer stories' },
    { url: 'shiftwell.example/about', label: 'About' }
  ];
  const LOOKING_FOR = [
    { k: 'Who', v: 'Operations leads at businesses with two or more sites',
      why: 'Your home page says Shiftwell is built for teams that work across locations.', src: 'shiftwell.example' },
    { k: 'What they need', v: 'One rota for every site instead of a spreadsheet per site',
      why: 'Every customer story starts with a spreadsheet per location.', src: 'shiftwell.example/customers' },
    { k: 'Good timing', v: 'Just opened a new site, or hiring shift leads across sites',
      why: 'A second site is when one rota stops working. Your customers say so too.', src: 'shiftwell.example/customers' },
    { k: 'Where', v: 'United States and Canada',
      why: 'Your pricing page lists USD and CAD only.', src: 'shiftwell.example/pricing' },
    { k: 'Like your customers', v: 'Bakeries, clinics, warehouses, restaurant groups',
      why: 'These are the businesses named on your customers page.', src: 'shiftwell.example/customers' }
  ];
  const ALSO_FILLED = ['ideal customer profile', 'problems it solves', 'pricing, $39 per site a month'];

  // ---- Discover ----
  const ASK = 'Operations leads at businesses that just opened a second site or are hiring shift leads across sites';
  const LOOK_STEPS = [
    'Read who you are looking for',
    'Checked job boards: Greenhouse, Lever, Ashby, Workable',
    'Read company news and city business listings',
    'Read each company site to confirm the signal',
    'Kept companies with a dated reason from the last 60 days'
  ];
  // Found in the order the look turns them up. "left" ones are shown as left out, with the reason.
  const FOUND = [
    {
      id: 'northwind', name: 'Northwind Supply Co', place: 'Portland, OR', fit: 'strong',
      summary: 'Wholesale supplier, opened a second warehouse in September.',
      person: 'Ada Brennan', role: 'Head of Operations', personWhy: 'Named on the careers page as the hiring manager for the shift lead roles.',
      channel: 'Email', channelWhy: 'Her work address follows the pattern on the team page. Checked, likely to deliver.',
      signals: [
        { text: 'Hiring three shift leads for the new Dock Road warehouse', date: '2026-10-08', src: 'northwind.example/careers', quote: 'We are hiring three shift leads for our new Dock Road site. You will help us fix scheduling across both warehouses.' },
        { text: 'Opened a second warehouse on Dock Road', date: '2026-09-22', src: 'northwind.example/news', quote: 'Northwind opens its second warehouse, on Dock Road, to serve the east side.' }
      ]
    },
    {
      id: 'tidewater', name: 'Tidewater Physio Clinics', place: 'Tacoma, WA', fit: 'possible',
      summary: 'Physical therapy group with three clinics.',
      person: 'Ravi Mehta', role: 'Operations Lead', personWhy: 'Listed as the contact for the rota coordinator role.',
      channel: 'LinkedIn', channelWhy: 'No work email found. He posts on LinkedIn every week.',
      signals: [
        { text: 'Hiring a rota coordinator for three clinics', date: '2026-10-04', src: 'tidewater.example/careers', quote: 'Coordinate therapist rotas across our Tacoma, Lakewood and Puyallup clinics.' },
        { text: 'Announced Saturday hours at every clinic', date: '2026-09-21', src: 'tidewater.example/news', quote: 'From October, all three clinics open on Saturdays.' }
      ]
    },
    { id: 'gull', name: 'Gull Harbor Coffee', left: 'One site only. Your profile asks for two or more.' },
    {
      id: 'copperpot', name: 'Copper Pot Kitchens', place: 'Boise, ID', fit: 'possible',
      summary: 'Restaurant group, second kitchen opening in November.',
      person: 'Mo Haddad', role: 'General Manager', personWhy: 'Signs the hiring post for the new kitchen manager.',
      channel: 'Email', channelWhy: 'Address listed on the jobs page.',
      signals: [
        { text: 'Hiring a kitchen manager for a new site', date: '2026-10-12', src: 'copperpot.example/jobs', quote: 'Kitchen manager for our second location, opening in November.' }
      ]
    },
    { id: 'pinecrest', name: 'Pinecrest Storage', left: 'The newest signal is from March. Older than 60 days.' },
    { id: 'alder', name: 'Alder & Finch Florists', left: 'Already in your Leads. Kindred does not show a company twice.' }
  ];

  // ---- The lead the demo follows ----
  const LEAD = {
    id: 'ada', name: 'Ada Brennan', role: 'Head of Operations', company: 'Northwind Supply Co', domain: 'northwind.example',
    email: 'ada.brennan@northwind.example', type: 'Outbound', from: 'Discover'
  };
  const SOURCES = [
    { n: 1, title: 'Careers at Northwind', url: 'northwind.example/careers', date: '2026-10-08', excerpt: 'We are hiring three shift leads for our new Dock Road site. You will help us fix scheduling across both warehouses.' },
    { n: 2, title: 'Northwind opens Dock Road warehouse', url: 'northwind.example/news', date: '2026-09-22', excerpt: 'Our second warehouse doubles our floor space. Both sites run two shifts, six days a week.' },
    { n: 3, title: 'Ada Brennan, team page', url: 'northwind.example/team', date: '2026-10-27', excerpt: 'Ada runs operations across both warehouses, from receiving to the weekend crew.' }
  ];
  const BRIEF = {
    fit: { rating: 'strong', reasons: [
      { text: 'Runs two warehouses since September, each with two shifts.', cite: 2 },
      { text: 'Is hiring shift leads to fix scheduling across both sites, in their own words.', cite: 1 }
    ] },
    whyNow: [
      { text: 'Three shift lead roles posted 22 days ago, still open.', cite: 1 },
      { text: 'Second warehouse opened 38 days ago.', cite: 2 }
    ],
    who: [
      { text: 'Runs operations across both sites, from receiving to the weekend crew.', cite: 3 },
      { text: 'Owns the hiring for the new shift lead roles.', cite: 1 }
    ],
    objections: [
      { text: 'They may already plan shifts in a spreadsheet and see no reason to change mid hiring.', kind: 'Inferred' },
      { text: 'A new tool during a busy season can feel like one more thing to learn.', kind: 'Inferred' }
    ],
    gaps: ['Who sets the weekend rota today?', 'What they use to plan shifts now.'],
    approach: { channel: 'Email', timing: 'This week, while the roles are open', note: 'Lead with the line from their careers page. One small offer, no meeting ask yet.' }
  };
  const DRAFTS = {
    email: {
      label: 'Email',
      subject: 'Scheduling across two warehouses',
      body: "Hi Ada,\n\nYour careers page says the new shift leads will help fix scheduling across both Northwind warehouses. That is the exact problem Shiftwell solves: one rota for every site, so a lead at Dock Road can see who is free at the first warehouse.\n\nIf it would help while you hire, I can send a sample rota built for two sites and two shifts. Want me to?\n\nScott\nShiftwell, Portland. Reply stop and I will not write again.",
      opens: 1
    },
    dm: {
      label: 'LinkedIn DM',
      subject: '',
      body: "Hi Ada, saw Northwind is hiring shift leads to fix scheduling across both warehouses. I build Shiftwell, one rota for every site. Happy to send a sample rota for two sites if useful. Scott",
      opens: 1
    },
    call: {
      label: 'Call opener',
      subject: '',
      body: "Hi Ada, it's Scott from Shiftwell. I saw on your careers page that the new shift leads are meant to fix scheduling across both warehouses. Is that still the plan, or has it moved?",
      opens: 1
    }
  };

  // ---- Lived in data, so the other screens are not empty ----
  const LEADS = [
    { id: 'bea', name: 'Bea Lindqvist', role: 'Owner', company: 'Harbor Street Bakery', status: 'Replied', fit: 'strong', when: '2026-10-21' },
    { id: 'ivy', name: 'Ivy Okafor', role: 'Co owner', company: 'Fernhill Yoga', status: 'Sent', fit: 'possible', when: '2026-10-24' },
    { id: 'dev', name: 'Dev Raman', role: 'Manager', company: 'Lantern Cycles', status: 'Won', fit: 'strong', when: '2026-09-30' },
    { id: 'lee', name: 'Lee Fontaine', role: 'Practice Manager', company: 'Oakleaf Vets', status: 'Brief ready', fit: 'possible', when: '2026-10-28' },
    { id: 'sam', name: 'Sam Whitaker', role: 'Owner', company: 'Two Rivers Cafe', status: 'Waiting', fit: 'possible', when: '2026-10-15' }
  ];
  const STAGES = [
    { id: 'talk', name: 'First talk', kind: 'open' },
    { id: 'demo', name: 'Demo', kind: 'open' },
    { id: 'proposal', name: 'Proposal', kind: 'open' },
    { id: 'won', name: 'Won', kind: 'won' },
    { id: 'lost', name: 'Lost', kind: 'lost' }
  ];
  const DEALS = [
    { id: 'd-oak', name: 'Oakleaf Vets, 2 clinics', contact: 'Lee Fontaine', amount: 936, stage: 'talk', days: 3, next: 'Send the two clinic sample' },
    { id: 'd-fern', name: 'Fernhill Yoga, 2 studios', contact: 'Ivy Okafor', amount: 936, stage: 'demo', days: 6, next: 'Demo on Tuesday' },
    { id: 'd-harbor', name: 'Harbor Street Bakery', contact: 'Bea Lindqvist', amount: 1404, stage: 'proposal', days: 2, next: 'Follow up on the proposal Friday' },
    { id: 'd-lantern', name: 'Lantern Cycles', contact: 'Dev Raman', amount: 936, stage: 'won', days: 11, next: '' },
    { id: 'd-rivers', name: 'Two Rivers Cafe', contact: 'Sam Whitaker', amount: 936, stage: 'lost', days: 9, next: '', lost: 'Bad timing' }
  ];
  const NEW_DEAL = { id: 'd-north', name: 'Northwind Supply Co, 2 sites', contact: 'Ada Brennan', amount: 936, stage: 'talk', days: 0, next: 'Call Thursday at 10' };
  const REPLY = {
    from: 'Ada Brennan', company: 'Northwind Supply Co', when: '2026-11-01',
    body: "Hi Scott, yes please send the sample. We start the new leads on the 16th and I'd like something better than our two spreadsheets by then. Thursday at 10 works for a quick call.",
    read: 'Interested', note: 'Asks for the sample and offers a call time. A good moment to start a deal.'
  };
  const WIN_LEARN = 'Discover now ranks companies like Northwind higher: wholesale or warehouse, two sites, hiring shift leads. Your wins this month came from hiring signals, so those go first.';

  const WEEK = {
    tiles: [
      { k: 'Companies shown', v: 14, d: 'From 4 looks' },
      { k: 'Kept', v: 6, d: '8 skipped, each with a reason' },
      { k: 'Notes you sent', v: 5, d: 'All copied or sent by you' },
      { k: 'Replies', v: 3, d: '2 asked for more' }
    ],
    worked: [
      { text: 'Hiring signals got 2 replies from 3 notes. Openings got 1 from 2.', tone: 'good' },
      { text: 'Notes that quoted the company’s own words got every reply this week.', tone: 'good' },
      { text: 'Two notes waited more than 5 days. Follow ups are on Today.', tone: 'possible' }
    ]
  };

  return { SAMPLE_DAY, ME, SITE_PAGES, LOOKING_FOR, ALSO_FILLED, ASK, LOOK_STEPS, FOUND, LEAD, SOURCES, BRIEF, DRAFTS, LEADS, STAGES, DEALS, NEW_DEAL, REPLY, WIN_LEARN, WEEK };
})();
