// ══════════════════════════════════════════════════════════════════════
//  ARCHETYPES — the kinds of commissions the Beast accepts.
//  Each carries its own name pools, copy formulas and section plan
//  (Garrett: scope fixed from strategy before any pixel is placed).
// ══════════════════════════════════════════════════════════════════════

export interface SectionPlan {
  key: string;
  headline: string[]; // formula pool, seeded pick
  blurb: string[]; // body copy pool
}

export interface Archetype {
  id: string;
  label: string;
  audience: string;
  feel: string; // one-line brief personality (Refactoring UI: choose a personality)
  nameParts1: string[];
  nameParts2: string[];
  heroLead: string[]; // kicker line above headline
  heroHeadline: string[];
  heroSub: string[];
  ctaPrimary: string[];
  ctaSecondary: string[];
  sections: SectionPlan[];
  features: { title: string; desc: string }[];
  stats: { value: string; label: string }[];
  testimonials: { quote: string; name: string; role: string }[];
  contactNote: string;
}

const T = {
  cta: ["Book a table", "Reserve your spot", "Come see us", "Plan your visit"],
  cta2: ["View the menu", "See what we do", "Browse our work", "Get a quote"],
};

export const ARCHETYPES: Archetype[] = [
  {
    id: "restaurant",
    label: "Restaurant",
    audience: "locals deciding where to eat tonight",
    feel: "warm, appetizing, unhurried — the site should smell like the kitchen",
    nameParts1: ["Copper", "Ember", "Olive", "Fig", "Cedar", "Harvest", "Salt", "Golden"],
    nameParts2: ["& Oak", "Kitchen", "Table", "Fork", "Larder", "Hearth", "Spoon", "Provisions"],
    heroLead: ["Est. 2019 · Seasonal · Local", "Open Tue–Sun · From 5pm", "Farm-to-table, since day one", "Walk-ins welcome · Reservations advised"],
    heroHeadline: [
      "Honest food, cooked slow, served warm",
      "A neighbourhood kitchen with a wood fire at its heart",
      "Seasonal plates from growers we actually know",
      "Come hungry. Leave slowly.",
    ],
    heroSub: [
      "A small kitchen with a short menu that changes with the seasons. Everything made in-house, from the bread to the stocks.",
      "We cook what the farms bring us each morning. The menu is short on purpose, the portions are not.",
    ],
    ctaPrimary: T.cta,
    ctaSecondary: ["View the menu", "See tonight's specials", "Browse the wine list"],
    sections: [
      { key: "intro", headline: ["The kitchen", "What we cook", "From the pass"], blurb: ["Open kitchen, open fire, closed on Mondays. We do one seating a night and we do it properly.", "Every dish starts with stock made before sunrise. It ends when the bread runs out."] },
      { key: "hours", headline: ["Find us & hours", "When to come", "The door times"], blurb: ["Dinner Tuesday to Sunday from 5pm. Lunch Friday only. 42 seats — book ahead for weekends."] },
    ],
    features: [
      { title: "Seasonal menu", desc: "Rewritten every few weeks around what the farms actually have." },
      { title: "Wood-fired grill", desc: "One oak fire, lit at 8am, doing all the heavy lifting." },
      { title: "Natural wine", desc: "A short list of low-intervention bottles from small growers." },
      { title: "Private dining", desc: "The back room seats 14. One long table. One menu for all." },
    ],
    stats: [{ value: "4.9★", label: "on 1,200+ reviews" }, { value: "42", label: "seats, one room" }, { value: "14", label: "local farms we buy from" }],
    testimonials: [
      { quote: "The kind of place you plan your week around. The short rib is a religious experience.", name: "Dana M.", role: "Regular since opening night" },
      { quote: "We booked the back room for our anniversary. They remembered our wine from last year.", name: "Priya & Tom", role: "Dined with us 6 times" },
    ],
    contactNote: "For large bookings call after 2pm — the kitchen answers.",
  },
  {
    id: "saas",
    label: "SaaS Product",
    audience: "team leads comparing tools this week",
    feel: "precise, credible, quietly confident — no hype words",
    nameParts1: ["Fleet", "Ledger", "Beacon", "Craft", "Pulse", "Anchor", "Draft", "Signal"],
    nameParts2: ["HQ", "Ops", "Flow", "Board", "Desk", "Base", "Stack", "Cloud"],
    heroLead: ["Now with API v2", "Backed by teams at 2,000+ companies", "Free for 14 days · No card", "SOC 2 Type II certified"],
    heroHeadline: [
      "Ship the work, skip the status meeting",
      "Every task, decision and deadline — finally in one place",
      "The operations layer your team actually opens",
      "Stop managing work. Start finishing it.",
    ],
    heroSub: [
      "Plan sprints, track decisions and report up without the spreadsheet ritual. Set up in an afternoon, adopted by Friday.",
      "One workspace for tasks, docs and reporting — with the automation your team keeps trying to bolt onto chat.",
    ],
    ctaPrimary: ["Start free trial", "Get started — it's free", "Create your workspace"],
    ctaSecondary: ["See how it works", "Book a 15-min demo", "Read the docs"],
    sections: [
      { key: "how", headline: ["How it works", "Three steps, one afternoon", "From chaos to board in a day"], blurb: ["Import from your current tools, pick a template, invite the team. Most workspaces are live the same day."] },
      { key: "security", headline: ["Security & trust", "Your data, guarded", "Enterprise-grade from day one"], blurb: ["SOC 2 Type II, SSO/SAML on every plan, and daily backups you can restore yourself."] },
    ],
    features: [
      { title: "Unified board", desc: "Tasks, docs and decisions linked in one timeline. No more archaeology." },
      { title: "Auto-reporting", desc: "Weekly summaries write themselves from what actually happened." },
      { title: "Deep automations", desc: "Route work with rules that read like sentences, not scripts." },
      { title: "90+ integrations", desc: "GitHub, Slack, Figma and everything else your stack insists on." },
    ],
    stats: [{ value: "12,400+", label: "teams on board" }, { value: "6.2h", label: "saved per person, weekly" }, { value: "99.99%", label: "uptime, last 12 months" }],
    testimonials: [
      { quote: "We cancelled three tools the month we rolled it out. The weekly report alone sold my CEO.", name: "Marcus T.", role: "Head of Ops, logistics startup" },
      { quote: "Adoption is the metric nobody talks about. This is the first tool everyone actually opened.", name: "Elena R.", role: "Engineering Manager" },
    ],
    contactNote: "Questions? Our team answers in under 4 hours, by humans.",
  },
  {
    id: "portfolio",
    label: "Creative Portfolio",
    audience: "clients scouting for a commission",
    feel: "gallery-quiet, confident, let the work breathe",
    nameParts1: ["Studio", "Atelier", "Office", "Practice", "House", "Dept."],
    nameParts2: ["Mara Voss", "Jon Feld", "Nia Okafor", "Theo Marsh", "Iris Kwon", "Ben Alvey"],
    heroLead: ["Independent practice · Berlin", "Selected work 2021–2026", "Available for commissions", "Design & art direction"],
    heroHeadline: [
      "Design that earns its keep",
      "Brand, print and digital for people who care",
      "Small studio. Deliberate work. No template energy.",
      "Making things that outlast the trend cycle.",
    ],
    heroSub: [
      "A one-person studio working with founders and cultural institutions on identity, editorial and digital design.",
      "Fifteen years of brand systems, book design and interfaces — chosen by clients who want it to last.",
    ],
    ctaPrimary: ["Start a project", "Commission work", "Say hello"],
    ctaSecondary: ["View selected work", "Browse the archive", "Read the process notes"],
    sections: [
      { key: "process", headline: ["The process", "How a project runs", "Slow is smooth"], blurb: ["A short discovery call, a written proposal, then deliberate work in the open. You see everything as it happens."] },
      { key: "services", headline: ["What I take on", "Scope", "Ways of working"], blurb: ["Identity systems, editorial design and websites — often all three, always start to finish."] },
    ],
    features: [
      { title: "Brand identity", desc: "Marks, systems and the guidelines that keep them honest." },
      { title: "Editorial & print", desc: "Books, reports and covers — typeset by hand, shipped on time." },
      { title: "Digital design", desc: "Sites designed and built with the same care as the letterhead." },
      { title: "Art direction", desc: "Photo, illustration and motion — directed, never stock-piled." },
    ],
    stats: [{ value: "60+", label: "projects shipped" }, { value: "15", label: "years in practice" }, { value: "9", label: "awards (some dusty)" }],
    testimonials: [
      { quote: "Our rebrand paid for itself in a year. The deck alone closed two investors.", name: "S. Okonkwo", role: "Founder, fintech" },
      { quote: "The rare designer who says no to bad ideas — including mine. That's exactly why we hired them.", name: "H. Lindqvist", role: "Museum director" },
    ],
    contactNote: "Currently booking projects for next quarter. Two slots left.",
  },
  {
    id: "fitness",
    label: "Gym & Fitness",
    audience: "people restarting their training this month",
    feel: "strong, direct, zero fluff — energy without shouting",
    nameParts1: ["Iron", "Forge", "Grit", "North", "Vanguard", "Baseline"],
    nameParts2: ["Strength Club", "Athletics", "Barbell Club", "Performance", "Conditioning", "Strength Co."],
    heroLead: ["Open 5am–11pm · 7 days", "First week free · No lock-in", "Coaching from day one", "Small groups, real programming"],
    heroHeadline: [
      "Get strong. Stay strong. Here's how.",
      "A training gym for people who are done starting over",
      "Coached sessions, real programming, no mirrors-and-music circus",
      "Strength you can measure, coached by people who train.",
    ],
    heroSub: [
      "Small-group strength and conditioning with actual programming — progressive, tracked, adjusted to you.",
      "No contracts, no sales floor. Just a barbell club that keeps its classes small and its coaches qualified.",
    ],
    ctaPrimary: ["Claim your free week", "Start training", "Book your intro session"],
    ctaSecondary: ["See the timetable", "Meet the coaches", "View memberships"],
    sections: [
      { key: "method", headline: ["The method", "Why it works", "Train with a plan"], blurb: ["Every block runs 8 weeks: assess, progress, test. You'll know exactly why you're doing every set."] },
      { key: "community", headline: ["The club", "Who trains here", "Your training people"], blurb: ["Accountants, nurses, new mums, masters athletes. The common thread: they show up."] },
    ],
    features: [
      { title: "Coached small groups", desc: "Max 8 per session. Every rep watched, every lift logged." },
      { title: "Real programming", desc: "8-week blocks built around your numbers, not a whiteboard vibe." },
      { title: "Open gym access", desc: "Members train solo 5am–11pm with programming in the app." },
      { title: "Recovery room", desc: "Sauna and mobility zone — because adaptation happens at rest." },
    ],
    stats: [{ value: "380+", label: "active members" }, { value: "8", label: "max per class" }, { value: "0", label: "lock-in contracts" }],
    testimonials: [
      { quote: "First gym where a coach knew my name on day two. Deadlift went from 80 to 140kg in a year.", name: "Josh K.", role: "Member, 18 months" },
      { quote: "I came for the free week and stayed two years. The programming is the real deal.", name: "Amara N.", role: "Member" },
    ],
    contactNote: "Free week includes one intro session and a movement screen.",
  },
  {
    id: "dental",
    label: "Dental Clinic",
    audience: "nervous patients choosing a practice",
    feel: "calm, clean, trustworthy — reassurance over technology",
    nameParts1: ["Willow", "Park", "Bridge", "Maple", "Harbour", "Gentle"],
    nameParts2: ["Dental", "Dental Studio", "Family Dental", "Dental Care", "Smile Clinic"],
    heroLead: ["New patients welcome", "Same-week emergency slots", "Open Saturdays", "Nervous patients our specialty"],
    heroHeadline: [
      "Dentistry that explains itself",
      "Gentle, modern care — and we mean the gentle part",
      "A dental home for people who avoided the dentist",
      "Calm appointments. Clear prices. No lectures.",
    ],
    heroSub: [
      "We show you what we see, explain what it means and price it before we start. Anxiety-friendly by design.",
      "Modern treatment rooms, honest treatment plans and a team that moves at your pace — not the schedule's.",
    ],
    ctaPrimary: ["Book an appointment", "Request a visit", "Book your first check-up"],
    ctaSecondary: ["See our services", "Meet the team", "Read patient stories"],
    sections: [
      { key: "care", headline: ["Our approach", "Care without the hurry", "How we work"], blurb: ["Longer appointments, photos of everything, and a treatment plan in plain language with fixed prices."] },
      { key: "pricing", headline: ["Honest pricing", "What things cost", "No surprise bills"], blurb: ["Check-ups from $85, hygiene from $110. Every plan costed and approved by you first."] },
    ],
    features: [
      { title: "Anxiety-friendly", desc: "Noise-cancelling headphones, agreed hand signals, zero judgement." },
      { title: "Same-week urgent", desc: "Reserved emergency slots every day — usually seen within 48 hours." },
      { title: "3D imaging", desc: "Scan instead of guess: you see the plan before any drill appears." },
      { title: "Family block booking", desc: "Whole household in one morning, back to back." },
    ],
    stats: [{ value: "4.8★", label: "from 900+ patients" }, { value: "48h", label: "max wait for urgent care" }, { value: "22", label: "years serving the suburb" }],
    testimonials: [
      { quote: "I hadn't seen a dentist in a decade out of fear. They talked me through everything. Nothing hurt.", name: "Robert L.", role: "Patient" },
      { quote: "They fixed a cracked crown the same week I called, and the price matched the quote exactly.", name: "Sandra P.", role: "Patient, 6 years" },
    ],
    contactNote: "Reception answers 8am–6pm weekdays, 9am–1pm Saturdays.",
  },
  {
    id: "law",
    label: "Law Firm",
    audience: "people with a legal problem and a deadline",
    feel: "measured, authoritative, human — authority without marble",
    nameParts1: ["Hartwell", "Marsh &", "Calloway", "Ellison", "Stonebridge"],
    nameParts2: ["Law", "Partners", "Legal", "Chambers", "Law Group"],
    heroLead: ["Free 20-minute consult", "Practising 20+ years", "Fixed fees where possible", "Serving the region since 2004"],
    heroHeadline: [
      "Clear legal advice, plainly priced",
      "Lawyers who explain, then execute",
      "Serious counsel without the theatre",
      "Your matter, handled properly.",
    ],
    heroSub: [
      "Family, property and commercial law with written fee estimates and a lawyer who returns calls the same day.",
      "We take the cases we can win and tell you early when you don't need a lawyer at all.",
    ],
    ctaPrimary: ["Book a free consult", "Request a call back", "Talk to a lawyer"],
    ctaSecondary: ["Our practice areas", "Meet the team", "Read case notes"],
    sections: [
      { key: "areas", headline: ["Practice areas", "What we handle", "Where we help"], blurb: ["Conveyancing, wills and estates, family law and small-business matters — the areas where clarity matters most."] },
      { key: "fees", headline: ["Fees, in writing", "What it costs", "No meter running blind"], blurb: ["Fixed fees for standard matters. Hourly work estimated in writing before we start, honoured after."] },
    ],
    features: [
      { title: "Fixed-fee certainty", desc: "Standard matters quoted up front — the number you sign is the number you pay." },
      { title: "Same-day response", desc: "Every client email answered within one business day, by your lawyer." },
      { title: "Plain-language advice", desc: "Options explained without Latin, with the risks written down." },
      { title: "20 years local", desc: "We know the local courts, registries and how things actually move." },
    ],
    stats: [{ value: "1,900+", label: "matters resolved" }, { value: "93%", label: "settled without court" }, { value: "20+", label: "years in practice" }],
    testimonials: [
      { quote: "Our property settlement was quoted fixed-fee and finished early. I never once felt lost.", name: "G. Whitmore", role: "Client" },
      { quote: "Told me on the first call I didn't need to litigate. Saved me thousands. That's the firm you want.", name: "D. Okafor", role: "Small-business owner" },
    ],
    contactNote: "This is general information, not legal advice. Consult on your specific matter.",
  },
  {
    id: "coffee",
    label: "Coffee Shop / Roastery",
    audience: "regulars and the laptop-with-a-latte crowd",
    feel: "roasted-warm, craft-proud, morning-friendly",
    nameParts1: ["Kettle", "Roast", "Bean", "Morning", "Slow", "Copper"],
    nameParts2: ["Coffee Co.", "Roasters", "Coffee Lab", "Espresso Bar", "Coffee House"],
    heroLead: ["Roasting in-house since 2018", "Open 7am · Every day", "Single-origin, roasted weekly", "Beans to your door, Fridays"],
    heroHeadline: [
      "Roasted here. Poured right.",
      "Small-batch roasting, seven days a week",
      "The corner café that roasts its own",
      "Serious coffee without the ceremony.",
    ],
    heroSub: [
      "We roast twice a week in the back and pour it front-of-house within days. Beans ship every Friday.",
      "One espresso blend for the regulars, rotating singles for the curious, and decaf that isn't an insult.",
    ],
    ctaPrimary: ["Shop fresh beans", "Order for pickup", "Subscribe & save 10%"],
    ctaSecondary: ["See the roastery", "This week's origins", "Find the café"],
    sections: [
      { key: "roast", headline: ["The roastery", "Roasted in the back", "How we roast"], blurb: ["12kg drum, Tuesdays and Fridays. Every batch cupped before it earns the shelf."] },
      { key: "cafe", headline: ["The café", "Come sit a while", "Find your seat"], blurb: ["Thirty seats, fast wifi, and a staff who remember your order by week two."] },
    ],
    features: [
      { title: "Weekly roasts", desc: "Every bag stamped with its roast date. Stale beans don't ship." },
      { title: "Origins rotating", desc: "Two single-origins on brew bars, changing most weeks." },
      { title: "Subscription", desc: "Your bag lands Friday, 10% under counter price, pause anytime." },
      { title: "Barista training", desc: "Wholesale customers get their team trained on their own machine." },
    ],
    stats: [{ value: "6", label: "origins on the shelf" }, { value: "72h", label: "roast to shelf" }, { value: "310", label: "subscription households" }],
    testimonials: [
      { quote: "The roast date on the bag is always this week. That's why I stopped buying beans anywhere else.", name: "M. Castellano", role: "Subscriber" },
      { quote: "Their training got our café's coffee consistent for the first time. Worth every cent.", name: "J. Mbeki", role: "Wholesale customer" },
    ],
    contactNote: "Wholesale enquiries: ask for the head roaster, Tom.",
  },
  {
    id: "realestate",
    label: "Real Estate Agency",
    audience: "homeowners weighing an agent",
    feel: "polished, local, results-forward — trust before flash",
    nameParts1: ["Beacon", "Harbour", "Kingsley", "Terrace", "Anchor"],
    nameParts2: ["Property", "Real Estate", "Realty Group", "Property Partners", "Estate Agents"],
    heroLead: ["Avg. 21 days on market", "Appraisals free · No obligation", "Independent & local", "2025 Agency of the Year, finalist"],
    heroHeadline: [
      "Sell well. Move on.",
      "The local agency that prices honestly",
      "Your home, marketed like it matters",
      "Data-driven selling with a human handshake.",
    ],
    heroSub: [
      "We sell fewer homes on purpose — deeper marketing, honest appraisals and an agent who answers their own phone.",
      "Independent, local and unbureaucratic. You deal with the principal from first appraisal to settlement day.",
    ],
    ctaPrimary: ["Book a free appraisal", "Get your home's value", "Request an appraisal"],
    ctaSecondary: ["See recent sales", "Meet the team", "Browse current listings"],
    sections: [
      { key: "results", headline: ["Recent results", "Sold, not just listed", "Proof over promises"], blurb: ["Every sale published with days-on-market and price achieved. We list the misses too — few, but real."] },
      { key: "process", headline: ["The campaign", "How we sell", "Four weeks, start to sold"], blurb: ["Week one: styling and media. Week two: launches. Week three: offers. Week four: you're moving."] },
    ],
    features: [
      { title: "Honest appraisals", desc: "Priced from sold data, not from what you'd love to hear." },
      { title: "Full-styling budget", desc: "Every campaign includes styling, floorplans and cinematic media." },
      { title: "Principal-led", desc: "The agent who appraises your home is the one who sells it." },
      { title: "Off-market network", desc: "2,400 registered buyers, some who never browse listings." },
    ],
    stats: [{ value: "21", label: "avg. days on market" }, { value: "104%", label: "avg. sale vs. reserve" }, { value: "480+", label: "homes sold locally" }],
    testimonials: [
      { quote: "Three agencies appraised. These were the middle quote — and the ones whose numbers held up.", name: "The Harsons", role: "Sold in 19 days" },
      { quote: "Our agent ran the open homes himself and knew every buyer by name. Old school in the best way.", name: "R. Iyer", role: "Vendor" },
    ],
    contactNote: "Appraisals run Tuesday–Saturday, your place or ours.",
  },
  {
    id: "wellness",
    label: "Wellness Studio",
    audience: "stressed professionals seeking calm",
    feel: "soft, breathing, spa-calm — whitespace as medicine",
    nameParts1: ["Still", "Haven", "Bloom", "Quiet", "Lumen", "Slow"],
    nameParts2: ["Wellness", "Studio", "Sanctuary", "Spa", "Body & Mind", "Yoga House"],
    heroLead: ["First class free", "Open early & late", "Small classes · Book ahead", "Mat, towel, tea — provided"],
    heroHeadline: [
      "An hour that belongs to you",
      "Move slowly. Breathe deliberately. Recover properly.",
      "A quiet room, good teachers, no performance",
      "Wellness without the wellness theatre.",
    ],
    heroSub: [
      "Yoga, breathwork and massage in a small, warm studio. Classes capped at ten, teachers who know your name.",
      "We teach fewer styles properly: slow flow, restorative, and a breathwork hour that resets your week.",
    ],
    ctaPrimary: ["Book your first class", "Start with a free week", "Reserve a mat"],
    ctaSecondary: ["View the timetable", "See class styles", "Meet the teachers"],
    sections: [
      { key: "studio", headline: ["The studio", "The room", "A calm space"], blurb: ["Cork floors, warm light, eleven mats maximum. Phones live in the baskets by the door."] },
      { key: "restore", headline: ["Recovery & bodywork", "Beyond the mat", "Rest is training too"], blurb: ["Remedial massage and guided breathwork for the weeks when movement isn't enough."] },
    ],
    features: [
      { title: "Classes of ten", desc: "Small enough for hands-on adjustment and actual teaching." },
      { title: "Beginner-first", desc: "Every style has a true beginners' hour — no drop-in humiliation." },
      { title: "Remedial massage", desc: "Two treatment rooms, qualified therapists, health-fund rebates." },
      { title: "Tea & lounge", desc: "Stay after class. The kettle's always on and nobody's rushing you." },
    ],
    stats: [{ value: "10", label: "max per class" }, { value: "34", label: "classes weekly" }, { value: "6", label: "certified teachers" }],
    testimonials: [
      { quote: "The restorative class fixed my Sunday scaries. Ten people, candlelight, no phones. Magic.", name: "Hana S.", role: "Member, 2 years" },
      { quote: "First studio where a teacher corrected my form gently. My back has noticed the difference.", name: "Peter D.", role: "Member" },
    ],
    contactNote: "Mats, props and tea provided. Just bring yourself.",
  },
  {
    id: "agency",
    label: "Creative Agency",
    audience: "marketing leads with a budget to spend well",
    feel: "sharp, proof-heavy, strategic — swagger backed by numbers",
    nameParts1: ["Northline", "Fieldnote", "Bright&", "Kite", "Foundry", "Standard"],
    nameParts2: ["Agency", "Studio", "Collective", "Partners", "& Co."],
    heroLead: ["Campaign work that reports", "Independent since 2016", "Strategy-first, media-blind", "Now booking Q3"],
    heroHeadline: [
      "Campaigns that earn their budget",
      "Brand, campaigns and the numbers to prove it worked",
      "An agency that reports like a CFO",
      "We make brands make sense.",
    ],
    heroSub: [
      "Strategy, identity and campaign work for brands that want the work and the receipt — every metric reported monthly.",
      "Small senior team, no account-manager telephone game. You brief the people who make the work.",
    ],
    ctaPrimary: ["Start a conversation", "Book a strategy call", "Request our deck"],
    ctaSecondary: ["See case studies", "Our capabilities", "Read the field notes"],
    sections: [
      { key: "cases", headline: ["Case studies", "The receipts", "Work, with numbers"], blurb: ["Every case study ships with the before, the work and the after — measured, not vibes."] },
      { key: "model", headline: ["How we work", "The model", "Senior hands only"], blurb: ["Pods of three: strategist, designer, media. You meet all three in the first call."] },
    ],
    features: [
      { title: "Brand strategy", desc: "Positioning workshops that end in a one-pager, not a 90-slide deck." },
      { title: "Campaign systems", desc: "Big idea, then every asset it touches — from OOH to organic." },
      { title: "Performance media", desc: "We report on what it cost, what it earned, and what's next." },
      { title: "Monthly reporting", desc: "One page, plain language, sent the same day every month." },
    ],
    stats: [{ value: "$4.2M", label: "client revenue attributed last year" }, { value: "31", label: "brands stewarded" }, { value: "8", label: "seniors, zero juniors" }],
    testimonials: [
      { quote: "Their monthly report is one page. It told us to kill a channel we loved. It was right.", name: "F. Duarte", role: "CMO, DTC brand" },
      { quote: "The rebrand shipped on time and the campaign beat target by 40%. Rare combo.", name: "L. Nguyen", role: "Marketing Director" },
    ],
    contactNote: "We take on four new clients a year. Currently two slots open.",
  },
  {
    id: "barbershop",
    label: "Barbershop",
    audience: "men who found one barber and stay loyal",
    feel: "craft-proud, masculine-warm, no-fuss",
    nameParts1: ["The Sharp", "Kings", "Fade", "Old Town", "Iron", "Blade"],
    nameParts2: ["Barber Co.", "Barbers", "Barber Shop", "Cutting Room", "Barbershop"],
    heroLead: ["Walk-ins & bookings", "Open Tue–Sat · From 8am", "Hot towel finish, always", "Card & cash welcome"],
    heroHeadline: [
      "A proper cut, a proper chair",
      "Barbering the way it should be done",
      "Sharp fades, straight razors, zero small-talk pressure",
      "Come in shaggy. Leave sharp.",
    ],
    heroSub: [
      "Three chairs, four barbers, thirty-minute appointments that actually take thirty minutes.",
      "Cutthroat shaves, honest advice on what suits your head, and a booking system that runs on time.",
    ],
    ctaPrimary: ["Book a chair", "Reserve your slot", "Book a cut"],
    ctaSecondary: ["See the price list", "Meet the barbers", "View the shop"],
    sections: [
      { key: "craft", headline: ["The craft", "What we do", "Chair-side standards"], blurb: ["Every cut starts with a consultation, ends with a hot towel, and grows out clean for four weeks."] },
      { key: "shop", headline: ["The shop", "The room", "Your thirty minutes"], blurb: ["Coffee on the sideboard, cricket on the telly, and absolutely no pressure to chat."] },
    ],
    features: [
      { title: "Skin fades", desc: "Our signature — blended seamless, photographed from every angle." },
      { title: "Straight razor", desc: "Hot towel, proper lather, one careful pass. The full ritual." },
      { title: "Beard work", desc: "Shaped to your jaw, oiled, and taught how to maintain it." },
      { title: "Kids' cuts", desc: "Saturday mornings, patient hands, lollipop diplomacy." },
    ],
    stats: [{ value: "4.9★", label: "from 2,100+ cuts" }, { value: "30min", label: "every appointment" }, { value: "4", label: "barbers, 3 chairs" }],
    testimonials: [
      { quote: "Been to every shop in town. These are the only ones who ask what you actually want.", name: "C. Rivera", role: "Monthly regular" },
      { quote: "Booked online, sat down at 10:00 sharp, walked out at 10:29 looking like a new man.", name: "T. Baldwin", role: "Customer" },
    ],
    contactNote: "Bookings open Monday 9am for the week ahead.",
  },
  {
    id: "landscaping",
    label: "Landscaping & Gardens",
    audience: "homeowners with a yard and a vision",
    feel: "grounded, seasonal, trustworthy — soil under the nails",
    nameParts1: ["Greenline", "Stone &", "Terra", "Hearth &", "Rootbound", "Oakleaf"],
    nameParts2: ["Landscapes", "Gardens", "Landscaping Co.", "Grounds", "Outdoor Spaces"],
    heroLead: ["Free on-site consult", "Fully insured & licensed", "Design–build–maintain", "Booked 6 weeks out"],
    heroHeadline: [
      "Gardens designed to grow into",
      "Outdoor spaces built to last decades, not seasons",
      "From bare dirt to your favourite room",
      "Landscaping with a horticulturist's brain.",
    ],
    heroSub: [
      "Design, construction and year-round care from one crew — so the plan, the build and the upkeep all agree.",
      "We plant for the garden you'll have in five years, not the photo shoot in three weeks.",
    ],
    ctaPrimary: ["Book a site visit", "Get a free consult", "Request a quote"],
    ctaSecondary: ["See our gardens", "The process", "Maintenance plans"],
    sections: [
      { key: "process", headline: ["Design to dirt", "How a garden happens", "Three visits, no surprises"], blurb: ["Consult, concept plan, fixed-price build. You approve on paper before a spade moves."] },
      { key: "care", headline: ["Year-round care", "We come back", "Maintenance plans"], blurb: ["Quarterly visits keep the garden to plan — pruning, feeding, replanting, no contracts."] },
    ],
    features: [
      { title: "Concept design", desc: "A drawn plan with plant names, quantities and a five-year growth view." },
      { title: "Native-first planting", desc: "Plants chosen for your soil and rainfall, not the nursery's sale rack." },
      { title: "Stone & timber", desc: "Retaining, decking and paths built by tradespeople, not tacked on." },
      { title: "Irrigation", desc: "Drip systems on smart timers that cut water use roughly in half." },
    ],
    stats: [{ value: "230+", label: "gardens built" }, { value: "12", label: "years in the region" }, { value: "5yr", label: "workmanship warranty" }],
    testimonials: [
      { quote: "Two years on, the garden looks better than the day they left. The maintenance visits are worth it.", name: "K. O'Sullivan", role: "Homeowner" },
      { quote: "The fixed quote never moved, even when they hit rock. Crew was polite to my dog. 10/10.", name: "M. Tran", role: "Homeowner" },
    ],
    contactNote: "Booked roughly 6 weeks ahead — autumn slots go first.",
  },
];

export function archetypeById(id: string): Archetype {
  return ARCHETYPES.find((a) => a.id === id) ?? ARCHETYPES[0];
}
