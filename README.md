# Kindred: interactive demo

Fast research. Human send.

A clickable, static demo of Kindred, a sales research assistant for founder-led companies.
Open `index.html` in any modern browser (double-click works, no server needed) or host the folder on any static host.

- No backend, no external requests, no tracking. The Inter font is bundled inside `assets/styles.css`.
- All people, companies, posts, emails, phone numbers and timings are fictional example data (`.example` domains, 555 numbers, scripted research times).
- There is no send button. Drafts are copied to your clipboard so you can send them yourself.
- Phrase check: the drafter flags overused or pushy phrases as you edit, using the list in `research/avoid-phrases.json` (built into `assets/phrases.js`). It only advises and never blocks copying.

Flow: Leads, then Your company (setup), then Enrich from post (agent chain), then the prospect brief (Why it fits, drafts), then Voice, then the Tidewell account, then an inbound brief marked "Possible fit".

Concept and design: Scott Csonka, GTM Engineer.
