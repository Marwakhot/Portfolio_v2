// Everything you need to personalise lives here.
export const content = {
  // The opening message, one line at a time, before the boarding gate.
  welcome: ['Welcome to Marwa Khot\u2019s portfolio.', 'Boarding is now open.'],

  // Either side of the window, once the shade has lifted.
  cruising: ['We\u2019ve reached cruising altitude.', 'Feel free to explore at your own pace.'],

  firstName: 'Marwa',
  lastName: 'Khot',

  // Top left and top right of the first screen.
  line: 'I take AI ideas off the whiteboard and turn them into things that actually work and make an impact.',
  classOf: 'Class of 2027, CS at UOWD',
};

export const card = {
  // Set to an image path (e.g. '/my-card.png', put the file in /public) to use
  // your own artwork instead of the generated card. Best size: 900 x 1320.
  artworkUrl: null,

  photo: '/marwa.png', // fills the space between the name and the boxes on the first card
  // Printed under the photo on the first card.
  lines: [
    { text: 'AI Developer at', pill: 'StudentVerse', color: '#0a28ff' },
    { text: 'CS Student at', pill: 'University of Wollongong in Dubai', color: '#c8102e' },
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
      dates: 'May 2026 – Present',
      company: 'StudentVerse',
      logo: 'logos/studentverse.png',
      cardColor: '#0a28ff',
      current: true,
      role: 'AI Developer',
      skills: ['Backend Development', 'RAG', 'Semantic Search', 'LLM Integration', 'AI Chatbots', 'iOS & Android Backends'],
      built: [
        'Built 3 AI modes for SV Orbit (Planner, Chat and Find), powered by semantic search and a RAG pipeline.',
        'Building the backend for Baitna, the app’s student accommodation finder, serving the iOS and Android apps, operations and housing partners.',
      ],
      gallery: [
        { src: 'shots/svorbit-splash.jpg', alt: 'StudentVerse app splash screen' },
        { src: 'shots/svorbit-home.jpg', alt: 'StudentVerse app home screen' },
        { src: 'shots/svorbit-chat.jpg', alt: 'SV Orbit chat screen answering a request for shoe deals' },
      ],
    },
    {
      dates: 'May 2026 – Present',
      company: 'UOWD Tech Club',
      logo: 'logos/uowd-tech-club.png',
      cardColor: '#000000',
      current: true,
      role: 'Research Trainee',
      skills: ['SNNs', 'CNNs', 'Pipeline Architecture', 'Model Benchmarking', 'Prosthetic Applications', 'Neural Interfaces'],
      description: 'Currently researching Spiking Neural Network and CNN architectures for prosthetics applications.',
    },
    {
      dates: 'Graduating Jul 2027',
      company: 'University of Wollongong in Dubai',
      logo: 'logos/uowd.png',
      cardColor: '#0b2545',
      current: true,
      role: 'CS Student',
      skills: ['Computer Science', 'Big Data', 'Artificial Intelligence'],
      description: 'Studying Computer Science, majoring in Big Data and AI.',
    },
    {
      dates: 'Oct 2025 – Apr 2026',
      company: 'Alamar Foods (Dunkin Egypt)',
      logo: 'logos/alamar.png',
      cardColor: '#e30000',
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
      logo: 'logos/dreamloop.png',
      cardColor: '#3d0fa8',
      role: 'AI Product & Solution Ambassador',
      skills: ['Live Product Demos', 'Enterprise Clients', 'Client Acquisition', 'Business Development', 'AI Product Communication', 'GITEX 2025'],
      built: [
        'Pitched to 60+ enterprise leaders, including CEOs and founders, through live product demos at GITEX Expand North Star 2025.',
        'Turned booth conversations into new client relationships for Dreamloop.ai.',
      ],
      gallery: [
        { src: 'shots/gitex-booth.png', alt: 'The Dreamloop.ai booth team at GITEX 2025', wide: true },
        { src: 'shots/gitex-demo.png', alt: 'Talking with visitors at the Dreamloop.ai booth at GITEX 2025', wide: true },
      ],
    },
  ],
};

// Hackathons and events. Each one is a postcard in the sideways carousel. `links` is optional,
// `stamp` is the postage stamp, and `postmark` is the words around the round ink mark.
//
// `image` is the photo on the card: put the file in /public and use a path like
// 'events/hackathon.jpg', or a list of two paths to show two photos. Landscape photos fit best.
export const eventsSection = {
  heading: 'A few stops along the way',
};

export const events = [
  {
    title: '1st Place at Future Mindz Fest',
    date: '2026',
    place: 'Dubai, UAE',
    stamp: { top: '1st', bottom: 'Place', color: '#f3dc96' },
    postmark: 'DUBAI UAE',
    description: 'Took first place and an AED 10,000 prize with Inventra, an agentic AI platform that spots stockout and overstock risks across warehouses before they cost money, and lets businesses test decisions in its Scenario Lab.',
    links: [
      { label: 'Inventra', href: 'https://lnkd.in/dxrXbs8T' },
      { label: 'Pitch Deck', href: 'https://lnkd.in/djTBxzX5' },
    ],
    image: ['events/futuremindz-1.jpg', 'events/futuremindz-2.png'],
  },
  {
    title: '3rd Place at the Digi-Health Lab Symposium',
    date: '2026',
    place: 'Middlesex University, Dubai',
    stamp: { top: '3rd', bottom: 'Place', color: '#c9b9ef' },
    postmark: 'DUBAI UAE',
    description: 'Chosen from 140 applicants to present ILMA, a female-centric safety score for skincare in the GCC, and voted into third place by the audience.',
    links: [],
    image: ['events/digihealth-1.png', 'events/digihealth-2.png'],
  },
  {
    title: 'Finalist at the University of Dubai Pitch Competition',
    date: '2025',
    place: 'University of Dubai, UAE',
    stamp: { top: 'Top 12', bottom: 'Finalist', color: '#a9dcb8' },
    postmark: 'DUBAI UAE',
    description: 'Made the final 12 out of 77 teams with ILMA’s first public pitch: a femtech app that shows how well skincare and pharmaceutical products were researched for female biology.',
    links: [],
    image: ['events/udpitch-1.png', 'events/udpitch-2.png'],
  },
  {
    title: '3rd Place at the Space42 Bounty Challenge',
    date: '2025',
    place: 'University of Birmingham Dubai',
    stamp: { top: '3rd', bottom: 'Place', color: '#f5bfa8' },
    postmark: 'DUBAI UAE',
    description: 'Won third place and AED 2,000 with Orion, an AI talent and onboarding partner that matches CVs to roles, runs behavioral assessments, and answers questions through a LangChain RAG chatbot.',
    links: [{ label: 'Orion GitHub', href: 'https://github.com/Marwakhot/Orion' }],
    image: 'events/space42-1.png',
  },
];

// Projects: one hanging card per field. Opening a card shows every project in that field.
export const projectsSection = {
  heading: 'What I’ve built',
  intro: 'Claim a ticket to see every project in that field.',
};

export const projectFields = [
  {
    name: 'AI Systems',
    projects: [
      {
        title: 'Orion',
        summary: 'AI-powered HR platform with CV parsing, semantic job matching, and behavioral assessment.',
        problem: ['Screening CVs by hand is slow and open to bias', 'Strong candidates get missed', 'Soft skills are rarely assessed in a structured way'],
        solution: ['Matches CVs against must-have job skills instantly', 'Runs a behavioral AI assessment by voice or text', 'Ranks candidates on one HR dashboard', 'RAG chatbot answers questions from company documents', 'Keeps rejected candidates in a Talent Orbit for future roles'],
        tags: ['FastAPI', 'Supabase', 'Groq LLM', 'FAISS'],
        href: 'https://github.com/Marwakhot/Orion',
      },
      {
        title: 'ReelReal',
        summary: 'Deepfake video detection with frame-by-frame analysis and Grad-CAM heatmaps.',
        problem: ['Deepfake videos are increasingly convincing', 'Most people have no reliable way to check a clip'],
        solution: ['Flags suspicious moments on a frame-by-frame timeline', 'Grad-CAM heatmaps show where manipulation was detected', 'Shows the measurements behind every score', 'Works as a website and a Chrome extension'],
        tags: ['Python', 'Deep Learning', 'Grad-CAM'],
        href: 'https://github.com/Marwakhot/reelreal',
      },
      {
        title: 'Inventra',
        summary: 'Agentic AI inventory planning platform with scenario simulation. 1st Place, Future Mindz Fest.',
        problem: ['Warning signs across warehouses are easy to miss', 'Stockouts and overstock are often found too late'],
        solution: ['AI agents monitor data and investigate issues on their own', 'Flags risks before they escalate', 'Scenario Lab tests decisions before they are made', 'The final call stays with a person'],
        tags: ['Python', 'Agentic AI', 'Scenario Sim'],
        href: 'https://github.com/Marwakhot/INVENTRA_TROJAN',
      },
      {
        title: 'BrainBrew',
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
    projects: [
      {
        title: 'Bug Triage NLP',
        summary: 'End-to-end ML pipeline automating software bug classification using NLP.',
        problem: ['Bug reports pile up in large software teams', 'Sorting and routing them by hand is slow and error-prone'],
        solution: ['Classifies bug reports automatically with NLP', 'Routes each one to the right team', 'Flask API for real-time predictions', 'Streamlit dashboard for monitoring', 'Packaged with Docker for easy deployment'],
        tags: ['Python', 'NLP', 'Flask', 'Docker'],
        href: 'https://github.com/Marwakhot/bug-triage-nlp-api',
      },
      {
        title: 'ML Lens',
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
    projects: [
      {
        title: 'Haven',
        summary: 'Household finance dashboard with live market prices and portfolio tracking.',
        problem: ['Household money is scattered across spreadsheets', 'No single view links spending, debts and investments'],
        solution: ['One real-time dashboard for bills, debts and subscriptions', 'Live investment values with USD/AED conversion', '12-month portfolio charts and net worth history', 'Buy, hold and sell signals', 'Secured with Supabase Row Level Security'],
        tags: ['Supabase', 'Finnhub API', 'Twelve Data'],
        href: 'https://github.com/Marwakhot/HAVEN',
      },
      {
        title: 'Bouncer',
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
    projects: [
      {
        title: 'ILMA',
        summary: 'Femtech app and safety score showing how well products were researched for female biology.',
        problem: ['Skincare and pharmaceutical products are rarely explained around female biology', 'Funders cannot easily see where the research gaps are'],
        solution: ['Lets women in the GCC scan skincare and pharmaceutical products', 'Rates ingredient safety, hormonal relevance, transparency and evidence across skin tones', 'Dashboard exposes research gaps and shows funders where they matter most', '3rd Place at the Digi-Health Lab Symposium'],
        tags: ['Femtech', 'Health Informatics', 'Research'],
      },
      {
        title: 'Palm2Soil',
        summary: 'Satellite-guided salinity remediation for precision agriculture. Space Hackathon 2026.',
        problem: ['Soil salinity damages farmland across arid regions', 'Limited budgets need evidence on which parcels to inspect first'],
        solution: ['Processes hyperspectral satellite data', 'Produces a ranked inspection list for farm blocks', 'Exports CSV tables and GeoJSON parcel maps', 'Attaches data-quality figures to every row', 'Built for the Arab Youth Space Hackathon 2026'],
        tags: ['Python', 'Satellite Data', 'GIS'],
        href: 'https://github.com/Marwakhot/palm2soil',
      },
    ],
  },
];

// The landing after Projects.
export const landing = {
  descent: 'We’ve begun our descent.',
};

// The last page: your boarding pass, stamped, and how to reach you.
export const arrivals = {
  heading: 'You’ve arrived.',
  message: 'Thanks for flying Marwa Air. Here’s how to reach me.',
  stamp: 'Arrived',
  replay: 'Fly again',
};

// Contact information
export const contact = {
  phone: '0585885323',
  phoneHref: 'tel:+971585885323',
  email: 'marwakhot007@gmail.com',
  github: 'https://github.com/Marwakhot',
  linkedin: 'https://www.linkedin.com/in/marwa-khot-238482353/',
};
