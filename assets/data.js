/* Orblo sample: scripted data. Every person, company, page and number here is made up.
   Sources use .example addresses. Dates are counted against SAMPLE_DAY so "9 days ago" stays true. */
window.OB = (function () {
  'use strict';
  const SAMPLE_DAY = '2026-11-12';
  const REPLY_DAY = '2026-11-13';

  const ME = {
    name: 'Scott Csonka', first: 'Scott', initials: 'SC',
    company: 'Crema Works', site: 'cremaworks.example',
    offer: 'Espresso machine servicing and repair for cafes'
  };

  // ---------- Onboarding: what Orb reads, asks and finds ----------
  const ONBOARD = {
    readLog: ['> reading your homepage', 'read: cremaworks.example/', 'read: /services', 'read: /about', 'found: 3 services you mention', 'found: who you say you serve'],
    sell: [
      { label: 'A service I do for them', site: true },
      { label: 'Something I make or supply' },
      { label: 'Software or an app' },
      { label: 'Lessons, coaching or classes' },
      { label: 'Espresso machine servicing', site: true },
      { label: 'Emergency repairs', site: true }
    ],
    buys: [
      { label: 'Restaurants and cafes', site: true },
      { label: 'Hotels, venues and events' },
      { label: 'Shops and retail' },
      { label: 'Bakeries', site: true },
      { label: 'Offices' },
      { label: 'Near Vancouver', site: true }
    ],
    use: ['Find new customers', 'Win back past customers', 'Plan what to say to each one', 'Keep track of who I have written to'],
    goal: ['My first customers', 'More meetings', 'Try a new type of customer'],
    buildLog: ['> saving who to look for', '> looking for good fits nearby', 'read: 14 public pages', 'found: 3 fits with dated reasons', '> planning each one: email and DM'],
    // What the onboarding writes into About you. Each line says where it came from.
    learned: [
      { k: 'You sell', v: 'Espresso machine servicing and emergency repairs', from: 'From your site, cremaworks.example/services' },
      { k: 'To', v: 'Independent cafes, bakeries and restaurants', from: 'From your site, then your pick' },
      { k: 'Where', v: 'Vancouver, a short drive', from: 'Your pick' },
      { k: 'Good timing', v: 'A new location, a new machine, or a new team behind the bar', from: 'From your site: "most of our customers call us the week a second site opens"' },
      { k: 'Win in 90 days', v: 'My first customers', from: 'Your pick' }
    ]
  };

  // ---------- Discover ----------
  // Questions you write (Signals W1). Each look asks them of every company, and This week shows which ones win.
  const QUESTIONS = [
    { q: 'Did they open, or announce, a new location in the last 60 days?', from: 'Suggested from your site' },
    { q: 'Are they hiring baristas or a shift lead?', from: 'Suggested from your site' },
    { q: 'Did the city issue them a new business licence?', from: 'You added this' }
  ];
  const LOOK_STEPS = [
    'Read who you are looking for and your three questions',
    'Checked new business licences from the city, last 60 days',
    'Checked public job boards for barista and shift lead posts',
    'Read dated local news',
    'Read each company site to confirm the reason',
    'Kept companies with two kinds of dated reason. Left the rest out, each with why'
  ];
  const FOUND = [
    {
      id: 'harbour', name: 'Harbour Street Cafe', place: 'Mount Pleasant, Vancouver', fit: 'strong',
      summary: 'Independent cafe, opening a second location on Main Street.',
      answers: [true, true, true],
      signals: [
        { kind: 'Their site', text: 'Second cafe opens on Main Street in late November', date: '2026-10-28', src: 'harbourstreetcafe.example/news', quote: 'Our second cafe opens on Main Street in late November. Same beans, same team spirit, twice the counter.' },
        { kind: 'City licence', text: 'Business licence issued for 3120 Main Street', date: '2026-10-21', src: 'vancouver-opendata.example/licences/41877', quote: 'Licence issued. Harbour Street Cafe Ltd. 3120 Main St. Restaurant, class 1.' },
        { kind: 'Job post', text: 'Hiring four baristas and a shift lead for Main Street', date: '2026-11-03', src: 'jobs.lever.example/harbourstreetcafe', quote: 'We are hiring four baristas and a shift lead for our new Main Street location. Training starts the week of the 23rd.' }
      ],
      whyNow: 'A second cafe means a second espresso machine to keep running, with a new team behind it. The licence came through on Oct 21, the opening is set for late November, and they are hiring the people who will use the machine.'
    },
    { id: 'kits', name: 'Kits Coffee Bar', place: 'Kitsilano', left: 'Closed for renovation until spring. Nobody to write to yet.' },
    {
      id: 'tideline', name: 'Tideline Bistro', place: 'Kitsilano, Vancouver', fit: 'strong',
      summary: 'Bistro adding weekend brunch, with a coffee bar.',
      answers: [false, true, false],
      signals: [
        { kind: 'Local news', text: 'Adds weekend brunch from November', date: '2026-10-30', src: 'kitsdaily.example/food/tideline-brunch', quote: 'Tideline Bistro will open for weekend brunch from November, with a full coffee bar for the first time.' },
        { kind: 'Job post', text: 'Hiring two baristas for weekend brunch', date: '2026-11-05', src: 'tidelinebistro.example/careers', quote: 'Two baristas for Saturday and Sunday brunch. Experience on a two group machine is a plus.' }
      ],
      whyNow: 'Their first coffee bar opens with brunch this month, and the job post asks for people who know a two group machine. A new bar with a new team is when machines need the most care.'
    },
    { id: 'northside', name: 'Northside Roasters', place: 'Strathcona', left: 'They service espresso machines themselves. Their site says so.' },
    {
      id: 'granville', name: 'Granville Bakehouse', place: 'Fairview, Vancouver', fit: 'possible',
      summary: 'Bakery adding a coffee counter.',
      answers: [false, false, true],
      signals: [
        { kind: 'City licence', text: 'Licence amended to add a coffee counter', date: '2026-11-02', src: 'vancouver-opendata.example/licences/39210', quote: 'Licence amended. Granville Bakehouse. Adds food service: coffee counter.' }
      ],
      whyNow: 'One type of reason so far: the city licence. Orblo keeps looking for a second before it calls this strong.'
    },
    { id: 'diner', name: 'Main Street Diner', place: 'Riley Park', left: 'The only reason is a job post from March. Older than 60 days.' }
  ];

  // ---------- Enrichment: find the right person, then a work email ----------
  const PEOPLE = [
    { id: 'maria', name: 'Maria Lopez', role: 'Owner', why: 'Most senior. In a cafe this size, the owner books repairs.' },
    { id: 'james', name: 'James Chen', role: 'General manager', why: 'Runs the floor day to day. A good second name.' },
    { id: 'priya', name: 'Priya Shah', role: 'Shift lead', why: 'Uses the machine every day, but does not decide.' }
  ];
  // Each step is something Orblo really runs. FullEnrich does not say which provider found what, so neither does Orblo.
  const WATERFALL = [
    { id: 'past', step: 'Looked up before', source: 'Orblo', note: 'Not found. This is the first lookup for Maria.', status: 'none', results: [] },
    { id: 'people', step: 'Who works there', source: 'FullEnrich', note: '3 people, most senior first, ranked by who you sell to.', status: 'found', credits: 0.75,
      results: [{ label: 'Owner', value: 'Maria Lopez', quality: 'usable', detail: 'Picked' }, { label: 'General manager', value: 'James Chen', quality: 'unknown', detail: 'Next best' }, { label: 'Shift lead', value: 'Priya Shah', quality: 'unknown', detail: 'Does not decide' }] },
    { id: 'email', step: 'Work email', source: 'FullEnrich', note: 'Found. The most likely address is first.', status: 'found', credits: 1,
      results: [{ label: 'Work email', value: 'maria@harbourstreetcafe.example', quality: 'usable', detail: 'Deliverable' }, { label: 'Work email', value: 'm.lopez@harbourstreetcafe.example', quality: 'risky', detail: 'Catch all. May not reach her' }] },
    { id: 'phone', step: 'Company phone', source: 'Their website', note: 'From their contact page. Orblo never looks up a personal phone.', status: 'found',
      results: [{ label: 'Company phone', value: '604 555 0143', quality: 'usable', detail: 'harbourstreetcafe.example/contact' }] }
  ];
  const ENRICH_SUMMARY = { credits: 1.75, left: 18 };

  // ---------- Research: the pages Enrich saves, and the brief written only from them ----------
  const SOURCES = [
    { n: 1, title: 'News: our second cafe', url: 'harbourstreetcafe.example/news', date: '2026-10-28', excerpt: 'Our second cafe opens on Main Street in late November. Same beans, same team spirit, twice the counter.' },
    { n: 2, title: 'Business licence, 3120 Main St', url: 'vancouver-opendata.example/licences/41877', date: '2026-10-21', excerpt: 'Licence issued. Harbour Street Cafe Ltd. Restaurant, class 1.' },
    { n: 3, title: 'Barista and shift lead, Main Street', url: 'jobs.lever.example/harbourstreetcafe', date: '2026-11-03', excerpt: 'Hiring four baristas and a shift lead for our new Main Street location. Training starts the week of the 23rd.' },
    { n: 4, title: 'About us', url: 'harbourstreetcafe.example/about', date: '2026-11-12', excerpt: 'Maria opened Harbour Street in 2019 with one espresso machine and a lot of patience. It is still running.' },
    { n: 5, title: 'Main Street gets two new cafes this fall', url: 'mountpleasantnews.example/2026/10/main-street-cafes', date: '2026-10-24', excerpt: 'Harbour Street, a neighbourhood favourite on its home block, is the bigger of the two openings.' }
  ];
  const RESEARCH_LOG = ['Read their site: news and about', 'Read the city licence record', 'Read the job post on their board', 'Read dated local news', 'Saved 5 public pages, each with its date'];
  const BRIEF = {
    fit: { rating: 'strong', reasons: [
      { text: 'They run a busy espresso bar, and a second one opens this month.', cite: 1 },
      { text: 'A new team will learn the new machine from scratch.', cite: 3 }
    ] },
    whyNow: [
      { text: 'Licence for the Main Street site issued Oct 21.', cite: 2 },
      { text: 'Opening set for late November. Training starts the week of the 23rd.', cite: 3 }
    ],
    who: [
      { text: 'Opened in 2019 by Maria Lopez, who still runs it.', cite: 4 },
      { text: 'Proud that their first machine is still running.', cite: 4 },
      { text: 'Local news calls them a neighbourhood favourite.', cite: 5 }
    ],
    objections: [
      { text: 'Someone may already service their first machine.', kind: 'Inferred' },
      { text: 'Opening month is busy. A short note with one small ask fits that.', kind: 'Inferred' }
    ],
    gaps: ['Who services their machine today', 'Which machine the new site will use', 'Whether Maria or James books repairs'],
    approach: { channel: 'Email', timing: 'This week, before the opening', note: 'Open with the opening. Ask one small question about the first week.' }
  };

  // ---------- Outreach ----------
  const DRAFTS = {
    email: {
      label: 'Email',
      subject: 'Main Street opening',
      body: 'Hi Maria,\n\nI saw your second cafe opens on Main Street later this month, and that training starts the week of the 23rd.\n\nA new machine with a new team often needs a few small adjustments in its first weeks. I service espresso machines for cafes in Mount Pleasant and could look it over during that first week.\n\nWould a free check during your first week be useful?\n\nScott\nCrema Works, cremaworks.example\nIf this is not for you, reply "no thanks" and I will not write again.',
      fact: 'second cafe opens on Main Street'
    },
    dm: {
      label: 'DM',
      subject: '',
      body: 'Hi Maria, I saw your second cafe opens on Main Street this month. I service espresso machines in Mount Pleasant. Would a free check during your first week be useful?',
      fact: 'second cafe opens on Main Street'
    }
  };
  const TRY_LINE = 'Can we hop on a quick call next week to discuss?';
  const PRACTICE = [
    { id: 'interested', label: 'Interested', reply: 'Thanks for the note. This could be useful for us. What would the next step be?' },
    { id: 'question', label: 'A question', reply: 'Thanks. How would this work for a cafe our size? We are a small team.' },
    { id: 'price', label: 'How much?', reply: 'Thanks for the note. Roughly how much does this cost?' },
    { id: 'not_now', label: 'Not now', reply: 'Thanks, but now is not a good time for us. We have a lot on this month.' }
  ];

  // ---------- Customers ----------
  const REPLY = {
    from: 'Maria Lopez', company: 'Harbour Street Cafe', day: REPLY_DAY,
    body: 'Hi Scott, good timing. The new machine arrives on the 24th and nobody on the new team has used one like it. What would the first week check cost, and could you do the 26th?',
    read: 'Interested',
    note: 'She asks the price and names a day. Answer both before you ask anything of your own.',
    next: 'Send Maria the price for a first week check, and confirm the 26th',
    nextDue: '2026-11-14'
  };
  const STAGES = [
    { id: 'talk', name: 'First talk', kind: 'open' },
    { id: 'quote', name: 'Quote sent', kind: 'open' },
    { id: 'agreed', name: 'Agreed', kind: 'open' },
    { id: 'won', name: 'Won', kind: 'won' },
    { id: 'lost', name: 'Lost', kind: 'lost' }
  ];
  const DEALS = [
    { id: 'd-fern', name: 'Fernwood Pizza', contact: 'Ravi Patel, owner', amount: 1800, stage: 'quote', days: 4, next: 'Ravi said he would decide by Friday' },
    { id: 'd-juniper', name: 'Juniper Tea House', contact: 'Emma Wilson, manager', amount: 1200, stage: 'talk', days: 2, next: 'Visit Tuesday to see the machine' },
    { id: 'd-cedar', name: 'Cedar Lane Kitchen', contact: 'Daniel Kim, chef owner', amount: 3000, stage: 'agreed', days: 9, next: 'Sign the service plan' },
    { id: 'd-pine', name: 'Pine Street Deli', contact: 'Laura Brown, owner', amount: 900, stage: 'lost', days: 21, lost: 'Chose a plan from the machine dealer' }
  ];
  const NEW_DEAL = { id: 'd-harbour', name: 'Harbour Street Cafe', contact: 'Maria Lopez, owner', amount: 2600, stage: 'talk', days: 0, next: 'First week check on the 26th' };
  const WIN_LEARN = 'Orblo will look harder for cafes opening a second site. "Did they open a new location?" led to this win, so it moves up your questions.';

  const TODAY_FEW = [
    { id: 'harbour', name: 'Harbour Street Cafe', why: 'Second cafe opens on Main Street in late November', when: '2026-10-28', fit: 'strong' },
    { id: 'tideline', name: 'Tideline Bistro', why: 'Hiring two baristas for weekend brunch', when: '2026-11-05', fit: 'strong' },
    { id: 'granville', name: 'Granville Bakehouse', why: 'Licence amended to add a coffee counter', when: '2026-11-02', fit: 'possible' }
  ];
  const TASKS = [
    { t: 'Follow up with Emma Wilson', d: 'Sent 6 days ago, no reply. Bring one new thing: the visit time that suits her.', b: 'Due today' },
    { t: 'Send Ravi Patel the service plan', d: 'Promised on Tuesday\'s call.', b: 'Due today' },
    { t: 'Cedar Lane Kitchen agreement', d: 'Daniel said he would sign this week.', b: 'Friday' }
  ];
  const LEADS = [
    { name: 'Emma Wilson', role: 'Manager', company: 'Juniper Tea House', status: 'Sent', fit: 'strong', when: '2026-11-06' },
    { name: 'Ravi Patel', role: 'Owner', company: 'Fernwood Pizza', status: 'Talking', fit: 'strong', when: '2026-11-02' },
    { name: 'Daniel Kim', role: 'Chef owner', company: 'Cedar Lane Kitchen', status: 'Talking', fit: 'possible', when: '2026-10-27' }
  ];

  const WEEK = {
    lead: { k: 'Replies, this week', v: 3, change: 'Up from 1 last week' },
    tiles: [
      { k: 'Notes you sent', v: '6', d: 'All sent by you, from your own email' },
      { k: 'Deals started', v: '2', d: 'From replies' },
      { k: 'Won', v: '$2,600', d: 'A year, one deal' }
    ],
    questions: [
      { q: 'Did they open a new location?', sent: 3, replies: 2 },
      { q: 'Are they hiring baristas?', sent: 2, replies: 1 },
      { q: 'New business licence?', sent: 1, replies: 0 }
    ]
  };

  const GUIDES = [
    { slug: 'research', title: 'How to research someone in 5 minutes', lede: 'You are looking for one true thing about them, not a file on them.',
      steps: [
        ['Minute 1: what changed', 'Read the dated reasons Orblo shows. A new location, a job post or a new licence tells you what is on their mind this month.'],
        ['Minutes 2 and 3: their own words', 'Open their site. Read the home page and the About page. Notice how they describe their customers and what they are proud of.'],
        ['Minute 4: who decides', 'In a small business it is usually the owner. Find the name on the About page or the listing. If you cannot find one, write to the business.'],
        ['Minute 5: one sentence', 'Write down the one fact that makes this a good week to write to them. If you cannot find one, skip them. That is a good result too.']
      ], keep: 'One real, dated fact beats ten things you could say to anyone.' },
    { slug: 'first-line', title: 'Writing a first line that\'s about them', lede: 'The first line decides whether the rest gets read.',
      steps: [
        ['Start with what happened on their side', 'Name the thing you noticed and when. They know at once that the note was written for them.'],
        ['Leave yourself out of it', 'Your name, your company and what you sell can wait for the second or third sentence.'],
        ['Say why it matters to them', 'Add one line on what that change usually brings. Now they can see you understand their week.'],
        ['Check it', 'Could you send this exact line to another business? If yes, it needs a fact that is only true of them.']
      ], keep: 'A fact, a date, and why it matters to them. Then stop.' },
    { slug: 'follow-up', title: 'A good second note', lede: 'Silence usually means busy, not no.',
      steps: [
        ['Wait five days', 'Sooner feels like pressure. Orblo reminds you when it is time, so you do not have to keep count.'],
        ['Bring one new thing', 'A new fact about them, a short example from a customer like them, or an answer to a question they might have.'],
        ['Keep it shorter than the first', 'Two or three sentences. One easy question at the end.'],
        ['Stop at two', 'Orblo never suggests more than two follow ups. After that, leave them be.']
      ], keep: 'Each note should be worth reading even if they never saw the one before it.' }
  ];

  // Ask Orb: questions with answers that cite what Orblo saved. Scripted for the sample.
  const ORB = [
    { q: 'Why is Harbour Street a strong fit?', a: 'Two kinds of dated reason line up with what you sell. Their own news says a second cafe opens in late November, and the city issued the licence on Oct 21. They are also hiring the team who will use the new machine.', cites: ['harbourstreetcafe.example/news', 'vancouver-opendata.example/licences/41877', 'jobs.lever.example/harbourstreetcafe'] },
    { q: 'Who should I write to next?', a: 'Tideline Bistro. Their first coffee bar opens with weekend brunch this month, and they are hiring baristas who know a two group machine. I have not found a person there yet, so start with Find the right person.', cites: ['kitsdaily.example/food/tideline-brunch', 'tidelinebistro.example/careers'] },
    { q: 'What is still missing on Harbour Street?', a: 'I could not find who services their first machine today, which machine the new site will use, or whether Maria or James books repairs. Those make good questions if she writes back. I will not guess them.', cites: [] }
  ];

  return { SAMPLE_DAY, REPLY_DAY, ME, ONBOARD, QUESTIONS, LOOK_STEPS, FOUND, PEOPLE, WATERFALL, ENRICH_SUMMARY, SOURCES, RESEARCH_LOG, BRIEF, DRAFTS, TRY_LINE, PRACTICE, REPLY, STAGES, DEALS, NEW_DEAL, WIN_LEARN, TODAY_FEW, TASKS, LEADS, WEEK, GUIDES, ORB };
})();
