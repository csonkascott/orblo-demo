/* Kindred demo: scripted example data. Every person, company, post and number is fictional. */
window.KD = (function () {
  // ---- voice questionnaire ----
  const VOICE_Q = [
    { k: 'open', n: '01', h: 'How do you usually open?', s: 'First line of a first touch',
      opts: [
        { v: 'direct', b: 'Straight to the point', d: 'Lead with the useful idea' },
        { v: 'warm', b: 'A warm hello', d: 'A kind word, then the idea' },
        { v: 'question', b: 'With a question', d: 'Get them talking first' } ] },
    { k: 'formal', n: '02', h: 'How formal are you?', s: 'Greeting, sign-off, contractions',
      opts: [
        { v: 'casual', b: 'Casual', d: 'Like a message to a peer' },
        { v: 'balanced', b: 'Balanced', d: 'Friendly, a little polished' },
        { v: 'formal', b: 'Formal', d: 'Full sentences, no slang' } ] },
    { k: 'length', n: '03', h: 'How long are your first messages?', s: 'Kindred keeps to it',
      opts: [
        { v: 'short', b: 'Short, 2 to 3 lines', d: 'Easy to read on a phone' },
        { v: 'long', b: 'A bit more context', d: 'One extra line of reasoning' } ] }
  ];
  const VOICE_WORD = { direct: 'direct', warm: 'warm', question: 'opens with a question' };

  // formal rewrite: applied on top of the scripted variants
  const FORMAL = [
    [/\bit's Scott Csonka\b/g, 'this is Scott Csonka'],
    [/\bHi (\w+),/g, 'Hello $1,'], [/\bThanks for your\b/g, 'Thank you for your'], [/\bThanks for writing in\b/g, 'Thank you for writing'],
    [/\bWant me to\b/g, 'Would you like me to'], [/\bWant a copy\?/g, 'Would you like a copy?'],
    [/\bgood luck with\b/g, 'I wish you well with'],
    [/\bdoesn't\b/g, 'does not'], [/\bdon't\b/g, 'do not'], [/\byou're\b/g, 'you are'], [/\bYou're\b/g, 'You are'],
    [/\bit's\b/g, 'it is'], [/\bIt's\b/g, 'It is'], [/\bthere's\b/g, 'there is'], [/\bthat's\b/g, 'that is'], [/\bThat's\b/g, 'That is'],
    [/\bI'm\b/g, 'I am'], [/\bI've\b/g, 'I have'], [/\bwe've\b/g, 'we have'], [/\bI'd\b/g, 'I would'], [/\byou'd\b/g, 'you would'],
    [/\bcan't\b/g, 'cannot'], [/\bisn't\b/g, 'is not']
  ];
  const SIGN = {
    dm: { casual: ['Scott'], balanced: ['Thanks, Scott'], formal: ['Best regards, Scott Csonka'] },
    email: { casual: ['Scott'], balanced: ['Thanks,', 'Scott'], formal: ['Best regards,', 'Scott Csonka'] }
  };

  // Each draft = parts chosen by voice. A "mid" can be one string, or { any, question } when the
  // question opener already carries the one ask (so the rest of the message makes an offer, not a second ask).
  // "{proof}" is filled from your company's proof points once they exist, and dropped otherwise.
  // Copy rules (checked by demo-tools/lint_copy.py against research/avoid-phrases.json):
  // one reason grounded in a public signal, one low-pressure ask, no flattery, no fake familiarity, no dashes.
  const DRAFTS = {
    maya: {
      tabs: [['comment', 'LinkedIn comment'], ['dm', 'DM'], ['email', 'Email'], ['call', 'Call opener']],
      comment: {
        ctx: 'Reply to her post. Help first, no product mention',
        open: {
          direct: "What I've seen work around 15 people: one checklist per new hire, owned by their manager instead of the founder.",
          warm: "A lot of the replies here say the same thing, so you're in good company. What I've seen work around 15 people: one checklist per new hire, owned by their manager instead of the founder.",
          question: "Could each new hire's manager own their first-week checklist instead of you? That's the change I've seen help most often around 15 people." },
        mid: {
          short: 'A shared doc is enough to start.',
          long: 'Keep it to the first week, with accounts on day one and one small task they can finish by Friday. A shared doc is enough to start, and you can reuse it for the next 10 hires.' },
        close: { casual: "I can share the template I'd use if that helps.", balanced: 'If a template would help, I can share one.', formal: 'If a template would be useful, I can share one.' },
        layout: 'one'
      },
      dm: {
        ctx: 'Send 2 days after your comment. Builds on it, one ask',
        greet: 'Hi Maya,',
        open: {
          direct: 'I left a reply on your onboarding post a couple of days ago.',
          warm: 'Your onboarding post drew 41 replies, so plenty of founders are working through the same thing.',
          question: 'Is onboarding still sitting with you, or has a manager picked some of it up?' },
        mid: {
          short: { any: "I've put the manager-owned approach into a one-page first-week checklist. Want a copy?",
            question: "If it's still with you, I have a one-page first-week checklist where the hiring manager owns each step, and I can send it over." },
          long: { any: "I've put the manager-owned approach into a one-page first-week checklist. Your hiring managers own it, so it stops sitting with you, and you can reuse it for the 10 or so hires you mentioned. Want a copy?",
            question: "If it's still with you, I have a one-page first-week checklist where the hiring manager owns each step. You could reuse it for the 10 or so hires you mentioned, and I can send it over." } },
        close: { casual: 'Either way, good luck with hire 16.', balanced: 'Either way, good luck with the next hires.', formal: 'Either way, good luck with the next hires.' },
        layout: 'letter', sign: 'dm'
      },
      email: {
        ctx: 'Send after a week if the DM gets no reply',
        subject: { direct: 'First-week checklist for Tidewell', warm: 'Onboarding at Tidewell', question: "Tidewell's next hires" },
        greet: 'Hi Maya,',
        open: {
          direct: 'You posted that onboarding lives entirely in your head, and on a founder podcast you said you plan to hire about 10 people this year.',
          warm: 'Ten hires in a year is a lot to carry when, as you posted, onboarding lives entirely in your head.',
          question: 'With about 10 hires planned this year, is onboarding still running through you?' },
        mid: {
          short: { any: 'Firstweek turns that into one checklist per hire, owned by the hiring manager, so each first week stops depending on you. Want me to send the one-page first-week checklist?',
            question: "If so, Firstweek turns it into one checklist per hire, owned by the hiring manager, so each first week stops depending on you. I can send the one-page first-week checklist if it's useful." },
          long: { any: 'Firstweek turns that into one checklist per hire, owned by the hiring manager, so each first week stops depending on you. {proof}You could start with the next hire only and judge it on time saved, with nothing to roll out company-wide. Want me to send the one-page first-week checklist?',
            question: "If so, Firstweek turns it into one checklist per hire, owned by the hiring manager, so each first week stops depending on you. {proof}You could start with the next hire only and judge it on time saved. I can send the one-page first-week checklist if it's useful." } },
        proof: 'Lumen Row, a 14-person team, cut founder time per hire from 6 hours to 1.',
        close: { casual: 'If the timing is wrong, no need to reply.', balanced: "If the timing isn't right, no need to reply.", formal: 'If the timing is not right, there is no need to reply.' },
        layout: 'letter', sign: 'email'
      },
      call: {
        ctx: 'Call 8:00 to 9:30 AM PT, her morning. Say why you called before you pitch',
        open: {
          direct: "Hi Maya, it's Scott Csonka from Firstweek. The reason for my call is your post about onboarding living in your head. Can I take 30 seconds to explain, and you tell me if it's relevant?",
          warm: "Hi Maya, it's Scott Csonka from Firstweek. How are you? I'm calling about your onboarding post and the 10 or so hires you have coming this year. Do you have a minute now, or is later better?",
          question: "Hi Maya, it's Scott Csonka from Firstweek, calling about your onboarding post. When your last hire started, what took most of your time in their first week?" },
        mid: { short: '', long: "If it's useful, I can walk you through the manager-owned checklist in two minutes. If not, that's fine." },
        close: { casual: '', balanced: '', formal: '' },
        layout: 'one'
      }
    },
    lena: {
      tabs: [['email', 'Email reply'], ['call', 'Call opener'], ['dm', 'LinkedIn DM']],
      email: {
        ctx: 'Reply within the hour. Keep it light, like she asked',
        subject: { direct: 'Onboarding at Brightloom', warm: 'Your note about onboarding', question: 'Before your next hire' },
        greet: 'Hi Lena,',
        open: {
          direct: 'Thanks for your note. Something lighter than a full HR suite is what Firstweek is built for.',
          warm: 'Thanks for writing in, and good luck with the 4 hires. Something lighter than a full HR suite is what Firstweek is built for.',
          question: 'Thanks for your note. Before I suggest anything, does onboarding need to sync with your payroll tool, or can it stand on its own?' },
        mid: {
          short: { any: 'You could start by turning one of your existing docs into a checklist for your next hire, owned by their manager. Want me to build that first checklist from a doc you send, so you can judge it before we talk?',
            question: 'Either way, you could start by turning one of your existing docs into a checklist for your next hire, owned by their manager. I can build that first checklist from a doc you send, so you can judge it before we talk.' },
          long: { any: 'You could start by turning your docs and Slack threads into one checklist per hire, owned by the hiring manager. You keep what already works. {proof}Want me to build the first checklist from a doc you send, so you can judge it before we talk?',
            question: 'Either way, you could start by turning your docs and Slack threads into one checklist per hire, owned by the hiring manager. You keep what already works. {proof}I can build the first checklist from a doc you send, so you can judge it before we talk.' } },
        proof: 'Harbor & Pine (22 people) has new hires fully set up by day 2, not week 2.',
        close: { casual: "A call works too if you'd rather talk it through.", balanced: "If you'd rather talk it through, a call works too.", formal: 'If you would prefer a call, I can work around your schedule.' },
        layout: 'letter', sign: 'email'
      },
      call: {
        ctx: "Same time zone as you. Call within the hour if she hasn't replied",
        open: {
          direct: "Hi Lena, it's Scott Csonka from Firstweek. You sent a note about onboarding a few minutes ago, so I'm calling back. Is now a good time, or is later better?",
          warm: "Hi Lena, it's Scott Csonka from Firstweek. Thanks for your note about onboarding. Do you have a couple of minutes now, or is later better?",
          question: "Hi Lena, it's Scott Csonka from Firstweek, calling about your note. Of the 4 roles you're hiring, which one starts first?" },
        mid: { short: '', long: 'If it helps, I can show how one of your existing docs becomes a checklist for your next hire.' },
        close: { casual: '', balanced: '', formal: '' },
        layout: 'one'
      },
      dm: {
        ctx: "Only after she replies by email. Connect, don't pitch",
        greet: 'Hi Lena,',
        open: {
          direct: 'Thanks for your reply on email.',
          warm: 'Good to hear back from you about Brightloom.',
          question: 'Is LinkedIn easier than email for you?' },
        mid: {
          short: { any: "We can keep talking here if that's easier.", question: 'If so, we can keep talking here.' },
          long: { any: "We can keep talking here if that's easier. I can also send the one-page first-week checklist here.",
            question: 'If so, we can keep talking here, and I can send the one-page first-week checklist here too.' } },
        close: { casual: '', balanced: '', formal: '' },
        layout: 'letter', sign: 'dm'
      }
    }
  };

  function formalize(s) { FORMAL.forEach(([re, to]) => { s = s.replace(re, to); }); return s; }

  // returns {ctx, subject, paras:[string]}. opts.proof: your company has proof points, so drafts may cite one.
  function compose(lead, tab, v, opts) {
    const d = DRAFTS[lead][tab];
    const proof = !!(opts && opts.proof);
    const f = v.formal === 'formal' ? formalize : (x) => x;
    const join = (...xs) => xs.filter(Boolean).join(' ');
    let mid = d.mid[v.length];
    if (mid && typeof mid === 'object') mid = (v.open === 'question' && mid.question) ? mid.question : mid.any;
    mid = (mid || '').replace('{proof}', proof && d.proof ? d.proof + ' ' : '');
    let paras;
    if (d.layout === 'one') {
      paras = [join(d.open[v.open], mid, d.close[v.formal])];
    } else {
      paras = [d.greet, join(d.open[v.open], mid)];
      if (d.close[v.formal]) paras.push(d.close[v.formal]);
      SIGN[d.sign][v.formal].forEach((x) => paras.push(x));
      // keep two-line sign-offs together
      if (d.sign === 'email' && v.formal !== 'casual') { const b = paras.pop(); const a = paras.pop(); paras.push(a + '\n' + b); }
    }
    return { ctx: d.ctx, subject: d.subject ? f(d.subject[v.open]) : null, paras: paras.map(f) };
  }


  // ---- the rep's own company (seller). Fictional. ----
  const COMPANY_FIELDS = [
    { k: 'name', l: 'Company name', w: 5, short: true },
    { k: 'site', l: 'Website', w: 5, short: true },
    { k: 'sell', l: 'What you sell', w: 15, ph: 'One or two lines, in plain words' },
    { k: 'icp', l: "Who it's for", w: 15, ph: 'Company size, roles, stage' },
    { k: 'problems', l: 'Problems it solves', w: 10, ph: 'In your buyers\u2019 words if you can' },
    { k: 'features', l: 'Key features and use cases', w: 10, ph: 'What people actually use it for' },
    { k: 'proof', l: 'Proof points', w: 15, ph: 'Customer results, stats, one per line' },
    { k: 'objections', l: 'Common objections and your answers', w: 15, ph: '"Objection": your answer, one per line' },
    { k: 'pricing', l: 'Pricing or plan range', w: 5, short: true, ph: 'e.g. free tier, per seat' },
    { k: 'competitors', l: 'Competitors and alternatives', w: 5, short: true, ph: 'Including "do nothing"' }
  ];
  const COMPANY_START = {
    name: 'Firstweek', site: 'firstweek.example',
    sell: 'Lightweight onboarding checklists for small teams. One checklist per new hire, owned by their manager, set up in an afternoon.',
    icp: 'Founder-led teams of 10 to 50 people that hire steadily. Buyers are founders or the first ops hire. Seed to Series A.',
    problems: "Onboarding lives in the founder's head. New hires wait on accounts and intros. Every hire starts differently.",
    features: 'Manager-owned checklists per hire. First-week templates. Import existing docs. Reminders for hire and manager.',
    proof: '', objections: '',
    pricing: 'Free up to 5 active checklists, then $6 per person a month',
    competitors: 'HR suites with onboarding modules, shared docs, doing nothing'
  };
  const COMPANY_IMPORT = {
    proof: 'Lumen Row, 14 people: founder time per hire down from 6 hours to 1.\nHarbor & Pine, 22 people: new hires fully set up by day 2, not week 2.',
    objections: '"Too small for a new tool": free up to 5 active checklists, so start with the next hire.\n"We\'ll just use a doc": import the doc, Firstweek adds owners and reminders.\n"We already have docs": import them as they are, first checklist ready in a day.'
  };
  // fit per lead. Never overclaims: unknowns are named, with the question to ask.
  const FIT = {
    maya: {
      level: 'strong', label: 'Strong fit', why: '15 people, about 10 hires planned, and onboarding still runs through her.',
      words: '"Onboarding lives entirely in my head."', wordsSrc: 'Her LinkedIn post',
      useLabel: 'Firstweek use case', use: '<b>Manager-owned checklists</b>, one per new hire',
      nowLabel: "Why she'd care now", now: 'About 10 hires planned this year',
      answer: 'Free up to 5 active checklists, so start with the next hire and judge it on time saved.'
    },
    lena: {
      level: 'possible', label: 'Possible fit', why: 'The need matches. Her current tools and payroll needs are unknown, so ask first.',
      words: '"Something lighter than a full HR suite."', wordsSrc: 'Her inbound form',
      useLabel: 'Firstweek use case', use: '<b>Import existing docs</b> into one checklist per hire',
      nowLabel: 'Worth asking', now: '"What do you use today, and does it need to sync with payroll?"',
      answer: 'Import them as they are. Her first checklist can be ready in a day.'
    }
  };

  // ---- leads & briefs ----
  const LEADS = {
    lena: {
      id: 'lena', name: 'Lena Marsh', init: 'LM', role: 'Founder', company: 'Brightloom', domain: 'brightloom.example',
      email: 'lena@brightloom.example', phone: '+1 503 555 0172', size: '11 to 50', mode: 'inbound',
      need: "We're 12 people and hiring 4 more by spring. Onboarding is a pile of docs and Slack threads. Looking for something lighter than a full HR suite.",
      headSub: 'Inbound lead, form sent 9:39 AM PT',
      sources: 'Inbound form, Brightloom site, careers page',
      badges: ['New, 2 min ago'], readySec: 46,
      who: { big: 'Founder and CEO of a 12-person software company', p: 'Brightloom builds wholesale ordering for coffee roasters. 4 open roles.', gap: 'Current tools: not found, worth asking' },
      why: { q: '"Onboarding is a pile of docs and Slack threads. Looking for something lighter than a full HR suite."', src: 'Her inbound form, 2 minutes ago.' },
      time: { t: 'Now to 11:00 AM', z: 'Your time and hers (PT)', p: 'Inbound goes cold fast. Area code 503 suggests Portland, likely your time zone. Numbers travel, so treat it as a hint.' },
      talk: { big: 'Lighter than an HR suite: one checklist per hire', p: 'She asked for less, not more. Lead with how small the setup is.' },
      disc: '"Who will run the first week for the next person you hire?"',
      watch: { big: '"We already have docs. We only need to tidy them."', p: 'Fair. Offer to turn one of her existing docs into the first checklist.' },
      reach: {
        note: 'Form and public activity',
        ch: [['Email', 'Sent the form from her work email', 'Active', 'hi'], ['Phone', 'Shared on the form for follow-up', 'Shared', 'hi'], ['LinkedIn', 'Posts about monthly, last 3 weeks ago', 'Monthly', 'lo']],
        tone: 'Concise, practical, friendly', topics: 'Coffee, ops, small teams',
        seq: [['Reply by email', 'within the hour'], ['Call if there is no reply', 'today, before 11 AM'], ['Connect on LinkedIn', 'after she replies']],
        why: 'Why: she asked to hear back and gave a work email and phone.'
      },
      notes: 'Inbound demo request from the website form. Asked for something lighter than an HR suite.',
      defaultTab: 'email'
    },
    maya: {
      id: 'maya', name: 'Maya Okafor', init: 'MO', role: 'Founder', company: 'Tidewell', domain: 'tidewell.example',
      email: 'maya@tidewell.example', phone: '+1 512 555 0148', size: '11 to 50', mode: 'outbound',
      headSub: 'Outbound prospect, researched 9:41 AM PT',
      sources: 'LinkedIn post, podcast episode, Tidewell changelog',
      badges: ['No prior contact found'], readySec: 72,
      who: { big: 'Founder and CEO of a 15-person B2B software startup', p: 'Tidewell makes scheduling tools for outdoor guides. 3 open roles.', gap: 'Funding stage: not found, worth asking' },
      why: { q: '"Just hired our 15th person and realized onboarding lives entirely in my head. What simple system worked for you at this size?"', src: 'LinkedIn post, 2 days ago. Also said "hiring 10 this year" on a podcast, 3 weeks ago.' },
      time: { t: '8:00 to 9:30 AM', z: 'Your time (PT)', p: "10:00 to 11:30 AM for Maya. Tidewell's team page lists Austin, and area code 512 matches: Central Time." },
      talk: { big: 'Get onboarding out of your head before the next 10 hires', p: 'She asked for a "simple system", so lead with one checklist per hire, not another tool.' },
      disc: '"When your last hire started, what took the most of your time in their first week?"',
      watch: { big: '"We can\'t justify a new tool at 15 people."', p: 'Fair point. Start with the next hire only and judge it on time saved.' },
      reach: {
        note: 'Public activity, last 90 days',
        ch: [['LinkedIn', '2 to 3 posts a week, last 2 days ago', 'Active', 'hi'], ['X', 'Last post 5 months ago', 'Rarely', 'lo'], ['Reddit', 'No public account found', 'None', 'lo']],
        tone: 'Practical, warm, first person', topics: 'Hiring, onboarding, small teams',
        seq: [['Comment on her onboarding post', 'today'], ['Short DM referencing it', '2 days later'], ['Email if no reply', 'after a week']],
        why: 'Why: she replies to comments within a day and rarely posts on X.'
      },
      notes: 'Saw her post about onboarding first hires. Fits our 11 to 50 sweet spot. No prior contact that I know of.',
      defaultTab: 'comment'
    }
  };

  // ---- agent chain scripts (scripted seconds) ----
  const CHAIN = {
    maya: {
      total: 38, realMs: 5600,
      steps: [
        { n: 'Intake', d: 'Reads the pasted post and opens one shared lead file.', a: 0, b: 3, r: 'Name, handle and headline taken from the post',
          sub: ['Reading the post'], file: [['Source', 'LinkedIn post, 2 days ago'], ['Person', 'Maya Okafor, in/maya-okafor-example']] },
        { n: 'Enrich', ext: true, d: 'The only agent that reaches outside data. Public and licensed sources.', a: 3, b: 21, r: 'Tidewell confirmed by 2 independent sources',
          sub: ['Following the link in her bio', 'Checking the tidewell.example team page', 'Checking the Product Hunt launch', 'Looking for her on X and Reddit', 'Checking her work email', 'Looking for a funding round'],
          file: [['Company', 'Tidewell, 15 people, Austin', 'Confirmed: team page + Product Hunt'], ['Presence', 'LinkedIn active, X rare, Reddit none'], ['Email', 'maya@tidewell.example, passed an email finder check'], ['Funding', 'Not found, worth asking']] },
        { n: 'Why now', d: 'Finds the reason to reach out today, in their own words.', a: 21, b: 27, r: 'Her onboarding post, plus about 10 hires planned',
          sub: ['Reading her last 90 days of posts', 'Matching a podcast mention'], file: [['Why now', '"Onboarding lives entirely in my head"']] },
        { n: 'Persona', d: 'Reads tone and best channel from public behaviour only.', a: 27, b: 31, r: 'Practical and warm. Comment first, then DM',
          sub: ['Reading tone and reply habits'], file: [['Approach', 'Comment, then DM, then email']] },
        { n: 'Drafter', d: 'Writes a comment, DM, email and call opener in your voice.', a: 31, b: 36, r: '4 drafts in your voice. Nothing sent',
          sub: ['Drafting in your voice'], file: [['Drafts', 'Comment, DM, email, call opener']] },
        { n: 'Brief', d: 'Puts it on one screen for you to review, edit and send.', a: 36, b: 38, r: 'Ready for your review',
          sub: ['Assembling the brief'], file: [['Status', 'Ready for review']] }
      ]
    },
    lena: {
      total: 46, realMs: 4200,
      steps: [
        { n: 'Intake', d: 'Reads the inbound form into one shared lead file.', a: 0, b: 2, r: 'Name, email, phone, size and need', sub: ['Reading the form'] },
        { n: 'Enrich', ext: true, d: 'The only agent that reaches outside data.', a: 2, b: 26, r: 'brightloom.example matches her email. 4 open roles', sub: ['Checking brightloom.example', 'Reading the careers page', 'Looking for public posts'] },
        { n: 'Why now', d: 'Finds the reason to reply today.', a: 26, b: 31, r: 'She asked for help 2 minutes ago', sub: ['Reading her form'] },
        { n: 'Persona', d: 'Tone and best channel from behaviour only.', a: 31, b: 36, r: 'Concise and practical. Email first', sub: ['Reading tone'] },
        { n: 'Drafter', d: 'Drafts in your voice.', a: 36, b: 43, r: '3 drafts in your voice. Nothing sent', sub: ['Drafting'] },
        { n: 'Brief', d: 'One screen for you to review.', a: 43, b: 46, r: 'Ready for your review', sub: ['Assembling the brief'] }
      ]
    }
  };

  return { VOICE_Q, VOICE_WORD, compose, LEADS, DRAFTS, CHAIN, COMPANY_FIELDS, COMPANY_START, COMPANY_IMPORT, FIT };
})();
