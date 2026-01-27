'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useHvacStore } from '@/lib/hvac';
import type { HvacProject, ProjectStatus, BuildingType } from '@/lib/hvac/types';

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
const STATUS_CONFIG: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
  draft: { bg: '#f3f4f6', text: '#4b5563', label: 'Draft' },
  in_progress: { bg: '#dbeafe', text: '#1d4ed8', label: 'In Progress' },
  review: { bg: '#fef3c7', text: '#d97706', label: 'Review' },
  submitted: { bg: '#d1fae5', text: '#059669', label: 'Submitted' },
  won: { bg: '#dcfce7', text: '#16a34a', label: 'Won' },
  lost: { bg: '#fee2e2', text: '#dc2626', label: 'Lost' },
  archived: { bg: '#f1f5f9', text: '#64748b', label: 'Archived' },
};

// Building type labels
const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  office: 'Office',
  retail: 'Retail',
  healthcare: 'Healthcare',
  education: 'Education',
  industrial: 'Industrial',
  warehouse: 'Warehouse',
  residential_multi: 'Multi-Family Residential',
  hospitality: 'Hospitality',
  restaurant: 'Restaurant',
  data_center: 'Data Center',
  laboratory: 'Laboratory',
  mixed_use: 'Mixed Use',
  other: 'Other',
};

type SortField = 'name' | 'created_at' | 'due_date' | 'total_estimated_cost' | 'status';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

export default function HvacProjectsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [buildingTypeFilter, setBuildingTypeFilter] = useState<BuildingType | 'all'>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const projects = useHvacStore((s) => s.projects);
  const setProjects = useHvacStore((s) => s.setProjects);

  // Load demo data
  useEffect(() => {
    const timer = setTimeout(() => {
      setProjects([
        {
          id: 'demo-1',
          user_id: 'user-1',
          name: 'Downtown Medical Center HVAC',
          client_name: 'Metro Healthcare Systems',
          project_number: 'HVAC-2024-001',
          building_type: 'healthcare',
          square_footage: 125000,
          num_floors: 5,
          climate_zone: '4a',
          status: 'in_progress',
          due_date: '2024-02-15',
          total_estimated_cost: 2850000,
          confidence_score: 82,
          created_at: '2024-01-10T10:00:00Z',
          updated_at: new Date().toISOString(),
        },
        {
          id: 'demo-2',
          user_id: 'user-1',
          name: 'Tech Campus Building B',
          client_name: 'Silicon Valley Innovations',
          project_number: 'HVAC-2024-002',
          building_type: 'office',
          square_footage: 75000,
          num_floors: 3,
          climate_zone: '3c',
          status: 'draft',
          due_date: '2024-03-01',
          created_at: '2024-01-15T14:30:00Z',
          updated_at: new Date().toISOString(),
        },
        {
          id: 'demo-3',
          user_id: 'user-1',
          name: 'Riverside Apartments Complex',
          client_name: 'Urban Living Developments',
          project_number: 'HVAC-2024-003',
          building_type: 'residential_multi',
          square_footage: 200000,
          num_floors: 12,
          climate_zone: '5a',
          status: 'review',
          due_date: '2024-02-01',
          total_estimated_cost: 1650000,
          confidence_score: 75,
          created_at: '2024-01-08T09:15:00Z',
          updated_at: new Date().toISOString(),
        },
        {
          id: 'demo-4',
          user_id: 'user-1',
          name: 'Central Data Center',
          client_name: 'CloudTech Solutions',
          project_number: 'HVAC-2024-004',
          building_type: 'data_center',
          square_footage: 50000,
          num_floors: 2,
          climate_zone: '4a',
          status: 'submitted',
          due_date: '2024-01-25',
          total_estimated_cost: 4200000,
          confidence_score: 90,
          created_at: '2024-01-05T11:00:00Z',
          updated_at: new Date().toISOString(),
        },
        {
          id: 'demo-5',
          user_id: 'user-1',
          name: 'Retail Plaza Renovation',
          client_name: 'Premier Properties',
          project_number: 'HVAC-2024-005',
          building_type: 'retail',
          square_footage: 85000,
          num_floors: 2,
          climate_zone: '3b',
          status: 'won',
          due_date: '2024-01-10',
          total_estimated_cost: 920000,
          confidence_score: 88,
          created_at: '2023-12-20T16:45:00Z',
          updated_at: new Date().toISOString(),
        },
        {
          id: 'demo-6',
          user_id: 'user-1',
          name: 'University Science Building',
          client_name: 'State University',
          project_number: 'HVAC-2024-006',
          building_type: 'laboratory',
          square_footage: 60000,
          num_floors: 4,
          climate_zone: '5a',
          status: 'lost',
          due_date: '2024-01-15',
          total_estimated_cost: 3100000,
          confidence_score: 78,
          created_at: '2023-12-15T10:30:00Z',
          updated_at: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [setProjects]);

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.client_name?.toLowerCase().includes(query) ||
        p.project_number?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter);
    }

    // Building type filter
    if (buildingTypeFilter !== 'all') {
      result = result.filter(p => p.building_type === buildingTypeFilter);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'due_date':
          const aDate = a.due_date ? new Date(a.due_date).getTime() : 0;
          const bDate = b.due_date ? new Date(b.due_date).getTime() : 0;
          comparison = aDate - bDate;
          break;
        case 'total_estimated_cost':
          comparison = (a.total_estimated_cost || 0) - (b.total_estimated_cost || 0);
          break;
        case 'status':
          const statusOrder = ['draft', 'in_progress', 'review', 'submitted', 'won', 'lost', 'archived'];
          comparison = statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [projects, searchQuery, statusFilter, buildingTypeFilter, sortField, sortDirection]);

  // Stats
  const stats = useMemo(() => ({
    total: projects.length,
    active: projects.filter(p => ['draft', 'in_progress', 'review'].includes(p.status)).length,
    submitted: projects.filter(p => p.status === 'submitted').length,
    won: projects.filter(p => p.status === 'won').length,
    totalValue: projects
      .filter(p => !['lost', 'archived'].includes(p.status))
      .reduce((sum, p) => sum + (p.total_estimated_cost || 0), 0),
  }), [projects]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#6b7280',
      }}>
        Loading projects...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
            HVAC Projects
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Manage and track all your HVAC estimating projects
          </p>
        </div>
        <Link
          href="/hvac/projects/new"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 20px',
            backgroundColor: '#0ea5e9',
            color: 'white',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 500,
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Link>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        gap: '24px',
        padding: '16px 20px',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        marginBottom: '24px',
      }}>
        <div>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: 0 }}>{stats.total}</p>
        </div>
        <div style={{ width: '1px', backgroundColor: '#e5e7eb' }} />
        <div>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#0ea5e9', margin: 0 }}>{stats.active}</p>
        </div>
        <div style={{ width: '1px', backgroundColor: '#e5e7eb' }} />
        <div>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Submitted</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', margin: 0 }}>{stats.submitted}</p>
        </div>
        <div style={{ width: '1px', backgroundColor: '#e5e7eb' }} />
        <div>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Won</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#059669', margin: 0 }}>{stats.won}</p>
        </div>
        <div style={{ width: '1px', backgroundColor: '#e5e7eb' }} />
        <div>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pipeline Value</p>
          <p style={{ fontSize: '20px', fontWeight: 700, color: '#059669', margin: 0 }}>{formatCurrency(stats.totalValue)}</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        flexWrap: 'wrap',
        alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '250px', maxWidth: '400px' }}>
          <svg
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: '#9ca3af' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
          style={{
            padding: '10px 32px 10px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([value, config]) => (
            <option key={value} value={value}>{config.label}</option>
          ))}
        </select>

        {/* Building type filter */}
        <select
          value={buildingTypeFilter}
          onChange={(e) => setBuildingTypeFilter(e.target.value as BuildingType | 'all')}
          style={{
            padding: '10px 32px 10px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="all">All Building Types</option>
          {Object.entries(BUILDING_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        {/* Sort */}
        <select
          value={`${sortField}-${sortDirection}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split('-') as [SortField, SortDirection];
            setSortField(field);
            setSortDirection(dir);
          }}
          style={{
            padding: '10px 32px 10px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white',
            cursor: 'pointer',
          }}
        >
          <option value="created_at-desc">Newest First</option>
          <option value="created_at-asc">Oldest First</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="due_date-asc">Due Date (Earliest)</option>
          <option value="due_date-desc">Due Date (Latest)</option>
          <option value="total_estimated_cost-desc">Value (High to Low)</option>
          <option value="total_estimated_cost-asc">Value (Low to High)</option>
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <button
            onClick={() => setViewMode('grid')}
            style={{
              padding: '10px 14px',
              backgroundColor: viewMode === 'grid' ? '#f3f4f6' : 'white',
              border: 'none',
              cursor: 'pointer',
              color: viewMode === 'grid' ? '#111827' : '#6b7280',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{
              padding: '10px 14px',
              backgroundColor: viewMode === 'list' ? '#f3f4f6' : 'white',
              border: 'none',
              borderLeft: '1px solid #e5e7eb',
              cursor: 'pointer',
              color: viewMode === 'list' ? '#111827' : '#6b7280',
            }}
          >
            <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Results count */}
      <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
        Showing {filteredProjects.length} of {projects.length} projects
      </p>

      {/* Projects Grid/List */}
      {viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: '16px',
        }}>
          {filteredProjects.map((project) => (
            <ProjectGridCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Project</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Client</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Due Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Value</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <ProjectListRow key={project.id} project={project} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {filteredProjects.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          backgroundColor: 'white',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
        }}>
          <svg
            style={{ width: '48px', height: '48px', margin: '0 auto 16px', color: '#d1d5db' }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
            No projects found
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

// Grid card component
function ProjectGridCard({ project }: { project: HvacProject }) {
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
  const buildingType = project.building_type ? BUILDING_TYPE_LABELS[project.building_type] : null;
  const dueDate = project.due_date ? new Date(project.due_date) : null;
  const now = new Date();
  const isOverdue = dueDate && dueDate < now && !['won', 'lost', 'archived'].includes(project.status);

  return (
    <Link
      href={`/hvac/projects/${project.id}`}
      style={{
        display: 'block',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        textDecoration: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Status accent */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        background: status.text,
      }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ flex: 1, paddingRight: '12px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 4px 0' }}>
            {project.name}
          </h3>
          {project.project_number && (
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{project.project_number}</p>
          )}
        </div>
        <span style={{
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 500,
          borderRadius: '6px',
          backgroundColor: status.bg,
          color: status.text,
          flexShrink: 0,
        }}>
          {status.label}
        </span>
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {project.client_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '14px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {project.client_name}
          </div>
        )}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {buildingType && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {buildingType}
            </div>
          )}
          {project.square_footage && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6b7280', fontSize: '13px' }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              {project.square_footage.toLocaleString()} sf
            </div>
          )}
        </div>
        {dueDate && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: isOverdue ? '#dc2626' : '#6b7280',
            fontSize: '13px',
            fontWeight: isOverdue ? 600 : 400,
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {isOverdue ? 'Overdue: ' : ''}{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '12px',
        borderTop: '1px solid #f3f4f6',
      }}>
        {project.total_estimated_cost ? (
          <span style={{ fontSize: '16px', fontWeight: 700, color: '#059669' }}>
            {formatCurrency(project.total_estimated_cost)}
          </span>
        ) : (
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>No estimate yet</span>
        )}
        {project.confidence_score && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '6px',
            backgroundColor: project.confidence_score >= 80 ? '#dcfce7' : project.confidence_score >= 60 ? '#fef3c7' : '#fee2e2',
            color: project.confidence_score >= 80 ? '#16a34a' : project.confidence_score >= 60 ? '#d97706' : '#dc2626',
            fontSize: '13px',
            fontWeight: 500,
          }}>
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            {project.confidence_score}%
          </div>
        )}
      </div>
    </Link>
  );
}

// List row component
function ProjectListRow({ project }: { project: HvacProject }) {
  const status = STATUS_CONFIG[project.status] || STATUS_CONFIG.draft;
  const buildingType = project.building_type ? BUILDING_TYPE_LABELS[project.building_type] : '-';
  const dueDate = project.due_date ? new Date(project.due_date) : null;
  const now = new Date();
  const isOverdue = dueDate && dueDate < now && !['won', 'lost', 'archived'].includes(project.status);

  return (
    <tr
      style={{ cursor: 'pointer' }}
      onClick={() => window.location.href = `/hvac/projects/${project.id}`}
      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}
    >
      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <div>
          <p style={{ fontSize: '14px', fontWeight: 500, color: '#111827', margin: 0 }}>{project.name}</p>
          {project.project_number && (
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '2px 0 0 0' }}>{project.project_number}</p>
          )}
        </div>
      </td>
      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#374151' }}>
        {project.client_name || '-'}
      </td>
      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', color: '#374151' }}>
        {buildingType}
      </td>
      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 500,
          borderRadius: '6px',
          backgroundColor: status.bg,
          color: status.text,
        }}>
          {status.label}
        </span>
      </td>
      <td style={{
        padding: '14px 16px',
        borderBottom: '1px solid #f3f4f6',
        fontSize: '14px',
        color: isOverdue ? '#dc2626' : '#374151',
        fontWeight: isOverdue ? 600 : 400,
      }}>
        {dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-'}
      </td>
      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', fontSize: '14px', fontWeight: 600, color: '#059669', textAlign: 'right' }}>
        {project.total_estimated_cost ? formatCurrency(project.total_estimated_cost) : '-'}
      </td>
      <td style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
        {project.confidence_score ? (
          <span style={{
            padding: '4px 8px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '6px',
            backgroundColor: project.confidence_score >= 80 ? '#dcfce7' : project.confidence_score >= 60 ? '#fef3c7' : '#fee2e2',
            color: project.confidence_score >= 80 ? '#16a34a' : project.confidence_score >= 60 ? '#d97706' : '#dc2626',
          }}>
            {project.confidence_score}%
          </span>
        ) : '-'}
      </td>
    </tr>
  );
}
