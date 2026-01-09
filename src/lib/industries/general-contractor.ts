import { IndustryConfig } from './types';

export const generalContractorConfig: IndustryConfig = {
  id: 'general-contractor',
  name: 'SiteSense Pro',
  tagline: 'Professional Construction Management',

  branding: {
    primaryColor: '#1d4ed8',     // Construction blue
    secondaryColor: '#1e293b',   // Dark slate
    accentColor: '#eab308',      // Safety yellow
    logo: '/logos/sitesense.svg',
    favicon: '/favicon.ico',
    heroImage: '/images/construction-hero.jpg',
  },

  terminology: {
    job: 'Job',
    jobPlural: 'Jobs',
    client: 'Client',
    clientPlural: 'Clients',
    estimate: 'Estimate',
    estimatePlural: 'Estimates',
    crew: 'Crew',
    phase: 'Phase',
    phasePlural: 'Phases',
  },

  features: {
    jobs: true,
    estimates: true,
    sov: true,
    crm: true,
    expenses: true,
    invoicing: true,
    scheduling: true,
    crew: true,
    mileage: true,
    receipts: true,
    reports: true,
    areaMeasurement: true,
    // Specialized tools
    stallTool: false,
    concreteTool: true,
    roofingTool: true,
  },

  phases: [
    {
      name: 'Pre-Construction',
      tasks: ['Permits', 'Site survey', 'Utility locates', 'Material ordering', 'Subcontractor scheduling'],
      color: '#3b82f6',
    },
    {
      name: 'Foundation',
      tasks: ['Excavation', 'Footings', 'Foundation walls', 'Waterproofing', 'Backfill'],
      color: '#78716c',
    },
    {
      name: 'Framing',
      tasks: ['Floor framing', 'Wall framing', 'Roof framing', 'Sheathing', 'Windows/Doors'],
      color: '#f59e0b',
    },
    {
      name: 'MEP Rough-In',
      tasks: ['Electrical rough', 'Plumbing rough', 'HVAC rough', 'Inspections'],
      color: '#ef4444',
    },
    {
      name: 'Insulation & Drywall',
      tasks: ['Insulation', 'Drywall hang', 'Drywall finish', 'Prime'],
      color: '#a855f7',
    },
    {
      name: 'Finishes',
      tasks: ['Flooring', 'Trim', 'Cabinets', 'Countertops', 'Paint', 'Fixtures'],
      color: '#22c55e',
    },
    {
      name: 'Final',
      tasks: ['Final MEP', 'Punch list', 'Final inspection', 'Certificate of Occupancy', 'Closeout'],
      color: '#06b6d4',
    },
  ],

  services: [
    {
      id: 'general-construction',
      name: 'General Construction',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 150,
      minimumCharge: 10000,
      description: 'Full construction management',
    },
    {
      id: 'remodel',
      name: 'Remodeling',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 175,
      minimumCharge: 5000,
      description: 'Interior renovation work',
    },
    {
      id: 'addition',
      name: 'Addition',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 200,
      minimumCharge: 15000,
      description: 'Home addition construction',
    },
    {
      id: 'kitchen-remodel',
      name: 'Kitchen Remodel',
      measurementType: 'count',
      unit: 'project',
      defaultRate: 35000,
      minimumCharge: 15000,
      description: 'Complete kitchen renovation',
    },
    {
      id: 'bathroom-remodel',
      name: 'Bathroom Remodel',
      measurementType: 'count',
      unit: 'project',
      defaultRate: 18000,
      minimumCharge: 8000,
      description: 'Complete bathroom renovation',
    },
    {
      id: 'deck-construction',
      name: 'Deck Construction',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 45,
      minimumCharge: 3500,
      description: 'Wood or composite decking',
    },
    {
      id: 'project-management',
      name: 'Project Management',
      measurementType: 'time',
      unit: 'hour',
      defaultRate: 85,
      minimumCharge: 500,
      description: 'Construction oversight and coordination',
    },
  ],

  customFields: [
    {
      key: 'project_type',
      label: 'Project Type',
      type: 'select',
      options: ['New Construction', 'Remodel', 'Addition', 'Renovation', 'Repair', 'Commercial Buildout'],
      required: true,
    },
    {
      key: 'total_sqft',
      label: 'Total Square Footage',
      type: 'number',
      required: true,
    },
    {
      key: 'structure_type',
      label: 'Structure Type',
      type: 'select',
      options: ['Single Family', 'Multi-Family', 'Commercial', 'Industrial', 'Mixed Use'],
    },
    {
      key: 'permit_number',
      label: 'Permit Number',
      type: 'text',
    },
    {
      key: 'contract_type',
      label: 'Contract Type',
      type: 'select',
      options: ['Fixed Price', 'Cost Plus', 'Time & Materials', 'Design-Build'],
    },
    {
      key: 'financing_type',
      label: 'Financing',
      type: 'select',
      options: ['Cash', 'Construction Loan', 'HELOC', 'Insurance Claim', 'Other'],
    },
  ],

  reports: [
    {
      id: 'revenue',
      name: 'Revenue Report',
      description: 'Total revenue by period',
      icon: 'DollarSign',
    },
    {
      id: 'profitability',
      name: 'Job Profitability',
      description: 'Profit margin per job',
      icon: 'TrendingUp',
    },
    {
      id: 'budget-vs-actual',
      name: 'Budget vs Actual',
      description: 'Compare estimated vs actual costs',
      icon: 'Scale',
    },
    {
      id: 'subcontractor-costs',
      name: 'Subcontractor Costs',
      description: 'Spending by subcontractor',
      icon: 'Users',
    },
    {
      id: 'change-orders',
      name: 'Change Order Report',
      description: 'Change order tracking and impact',
      icon: 'FileEdit',
    },
    {
      id: 'schedule-performance',
      name: 'Schedule Performance',
      description: 'On-time completion metrics',
      icon: 'Clock',
    },
  ],

  navigation: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Jobs', href: '/jobs', icon: 'Briefcase' },
    { label: 'Estimates', href: '/estimates', icon: 'FileText' },
    { label: 'SOV', href: '/sov', icon: 'ClipboardList' },
    { label: 'Clients', href: '/contacts', icon: 'Users' },
    { label: 'Subcontractors', href: '/subcontractors', icon: 'HardHat' },
    { label: 'Schedule', href: '/schedule', icon: 'Calendar' },
    { label: 'Crew', href: '/crew', icon: 'Users' },
    { label: 'Invoices', href: '/invoices', icon: 'Receipt' },
    { label: 'Expenses', href: '/expenses', icon: 'CreditCard' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
};

export default generalContractorConfig;
