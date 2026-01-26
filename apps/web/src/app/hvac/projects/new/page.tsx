'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { BuildingType, SystemArchetype, ClimateZone } from '@/lib/hvac/types';

// Step configuration
const STEPS = [
  { id: 1, name: 'Project Info', description: 'Basic project details' },
  { id: 2, name: 'Building', description: 'Building specifications' },
  { id: 3, name: 'System', description: 'HVAC system type' },
  { id: 4, name: 'Documents', description: 'Upload plans' },
];

// Building type options
const BUILDING_TYPES: { value: BuildingType; label: string; description: string }[] = [
  { value: 'office', label: 'Office', description: 'Commercial office buildings' },
  { value: 'retail', label: 'Retail', description: 'Stores, malls, shopping centers' },
  { value: 'healthcare', label: 'Healthcare', description: 'Hospitals, clinics, medical facilities' },
  { value: 'education', label: 'Education', description: 'Schools, universities, training centers' },
  { value: 'industrial', label: 'Industrial', description: 'Manufacturing and production facilities' },
  { value: 'warehouse', label: 'Warehouse', description: 'Storage and distribution centers' },
  { value: 'residential_multi', label: 'Multi-Family', description: 'Apartments, condos, senior living' },
  { value: 'hospitality', label: 'Hospitality', description: 'Hotels, resorts, conference centers' },
  { value: 'restaurant', label: 'Restaurant', description: 'Food service and commercial kitchens' },
  { value: 'data_center', label: 'Data Center', description: 'Server rooms and IT facilities' },
  { value: 'laboratory', label: 'Laboratory', description: 'Research and testing facilities' },
  { value: 'mixed_use', label: 'Mixed Use', description: 'Combined commercial/residential' },
  { value: 'other', label: 'Other', description: 'Other building types' },
];

// System archetype options
const SYSTEM_ARCHETYPES: { value: SystemArchetype; label: string; description: string }[] = [
  { value: 'vav_central', label: 'VAV with Central Plant', description: 'Variable air volume with chiller/boiler plant' },
  { value: 'vrf', label: 'VRF/VRV', description: 'Variable refrigerant flow systems' },
  { value: 'rooftop_units', label: 'Packaged Rooftop Units', description: 'Single-zone or multi-zone RTUs' },
  { value: 'split_systems', label: 'Split Systems', description: 'DX split systems and mini-splits' },
  { value: 'chilled_beams', label: 'Chilled Beams', description: 'Active or passive chilled beam systems' },
  { value: 'doas_radiant', label: 'DOAS + Radiant', description: 'Dedicated OA with radiant heating/cooling' },
  { value: 'geothermal', label: 'Geothermal', description: 'Ground-source heat pump systems' },
  { value: 'district', label: 'District System', description: 'Campus or district heating/cooling' },
  { value: 'hybrid', label: 'Hybrid/Custom', description: 'Mixed system types or custom configuration' },
];

// Climate zone options
const CLIMATE_ZONES: { value: ClimateZone; label: string }[] = [
  { value: '1a', label: '1A - Very Hot Humid' },
  { value: '1b', label: '1B - Very Hot Dry' },
  { value: '2a', label: '2A - Hot Humid' },
  { value: '2b', label: '2B - Hot Dry' },
  { value: '3a', label: '3A - Warm Humid' },
  { value: '3b', label: '3B - Warm Dry' },
  { value: '3c', label: '3C - Warm Marine' },
  { value: '4a', label: '4A - Mixed Humid' },
  { value: '4b', label: '4B - Mixed Dry' },
  { value: '4c', label: '4C - Mixed Marine' },
  { value: '5a', label: '5A - Cool Humid' },
  { value: '5b', label: '5B - Cool Dry' },
  { value: '5c', label: '5C - Cool Marine' },
  { value: '6a', label: '6A - Cold Humid' },
  { value: '6b', label: '6B - Cold Dry' },
  { value: '7', label: '7 - Very Cold' },
  { value: '8', label: '8 - Subarctic/Arctic' },
];

// Form data interface
interface FormData {
  // Step 1: Project Info
  name: string;
  project_number: string;
  client_name: string;
  client_contact: string;
  client_email: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  due_date: string;
  // Step 2: Building
  building_type: BuildingType | '';
  square_footage: string;
  num_floors: string;
  construction_type: 'new' | 'renovation' | 'addition' | '';
  occupancy_date: string;
  // Step 3: System
  system_archetype: SystemArchetype | '';
  climate_zone: ClimateZone | '';
  design_cooling_temp: string;
  design_heating_temp: string;
  notes: string;
}

export default function NewProjectWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const [formData, setFormData] = useState<FormData>({
    name: '',
    project_number: '',
    client_name: '',
    client_contact: '',
    client_email: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    due_date: '',
    building_type: '',
    square_footage: '',
    num_floors: '',
    construction_type: '',
    occupancy_date: '',
    system_archetype: '',
    climate_zone: '',
    design_cooling_temp: '95',
    design_heating_temp: '10',
    notes: '',
  });

  // Update form field
  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validation
  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.building_type !== '' && formData.square_footage !== '';
      case 3:
        return true; // Optional
      case 4:
        return true; // Optional
      default:
        return false;
    }
  };

  // Navigation
  const nextStep = () => {
    if (currentStep < 4 && isStepValid(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // File handling
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Submit
  const handleSubmit = async () => {
    if (!isStepValid(1) || !isStepValid(2)) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement actual API call
      console.log('Creating project:', formData);
      console.log('Uploaded files:', uploadedFiles);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Navigate to projects list
      router.push('/hvac/projects');
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link
          href="/hvac/projects"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: '#6b7280',
            textDecoration: 'none',
            marginBottom: '12px',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </Link>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
          Create New Project
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          Set up a new HVAC estimating project
        </p>
      </div>

      {/* Progress Steps */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '32px',
        position: 'relative',
      }}>
        {/* Progress line */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '40px',
          right: '40px',
          height: '2px',
          backgroundColor: '#e5e7eb',
        }}>
          <div style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
            height: '100%',
            backgroundColor: '#0ea5e9',
            transition: 'width 0.3s ease',
          }} />
        </div>

        {STEPS.map((step) => (
          <div
            key={step.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 600,
              backgroundColor: currentStep >= step.id ? '#0ea5e9' : 'white',
              color: currentStep >= step.id ? 'white' : '#9ca3af',
              border: `2px solid ${currentStep >= step.id ? '#0ea5e9' : '#e5e7eb'}`,
              transition: 'all 0.3s ease',
            }}>
              {currentStep > step.id ? (
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <p style={{
              fontSize: '13px',
              fontWeight: 500,
              color: currentStep >= step.id ? '#111827' : '#9ca3af',
              margin: '8px 0 2px 0',
              textAlign: 'center',
            }}>
              {step.name}
            </p>
            <p style={{
              fontSize: '12px',
              color: '#9ca3af',
              margin: 0,
              textAlign: 'center',
            }}>
              {step.description}
            </p>
          </div>
        ))}
      </div>

      {/* Form Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '32px',
        marginBottom: '24px',
      }}>
        {/* Step 1: Project Info */}
        {currentStep === 1 && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 24px 0' }}>
              Project Information
            </h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g., Downtown Medical Center HVAC"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Project Number
                </label>
                <input
                  type="text"
                  value={formData.project_number}
                  onChange={(e) => updateField('project_number', e.target.value)}
                  placeholder="e.g., HVAC-2024-001"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => updateField('due_date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #f3f4f6', paddingTop: '20px', marginTop: '4px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', margin: '0 0 16px 0' }}>Client Information</h3>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Client/Company Name
                </label>
                <input
                  type="text"
                  value={formData.client_name}
                  onChange={(e) => updateField('client_name', e.target.value)}
                  placeholder="e.g., Metro Healthcare Systems"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.client_contact}
                  onChange={(e) => updateField('client_contact', e.target.value)}
                  placeholder="e.g., John Smith"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => updateField('client_email', e.target.value)}
                  placeholder="e.g., john.smith@company.com"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #f3f4f6', paddingTop: '20px', marginTop: '4px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', margin: '0 0 16px 0' }}>Project Location</h3>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Street Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="e.g., 123 Main Street"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => updateField('city', e.target.value)}
                  placeholder="e.g., Denver"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    placeholder="CO"
                    maxLength={2}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      textTransform: 'uppercase',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={formData.zip_code}
                    onChange={(e) => updateField('zip_code', e.target.value)}
                    placeholder="80202"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Building */}
        {currentStep === 2 && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 24px 0' }}>
              Building Specifications
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '12px' }}>
                Building Type *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {BUILDING_TYPES.map((type) => (
                  <div
                    key={type.value}
                    onClick={() => updateField('building_type', type.value)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: `2px solid ${formData.building_type === type.value ? '#0ea5e9' : '#e5e7eb'}`,
                      backgroundColor: formData.building_type === type.value ? '#f0f9ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: formData.building_type === type.value ? '#0369a1' : '#111827',
                      margin: '0 0 4px 0',
                    }}>
                      {type.label}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {type.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Square Footage *
                </label>
                <input
                  type="number"
                  value={formData.square_footage}
                  onChange={(e) => updateField('square_footage', e.target.value)}
                  placeholder="e.g., 75000"
                  min="0"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Number of Floors
                </label>
                <input
                  type="number"
                  value={formData.num_floors}
                  onChange={(e) => updateField('num_floors', e.target.value)}
                  placeholder="e.g., 3"
                  min="1"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Construction Type
                </label>
                <select
                  value={formData.construction_type}
                  onChange={(e) => updateField('construction_type', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select type...</option>
                  <option value="new">New Construction</option>
                  <option value="renovation">Renovation</option>
                  <option value="addition">Addition</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Target Occupancy Date
                </label>
                <input
                  type="date"
                  value={formData.occupancy_date}
                  onChange={(e) => updateField('occupancy_date', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: System */}
        {currentStep === 3 && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 24px 0' }}>
              HVAC System Configuration
            </h2>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '12px' }}>
                System Archetype
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                {SYSTEM_ARCHETYPES.map((type) => (
                  <div
                    key={type.value}
                    onClick={() => updateField('system_archetype', type.value)}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      border: `2px solid ${formData.system_archetype === type.value ? '#0ea5e9' : '#e5e7eb'}`,
                      backgroundColor: formData.system_archetype === type.value ? '#f0f9ff' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <p style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: formData.system_archetype === type.value ? '#0369a1' : '#111827',
                      margin: '0 0 4px 0',
                    }}>
                      {type.label}
                    </p>
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                      {type.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Climate Zone
                </label>
                <select
                  value={formData.climate_zone}
                  onChange={(e) => updateField('climate_zone', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    backgroundColor: 'white',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="">Select zone...</option>
                  {CLIMATE_ZONES.map((zone) => (
                    <option key={zone.value} value={zone.value}>{zone.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Design Cooling Temp (°F)
                </label>
                <input
                  type="number"
                  value={formData.design_cooling_temp}
                  onChange={(e) => updateField('design_cooling_temp', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                  Design Heating Temp (°F)
                </label>
                <input
                  type="number"
                  value={formData.design_heating_temp}
                  onChange={(e) => updateField('design_heating_temp', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateField('notes', e.target.value)}
                placeholder="Any special requirements, constraints, or notes about the project..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '14px',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        )}

        {/* Step 4: Documents */}
        {currentStep === 4 && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
              Upload Documents
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 24px 0' }}>
              Upload mechanical plans, specifications, and other relevant documents for AI-assisted takeoff
            </p>

            {/* Upload area */}
            <div
              style={{
                border: '2px dashed #e5e7eb',
                borderRadius: '12px',
                padding: '48px 24px',
                textAlign: 'center',
                backgroundColor: '#fafafa',
                marginBottom: '24px',
              }}
            >
              <input
                type="file"
                id="file-upload"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.dwg,.dxf"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              <svg
                style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#9ca3af' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p style={{ fontSize: '16px', color: '#374151', margin: '0 0 8px 0' }}>
                Drag and drop files here, or
              </p>
              <label
                htmlFor="file-upload"
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  backgroundColor: '#0ea5e9',
                  color: 'white',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Browse Files
              </label>
              <p style={{ fontSize: '13px', color: '#9ca3af', margin: '16px 0 0 0' }}>
                Supported formats: PDF, PNG, JPG, DWG, DXF
              </p>
            </div>

            {/* Uploaded files list */}
            {uploadedFiles.length > 0 && (
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#374151', margin: '0 0 12px 0' }}>
                  Uploaded Files ({uploadedFiles.length})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    >
                      <svg
                        style={{ width: '20px', height: '20px', color: '#6b7280', flexShrink: 0 }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </p>
                        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        style={{
                          padding: '6px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#9ca3af',
                        }}
                      >
                        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{
              marginTop: '24px',
              padding: '16px',
              backgroundColor: '#f0f9ff',
              borderRadius: '8px',
              border: '1px solid #bae6fd',
            }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <svg
                  style={{ width: '20px', height: '20px', color: '#0284c7', flexShrink: 0, marginTop: '2px' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: '#0369a1', margin: '0 0 4px 0' }}>
                    AI-Assisted Takeoff
                  </p>
                  <p style={{ fontSize: '13px', color: '#0c4a6e', margin: 0 }}>
                    After creating your project, you can use AI to automatically extract equipment, ductwork, and other HVAC components from your uploaded documents.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          style={{
            padding: '12px 24px',
            backgroundColor: currentStep === 1 ? '#f3f4f6' : 'white',
            color: currentStep === 1 ? '#9ca3af' : '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {currentStep < 4 ? (
          <button
            onClick={nextStep}
            disabled={!isStepValid(currentStep)}
            style={{
              padding: '12px 24px',
              backgroundColor: isStepValid(currentStep) ? '#0ea5e9' : '#e5e7eb',
              color: isStepValid(currentStep) ? 'white' : '#9ca3af',
              border: 'none',
              borderRadius: '8px',
              cursor: isStepValid(currentStep) ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            Next
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !isStepValid(1) || !isStepValid(2)}
            style={{
              padding: '12px 24px',
              backgroundColor: isSubmitting ? '#93c5fd' : '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            {isSubmitting ? (
              <>
                Creating...
              </>
            ) : (
              <>
                <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Create Project
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
