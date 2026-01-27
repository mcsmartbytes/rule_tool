import { IndustryConfig } from './types';

export const roofingConfig: IndustryConfig = {
  id: 'roofing',
  name: 'RoofPro Suite',
  tagline: 'Professional Roofing Management',

  branding: {
    primaryColor: '#7c2d12',     // Roof brown/terracotta
    secondaryColor: '#292524',   // Dark stone
    accentColor: '#dc2626',      // Safety red
    logo: '/logos/roofpro.svg',
    favicon: '/favicon.ico',
    heroImage: '/images/roofing-hero.jpg',
  },

  terminology: {
    job: 'Job',
    jobPlural: 'Jobs',
    client: 'Homeowner',
    clientPlural: 'Homeowners',
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
    concreteTool: false,
    roofingTool: true,
  },

  phases: [
    {
      name: 'Inspection',
      tasks: ['Roof inspection', 'Measure squares', 'Document damage', 'Take photos', 'Check decking'],
      color: '#3b82f6',
    },
    {
      name: 'Tear-Off',
      tasks: ['Set up dumpster', 'Protect landscaping', 'Remove shingles', 'Remove underlayment', 'Inspect decking'],
      color: '#ef4444',
    },
    {
      name: 'Repair',
      tasks: ['Replace damaged decking', 'Install drip edge', 'Flash penetrations', 'Install ice & water shield'],
      color: '#f59e0b',
    },
    {
      name: 'Installation',
      tasks: ['Install underlayment', 'Install starter strip', 'Install shingles', 'Install ridge cap', 'Install vents'],
      color: '#22c55e',
    },
    {
      name: 'Cleanup',
      tasks: ['Magnetic sweep', 'Gutter cleaning', 'Remove dumpster', 'Final inspection', 'Customer walkthrough'],
      color: '#8b5cf6',
    },
  ],

  services: [
    {
      id: 'shingle-replacement',
      name: 'Shingle Replacement',
      measurementType: 'area',
      unit: 'square',
      defaultRate: 450,
      minimumCharge: 2500,
      description: 'Complete tear-off and replacement (per 100 sqft)',
    },
    {
      id: 'tear-off',
      name: 'Tear Off (per layer)',
      measurementType: 'area',
      unit: 'square',
      defaultRate: 75,
      minimumCharge: 500,
      description: 'Remove existing roofing material',
    },
    {
      id: 'underlayment',
      name: 'Underlayment',
      measurementType: 'area',
      unit: 'square',
      defaultRate: 45,
      minimumCharge: 300,
      description: 'Synthetic or felt underlayment',
    },
    {
      id: 'ice-water-shield',
      name: 'Ice & Water Shield',
      measurementType: 'area',
      unit: 'square',
      defaultRate: 85,
      minimumCharge: 250,
      description: 'Self-adhering membrane',
    },
    {
      id: 'flashing',
      name: 'Flashing',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 12,
      minimumCharge: 250,
      description: 'Step, counter, and valley flashing',
    },
    {
      id: 'ridge-cap',
      name: 'Ridge Cap',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 8,
      minimumCharge: 200,
      description: 'Hip and ridge shingles',
    },
    {
      id: 'skylight',
      name: 'Skylight Flashing',
      measurementType: 'count',
      unit: 'each',
      defaultRate: 350,
      minimumCharge: 350,
      description: 'Re-flash existing skylight',
    },
    {
      id: 'chimney-flashing',
      name: 'Chimney Flashing',
      measurementType: 'count',
      unit: 'each',
      defaultRate: 450,
      minimumCharge: 450,
      description: 'Complete chimney re-flash',
    },
    {
      id: 'decking-repair',
      name: 'Decking Repair',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 6,
      minimumCharge: 150,
      description: 'Replace rotted plywood',
    },
    {
      id: 'gutter-replacement',
      name: 'Gutter Replacement',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 15,
      minimumCharge: 400,
      description: 'Seamless aluminum gutters',
    },
  ],

  customFields: [
    {
      key: 'roof_type',
      label: 'Roof Type',
      type: 'select',
      options: ['Asphalt Shingle', 'Metal', 'Tile', 'Slate', 'Flat/TPO', 'Cedar Shake', 'Composite'],
      required: true,
    },
    {
      key: 'roof_pitch',
      label: 'Roof Pitch',
      type: 'select',
      options: ['Flat (0-2/12)', 'Low (3-4/12)', 'Medium (5-7/12)', 'Steep (8-10/12)', 'Very Steep (11+/12)'],
      required: true,
    },
    {
      key: 'measured_squares',
      label: 'Measured Squares',
      type: 'number',
      required: true,
      helpText: '1 square = 100 sqft',
    },
    {
      key: 'existing_layers',
      label: 'Existing Layers',
      type: 'select',
      options: ['1 layer', '2 layers', '3+ layers'],
    },
    {
      key: 'stories',
      label: 'Number of Stories',
      type: 'select',
      options: ['1 Story', '2 Story', '3+ Story', 'Split Level'],
    },
    {
      key: 'access_difficulty',
      label: 'Access Difficulty',
      type: 'select',
      options: ['Easy', 'Moderate', 'Difficult', 'Very Difficult'],
      helpText: 'Consider landscaping, fencing, power lines',
    },
    {
      key: 'structure_type',
      label: 'Structure Type',
      type: 'select',
      options: ['Single Family', 'Townhouse', 'Duplex', 'Commercial', 'Apartment/Condo', 'Garage/Barn'],
    },
    {
      key: 'insurance_claim',
      label: 'Insurance Claim',
      type: 'boolean',
      helpText: 'Is this an insurance claim job?',
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
      id: 'crew-productivity',
      name: 'Crew Productivity',
      description: 'Squares completed per day',
      icon: 'Users',
    },
    {
      id: 'material-usage',
      name: 'Material Usage',
      description: 'Shingle bundles and supply tracking',
      icon: 'Package',
    },
    {
      id: 'warranty-tracker',
      name: 'Warranty Tracker',
      description: 'Active warranties by job',
      icon: 'Shield',
    },
    {
      id: 'insurance-jobs',
      name: 'Insurance Claims',
      description: 'Insurance job tracking and supplements',
      icon: 'FileCheck',
    },
  ],

  navigation: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Jobs', href: '/jobs', icon: 'Briefcase' },
    { label: 'Estimates', href: '/estimates', icon: 'FileText' },
    { label: 'Customers', href: '/contacts', icon: 'Users' },
    { label: 'Schedule', href: '/schedule', icon: 'Calendar' },
    { label: 'Crew', href: '/crew', icon: 'HardHat' },
    { label: 'Invoices', href: '/invoices', icon: 'Receipt' },
    { label: 'Expenses', href: '/expenses', icon: 'CreditCard' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
};

export default roofingConfig;
