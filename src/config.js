// Everything you need to personalise lives here.
export const content = {
  firstName: 'Marwa',
  lastName: 'Khot',

  // Top right of the first screen.
  classOf: 'Class of 2027, CS at UOWD',
};

// The platinum card on the first screen. It tilts toward the cursor with a holographic foil;
// `foil` is 'holo' (rainbow) or 'brushed' (quieter metal). The photo sits in the tile.
export const card = {
  tier: 'Platinum',
  mark: 'MK',
  number: '2027 0525 1104 0007',
  footnote: 'Class of 2027',
  name: 'Marwa Khot',
  brand: 'AI Dev',
  photo: '/marwa.webp',
  foil: 'holo',
  // The card's metal, as four gradient stops; `ink` is the printing, `tile` the photo's duotone
  // (dark, light). The back of the card uses the same colours.
  colors: {
    body: ['#0f1f45', '#060c22', '#16295a', '#03071a'],
    ink: '#dce4f4',
    tile: ['#0a1430', '#d8e0f0'],
  },
};

// Experience: each job is one glass layer above the card. `logo` and `gallery` are optional.
export const journey = {
  heading: 'What I do and where I\u2019ve been',

  // Newest first. Add `href` to a company or project to make it a link.
  experience: [
    {
      dates: 'May 2026 – Present',
      company: 'StudentVerse',
      // The card's colour: `color` for one colour, or `gradient` for several, left to right.
      gradient: ['#3f1a85', '#3f1a85'], // solid deep purple
      logo: 'logos/studentverse.webp',
      current: true,
      role: 'AI Developer',
      skills: ['Backend Development', 'RAG', 'Semantic Search', 'LLM Integration', 'AI Chatbots', 'iOS & Android Backends'],
      built: [
        'Built 3 AI modes for SV Orbit (Planner, Chat and Find), powered by semantic search and a RAG pipeline.',
        'Building the backend for Baitna, the app’s student accommodation finder, serving the iOS and Android apps, operations and housing partners.',
      ],
      gallery: [
        { src: 'shots/svorbit-splash.webp', alt: 'StudentVerse app splash screen' },
        { src: 'shots/svorbit-home.webp', alt: 'StudentVerse app home screen' },
        { src: 'shots/svorbit-chat.webp', alt: 'SV Orbit chat screen answering a request for shoe deals' },
      ],
    },
    {
      dates: 'May 2026 – Present',
      company: 'UOWD Tech Club',
      color: '#0b1d4a', // the colour of this job's card
      logo: 'logos/uowd-tech-club.webp',
      current: true,
      role: 'Research Trainee',
      skills: ['SNNs', 'CNNs', 'Pipeline Architecture', 'Model Benchmarking', 'Prosthetic Applications', 'Neural Interfaces'],
      description: 'Currently researching Spiking Neural Network and CNN architectures for prosthetics applications.',
    },
    {
      dates: 'Oct 2025 – Apr 2026',
      company: 'Alamar Foods (Dunkin Egypt)',
      color: '#e30000', // the colour of this job's card
      logo: 'logos/alamar.webp',
      logoEdge: false, // no white edge round this logo
      role: 'Data Science Intern',
      skills: ['AWS Redshift', 'SQL', 'Data Pipelines', 'KPI Dashboards', 'Revenue Reporting', 'Sales Analytics'],
      built: [
        'Processed 2M+ rows of Dunkin Egypt data through pipelines that unify multiple sources in AWS Redshift.',
        'Built KPI dashboards and presentations tracking sales, customer acquisition and revenue trends.',
      ],
    },
    {
      dates: 'Oct 2025 · 1 month',
      company: 'Dreamloop.ai',
      gradient: ['#000000', '#000000'], // solid black
      logo: 'logos/dreamloop.webp',
      role: 'AI Product & Solution Ambassador',
      skills: ['Live Product Demos', 'Enterprise Clients', 'Client Acquisition', 'Business Development', 'AI Product Communication', 'GITEX 2025'],
      built: [
        'Pitched to 60+ enterprise leaders, including CEOs and founders, through live product demos at GITEX Expand North Star 2025.',
        'Turned booth conversations into new client relationships for Dreamloop.ai.',
      ],
      gallery: [
        { src: 'shots/gitex-booth.webp', alt: 'The Dreamloop.ai booth team at GITEX 2025', wide: true },
        { src: 'shots/gitex-demo.webp', alt: 'Talking with visitors at the Dreamloop.ai booth at GITEX 2025', wide: true },
      ],
    },
  ],
};

// Hackathons and events, as frosted glass cards in a row that steps sideways as you scroll. Up to
// two `images` are stacked on the left of each; `headline` and `color` are described on the first
// event.
export const eventsSection = {
  heading: 'Hackathons & events',
};

export const events = [
  {
    title: 'Future Mindz Fest',
    headline: '1st Place at Future Mindz Fest', // the card's big title
    color: '#4b1d8f', // this event's accent: its placing pill and link hover
    award: '1st Place',
    date: '2026',
    place: 'Dubai, UAE',
    description: 'Took first place and an AED 10,000 prize with Inventra, an agentic AI platform that spots stockout and overstock risks across warehouses before they cost money, and lets businesses test decisions in its Scenario Lab.',
    links: [
      { label: 'Inventra', href: 'https://lnkd.in/dxrXbs8T' },
      { label: 'Pitch Deck', href: 'https://lnkd.in/djTBxzX5' },
    ],
    images: ['events/futuremindz-1.webp', 'events/futuremindz-2.webp'],
  },
  {
    title: 'Digi-Health Lab',
    headline: '3rd Place at the Digi-Health Lab Symposium',
    color: '#0e5a4a',
    award: '3rd Place',
    date: '2026',
    place: 'Middlesex University, Dubai',
    description: 'Chosen from 140 applicants to present ILMA, a female-centric safety score for skincare in the GCC, and voted into third place by the audience.',
    links: [],
    images: ['events/digihealth-1.webp', 'events/digihealth-2.webp'],
  },
  {
    title: 'UD Pitch Competition',
    headline: 'Finalist at the University of Dubai Pitch Competition',
    color: '#8a1c3b',
    award: 'Finalist',
    date: '2025',
    place: 'University of Dubai, UAE',
    description: 'Made the final 12 out of 77 teams with ILMA’s first public pitch: a femtech app that shows how well skincare and pharmaceutical products were researched for female biology.',
    links: [],
    images: ['events/udpitch-1.webp', 'events/udpitch-2.webp'],
  },
  {
    title: 'Space42 Bounty',
    headline: '3rd Place at the Space42 Bounty Challenge',
    color: '#1f3f8f',
    award: '3rd Place',
    date: '2025',
    place: 'University of Birmingham Dubai',
    description: 'Won third place and AED 2,000 with Orion, an AI talent and onboarding partner that matches CVs to roles, runs behavioral assessments, and answers questions through a LangChain RAG chatbot.',
    links: [{ label: 'Orion GitHub', href: 'https://github.com/Marwakhot/Orion' }],
    images: ['events/space42-1.webp'],
  },
];

// Projects: a board of pinned cards. Each card shows `title` and `line`; clicking it opens the
// summary, problem and solution. `label` and `color` (blue, orange, pink or black) are the
// field's filter pill in the sentence above the board.
// Projects grow out of the card's chip as a circuit: one trace per field, then one per project.
export const projectsSection = {
  heading: 'What I’ve built',
  hint: 'Pick an area to look inside.',
  lead: 'Things I’ve built across',
};

export const projectFields = [
  {
    name: 'AI Systems',
    label: 'AI systems',
    color: 'blue',
    projects: [
      {
        title: 'Orion',
        line: 'AI-powered hiring, from CV to interview.',
        summary: 'AI-powered HR platform with CV parsing, semantic job matching, and behavioral assessment.',
        problem: ['Screening CVs by hand is slow and open to bias', 'Strong candidates get missed', 'Soft skills are rarely assessed in a structured way'],
        solution: ['Matches CVs against must-have job skills instantly', 'Runs a behavioral AI assessment by voice or text', 'Ranks candidates on one HR dashboard', 'RAG chatbot answers questions from company documents', 'Keeps rejected candidates in a Talent Orbit for future roles'],
        tags: ['FastAPI', 'Supabase', 'Groq LLM', 'FAISS'],
        href: 'https://github.com/Marwakhot/Orion',
      },
      {
        title: 'ReelReal',
        line: 'Deepfake video detection you can see.',
        summary: 'Deepfake video detection with frame-by-frame analysis and Grad-CAM heatmaps.',
        problem: ['Deepfake videos are increasingly convincing', 'Most people have no reliable way to check a clip'],
        solution: ['Flags suspicious moments on a frame-by-frame timeline', 'Grad-CAM heatmaps show where manipulation was detected', 'Shows the measurements behind every score', 'Works as a website and a Chrome extension'],
        tags: ['Python', 'Deep Learning', 'Grad-CAM'],
        href: 'https://github.com/Marwakhot/reelreal',
      },
      {
        title: 'Inventra',
        line: 'Agentic AI for inventory planning.',
        summary: 'Agentic AI inventory planning platform with scenario simulation. 1st Place, Future Mindz Fest.',
        problem: ['Warning signs across warehouses are easy to miss', 'Stockouts and overstock are often found too late'],
        solution: ['AI agents monitor data and investigate issues on their own', 'Flags risks before they escalate', 'Scenario Lab tests decisions before they are made', 'The final call stays with a person'],
        tags: ['Python', 'Agentic AI', 'Scenario Sim'],
        href: 'https://github.com/Marwakhot/INVENTRA_TROJAN',
      },
      {
        title: 'BrainBrew',
        line: 'Turns PDFs into active learning.',
        summary: 'AI platform turning passive PDF reading into active learning with adaptive questions.',
        problem: ['Students read PDFs passively', 'Understanding stays shallow and retention is poor'],
        solution: ['Generates thought-provoking questions from uploaded documents', 'Four difficulty levels adapt to performance in real time'],
        tags: ['TypeScript', 'AI', 'EdTech'],
        href: 'https://github.com/Marwakhot/BrainBrew',
      },
    ],
  },
  {
    name: 'Data Science & ML',
    label: 'data science & ML',
    color: 'orange',
    projects: [
      {
        title: 'Bug Triage NLP',
        line: 'Sorts and routes bug reports automatically.',
        summary: 'End-to-end ML pipeline automating software bug classification using NLP.',
        problem: ['Bug reports pile up in large software teams', 'Sorting and routing them by hand is slow and error-prone'],
        solution: ['Classifies bug reports automatically with NLP', 'Routes each one to the right team', 'Flask API for real-time predictions', 'Streamlit dashboard for monitoring', 'Packaged with Docker for easy deployment'],
        tags: ['Python', 'NLP', 'Flask', 'Docker'],
        href: 'https://github.com/Marwakhot/bug-triage-nlp-api',
      },
      {
        title: 'ML Lens',
        line: 'Finds the best ML model for any CSV.',
        summary: 'Upload a CSV and sweep classical ML models across conditions to find the best config.',
        problem: ['Choosing a model means writing a lot of boilerplate', 'Experiments are run and compared one at a time'],
        solution: ['Upload a CSV to get started', 'Sweeps classical ML models across different conditions', 'Compares the winning setups visually in one interface'],
        tags: ['TypeScript', 'ML', 'Data Visualization'],
        href: 'https://github.com/Marwakhot/Ml_lens',
      },
    ],
  },
  {
    name: 'Full-Stack Apps',
    label: 'full-stack apps',
    color: 'pink',
    projects: [
      {
        title: 'Haven',
        line: 'Household finances in one dashboard.',
        summary: 'Household finance dashboard with live market prices and portfolio tracking.',
        problem: ['Household money is scattered across spreadsheets', 'No single view links spending, debts and investments'],
        solution: ['One real-time dashboard for bills, debts and subscriptions', 'Live investment values with USD/AED conversion', '12-month portfolio charts and net worth history', 'Buy, hold and sell signals', 'Secured with Supabase Row Level Security'],
        tags: ['Supabase', 'Finnhub API', 'Twelve Data'],
        href: 'https://github.com/Marwakhot/HAVEN',
      },
      {
        title: 'Bouncer',
        line: 'Blocks distracting tabs, fully offline.',
        summary: 'Chrome extension that blocks distracting tabs using local title classification.',
        problem: ['Focus apps take one click to disable', 'Many send browsing data to external servers'],
        solution: ['Locked focus timer closes distracting tabs', 'Classifies tab titles 100% locally, with no external API calls', 'Emergency override sits behind a memory game', 'Dashboard for session analytics'],
        tags: ['JavaScript', 'Chrome MV3', 'Local ML'],
        href: 'https://github.com/Marwakhot/chrome_extension',
      },
    ],
  },
  {
    name: 'Research',
    label: 'research',
    color: 'black',
    projects: [
      {
        title: 'ILMA',
        line: 'Skincare safety scores for female biology.',
        summary: 'Femtech app and safety score showing how well products were researched for female biology.',
        problem: ['Skincare and pharmaceutical products are rarely explained around female biology', 'Funders cannot easily see where the research gaps are'],
        solution: ['Lets women in the GCC scan skincare and pharmaceutical products', 'Rates ingredient safety, hormonal relevance, transparency and evidence across skin tones', 'Dashboard exposes research gaps and shows funders where they matter most', '3rd Place at the Digi-Health Lab Symposium'],
        tags: ['Femtech', 'Health Informatics', 'Research'],
      },
      {
        title: 'Palm2Soil',
        line: 'Satellite-guided fixes for salty soil.',
        summary: 'Satellite-guided salinity remediation for precision agriculture. Space Hackathon 2026.',
        problem: ['Soil salinity damages farmland across arid regions', 'Limited budgets need evidence on which parcels to inspect first'],
        solution: ['Processes hyperspectral satellite data', 'Produces a ranked inspection list for farm blocks', 'Exports CSV tables and GeoJSON parcel maps', 'Attaches data-quality figures to every row', 'Built for the Arab Youth Space Hackathon 2026'],
        tags: ['Python', 'Satellite Data', 'GIS'],
        href: 'https://github.com/Marwakhot/palm2soil',
      },
    ],
  },
];

// Contact information
export const contact = {
  phone: '+971 58 588 5323',
  phoneHref: 'tel:+971585885323',
  email: 'marwakhot007@gmail.com',
  github: 'https://github.com/Marwakhot',
  linkedin: 'https://www.linkedin.com/in/marwa-khot-238482353/',
};
