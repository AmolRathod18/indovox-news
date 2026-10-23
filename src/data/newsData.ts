export type Category = string;

export type Article = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string[];
  category: Category;
  date: string;
  author: string;
  readTime: string;
  image: string;
  featured?: boolean;
  breaking?: boolean;
  trending?: boolean;
  tags: string[];
  source?: string;
  sourceUrl?: string;
};

export const categories: Array<{ name: Category; accent: string }> = [
  { name: 'India', accent: 'bg-red-500' },
  { name: 'Politics', accent: 'bg-slate-800' },
  { name: 'Crime', accent: 'bg-rose-600' },
  { name: 'World', accent: 'bg-indigo-600' },
  { name: 'Business', accent: 'bg-emerald-600' },
  { name: 'Technology', accent: 'bg-sky-600' },
  { name: 'Sports', accent: 'bg-orange-500' },
  { name: 'Entertainment', accent: 'bg-pink-600' },
  { name: 'Current Affairs', accent: 'bg-yellow-600' },
];

export const navItems = [
  'Home',
  'India',
  'Politics',
  'Crime',
  'World',
  'Business',
  'Technology',
  'Sports',
  'Entertainment',
  'Current Affairs',
];

const placeholderImage =
  'https://images.unsplash.com/photo-1495020689067-958852a7765e?auto=format&fit=crop&w=1200&q=80';

export const articleData: Article[] = [
  {
    id: '1',
    slug: 'india-launches-new-urban-rail-project',
    title: 'India launches a new urban rail revival plan to ease congestion across major cities',
    summary:
      'The project aims to reduce travel times, improve connectivity, and bring more efficient transit to high-density urban corridors.',
    content: [
      'City planners and transit authorities have started rolling out a major urban rail expansion programme that officials say will reduce long commutes and improve the public transport experience across several metropolitan hubs.',
      'The phased plan includes upgrades to existing corridors, new station access points, and better integration with feeder bus systems to reduce congestion at major interchange points.',
      'Urban experts say the move is intended to address growing commuter pressure while promoting a more sustainable and efficient transport model for Indian cities.',
      'Officials cautioned that implementation would require coordinated planning, timely funding, and a stronger focus on commuter safety, accessibility, and maintenance.',
    ],
    category: 'India',
    date: '2026-10-23',
    author: 'INDOVOX Desk',
    readTime: '4 min read',
    image: placeholderImage,
    featured: true,
    breaking: true,
    trending: true,
    tags: ['urban mobility', 'infrastructure', 'transport'],
    source: 'Government briefing',
  },
  {
    id: '2',
    slug: 'election-watch-opposition-forms-front',
    title: 'Election watch: opposition coalition outlines a sharper national agenda',
    summary:
      'Leaders expect the new front to focus on governance, accountability, and regional development priorities as campaigning intensifies.',
    content: [
      'A new political bloc has started to shape up ahead of a key policy and election cycle, promising a stronger focus on governance, federal cooperation, and development priorities.',
      'Analysts expect the alliance to try to distinguish itself from the ruling side on issues including inflation, local accountability, and social welfare delivery.',
      'The development has sparked renewed attention on state and national strategy, with political observers noting that coalition arithmetic will play a key role in the months ahead.',
    ],
    category: 'Politics',
    date: '2026-10-22',
    author: 'S. Sharma',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
    featured: true,
    trending: true,
    tags: ['election', 'coalition', 'governance'],
    source: 'Political desk',
  },
  {
    id: '3',
    slug: 'crime-raid-reveals-digital-fraud-ring',
    title: 'Criminal investigation uncovers a digital fraud network operating across multiple states',
    summary:
      'Authorities say the operation used fake identities and layered payment channels to target several consumer groups.',
    content: [
      'Police agencies investigating a large-scale fraud operation say they have traced a network that relied on coordinated digital tactics and shell layers across multiple regions.',
      'Officials say the case highlights the need for stronger digital verification protocols and faster cross-agency cooperation in financial crime investigations.',
      'Authorities recovered several digital records and are continuing to question suspects linked to the scheme.',
    ],
    category: 'Crime',
    date: '2026-10-21',
    author: 'Investigations Team',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80',
    tags: ['fraud', 'cybercrime', 'investigation'],
    source: 'Police statement',
  },
  {
    id: '4',
    slug: 'global-markets-respond-to-commodity-shift',
    title: 'Global markets respond as commodity prices reshape export and trade outlooks',
    summary:
      'Analysts say supply conditions and energy costs are driving a new round of strategic trading and investment shifts.',
    content: [
      'The global commodity cycle has prompted a fresh round of recalibration in supply chains and investment planning across multiple key markets.',
      'Economists noted that energy and industrial metals costs continue to influence both consumer pricing and industrial output, especially across export-heavy economies.',
      'Policy watchers are closely analysing whether the trend will translate into a broader upswing in industrial activity or a more cautious fiscal stance.',
    ],
    category: 'Business',
    date: '2026-10-20',
    author: 'Markets Bureau',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=1200&q=80',
    tags: ['markets', 'commodities', 'trade'],
    source: 'Economic briefing',
  },
  {
    id: '5',
    slug: 'ai-startups-expand-india-operations',
    title: 'AI startups expand their footprint in India as demand for local language tools rises',
    summary:
      'A growing wave of homegrown technology ventures is targeting better local-language experiences and enterprise automation.',
    content: [
      'Indian technology firms are increasing investment in artificial intelligence products designed for local-language use, enterprise workflows, and public service delivery.',
      'Developers say demand is strongest in sectors such as customer service, education, and logistics, where multilingual interfaces are proving especially valuable.',
      'The push is prompting broader discussions on digital infrastructure, data governance, and the role of AI in workforce transformation.',
    ],
    category: 'Technology',
    date: '2026-10-19',
    author: 'Tech Wire',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
    tags: ['AI', 'India', 'startups'],
    source: 'Tech desk',
  },
  {
    id: '6',
    slug: 'sports-federation-revamps-elite-training',
    title: 'Sports federation launches elite training reforms to improve national performance',
    summary:
      'The restructuring focuses on athlete screening, coaching consistency, and better preparation for international competition.',
    content: [
      'National sports bodies have unveiled a major reform package aimed at strengthening athlete preparation, support systems, and competition readiness.',
      'The programme includes performance reviews, training standardisation, and a stronger focus on medical and fitness support across elite squads.',
      'Coaches say the changes are designed to improve consistency while identifying talent earlier in the pipeline.',
    ],
    category: 'Sports',
    date: '2026-10-18',
    author: 'Arena Desk',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=1200&q=80',
    tags: ['sports', 'training', 'athletes'],
    source: 'Sports bureau',
  },
  {
    id: '7',
    slug: 'entertainment-industry-pushes-for-local-production',
    title: 'Entertainment producers push for more local-language storytelling and creative investment',
    summary:
      'Industry leaders say regional storytelling is helping new audiences connect with culturally rooted narratives and talent.',
    content: [
      'Producers across the entertainment industry are increasingly financing regional stories that reflect local culture, language, and contemporary social realities.',
      'Analysts note that audiences are responding strongly to stories grounded in familiar settings and community experiences, creating new opportunities for independent creators.',
      'The shift has encouraged greater investment in talent development and cross-platform storytelling.',
    ],
    category: 'Entertainment',
    date: '2026-10-17',
    author: 'Culture Desk',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=1200&q=80',
    tags: ['entertainment', 'culture', 'regional cinema'],
    source: 'Culture desk',
  },
  {
    id: '8',
    slug: 'current-affairs-digital-literacy-initiative',
    title: 'Current affairs: a new digital literacy push aims to improve public information checks',
    summary:
      'Community programmes are helping citizens spot misinformation, check sources, and verify claims before sharing.',
    content: [
      'A growing network of civic programmes is expanding digital literacy work across communities, with an emphasis on helping people verify stories and identify manipulated content.',
      'The effort is being positioned as part of a broader strategy to strengthen public trust and reduce the spread of unverified narratives online.',
      'Academics and community leaders say the programme is most effective when it combines practical guidance with trusted local media support.',
    ],
    category: 'Current Affairs',
    date: '2026-10-16',
    author: 'Public Voice Team',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80',
    tags: ['digital literacy', 'media', 'public trust'],
    source: 'Public affairs desk',
  },
  {
    id: '9',
    slug: 'explainer-what-drives-india-s-rural-demand',
    title: 'Explainer: what is driving renewed demand across India’s rural consumption markets?',
    summary:
      'Economists say farm income stability, credit access, and digital commerce are helping shape a more resilient spending trend.',
    content: [
      'A steady recovery in rural consumption is being linked to stronger agricultural output, improved credit access, and faster digital transactions.',
      'Analysts say lower travel cost and improved distribution networks are also giving local sellers a more reliable operational base.',
      'The trend has implications for both consumer brands and the wider manufacturing ecosystem in the country.',
    ],
    category: 'Current Affairs',
    date: '2026-10-15',
    author: 'Explainers Desk',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1200&q=80',
    tags: ['rural economy', 'consumption', 'analysis'],
    source: 'Analysis desk',
  },
  {
    id: '10',
    slug: 'india-world-relations-strengthen',
    title: 'India and partner economies deepen their strategic coordination on critical supply routes',
    summary:
      'Informal diplomatic coordination appears to be increasing as countries focus on resilient logistics and industrial security.',
    content: [
      'Analysts say recent coordination efforts point to growing attention on resilient supply chains and strategic infrastructure planning.',
      'The shift comes as policymakers seek to reduce exposure to bottlenecks while strengthening regional economic ties and industrial continuity.',
      'Economic and foreign policy experts expect the trend to shape next-stage planning in both trade and industrial policy.',
    ],
    category: 'World',
    date: '2026-10-14',
    author: 'World Desk',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?auto=format&fit=crop&w=1200&q=80',
    tags: ['world', 'diplomacy', 'trade'],
    source: 'International bureau',
  },
];

export const breakingStories = [
  { id: 'b1', title: 'Breaking: New transit plan promises faster city-to-city travel', link: '/news/india-launches-new-urban-rail-project' },
  { id: 'b2', title: 'Live updates: political leaders intensify national development debate', link: '/news/election-watch-opposition-forms-front' },
  { id: 'b3', title: 'Security agencies widen fraud probe across digital payment channels', link: '/news/crime-raid-reveals-digital-fraud-ring' },
];
