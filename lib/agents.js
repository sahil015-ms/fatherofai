export const NICHES = ['Technology','AI Tools','Health & Fitness','Personal Finance','Education','Travel','Food & Recipes','Real Estate','Digital Marketing','Startups','E-commerce','Fashion','Automotive','Parenting','Gaming','Home Decor','Careers & Jobs','Government Schemes','Agriculture','Entertainment'];
export const ROLE_TITLES = { topic_finder: 'Topic Finder', researcher: 'Researcher', seo_researcher: 'SEO Researcher', writer: 'Writer', editor: 'Editor', publisher: 'Publisher' };
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
// 1 manager + 1 lead finder + 6 roles x 20 niches = 122 agents
export const AGENTS = [
  { id: 'manager', role: 'manager', niche: null, name: 'Manager' },
  { id: 'lead_finder', role: 'lead_finder', niche: null, name: 'Lead Finder' },
];
for (const niche of NICHES) for (const [role, title] of Object.entries(ROLE_TITLES))
  AGENTS.push({ id: `${role}:${slug(niche)}`, role, niche, name: `${niche} ${title}` });
export const findAgent = (role, niche) => AGENTS.find((a) => a.role === role && a.niche === niche) || AGENTS.find((a) => a.role === role);
