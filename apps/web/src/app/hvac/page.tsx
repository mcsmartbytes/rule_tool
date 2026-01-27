'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useHvacStore } from '@/lib/hvac';
import type { HvacProject, ProjectStatus } from '@/lib/hvac/types';

// Format currency helper
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Stat card component
function StatCard({
  label,
  value,
  subtext,
  color,
  icon
}: {
  label: string;
  value: string | number;
  subtext?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {color && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '4px',
          height: '100%',
          background: color,
        }} />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p style={{
            fontSize: '13px',
            color: '#1f2937',
            margin: 0,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {label}
          </p>
          <p style={{
            fontSize: '28px',
            fontWeight: 700,
            color: color || '#111827',
            margin: '8px 0 0 0',
            lineHeight: 1
          }}>
            {value}
          </p>
          {subtext && (
            <p style={{ fontSize: '13px', color: '#1f2937', margin: '6px 0 0 0' }}>{subtext}</p>
          )}
        </div>
        {icon && (
          <div style={{ color: color || '#9ca3af', opacity: 0.6 }}>{icon}</div>
        )}
      </div>
    </div>
  );
}

// Project card component
function ProjectCard({ project, onClick }: { project: HvacProject; onClick: () => void }) {
  const statusColors: Record<ProjectStatus, { bg: string; text: string; label: string }> = {
    draft: { bg: '#f3f4f6', text: '#4b5563', label: 'Draft' },
    in_progress: { bg: '#dbeafe', text: '#1d4ed8', label: 'In Progress' },
    review: { bg: '#fef3c7', text: '#d97706', label: 'Review' },
    submitted: { bg: '#d1fae5', text: '#059669', label: 'Submitted' },
    won: { bg: '#dcfce7', text: '#16a34a', label: 'Won' },
    lost: { bg: '#fee2e2', text: '#dc2626', label: 'Lost' },
    archived: { bg: '#f1f5f9', text: '#64748b', label: 'Archived' },
  };

  const status = statusColors[project.status] || statusColors.draft;
  const dueDate = project.due_date ? new Date(project.due_date) : null;
  const now = new Date();
  const isOverdue = dueDate && dueDate < now && !['won', 'lost', 'archived'].includes(project.status);

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        cursor: 'pointer',
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
      {/* Status accent bar */}
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
        <h3 style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#111827',
          margin: 0,
          flex: 1,
          paddingRight: '12px',
        }}>
          {project.name}
        </h3>
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
      </div>

      {/* Details */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {project.client_name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '14px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            {project.client_name}
          </div>
        )}

        {project.building_type && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '14px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {project.building_type.charAt(0).toUpperCase() + project.building_type.slice(1).replace(/_/g, ' ')}
          </div>
        )}

        {project.square_footage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#374151', fontSize: '14px' }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            {project.square_footage.toLocaleString()} sq ft
          </div>
        )}

        {dueDate && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: isOverdue ? '#dc2626' : '#374151',
            fontSize: '14px',
            fontWeight: isOverdue ? 600 : 400,
          }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {isOverdue ? 'Overdue: ' : 'Due: '}{dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </div>
        )}
      </div>

      {/* Footer with estimate value */}
      {project.total_estimated_cost && (
        <div style={{
          marginTop: '16px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '13px', color: '#6b7280' }}>Estimated Value</span>
          <span style={{ fontSize: '18px', fontWeight: 700, color: '#059669' }}>
            {formatCurrency(project.total_estimated_cost)}
          </span>
        </div>
      )}
    </div>
  );
}

// Quick action card
function QuickActionCard({
  title,
  description,
  icon,
  href,
  color
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      style={{
        display: 'block',
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        textDecoration: 'none',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
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
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '10px',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '14px',
        color: color,
      }}>
        {icon}
      </div>
      <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 6px 0' }}>{title}</h3>
      <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>{description}</p>
    </Link>
  );
}

// Activity item
function ActivityItem({
  action,
  project,
  time,
  icon
}: {
  action: string;
  project: string;
  time: string;
  icon: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px',
      padding: '12px 0',
      borderBottom: '1px solid #f3f4f6',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        backgroundColor: '#f3f4f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6b7280',
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: '14px', color: '#111827', margin: 0 }}>
          {action} <strong>{project}</strong>
        </p>
        <p style={{ fontSize: '12px', color: '#9ca3af', margin: '4px 0 0 0' }}>{time}</p>
      </div>
    </div>
  );
}

export default function HvacDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const projects = useHvacStore((s) => s.projects);
  const setProjects = useHvacStore((s) => s.setProjects);

  // Mock data for demonstration - will be replaced with real API calls
  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      // Set some demo projects
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
          created_at: new Date().toISOString(),
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
          created_at: new Date().toISOString(),
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [setProjects]);

  // Calculate stats
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => ['draft', 'in_progress', 'review'].includes(p.status)).length;
  const totalPipelineValue = projects
    .filter(p => !['won', 'lost', 'archived'].includes(p.status))
    .reduce((sum, p) => sum + (p.total_estimated_cost || 0), 0);
  const avgConfidence = projects.filter(p => p.confidence_score).length > 0
    ? Math.round(projects.filter(p => p.confidence_score).reduce((sum, p) => sum + (p.confidence_score || 0), 0) / projects.filter(p => p.confidence_score).length)
    : 0;

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#6b7280',
      }}>
        Loading dashboard...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
          HVAC Estimating Dashboard
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          AI-assisted takeoff and estimating for commercial HVAC projects
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}>
        <StatCard
          label="Total Projects"
          value={totalProjects}
          color="#0ea5e9"
          icon={
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Active Projects"
          value={activeProjects}
          color="#8b5cf6"
          icon={
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
        <StatCard
          label="Pipeline Value"
          value={formatCurrency(totalPipelineValue)}
          color="#059669"
          icon={
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Avg Confidence"
          value={`${avgConfidence}%`}
          subtext="Estimate accuracy"
          color={avgConfidence >= 75 ? '#059669' : avgConfidence >= 50 ? '#f59e0b' : '#ef4444'}
          icon={
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />
      </div>

      {/* Main Content Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Left Column */}
        <div>
          {/* Quick Actions */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
              Quick Actions
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <QuickActionCard
                title="New Project"
                description="Start a new HVAC estimate"
                href="/hvac/projects/new"
                color="#0ea5e9"
                icon={
                  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              />
              <QuickActionCard
                title="Upload Plans"
                description="AI-assisted document extraction"
                href="/hvac/takeoff"
                color="#8b5cf6"
                icon={
                  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                }
              />
              <QuickActionCard
                title="Master Checklist"
                description="Review estimating checklist"
                href="/hvac/checklist"
                color="#f59e0b"
                icon={
                  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                }
              />
              <QuickActionCard
                title="View Estimates"
                description="Browse completed estimates"
                href="/hvac/estimates"
                color="#059669"
                icon={
                  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Recent Projects */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
                Recent Projects
              </h2>
              <Link
                href="/hvac/projects"
                style={{
                  fontSize: '14px',
                  color: '#0ea5e9',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                View all
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {projects.slice(0, 6).map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => {
                    // Navigate to project detail - will implement later
                    window.location.href = `/hvac/projects/${project.id}`;
                  }}
                />
              ))}
              {projects.length === 0 && (
                <div style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '48px 24px',
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
                    No projects yet
                  </h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0' }}>
                    Create your first HVAC estimate project to get started
                  </p>
                  <Link
                    href="/hvac/projects/new"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 20px',
                      backgroundColor: '#0ea5e9',
                      color: 'white',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Project
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Activity & Risk */}
        <div>
          {/* Risk Overview */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px',
            marginBottom: '24px',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 16px 0' }}>
              Risk Overview
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                  }} />
                  <span style={{ fontSize: '14px', color: '#374151' }}>Critical Flags</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>2</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#f59e0b',
                  }} />
                  <span style={{ fontSize: '14px', color: '#374151' }}>Warnings</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#f59e0b' }}>5</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: '#3b82f6',
                  }} />
                  <span style={{ fontSize: '14px', color: '#374151' }}>Info Items</span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 600, color: '#3b82f6' }}>8</span>
              </div>
            </div>
            <Link
              href="/hvac/checklist"
              style={{
                display: 'block',
                textAlign: 'center',
                padding: '10px',
                marginTop: '16px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                color: '#0ea5e9',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Review All Risk Flags
            </Link>
          </div>

          {/* Recent Activity */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '20px',
          }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>
              Recent Activity
            </h2>
            <div>
              <ActivityItem
                action="Estimate updated for"
                project="Downtown Medical Center"
                time="2 hours ago"
                icon={
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                }
              />
              <ActivityItem
                action="AI extraction completed for"
                project="Tech Campus Building B"
                time="5 hours ago"
                icon={
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              <ActivityItem
                action="New project created:"
                project="Riverside Apartments"
                time="1 day ago"
                icon={
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
              />
              <ActivityItem
                action="Checklist completed for"
                project="Office Park Phase 2"
                time="2 days ago"
                icon={
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
