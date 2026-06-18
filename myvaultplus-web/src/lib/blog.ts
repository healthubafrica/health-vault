export interface BlogSection {
  heading: string
  body: string
}

export interface BlogPost {
  slug: string
  title: string
  date: string
  dateISO: string
  category: string
  excerpt: string
  image: string
  sections: BlogSection[]
  featured: boolean
}

export const posts: BlogPost[] = [
  {
    slug: 'digital-health-records-transform-care',
    title: 'How Digital Health Records Are Transforming Patient Care in Nigeria',
    date: 'January 14, 2026',
    dateISO: '2026-01-14',
    category: 'Digital Health',
    featured: true,
    excerpt:
      'From fragmented paper files to a unified digital record, Nigeria\'s healthcare system is undergoing a quiet revolution. MyHealth Vault+™ is at the centre of it.',
    image:
      'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&h=800&fit=crop&q=85',
    sections: [
      {
        heading: '1. The Problem With Paper',
        body: 'Across Nigeria, millions of patients carry their health histories in their heads or scattered across manila folders. When you visit a new clinic, a specialist, or an emergency room, critical information (past diagnoses, drug allergies, chronic conditions) may never reach the clinician in time. The consequences can be severe. Digital health records change this fundamentally.',
      },
      {
        heading: '2. One Record, Every Visit',
        body: 'MyHealth Vault+™ centralises your health data into a single, secure, FHIR R4-compliant record. Whether you visit a partner clinic, consult via TeleCare™, or submit a case to Expert Review™, your information travels with you. Clinicians get the full picture. You get better care.',
      },
      {
        heading: '3. Security Without Compromise',
        body: 'Storing health records digitally raises legitimate concerns about privacy. That is why every record on MyHealth Vault+™ is encrypted at rest and in transit, NDPR-compliant, and governed by role-based access controls. Your data belongs to you, and only you decide who sees it.',
      },
      {
        heading: '4. The Road Ahead',
        body: 'As interoperability standards mature across Nigerian hospitals and labs, digital health records will become the backbone of an integrated national healthcare system. Patients who take control of their health data today will be best positioned to benefit from the next generation of personalised, preventive care.',
      },
    ],
  },
  {
    slug: 'ai-diagnostics-african-hospitals',
    title: '5 Ways AI Is Revolutionising Diagnostics in African Hospitals',
    date: 'September 22, 2025',
    dateISO: '2025-09-22',
    category: 'Health Tech',
    featured: false,
    excerpt:
      'Artificial intelligence is no longer a distant promise for African healthcare; it is arriving now, with measurable impact on diagnosis speed and accuracy.',
    image:
      'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=1200&h=800&fit=crop&q=85',
    sections: [
      {
        heading: '1. Faster Radiology Reads',
        body: 'AI-assisted imaging tools are helping radiologists in under-resourced hospitals process chest X-rays and CT scans faster, flagging anomalies that might otherwise be missed under pressure. In pilot programmes across Lagos and Abuja, turnaround times have dropped by up to 40%.',
      },
      {
        heading: '2. Predictive Risk Scoring',
        body: 'Machine learning models trained on African patient populations are beginning to identify patients at elevated risk of conditions like hypertension and diabetes before symptoms appear. When integrated with digital health records, these models can trigger early intervention pathways automatically.',
      },
      {
        heading: '3. Clinical Decision Support',
        body: 'At the point of care, AI-driven clinical decision support tools provide clinicians with evidence-based treatment suggestions, drug interaction alerts, and differential diagnosis prompts, reducing error rates and improving consistency across care settings.',
      },
      {
        heading: '4. Pathology Automation',
        body: 'Automated pathology analysis, including blood smear reading, cellular anomaly detection, and malaria and tuberculosis flagging, is beginning to reach overburdened laboratory settings. A single AI-powered lab scanner can process hundreds of samples per hour with diagnostic accuracy matching senior pathologists.',
      },
      {
        heading: '5. Natural Language Processing for Clinical Notes',
        body: 'NLP tools that can extract structured insights from free-text clinical notes are beginning to unlock the value buried in decades of paper and electronic records. This unlocks population health insights that were previously impossible to surface at scale.',
      },
    ],
  },
  {
    slug: 'why-a-second-opinion-matters',
    title: 'Why a Specialist Second Opinion Could Change Everything',
    date: 'November 5, 2025',
    dateISO: '2025-11-05',
    category: 'Expert Review',
    featured: false,
    excerpt:
      'Research consistently shows that diagnostic errors affect up to 15% of clinical encounters. A specialist second opinion is one of the most effective interventions you can take.',
    image:
      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=1200&h=800&fit=crop&q=85',
    sections: [
      {
        heading: '1. Diagnostic Errors Are More Common Than You Think',
        body: 'Studies from the BMJ and the Lancet estimate that diagnostic errors (including missed, delayed, or incorrect diagnoses) affect hundreds of millions of patients annually worldwide. In settings with constrained specialist access, the risk is amplified significantly.',
      },
      {
        heading: '2. What Expert Review™ Does',
        body: 'Expert Review™ connects you with a verified specialist in over 18 clinical fields within 72 hours. Upload your records, scans, and clinical notes. A board-certified consultant reviews them independently and delivers a structured second opinion, all without leaving your home.',
      },
      {
        heading: '3. When to Seek a Second Opinion',
        body: 'You should consider a specialist second opinion when facing a serious or rare diagnosis, when treatment options are unclear, before major surgery, or when your condition is not responding to current treatment as expected. Expert Review™ makes this process accessible and affordable for every Nigerian patient.',
      },
    ],
  },
  {
    slug: 'future-of-telemedicine-west-africa',
    title: 'The Future of Telemedicine in West Africa',
    date: 'December 10, 2025',
    dateISO: '2025-12-10',
    category: 'Telemedicine',
    featured: false,
    excerpt:
      'With mobile penetration above 80% and an expanding 4G footprint, West Africa is poised for a telemedicine revolution. Here is what it looks like from the inside.',
    image:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=800&fit=crop&q=85',
    sections: [
      {
        heading: '1. Infrastructure Has Arrived',
        body: 'For years, telemedicine in West Africa was constrained by unreliable connectivity. That story is changing. Nigeria\'s 4G coverage now reaches the majority of urban and peri-urban zones, and fibre broadband is expanding into second-tier cities. The technical barriers are lower than at any point in history.',
      },
      {
        heading: '2. The Clinician Shortage Problem',
        body: 'Nigeria has approximately 45,000 registered doctors serving a population of over 220 million, a ratio far below WHO recommendations. Telemedicine does not solve this overnight, but it dramatically extends the reach of each available clinician, allowing consultations to cross geographic barriers.',
      },
      {
        heading: '3. What Comes Next',
        body: 'The next frontier is asynchronous telemedicine: text and voice-based consultations that do not require both parties to be online simultaneously. Combined with AI-powered triage, this model could serve millions of patients in underserved areas who currently have no reliable access to primary care.',
      },
    ],
  },
  {
    slug: 'dispatchcare-emergency-response',
    title: 'DispatchCare™: How Smart Emergency Dispatch Works',
    date: 'December 14, 2025',
    dateISO: '2025-12-14',
    category: 'Emergency Care',
    featured: false,
    excerpt:
      'When every second matters, DispatchCare™ coordinates emergency response, ambulance dispatch, and hospital admission from a single tap, even when you cannot speak.',
    image:
      'https://images.unsplash.com/photo-1587745416684-47953f16f02f?w=1200&h=800&fit=crop&q=85',
    sections: [
      {
        heading: '1. One Tap, Full Response',
        body: 'Activating DispatchCare™ sends your GPS location, MyVault+ health ID, and emergency contact details to our 24/7 coordination centre instantly. A trained dispatcher assesses the situation and coordinates the nearest available ambulance or emergency response unit simultaneously.',
      },
      {
        heading: '2. Your Health Profile Goes Ahead',
        body: 'Before the ambulance arrives, the receiving hospital receives your critical health information: blood type, known allergies, chronic conditions, and current medications. This pre-notification dramatically reduces time from arrival to treatment initiation.',
      },
      {
        heading: '3. Why Speed Matters',
        body: 'In cardiac events and strokes, every minute without intervention causes irreversible damage. The golden hour concept is well-established in trauma medicine. DispatchCare™ is designed to compress the time between emergency and care delivery, giving your body and your care team the best possible starting position.',
      },
    ],
  },
  {
    slug: 'preventive-health-healthconsult',
    title: 'Preventive Health: Why HealthConsult™ Changes the Equation',
    date: 'November 20, 2025',
    dateISO: '2025-11-20',
    category: 'Preventive Care',
    featured: false,
    excerpt:
      'Treating illness is expensive and uncertain. Preventing it is neither. HealthConsult™ is our approach to keeping you well before things go wrong.',
    image:
      'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&h=800&fit=crop&q=85',
    sections: [
      {
        heading: '1. The Economics of Prevention',
        body: 'A single hospitalisation for a preventable condition (a hypertensive crisis or a poorly managed diabetic episode) can cost more than a full year of proactive health monitoring. For individuals and families, HealthConsult™ reframes healthcare as an ongoing relationship rather than a crisis response.',
      },
      {
        heading: '2. Personalised, Not Generic',
        body: 'HealthConsult™ sessions are tailored to your health profile, risk factors, lifestyle, and goals. A 35-year-old with a family history of cardiovascular disease gets different guidance than a 55-year-old managing type 2 diabetes. Every plan is built for the individual.',
      },
      {
        heading: '3. Integrated With Your Vault',
        body: 'Because HealthConsult™ lives inside MyHealth Vault+™, your consultant can see your full health history, lab results, and previous consultations. Follow-up sessions build on prior conversations. Over time, this creates a genuinely continuous, personalised health partnership.',
      },
    ],
  },
  {
    slug: 'ndpr-health-data-rights',
    title: 'Your Health Data Rights Under the NDPR',
    date: 'December 20, 2025',
    dateISO: '2025-12-20',
    category: 'Data & Privacy',
    featured: false,
    excerpt:
      'Nigeria\'s Data Protection Regulation gives you more rights over your health data than most patients realise. Here is what you are entitled to, and how MyVault+ protects them.',
    image:
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1200&h=800&fit=crop&q=85',
    sections: [
      {
        heading: '1. What the NDPR Says',
        body: 'The Nigeria Data Protection Regulation (NDPR) establishes clear rights for data subjects, including the right to access your data, correct inaccurate data, withdraw consent, and request deletion. Health data is treated as sensitive personal data with additional protections under the regulation.',
      },
      {
        heading: '2. What MyVault+ Does Differently',
        body: 'MyHealth Vault+™ was built with NDPR compliance as a design constraint, not an afterthought. All data is encrypted, access is logged, and no third party receives your data without your explicit consent. You can view, download, or request deletion of your records at any time from within your portal.',
      },
      {
        heading: '3. Your Practical Rights',
        body: 'Every patient on MyHealth Vault+™ has the right to view all data we hold about them, export health records in a standard format, revoke access from any clinician or service, and submit a formal data access or deletion request. We respond to all requests within 72 hours.',
      },
    ],
  },
]

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug)
}

export function getFeaturedPost(): BlogPost {
  return posts.find((p) => p.featured) ?? posts[0]
}

export function getRecentPosts(excludeSlug?: string, limit = 6): BlogPost[] {
  return posts.filter((p) => !p.featured && p.slug !== excludeSlug).slice(0, limit)
}

export function getRelatedPosts(slug: string, limit = 3): BlogPost[] {
  return posts.filter((p) => p.slug !== slug).slice(0, limit)
}

export function getAllSlugs(): string[] {
  return posts.map((p) => p.slug)
}
