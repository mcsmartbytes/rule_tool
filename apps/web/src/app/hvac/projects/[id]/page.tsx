'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useHvacStore } from '@/lib/hvac';
import type { HvacProject, HvacProjectStatus, HvacEquipment, HvacDuctwork, HvacAirDevice, HvacChecklist, HvacRiskFlag } from '@/lib/hvac/types';

// Format currency helper
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Status configuration
const STATUS_CONFIG: Record<HvacProjectStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: '#f3f4f6', text: '#4b5563', label: 'Draft' },
  in_progress: { bg: '#dbeafe', text: '#1d4ed8', label: 'In Progress' },
  review: { bg: '#fef3c7', text: '#d97706', label: 'Review' },
  submitted: { bg: '#d1fae5', text: '#059669', label: 'Submitted' },
  won: { bg: '#dcfce7', text: '#16a34a', label: 'Won' },
  lost: { bg: '#fee2e2', text: '#dc2626', label: 'Lost' },
  archived: { bg: '#f1f5f9', text: '#64748b', label: 'Archived' },
};

type TabId = 'overview' | 'takeoff' | 'checklist' | 'estimate' | 'documents';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'overview',
    label: 'Overview',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'takeoff',
    label: 'Takeoff',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
  },
  {
    id: 'checklist',
    label: 'Checklist',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: 'estimate',
    label: 'Estimate',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [project, setProject] = useState<HvacProject | null>(null);

  // Mock data for demo
  const [equipment, setEquipment] = useState<HvacEquipment[]>([]);
  const [ductwork, setDuctwork] = useState<HvacDuctwork[]>([]);
  const [airDevices, setAirDevices] = useState<HvacAirDevice[]>([]);
  const [checklist, setChecklist] = useState<HvacChecklist[]>([]);
  const [riskFlags, setRiskFlags] = useState<HvacRiskFlag[]>([]);

  // Load project data
  useEffect(() => {
    const timer = setTimeout(() => {
      // Demo project data
      setProject({
        id: projectId,
        user_id: 'user-1',
        name: 'Downtown Medical Center HVAC',
        client_name: 'Metro Healthcare Systems',
        project_number: 'HVAC-2024-001',
        building_type: 'healthcare',
        total_sqft: 125000,
        num_floors: 5,
        climate_zone: '4a',
        status: 'in_progress',
        bid_due_date: '2024-02-15',
        address: '123 Medical Center Drive',
        city: 'Denver',
        state: 'CO',
        zip: '80202',
        created_at: '2024-01-10T10:00:00Z',
        updated_at: new Date().toISOString(),
      });

      // Demo equipment
      setEquipment([
        { id: '1', project_id: projectId, equipment_type: 'ahu', model: 'Trane M-Series', capacity_tons: 50, quantity: 4, unit_cost: 45000, confidence: 85, created_at: '', updated_at: '' },
        { id: '2', project_id: projectId, equipment_type: 'chiller', model: 'Carrier 30XA', capacity_tons: 200, quantity: 2, unit_cost: 175000, confidence: 90, created_at: '', updated_at: '' },
        { id: '3', project_id: projectId, equipment_type: 'boiler', model: 'Cleaver-Brooks', capacity_mbh: 2000, quantity: 2, unit_cost: 85000, confidence: 80, created_at: '', updated_at: '' },
        { id: '4', project_id: projectId, equipment_type: 'vav_box', model: 'Trane VAV', capacity_cfm: 1200, quantity: 48, unit_cost: 1800, confidence: 75, created_at: '', updated_at: '' },
      ]);

      // Demo checklist
      setChecklist([
        { id: '1', project_id: projectId, section: 'A', item_number: 'A1', item_text: 'Equipment schedules reviewed', status: 'complete', created_at: '', updated_at: '' },
        { id: '2', project_id: projectId, section: 'A', item_number: 'A2', item_text: 'Control sequences verified', status: 'complete', created_at: '', updated_at: '' },
        { id: '3', project_id: projectId, section: 'B', item_number: 'B1', item_text: 'Ductwork routing confirmed', status: 'in_progress', created_at: '', updated_at: '' },
        { id: '4', project_id: projectId, section: 'B', item_number: 'B2', item_text: 'Piping layouts reviewed', status: 'not_started', created_at: '', updated_at: '' },
        { id: '5', project_id: projectId, section: 'C', item_number: 'C1', item_text: 'Coordination with electrical', status: 'not_started', created_at: '', updated_at: '' },
      ]);

      // Demo risk flags
      setRiskFlags([
        { id: '1', project_id: projectId, severity: 'critical', category: 'design_completeness', title: 'Missing equipment schedules', description: 'AHU-5 and AHU-6 not shown on mechanical drawings', status: 'open', created_at: '', updated_at: '' },
        { id: '2', project_id: projectId, severity: 'warning', category: 'coordination', title: 'Duct routing conflict', description: 'Main supply duct conflicts with structural beam at grid line D-4', status: 'open', created_at: '', updated_at: '' },
        { id: '3', project_id: projectId, severity: 'info', category: 'scope_clarity', title: 'Addendum pending', description: 'Addendum #2 expected with revised control sequences', status: 'open', created_at: '', updated_at: '' },
      ]);

      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [projectId]);

  if (isLoading || !project) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#6b7280',
      }}>
        Loading project...
      </div>
    );
  }

  const status = STATUS_CONFIG[project.status];
  const completedChecklist = checklist.filter(c => c.status === 'complete').length;
  const checklistProgress = checklist.length > 0 ? Math.round((completedChecklist / checklist.length) * 100) : 0;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <Link
              href="/hvac/projects"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13px',
                color: '#6b7280',
                textDecoration: 'none',
                marginBottom: '8px',
              }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Projects
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#111827', margin: 0 }}>
                {project.name}
              </h1>
              <span style={{
                padding: '4px 12px',
                fontSize: '12px',
                fontWeight: 500,
                borderRadius: '6px',
                backgroundColor: status.bg,
                color: status.text,
              }}>
                {status.label}
              </span>
            </div>
            {project.project_number && (
              <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0 0' }}>
                {project.project_number} | {project.client_name}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              style={{
                padding: '10px 16px',
                backgroundColor: 'white',
                color: '#374151',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </button>
            <button
              style={{
                padding: '10px 16px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 16px',
                backgroundColor: activeTab === tab.id ? '#f0f9ff' : 'transparent',
                color: activeTab === tab.id ? '#0284c7' : '#6b7280',
                border: 'none',
                borderBottom: `2px solid ${activeTab === tab.id ? '#0ea5e9' : 'transparent'}`,
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: activeTab === tab.id ? 600 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
            {/* Left Column */}
            <div>
              {/* Key Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px',
                marginBottom: '24px',
              }}>
                <MetricCard
                  label="Total Sq Ft"
                  value={project.total_sqft ? `${project.total_sqft.toLocaleString()} SF` : '-'}
                  color="#059669"
                />
                <MetricCard
                  label="Bid Due"
                  value={project.bid_due_date ? new Date(project.bid_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  color="#f59e0b"
                />
                <MetricCard
                  label="Checklist"
                  value={`${checklistProgress}%`}
                  subtext={`${completedChecklist}/${checklist.length} items`}
                  color="#0ea5e9"
                />
                <MetricCard
                  label="Risk Flags"
                  value={riskFlags.filter(r => r.status === 'open').length}
                  subtext={`${riskFlags.filter(r => r.severity === 'critical').length} critical`}
                  color={riskFlags.filter(r => r.severity === 'critical').length > 0 ? '#ef4444' : '#6b7280'}
                />
              </div>

              {/* Takeoff Summary */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                marginBottom: '24px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Takeoff Summary
                  </h2>
                  <button
                    onClick={() => setActiveTab('takeoff')}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    View Details
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                  <SummaryCard label="Equipment" count={equipment.length} icon="equipment" />
                  <SummaryCard label="Ductwork Sections" count={24} icon="ductwork" />
                  <SummaryCard label="Air Devices" count={156} icon="air_device" />
                </div>
              </div>

              {/* Equipment List */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Major Equipment
                  </h2>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>Type</th>
                      <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>Model</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>Qty</th>
                      <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>Unit Cost</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#374151', textTransform: 'uppercase' }}>Confidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipment.map((eq) => (
                      <tr key={eq.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#111827', fontWeight: 500 }}>
                          {eq.equipment_type.toUpperCase().replace('_', ' ')}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151' }}>{eq.model || '-'}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>{eq.quantity}</td>
                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', textAlign: 'right' }}>
                          {eq.unit_cost ? formatCurrency(eq.unit_cost) : '-'}
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          {eq.confidence && (
                            <span style={{
                              padding: '2px 8px',
                              fontSize: '12px',
                              fontWeight: 500,
                              borderRadius: '4px',
                              backgroundColor: eq.confidence >= 80 ? '#dcfce7' : eq.confidence >= 60 ? '#fef3c7' : '#fee2e2',
                              color: eq.confidence >= 80 ? '#16a34a' : eq.confidence >= 60 ? '#d97706' : '#dc2626',
                            }}>
                              {eq.confidence}%
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Project Details */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '20px',
                marginBottom: '24px',
              }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
                  Project Details
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <DetailRow label="Building Type" value={project.building_type?.replace('_', ' ') || '-'} />
                  <DetailRow label="Total Sq Ft" value={project.total_sqft ? `${project.total_sqft.toLocaleString()} sf` : '-'} />
                  <DetailRow label="Floors" value={project.num_floors || '-'} />
                  <DetailRow label="Climate Zone" value={project.climate_zone || '-'} />
                  <DetailRow label="Location" value={project.city && project.state ? `${project.city}, ${project.state}` : '-'} />
                  <DetailRow
                    label="Due Date"
                    value={project.bid_due_date ? new Date(project.bid_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
                  />
                </div>
              </div>

              {/* Risk Flags */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                padding: '20px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                    Risk Flags
                  </h2>
                  <span style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '4px',
                    backgroundColor: '#fee2e2',
                    color: '#dc2626',
                  }}>
                    {riskFlags.filter(r => r.status === 'open').length} Open
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {riskFlags.filter(r => r.status === 'open').map((flag) => (
                    <div
                      key={flag.id}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        backgroundColor: flag.severity === 'critical' ? '#fef2f2' : flag.severity === 'warning' ? '#fffbeb' : '#f0f9ff',
                        border: `1px solid ${flag.severity === 'critical' ? '#fecaca' : flag.severity === 'warning' ? '#fde68a' : '#bae6fd'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: flag.severity === 'critical' ? '#ef4444' : flag.severity === 'warning' ? '#f59e0b' : '#3b82f6',
                          marginTop: '6px',
                          flexShrink: 0,
                        }} />
                        <div>
                          <p style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: flag.severity === 'critical' ? '#991b1b' : flag.severity === 'warning' ? '#92400e' : '#1e40af',
                            margin: '0 0 4px 0',
                          }}>
                            {flag.title}
                          </p>
                          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                            {flag.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {riskFlags.filter(r => r.status === 'open').length === 0 && (
                    <p style={{ fontSize: '14px', color: '#6b7280', textAlign: 'center', padding: '16px 0' }}>
                      No open risk flags
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Takeoff Tab */}
        {activeTab === 'takeoff' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '40px',
            textAlign: 'center',
          }}>
            <svg
              style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
              Takeoff Editor
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
              Full takeoff editing functionality coming soon. Use the link below to access the takeoff editor.
            </p>
            <Link
              href="/hvac/takeoff"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Open Takeoff Editor
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        )}

        {/* Checklist Tab */}
        {activeTab === 'checklist' && (
          <div>
            {/* Progress bar */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              padding: '20px',
              marginBottom: '24px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                  Checklist Progress
                </h2>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#0ea5e9' }}>
                  {checklistProgress}% Complete
                </span>
              </div>
              <div style={{ height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${checklistProgress}%`,
                  height: '100%',
                  backgroundColor: '#0ea5e9',
                  transition: 'width 0.3s ease',
                }} />
              </div>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: '8px 0 0 0' }}>
                {completedChecklist} of {checklist.length} items completed
              </p>
            </div>

            {/* Checklist items */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}>
              {checklist.map((item, index) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px 20px',
                    borderBottom: index < checklist.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}
                >
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: item.status === 'complete' ? '#dcfce7' : item.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
                    color: item.status === 'complete' ? '#16a34a' : item.status === 'in_progress' ? '#1d4ed8' : '#9ca3af',
                    cursor: 'pointer',
                  }}>
                    {item.status === 'complete' ? (
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : item.status === 'in_progress' ? (
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', backgroundColor: '#d1d5db' }} />
                    )}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{
                      fontSize: '14px',
                      color: item.status === 'complete' ? '#6b7280' : '#111827',
                      margin: 0,
                      textDecoration: item.status === 'complete' ? 'line-through' : 'none',
                    }}>
                      <span style={{ fontWeight: 500, marginRight: '8px' }}>{item.item_number}.</span>
                      {item.item_text}
                    </p>
                  </div>
                  <span style={{
                    padding: '4px 8px',
                    fontSize: '11px',
                    fontWeight: 500,
                    borderRadius: '4px',
                    backgroundColor: item.status === 'complete' ? '#dcfce7' : item.status === 'in_progress' ? '#dbeafe' : '#f3f4f6',
                    color: item.status === 'complete' ? '#16a34a' : item.status === 'in_progress' ? '#1d4ed8' : '#6b7280',
                    textTransform: 'capitalize',
                  }}>
                    {item.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Estimate Tab */}
        {activeTab === 'estimate' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '40px',
            textAlign: 'center',
          }}>
            <svg
              style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
              Estimate Builder
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
              Generate detailed cost estimates based on your takeoff data. This feature is coming soon.
            </p>
            <button
              disabled
              style={{
                padding: '12px 24px',
                backgroundColor: '#e5e7eb',
                color: '#9ca3af',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'not-allowed',
              }}
            >
              Generate Estimate
            </button>
          </div>
        )}

        {/* Documents Tab */}
        {activeTab === 'documents' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '40px',
            textAlign: 'center',
          }}>
            <svg
              style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
              No Documents Yet
            </h2>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
              Upload mechanical plans and specifications to enable AI-assisted takeoff.
            </p>
            <button
              style={{
                padding: '12px 24px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload Documents
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper Components
function MetricCard({ label, value, subtext, color }: { label: string; value: string | number; subtext?: string; color: string }) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '10px',
      border: '1px solid #e5e7eb',
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '3px',
        backgroundColor: color,
      }} />
      <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </p>
      <p style={{ fontSize: '22px', fontWeight: 700, color, margin: 0 }}>
        {value}
      </p>
      {subtext && (
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>{subtext}</p>
      )}
    </div>
  );
}

function SummaryCard({ label, count, icon }: { label: string; count: number; icon: string }) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <p style={{ fontSize: '28px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
        {count}
      </p>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
        {label}
      </p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '14px', color: '#6b7280' }}>{label}</span>
      <span style={{ fontSize: '14px', fontWeight: 500, color: '#111827', textTransform: 'capitalize' }}>{value}</span>
    </div>
  );
}
