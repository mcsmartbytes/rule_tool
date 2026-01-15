import { IndustryConfig } from './types';

export const sealingStripingConfig: IndustryConfig = {
  id: 'sealing-striping',
  name: "Seal'n & Stripe'n Pro",
  tagline: 'Professional Parking Lot Management',

  branding: {
    primaryColor: '#1e3a8a',     // Navy blue
    secondaryColor: '#1e293b',   // Dark slate
    accentColor: '#fbbf24',      // Safety yellow
    logo: '/logos/sealpro.svg',
    favicon: '/favicon.ico',
    heroImage: '/images/parking-lot-hero.jpg',
  },

  terminology: {
    job: 'Project',
    jobPlural: 'Projects',
    client: 'Property Manager',
    clientPlural: 'Property Managers',
    estimate: 'Quote',
    estimatePlural: 'Quotes',
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
    stallTool: true,        // Parking lot striping
    concreteTool: false,
    roofingTool: false,
  },

  phases: [
    {
      name: 'Site Assessment',
      tasks: ['Measure lot', 'Document conditions', 'Take photos', 'Note repairs needed'],
      color: '#3b82f6',
    },
    {
      name: 'Preparation',
      tasks: ['Clear debris', 'Pressure wash', 'Mark repairs', 'Set up barriers'],
      color: '#f59e0b',
    },
    {
      name: 'Crack Filling',
      tasks: ['Clean cracks', 'Apply filler', 'Allow cure time'],
      color: '#ef4444',
    },
    {
      name: 'Sealcoating',
      tasks: ['Edge work', 'Apply first coat', 'Apply second coat', 'Cure time'],
      color: '#1e293b',
    },
    {
      name: 'Striping',
      tasks: ['Layout lines', 'Paint stalls', 'Paint arrows', 'ADA markings', 'Stencils'],
      color: '#fbbf24',
    },
    {
      name: 'Final Inspection',
      tasks: ['Quality check', 'Touch-ups', 'Customer walkthrough', 'Remove barriers'],
      color: '#22c55e',
    },
  ],

  services: [
    {
      id: 'sealcoating',
      name: 'Sealcoating',
      measurementType: 'area',
      unit: 'sqft',
      defaultRate: 0.18,
      minimumCharge: 450,
      description: 'Protective sealant application',
    },
    {
      id: 'crack-filling',
      name: 'Crack Filling',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 0.60,
      minimumCharge: 250,
      description: 'Hot rubberized crack filler',
    },
    {
      id: 'line-striping',
      name: 'Line Striping',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 1.10,
      minimumCharge: 225,
      description: 'Traffic paint line marking',
    },
    {
      id: 'stall-striping',
      name: 'Parking Stall Striping',
      measurementType: 'count',
      unit: 'stall',
      defaultRate: 3.50,
      minimumCharge: 200,
      description: 'Individual parking space marking',
    },
    {
      id: 'ada-markings',
      name: 'ADA Handicap Markings',
      measurementType: 'count',
      unit: 'space',
      defaultRate: 85.00,
      minimumCharge: 85,
      description: 'Compliant accessible parking symbols',
    },
    {
      id: 'arrows',
      name: 'Directional Arrows',
      measurementType: 'count',
      unit: 'arrow',
      defaultRate: 25.00,
      minimumCharge: 25,
      description: 'Traffic flow arrows',
    },
    {
      id: 'stencils',
      name: 'Custom Stencils',
      measurementType: 'count',
      unit: 'stencil',
      defaultRate: 35.00,
      minimumCharge: 35,
      description: 'STOP, YIELD, FIRE LANE, etc.',
    },
    {
      id: 'curb-painting',
      name: 'Curb Painting',
      measurementType: 'length',
      unit: 'ft',
      defaultRate: 2.50,
      minimumCharge: 150,
      description: 'Fire lane and no parking curbs',
    },
  ],

  customFields: [
    {
      key: 'surface_type',
      label: 'Surface Type',
      type: 'select',
      options: ['Asphalt', 'Concrete', 'Blacktop', 'Chip Seal'],
      required: true,
    },
    {
      key: 'surface_sqft',
      label: 'Total Square Footage',
      type: 'number',
      required: true,
      placeholder: 'Enter square footage',
    },
    {
      key: 'surface_condition',
      label: 'Surface Condition',
      type: 'select',
      options: ['Excellent', 'Good', 'Fair', 'Poor', 'Needs Repair'],
    },
    {
      key: 'stall_count',
      label: 'Number of Parking Stalls',
      type: 'number',
      placeholder: 'Estimated stall count',
    },
    {
      key: 'ada_spaces',
      label: 'ADA Spaces Required',
      type: 'number',
    },
    {
      key: 'last_sealed',
      label: 'Last Sealed Date',
      type: 'date',
      helpText: 'When was the lot last sealed?',
    },
    {
      key: 'property_type',
      label: 'Property Type',
      type: 'select',
      options: [
        'Shopping Center',
        'Office Building',
        'Apartment Complex',
        'Industrial',
        'Municipal',
        'Religious',
        'School',
        'Restaurant',
        'Medical Facility',
        'Other',
      ],
    },
    {
      key: 'access_restrictions',
      label: 'Access Restrictions',
      type: 'textarea',
      placeholder: 'Note any scheduling or access constraints',
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
      description: 'Square feet completed per crew hour',
      icon: 'Users',
    },
    {
      id: 'material-usage',
      name: 'Material Usage',
      description: 'Sealant and paint consumption tracking',
      icon: 'Package',
    },
    {
      id: 'cost-per-sqft',
      name: 'Cost Per Square Foot',
      description: 'Average cost breakdown by service',
      icon: 'Calculator',
    },
    {
      id: 'customer-retention',
      name: 'Customer Retention',
      description: 'Repeat business and contract renewals',
      icon: 'RefreshCw',
    },
    {
      id: 'seasonal-trends',
      name: 'Seasonal Trends',
      description: 'Revenue patterns by month/quarter',
      icon: 'Calendar',
    },
  ],

  navigation: [
    { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    { label: 'Projects', href: '/jobs', icon: 'Briefcase' },
    { label: 'Quotes', href: '/estimates', icon: 'FileText' },
    { label: 'Clients', href: '/contacts', icon: 'Users' },
    { label: 'Schedule', href: '/schedule', icon: 'Calendar' },
    { label: 'Crew', href: '/crew', icon: 'HardHat' },
  ],
};

export default sealingStripingConfig;
