import type { IndustryConfig } from '@rule-tool/industry-core';

export const landscapingConfig: IndustryConfig = {
  id: 'landscaping',
  name: 'LandscapePro Suite',
  tagline: 'Professional Landscape Management',

  branding: {
    primaryColor: '#166534',     // Forest green
    secondaryColor: '#14532d',   // Dark green
    accentColor: '#84cc16',      // Lime accent
    logo: '/logos/landscapepro.svg',
    favicon: '/favicon.ico',
    heroImage: '/images/landscaping-hero.jpg',
  },

  terminology: {
    job: 'Project',
    jobPlural: 'Projects',
    client: 'Customer',
    clientPlural: 'Customers',
    estimate: 'Proposal',
    estimatePlural: 'Proposals',
    crew: 'Crew',
    phase: 'Phase',
    phasePlural: 'Phases',
  },

  features: {
    jobs: true,
    estimates: true,
    sov: false,
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
    roofingTool: false,
  },

  phases: [
    {
      name: 'Design',
      tasks: ['Site visit', 'Measurements', 'Design concept', 'Material selection', 'Proposal'],
      color: '#3b82f6',
    },
    {
      name: 'Site Prep',
      tasks: ['Mark utilities', 'Clear debris', 'Demo existing', 'Grade site', 'Install drainage'],
      color: '#78716c',
    },
    {
      name: 'Hardscape',
      tasks: ['Excavate', 'Base material', 'Install pavers/stone', 'Edging', 'Polymeric sand'],
      color: '#f59e0b',
    },
    {
      name: 'Softscape',
      tasks: ['Soil prep', 'Plant trees', 'Plant shrubs', 'Install beds', 'Mulch'],
      color: '#22c55e',
    },
    {
      name: 'Irrigation',
      tasks: ['Trench lines', 'Install heads', 'Connect zones', 'Program controller', 'Test system'],
      color: '#06b6d4',
    },
    {
      name: 'Final',
      tasks: ['Sod/seed lawn', 'Final grading', 'Cleanup', 'Customer walkthrough', 'Maintenance plan'],
      color: '#8b5cf6',
    },
  ],

  services: [
    {
      id: 'mowing',
      name: 'Lawn Mowing',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 0.02,
      minimumCharge: 45,
      description: 'Weekly lawn maintenance',
    },
    {
      id: 'mulch-install',
      name: 'Mulch Installation',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 0.85,
      minimumCharge: 250,
      description: '3" depth premium mulch',
    },
    {
      id: 'bed-edging',
      name: 'Bed Edging',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 1.75,
      minimumCharge: 150,
      description: 'Spade edge or steel edging',
    },
    {
      id: 'sod-install',
      name: 'Sod Installation',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 1.25,
      minimumCharge: 500,
      description: 'Including soil prep',
    },
    {
      id: 'tree-planting',
      name: 'Tree Planting',
      measurementType: 'count',
      unit: 'tree',
      defaultRate: 150,
      minimumCharge: 150,
      description: 'Installation only (tree separate)',
    },
    {
      id: 'shrub-planting',
      name: 'Shrub Planting',
      measurementType: 'count',
      unit: 'shrub',
      defaultRate: 35,
      minimumCharge: 100,
      description: 'Installation only (shrub separate)',
    },
    {
      id: 'paver-patio',
      name: 'Paver Patio',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 22,
      minimumCharge: 2500,
      description: 'Including base and installation',
    },
    {
      id: 'retaining-wall',
      name: 'Retaining Wall',
      measurementType: 'area',
      unit: 'sqft face',
      defaultRate: 45,
      minimumCharge: 1500,
      description: 'Block or stone retaining wall',
    },
    {
      id: 'irrigation-install',
      name: 'Irrigation System',
      measurementType: 'count',
      unit: 'zone',
      defaultRate: 850,
      minimumCharge: 2500,
      description: 'Per zone installed',
    },
    {
      id: 'landscape-lighting',
      name: 'Landscape Lighting',
      measurementType: 'count',
      unit: 'fixture',
      defaultRate: 175,
      minimumCharge: 800,
      description: 'LED fixtures installed',
    },
  ],

  customFields: [
    {
      key: 'project_type',
      label: 'Project Type',
      type: 'select',
      options: ['New Install', 'Renovation', 'Maintenance', 'Hardscape Only', 'Softscape Only', 'Irrigation'],
      required: true,
    },
    {
      key: 'property_size',
      label: 'Property Size (sqft)',
      type: 'number',
      required: true,
    },
    {
      key: 'property_type',
      label: 'Property Type',
      type: 'select',
      options: ['Residential', 'Commercial', 'HOA/Condo', 'Municipal', 'Industrial'],
    },
    {
      key: 'irrigation_existing',
      label: 'Existing Irrigation',
      type: 'boolean',
      helpText: 'Does the property have existing irrigation?',
    },
    {
      key: 'design_style',
      label: 'Design Style',
      type: 'select',
      options: ['Traditional', 'Modern', 'Native/Natural', 'Xeriscaping', 'Formal', 'Cottage'],
    },
    {
      key: 'maintenance_plan',
      label: 'Maintenance Plan',
      type: 'select',
      options: ['None', 'Monthly', 'Bi-weekly', 'Weekly'],
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
      id: 'crew-productivity',
      name: 'Crew Productivity',
      description: 'Properties serviced per day',
      icon: 'Users',
    },
    {
      id: 'recurring-revenue',
      name: 'Recurring Revenue',
      description: 'Maintenance contract tracking',
      icon: 'RefreshCw',
    },
    {
      id: 'material-costs',
      name: 'Material Costs',
      description: 'Plants, mulch, and material spending',
      icon: 'Package',
    },
  ],

  navigation: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Projects', href: '/jobs', icon: 'Briefcase' },
    { label: 'Proposals', href: '/estimates', icon: 'FileText' },
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

export default landscapingConfig;
