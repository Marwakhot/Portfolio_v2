// Everything you need to personalise lives here.
export const content = {
  // The opening message, one line at a time, before the boarding gate.
  welcome: ['Welcome to Marwa Khot\u2019s portfolio.', 'Boarding is now open.'],

  // Either side of the window, once the shade has lifted.
  cruising: ['We\u2019ve reached cruising altitude.', 'Feel free to explore at your own pace.'],

  firstName: 'Marwa',
  lastName: 'Khot',

  // Each array entry is one line of text.
  intro: ['AI Developer & Researcher', 'building intelligent systems.'],
  education: ['AI Developer @ Studentverse,', 'Research Trainee @ UOWD Tech Club'],
  moreHref: 'https://www.linkedin.com/in/marwa-khot-238482353/', // where the [more] link goes

  // Single-sentence versions shown on phones.
  lead: 'AI Developer & Researcher building intelligent systems.',
  meta: 'AI Developer @ Studentverse \u00b7 Research Trainee @ UOWD Tech Club.',
};

export const card = {
  // Set to an image path (e.g. '/my-card.png', put the file in /public) to use
  // your own artwork instead of the generated card. Best size: 900 x 1320.
  artworkUrl: null,

  // Shown in place of the name on the first card. Once the card follows the
  // timeline, the job cards go back to showing the name.
  photo: '/marwa.png',

  currentlyLabel: 'Currently',
  currently: 'AI Developer @ Studentverse',
  previouslyLabel: 'Previously at',
  // Row one is one wide pill, row two is two pills joined by "&".
  pills: [
    { label: 'Alamar Foods (Dunkin)', color: '#e30000' },
    { label: 'Dreamloop.ai', color: '#3d0fa8' },
    { label: 'UOWD Tech Club', color: '#000000' },
  ],
  firstNameColor: '#0a0a0a',
  lastNameColor: '#0a28ff',
};

// The boarding pass you swipe through the reader. Your name comes from `content`.
export const boardingPass = {
  airline: 'MARWA AIR',
  slogan: 'SHAPING THE FUTURE',
  role: 'AI DEVELOPER',
  flight: 'MK2026',
  date: '5 NOV 2026',
  from: { code: 'UAE', city: 'DUBAI' },
  to: { code: 'NXT', city: 'THE FUTURE' },
  gate: 'A12',
  boarding: '08:45',
  seat: '18A',
  seatType: 'WINDOW',
  travelClass: 'J',
  classType: 'BUSINESS',
  sequence: '0029',
};

// The experience journey shown after the swipe.
export const journey = {
  tagline: 'AI Developer & Researcher',
  summary: 'Building AI-powered products and researching neural interfaces.\nPassionate about intelligent systems that solve real-world problems.',
  location: 'Dubai, UAE',
  latitude: { value: 25.2048, hemisphere: 'N' },
  longitude: { value: 55.2708, hemisphere: 'E' },
  timezone: 'GMT+4',
  planLabel: 'Flight plan',
  heading: 'What I do and where I\u2019ve been',

  // Newest first. Add `href` to a company or project to make it a link.
  experience: [
    {
      year: '2026',
      route: 'SV>NXT',
      company: 'Studentverse',
      cardColor: '#0a28ff',
      current: true,
      role: 'AI Developer',
      description: 'Building the backend for SV Orbit, a multi-mode AI chatbot platform. Developed the semantic search system and backend for various AI-driven features.',
      projects: [
        { title: 'SV Orbit Backend', description: 'Multi-mode AI chatbot platform with semantic search and AI-driven features' },
      ],
    },
    {
      year: '2026',
      route: 'UOWD',
      company: 'UOWD Tech Club',
      cardColor: '#000000',
      current: true,
      role: 'Research Trainee',
      description: 'Researching Spiking Neural Networks (SNNs) and their applications in prosthetics at UOWD\u2019s Tech Club research department.',
      projects: [
        { title: 'SNN Prosthetics Research', description: 'Exploring spiking neural networks for prosthetic control and neural interfaces' },
      ],
    },
    {
      year: '2025',
      route: 'DXB>CAI',
      company: 'Alamar Foods (Dunkin Egypt)',
      cardColor: '#e30000',
      role: 'Data Science Intern',
      description: 'Worked with AWS Redshift to create data pipelines processing over 2 million rows. Built KPI dashboards tracking sales, customer acquisition, and revenue trends.',
      projects: [
        { title: 'Data Pipelines', description: 'AWS Redshift pipelines processing 2M+ rows of operational data' },
        { title: 'KPI Dashboards', description: 'Sales pipeline, customer acquisition, and revenue trend dashboards and reports' },
      ],
    },
    {
      year: '2025',
      route: 'DXB',
      company: 'Dreamloop.ai',
      cardColor: '#3d0fa8',
      role: 'AI Product & Solution Ambassador',
      description: 'Represented Dreamloop.ai at GITEX 2025, engaging with 60+ enterprise clients including CEOs and founders, delivering live demos and driving client acquisition.',
      projects: [
        { title: 'GITEX 2025', description: 'Enterprise client engagement, live product demos, and business development at GITEX' },
      ],
    },
  ],
};

// Hackathons and events. Each one gets a crumpling white card on the left, and these
// details on the right. `result` and `links` are optional.
//
// `image` is the photo on the card: put the file in /public and use a path like
// 'events/hackathon.jpg', or a list of paths to stack several photos. Landscape or slightly tall photos fit best. Leave it as null
// for a blank white card.
export const eventsSection = {
  heading: 'Hackathons and events',
};

export const events = [
  {
    title: '1st Place at Future Mindz Fest',
    date: '2026',
    place: 'Dubai, UAE',
    description: 'Took first place and an AED 10,000 prize with Inventra, an agentic AI platform that watches inventory across warehouses, investigates warning signs on its own, and flags stockout and overstock risks before they cost money. Its Scenario Lab lets businesses test a decision before committing to it and see the ripple effects, while the final call stays with a person. Judged at an event organized by Dubai CommerCity and Wellington Campus, with sponsors Samsung Gulf, eBay, Tradeling and Tencent Cloud.',
    links: [
      { label: 'Inventra', href: 'https://lnkd.in/dxrXbs8T' },
      { label: 'Pitch Deck', href: 'https://lnkd.in/djTBxzX5' },
    ],
    image: ['events/futuremindz-1.png', 'events/futuremindz-2.jpg'],
  },
  {
    title: '3rd Place at the Digi-Health Lab Symposium',
    date: '2026',
    place: 'Middlesex University, Dubai',
    description: 'Chosen from 140 applicants to present research at the Health Informatics & Smart Diagnostics showcase, and voted into third place by the audience. The project, ILMA, introduces a female-centric safety score for skincare in the GCC, rating products on ingredient safety, hormonal relevance, transparency, and evidence across skin tones, so women get answers built around their own biology.',
    links: [],
    image: ['events/digihealth-1.png', 'events/digihealth-2.png'],
  },
  {
    title: 'Finalist at the University of Dubai Pitch Competition',
    date: '2025',
    place: 'University of Dubai, UAE',
    description: 'Made the final 12 out of 77 teams with ILMA’s first public pitch. ILMA is a femtech app that lets women in the GCC scan skincare and pharmaceutical products to see how well they were researched for female biology, backed by a dashboard that exposes research gaps and points funders to where they matter most.',
    links: [],
    image: ['events/udpitch-1.png', 'events/udpitch-2.png'],
  },
  {
    title: '3rd Place at the Space42 Bounty Challenge',
    date: '2025',
    place: 'University of Birmingham Dubai',
    description: 'Won third place and AED 2,000 with ORION, an AI talent and onboarding partner built end to end in the challenge. It matches CVs against a role’s must-have skills, runs a behavioral AI assessment, ranks candidates on one HR dashboard, answers questions from company documents through a LangChain RAG chatbot, and keeps strong runners-up in a Talent Orbit that re-ranks them for future roles. Hosted by GDG on Campus at the University of Birmingham Dubai.',
    links: [],
    image: 'events/space42-1.png',
  },
];

// Projects: one hanging card per field. Opening a card shows every project in that field.
export const projectsSection = {
  heading: 'Projects I\u2019ve worked on',
  intro: 'Open a card to see every project in that field.',
};

export const projectFields = [
  {
    name: 'AI Systems',
    projects: [
      {
        title: 'Orion',
        summary: 'AI-powered HR platform with CV parsing, semantic job matching, and behavioral assessment.',
        about: 'Problem: Hiring is slow and biased: HR teams manually screen hundreds of CVs, miss strong candidates, and lack structured ways to assess soft skills alongside technical fit.\n\nSolution: Orion automates the full pipeline: CV upload with instant eligibility matching against non-negotiable job skills, behavioral AI assessment through voice or text, and a combined scoring system that ranks candidates directly on the HR dashboard. A RAG-powered chatbot answers candidate questions from company documents instantly, and rejected candidates enter a Talent Orbit for continuous re-ranking in future roles.',
        tags: ['FastAPI', 'Supabase', 'Groq LLM', 'FAISS'],
        href: 'https://github.com/Marwakhot/Orion',
      },
      {
        title: 'ReelReal',
        summary: 'Deepfake video detection with frame-by-frame analysis and Grad-CAM heatmaps.',
        about: 'Problem: Deepfake videos are increasingly convincing, and most people have no reliable way to verify whether a clip is real, so they just squint at it and guess.\n\nSolution: ReelReal lets you upload a video and get a frame-by-frame timeline of flagged moments, with Grad-CAM heatmaps highlighting exactly where the model detected manipulation and the measurements behind every score. A website and Chrome extension share one Python detection server, giving moderators, journalists, and reviewers a defensible second opinion in under a minute.',
        tags: ['Python', 'Deep Learning', 'Grad-CAM'],
        href: 'https://github.com/Marwakhot/reelreal',
      },
      {
        title: 'Inventra',
        summary: 'Agentic AI inventory planning platform with scenario simulation. 1st Place, Future Mindz Fest.',
        about: 'Problem: Managing inventory across multiple warehouses means it\u2019s easy to miss connections between supply chain signals until the damage (stockouts, overstock, lost revenue) is already done.\n\nSolution: Inventra takes a fully agentic approach, proactively monitoring data, investigating potential issues, and identifying risks before they escalate. The Scenario Lab lets businesses simulate decisions before making them, explore different outcomes, and understand the ripple effects of each choice, all while keeping the final decision in human hands. Won 1st Place at Future Mindz Fest.',
        tags: ['Python', 'Agentic AI', 'Scenario Sim'],
        href: 'https://github.com/Marwakhot/INVENTRA_TROJAN',
      },
      {
        title: 'BrainBrew',
        summary: 'AI platform turning passive PDF reading into active learning with adaptive questions.',
        about: 'Problem: Students passively read through PDFs and lecture notes without truly engaging with the material, leading to shallow understanding and poor retention.\n\nSolution: BrainBrew uses AI to generate thought-provoking questions from uploaded documents, forcing students to think critically. Four adaptive difficulty levels adjust in real time based on the student\u2019s performance, ensuring they\u2019re always challenged at the right level.',
        tags: ['TypeScript', 'AI', 'EdTech'],
        href: 'https://github.com/Marwakhot/BrainBrew',
      },
    ],
  },
  {
    name: 'Data Science & ML',
    projects: [
      {
        title: 'Bug Triage NLP',
        summary: 'End-to-end ML pipeline automating software bug classification using NLP.',
        about: 'Problem: In large software teams, incoming bug reports pile up and must be manually read, categorized, and routed to the right team, a slow, error-prone bottleneck that delays fixes.\n\nSolution: An end-to-end NLP pipeline that automatically classifies bug reports and assigns them to the correct team. Features a Flask API for real-time predictions, a Streamlit dashboard for visualization and monitoring, and Docker containerization for consistent deployment anywhere.',
        tags: ['Python', 'NLP', 'Flask', 'Docker'],
        href: 'https://github.com/Marwakhot/bug-triage-nlp-api',
      },
      {
        title: 'ML Lens',
        summary: 'Upload a CSV and sweep classical ML models across conditions to find the best config.',
        about: 'Problem: Choosing the right ML model and hyperparameters for a dataset usually means writing boilerplate code, running experiments one at a time, and manually comparing results in notebooks.\n\nSolution: ML Lens lets you upload a CSV, automatically sweep multiple classical ML models across different experimental conditions, and visually compare which model/configuration wins, all from a single web interface. Built for rapid experimentation without repetitive scripting.',
        tags: ['TypeScript', 'ML', 'Data Visualization'],
        href: 'https://github.com/Marwakhot/Ml_lens',
      },
    ],
  },
  {
    name: 'Full-Stack Apps',
    projects: [
      {
        title: 'Haven',
        summary: 'Household finance dashboard with live market prices and portfolio tracking.',
        about: 'Problem: Families track spending in spreadsheets but have no single view connecting daily expenses, bills, debts, subscriptions, and investment portfolios with live market data.\n\nSolution: Haven pulls everything into one real-time dashboard built on Supabase with Row Level Security. Investment values update live via Finnhub with USD/AED conversion, 12-month portfolio charts come from Twelve Data, and buy/hold/sell signals give a quick market pulse, alongside net worth history and month-over-month comparisons.',
        tags: ['Supabase', 'Finnhub API', 'Twelve Data'],
        href: 'https://github.com/Marwakhot/HAVEN',
      },
      {
        title: 'Bouncer',
        summary: 'Chrome extension that blocks distracting tabs using local title classification.',
        about: 'Problem: Focus apps are easy to bypass: one click to disable, and you\u2019re back on social media. Most also send your browsing data to external servers for classification.\n\nSolution: Bouncer runs a locked-down focus timer that automatically closes distracting tabs using 100% local title classification with zero external API calls. The emergency override is gated behind a memory game, making impulsive disabling just hard enough to break the habit loop. Includes a dashboard for session analytics.',
        tags: ['JavaScript', 'Chrome MV3', 'Local ML'],
        href: 'https://github.com/Marwakhot/chrome_extension',
      },
    ],
  },
  {
    name: 'Research & Robotics',
    projects: [
      {
        title: 'Palm2Soil',
        summary: 'Satellite-guided salinity remediation for precision agriculture. Space Hackathon 2026.',
        about: 'Problem: Soil salinity degrades farmland across arid regions, but authorities with limited budgets have no evidence-based way to prioritize which parcels to inspect and remediate first.\n\nSolution: Palm2Soil processes hyperspectral satellite data to generate a ranked inspection priority list for farm blocks, so decision-makers know exactly where to look first. Outputs CSV tables and GeoJSON parcel maps with data-quality figures attached to every row. Built for the Arab Youth Space Hackathon 2026.',
        tags: ['Python', 'Satellite Data', 'GIS'],
        href: 'https://github.com/Marwakhot/palm2soil',
      },
      {
        title: 'AI Risk Management Audit',
        summary: 'NIST AI RMF fairness and security audit of an AI loan approval system.',
        about: 'Problem: AI systems making financial decisions can silently discriminate against protected groups and remain vulnerable to adversarial manipulation, with no standardized way to catch these issues before deployment.\n\nSolution: A structured audit using the NIST AI Risk Management Framework (RMF) 1.0 that tests an AI loan approval model for gender and age bias using the 80% Rule / Disparate Impact Ratio, probes for adversarial attack vectors in input fields, and evaluates regulatory compliance, producing a clear, actionable risk report.',
        tags: ['Python', 'NIST RMF', 'Bias Testing'],
        href: 'https://github.com/Marwakhot/AI-Risk-Management-Audit',
      },
      {
        title: 'Gazebo Robot Navigation',
        summary: 'Autonomous navigation comparing Fuzzy Logic, Behavior Trees, and Q-Learning.',
        about: 'Problem: Autonomous robots need to navigate obstacle-filled environments reliably, but different AI approaches have different trade-offs in reactivity, structure, and learning ability, and it\u2019s unclear which fits best without head-to-head comparison.\n\nSolution: Implements and benchmarks three approaches in a 10m \u00d7 10m Gazebo simulation: Fuzzy Logic for continuous reactive control, Behavior Trees for structured hierarchical decisions, and Q-Learning for experience-based obstacle avoidance. Each method is evaluated on the same arena for a direct comparison.',
        tags: ['Python', 'ROS', 'Gazebo', 'Q-Learning'],
        href: 'https://github.com/Marwakhot/Gazebo_robot_navigation',
      },
    ],
  },
];

// Contact information
export const contact = {
  phone: '0585885323',
  email: 'marwakhot007@gmail.com',
  github: 'https://github.com/Marwakhot',
  linkedin: 'https://www.linkedin.com/in/marwa-khot-238482353/',
};
