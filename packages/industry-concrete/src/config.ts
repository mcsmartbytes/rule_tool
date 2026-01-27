import type { IndustryConfig } from '@rule-tool/industry-core';

export const concreteConfig: IndustryConfig = {
  id: 'concrete',
  name: 'ConcretePro Suite',
  tagline: 'Professional Flatwork & Concrete Management',

  branding: {
    primaryColor: '#57534e',     // Stone gray
    secondaryColor: '#1c1917',   // Dark charcoal
    accentColor: '#f97316',      // Construction orange
    logo: '/logos/concretepro.svg',
    favicon: '/favicon.ico',
    heroImage: '/images/concrete-hero.jpg',
  },

  terminology: {
    job: 'Project',
    jobPlural: 'Projects',
    client: 'Customer',
    clientPlural: 'Customers',
    estimate: 'Bid',
    estimatePlural: 'Bids',
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
    roofingTool: false,
  },

  phases: [
    {
      name: 'Site Prep',
      tasks: ['Grade site', 'Excavate', 'Compact sub-base', 'Install forms', 'Set stakes'],
      color: '#78716c',
    },
    {
      name: 'Reinforcement',
      tasks: ['Place rebar', 'Install mesh', 'Set chairs', 'Tie rebar'],
      color: '#3b82f6',
    },
    {
      name: 'Pour',
      tasks: ['Order concrete', 'Stage pumping', 'Place concrete', 'Strike off', 'Bull float'],
      color: '#f59e0b',
    },
    {
      name: 'Finish',
      tasks: ['Edge', 'Cut joints', 'Broom finish', 'Trowel finish', 'Stamp/texture'],
      color: '#22c55e',
    },
    {
      name: 'Cure & Cleanup',
      tasks: ['Apply cure', 'Strip forms', 'Backfill', 'Cleanup', 'Final inspection'],
      color: '#8b5cf6',
    },
  ],

  services: [
    {
      id: 'concrete-flatwork',
      name: 'Concrete Flatwork',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 8.50,
      minimumCharge: 1500,
      description: 'Standard 4" slab with broom finish',
    },
    {
      id: 'driveway',
      name: 'Driveway (6")',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 12.00,
      minimumCharge: 2500,
      description: 'Reinforced 6" residential driveway',
    },
    {
      id: 'sidewalk',
      name: 'Sidewalk',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 9.00,
      minimumCharge: 800,
      description: '4" sidewalk with broom finish',
    },
    {
      id: 'patio',
      name: 'Patio',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 10.00,
      minimumCharge: 1200,
      description: 'Residential patio slab',
    },
    {
      id: 'stamped-concrete',
      name: 'Stamped Concrete',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 18.00,
      minimumCharge: 2000,
      description: 'Decorative stamped pattern',
    },
    {
      id: 'curb-gutter',
      name: 'Curb & Gutter',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 28.00,
      minimumCharge: 1000,
      description: 'Standard curb and gutter',
    },
    {
      id: 'demo-removal',
      name: 'Demo & Removal',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 3.50,
      minimumCharge: 500,
      description: 'Break out and haul away existing concrete',
    },
    {
      id: 'forming',
      name: 'Forming',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 6.00,
      minimumCharge: 300,
      description: 'Edge forming and stakes',
    },
    {
      id: 'saw-cutting',
      name: 'Saw Cutting',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 2.50,
      minimumCharge: 200,
      description: 'Control joint cutting',
    },
    {
      id: 'rebar',
      name: 'Rebar Installation',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 1.50,
      minimumCharge: 250,
      description: '#4 rebar on 18" centers',
    },
  ],

  customFields: [
    {
      key: 'project_type',
      label: 'Project Type',
      type: 'select',
      options: ['Driveway', 'Patio', 'Sidewalk', 'Foundation', 'Slab', 'Curb & Gutter', 'Steps', 'Retaining Wall'],
      required: true,
    },
    {
      key: 'total_sqft',
      label: 'Total Square Footage',
      type: 'number',
      required: true,
    },
    {
      key: 'thickness',
      label: 'Slab Thickness',
      type: 'select',
      options: ['4 inch', '5 inch', '6 inch', '8 inch', '10 inch', '12 inch'],
      required: true,
    },
    {
      key: 'psi_strength',
      label: 'Concrete PSI',
      type: 'select',
      options: ['3000 PSI', '3500 PSI', '4000 PSI', '4500 PSI', '5000 PSI'],
    },
    {
      key: 'finish_type',
      label: 'Finish Type',
      type: 'select',
      options: ['Broom', 'Smooth Trowel', 'Exposed Aggregate', 'Stamped', 'Stained', 'Polished'],
    },
    {
      key: 'reinforcement',
      label: 'Reinforcement',
      type: 'select',
      options: ['None', 'Fiber Mesh', 'Wire Mesh', 'Rebar', 'Rebar + Mesh'],
    },
    {
      key: 'demo_required',
      label: 'Demo Required',
      type: 'boolean',
      helpText: 'Is existing concrete removal needed?',
    },
    {
      key: 'access_difficulty',
      label: 'Access Difficulty',
      type: 'select',
      options: ['Easy - Direct pour', 'Moderate - Wheelbarrow', 'Difficult - Pump required'],
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
      name: 'Project Profitability',
      description: 'Profit margin per project',
      icon: 'TrendingUp',
    },
    {
      id: 'yardage-tracking',
      name: 'Yardage Tracking',
      description: 'Cubic yards poured per project',
      icon: 'Box',
    },
    {
      id: 'crew-productivity',
      name: 'Crew Productivity',
      description: 'Square feet placed per day',
      icon: 'Users',
    },
    {
      id: 'material-costs',
      name: 'Material Costs',
      description: 'Concrete, rebar, and supply costs',
      icon: 'Package',
    },
  ],

  navigation: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Projects', href: '/jobs', icon: 'Briefcase' },
    { label: 'Bids', href: '/estimates', icon: 'FileText' },
    { label: 'Customers', href: '/contacts', icon: 'Users' },
    { label: 'Schedule', href: '/schedule', icon: 'Calendar' },
    { label: 'Crew', href: '/crew', icon: 'HardHat' },
    { label: 'Area Calculator', href: '/area-bid', icon: 'Map' },
    { label: 'Invoices', href: '/invoices', icon: 'Receipt' },
    { label: 'Expenses', href: '/expenses', icon: 'CreditCard' },
    { label: 'Reports', href: '/reports', icon: 'BarChart3' },
    { label: 'Settings', href: '/settings', icon: 'Settings' },
  ],
};

export default concreteConfig;
