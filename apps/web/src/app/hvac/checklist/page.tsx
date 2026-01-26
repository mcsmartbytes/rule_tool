'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { ChecklistStatus } from '@/lib/hvac/types';

// Checklist section data based on Master HVAC Estimating Checklist
interface ChecklistItem {
  id: string;
  section: string;
  itemNumber: string;
  text: string;
  status: ChecklistStatus;
  notes?: string;
  flagged?: boolean;
}

interface ChecklistSection {
  id: string;
  title: string;
  description: string;
  items: ChecklistItem[];
}

const INITIAL_CHECKLIST: ChecklistSection[] = [
  {
    id: 'A',
    title: 'Document Review',
    description: 'Initial document completeness and coordination',
    items: [
      { id: 'A1', section: 'A', itemNumber: 'A.1', text: 'All mechanical drawing sheets received and legible', status: 'not_started' },
      { id: 'A2', section: 'A', itemNumber: 'A.2', text: 'Specifications received (Divisions 21, 22, 23, 25, 26)', status: 'not_started' },
      { id: 'A3', section: 'A', itemNumber: 'A.3', text: 'Equipment schedules complete and match drawings', status: 'not_started' },
      { id: 'A4', section: 'A', itemNumber: 'A.4', text: 'Control sequences and points lists provided', status: 'not_started' },
      { id: 'A5', section: 'A', itemNumber: 'A.5', text: 'Energy model or Title 24 compliance documents reviewed', status: 'not_started' },
      { id: 'A6', section: 'A', itemNumber: 'A.6', text: 'Structural coordination drawings reviewed', status: 'not_started' },
      { id: 'A7', section: 'A', itemNumber: 'A.7', text: 'Addenda received and incorporated', status: 'not_started' },
    ],
  },
  {
    id: 'B',
    title: 'Equipment Takeoff',
    description: 'Major equipment identification and pricing',
    items: [
      { id: 'B1', section: 'B', itemNumber: 'B.1', text: 'Air handling units counted and sized', status: 'not_started' },
      { id: 'B2', section: 'B', itemNumber: 'B.2', text: 'Chillers and condensers identified', status: 'not_started' },
      { id: 'B3', section: 'B', itemNumber: 'B.3', text: 'Boilers and water heaters listed', status: 'not_started' },
      { id: 'B4', section: 'B', itemNumber: 'B.4', text: 'Cooling towers and fluid coolers quantified', status: 'not_started' },
      { id: 'B5', section: 'B', itemNumber: 'B.5', text: 'Pumps counted and sized (CHW, HW, CW, condensate)', status: 'not_started' },
      { id: 'B6', section: 'B', itemNumber: 'B.6', text: 'VAV boxes and terminal units counted', status: 'not_started' },
      { id: 'B7', section: 'B', itemNumber: 'B.7', text: 'Fan coil units and unit heaters quantified', status: 'not_started' },
      { id: 'B8', section: 'B', itemNumber: 'B.8', text: 'VRF/VRV outdoor and indoor units listed', status: 'not_started' },
      { id: 'B9', section: 'B', itemNumber: 'B.9', text: 'Exhaust fans and ERVs counted', status: 'not_started' },
      { id: 'B10', section: 'B', itemNumber: 'B.10', text: 'Manufacturer budgets obtained for major equipment', status: 'not_started' },
    ],
  },
  {
    id: 'C',
    title: 'Ductwork Takeoff',
    description: 'Ductwork quantities and specifications',
    items: [
      { id: 'C1', section: 'C', itemNumber: 'C.1', text: 'Supply ductwork measured by size and type', status: 'not_started' },
      { id: 'C2', section: 'C', itemNumber: 'C.2', text: 'Return ductwork measured', status: 'not_started' },
      { id: 'C3', section: 'C', itemNumber: 'C.3', text: 'Exhaust ductwork quantified', status: 'not_started' },
      { id: 'C4', section: 'C', itemNumber: 'C.4', text: 'Outside air ductwork measured', status: 'not_started' },
      { id: 'C5', section: 'C', itemNumber: 'C.5', text: 'Duct insulation requirements identified', status: 'not_started' },
      { id: 'C6', section: 'C', itemNumber: 'C.6', text: 'Duct lining requirements noted', status: 'not_started' },
      { id: 'C7', section: 'C', itemNumber: 'C.7', text: 'Fire/smoke dampers counted', status: 'not_started' },
      { id: 'C8', section: 'C', itemNumber: 'C.8', text: 'Flexible duct quantities estimated', status: 'not_started' },
      { id: 'C9', section: 'C', itemNumber: 'C.9', text: 'Special duct materials identified (SS, aluminum, PVC)', status: 'not_started' },
    ],
  },
  {
    id: 'D',
    title: 'Air Devices',
    description: 'Diffusers, grilles, and registers',
    items: [
      { id: 'D1', section: 'D', itemNumber: 'D.1', text: 'Supply diffusers counted by type and size', status: 'not_started' },
      { id: 'D2', section: 'D', itemNumber: 'D.2', text: 'Return grilles counted', status: 'not_started' },
      { id: 'D3', section: 'D', itemNumber: 'D.3', text: 'Exhaust grilles quantified', status: 'not_started' },
      { id: 'D4', section: 'D', itemNumber: 'D.4', text: 'Linear slot diffusers measured', status: 'not_started' },
      { id: 'D5', section: 'D', itemNumber: 'D.5', text: 'Transfer grilles and louvers counted', status: 'not_started' },
      { id: 'D6', section: 'D', itemNumber: 'D.6', text: 'Special finishes or colors noted', status: 'not_started' },
    ],
  },
  {
    id: 'E',
    title: 'Piping Systems',
    description: 'Hydronic and refrigerant piping',
    items: [
      { id: 'E1', section: 'E', itemNumber: 'E.1', text: 'Chilled water piping measured by size', status: 'not_started' },
      { id: 'E2', section: 'E', itemNumber: 'E.2', text: 'Hot water piping measured', status: 'not_started' },
      { id: 'E3', section: 'E', itemNumber: 'E.3', text: 'Condenser water piping quantified', status: 'not_started' },
      { id: 'E4', section: 'E', itemNumber: 'E.4', text: 'Steam and condensate piping (if applicable)', status: 'not_started' },
      { id: 'E5', section: 'E', itemNumber: 'E.5', text: 'Refrigerant piping for splits/VRF', status: 'not_started' },
      { id: 'E6', section: 'E', itemNumber: 'E.6', text: 'Pipe insulation requirements identified', status: 'not_started' },
      { id: 'E7', section: 'E', itemNumber: 'E.7', text: 'Valves and specialties counted', status: 'not_started' },
      { id: 'E8', section: 'E', itemNumber: 'E.8', text: 'Pipe supports and hangers estimated', status: 'not_started' },
    ],
  },
  {
    id: 'F',
    title: 'Controls & BAS',
    description: 'Building automation and controls',
    items: [
      { id: 'F1', section: 'F', itemNumber: 'F.1', text: 'BAS controllers and panels counted', status: 'not_started' },
      { id: 'F2', section: 'F', itemNumber: 'F.2', text: 'Temperature sensors quantified', status: 'not_started' },
      { id: 'F3', section: 'F', itemNumber: 'F.3', text: 'Pressure sensors counted', status: 'not_started' },
      { id: 'F4', section: 'F', itemNumber: 'F.4', text: 'Flow sensors and meters listed', status: 'not_started' },
      { id: 'F5', section: 'F', itemNumber: 'F.5', text: 'Actuators and valves counted', status: 'not_started' },
      { id: 'F6', section: 'F', itemNumber: 'F.6', text: 'VFDs counted (if in HVAC scope)', status: 'not_started' },
      { id: 'F7', section: 'F', itemNumber: 'F.7', text: 'Control wiring and conduit estimated', status: 'not_started' },
      { id: 'F8', section: 'F', itemNumber: 'F.8', text: 'Graphics and programming scope defined', status: 'not_started' },
    ],
  },
  {
    id: 'G',
    title: 'Special Systems',
    description: 'Specialty HVAC systems and requirements',
    items: [
      { id: 'G1', section: 'G', itemNumber: 'G.1', text: 'Kitchen exhaust and makeup air systems', status: 'not_started' },
      { id: 'G2', section: 'G', itemNumber: 'G.2', text: 'Laboratory fume hood exhaust', status: 'not_started' },
      { id: 'G3', section: 'G', itemNumber: 'G.3', text: 'Clean room or isolation room requirements', status: 'not_started' },
      { id: 'G4', section: 'G', itemNumber: 'G.4', text: 'Data center cooling requirements', status: 'not_started' },
      { id: 'G5', section: 'G', itemNumber: 'G.5', text: 'Humidification systems identified', status: 'not_started' },
      { id: 'G6', section: 'G', itemNumber: 'G.6', text: 'Dehumidification requirements noted', status: 'not_started' },
      { id: 'G7', section: 'G', itemNumber: 'G.7', text: 'Snow melt or radiant systems', status: 'not_started' },
    ],
  },
  {
    id: 'H',
    title: 'Installation Logistics',
    description: 'Site conditions and installation requirements',
    items: [
      { id: 'H1', section: 'H', itemNumber: 'H.1', text: 'Equipment access paths verified', status: 'not_started' },
      { id: 'H2', section: 'H', itemNumber: 'H.2', text: 'Rigging and crane requirements identified', status: 'not_started' },
      { id: 'H3', section: 'H', itemNumber: 'H.3', text: 'Staging areas and material storage reviewed', status: 'not_started' },
      { id: 'H4', section: 'H', itemNumber: 'H.4', text: 'Scaffold and lift requirements estimated', status: 'not_started' },
      { id: 'H5', section: 'H', itemNumber: 'H.5', text: 'After-hours or weekend work requirements', status: 'not_started' },
      { id: 'H6', section: 'H', itemNumber: 'H.6', text: 'Occupied space work considerations', status: 'not_started' },
      { id: 'H7', section: 'H', itemNumber: 'H.7', text: 'Demolition scope identified', status: 'not_started' },
    ],
  },
  {
    id: 'I',
    title: 'Testing & Commissioning',
    description: 'TAB, commissioning, and startup',
    items: [
      { id: 'I1', section: 'I', itemNumber: 'I.1', text: 'TAB scope and requirements defined', status: 'not_started' },
      { id: 'I2', section: 'I', itemNumber: 'I.2', text: 'Commissioning scope clarified', status: 'not_started' },
      { id: 'I3', section: 'I', itemNumber: 'I.3', text: 'Equipment startup responsibilities assigned', status: 'not_started' },
      { id: 'I4', section: 'I', itemNumber: 'I.4', text: 'Training requirements identified', status: 'not_started' },
      { id: 'I5', section: 'I', itemNumber: 'I.5', text: 'O&M manual requirements noted', status: 'not_started' },
      { id: 'I6', section: 'I', itemNumber: 'I.6', text: 'Warranty requirements reviewed', status: 'not_started' },
    ],
  },
  {
    id: 'J',
    title: 'Coordination & Exclusions',
    description: 'Trade coordination and scope clarity',
    items: [
      { id: 'J1', section: 'J', itemNumber: 'J.1', text: 'Electrical connections scope verified', status: 'not_started' },
      { id: 'J2', section: 'J', itemNumber: 'J.2', text: 'Plumbing connections clarified', status: 'not_started' },
      { id: 'J3', section: 'J', itemNumber: 'J.3', text: 'Structural support scope defined', status: 'not_started' },
      { id: 'J4', section: 'J', itemNumber: 'J.4', text: 'Fire protection coordination reviewed', status: 'not_started' },
      { id: 'J5', section: 'J', itemNumber: 'J.5', text: 'Ceiling coordination requirements', status: 'not_started' },
      { id: 'J6', section: 'J', itemNumber: 'J.6', text: 'Exclusions and clarifications documented', status: 'not_started' },
    ],
  },
  {
    id: 'K',
    title: 'Final Review',
    description: 'Final checks before submission',
    items: [
      { id: 'K1', section: 'K', itemNumber: 'K.1', text: 'All quantities double-checked', status: 'not_started' },
      { id: 'K2', section: 'K', itemNumber: 'K.2', text: 'Labor rates and productivity factors verified', status: 'not_started' },
      { id: 'K3', section: 'K', itemNumber: 'K.3', text: 'Material escalation considered', status: 'not_started' },
      { id: 'K4', section: 'K', itemNumber: 'K.4', text: 'Contingency appropriate for risk level', status: 'not_started' },
      { id: 'K5', section: 'K', itemNumber: 'K.5', text: 'Bid form requirements met', status: 'not_started' },
      { id: 'K6', section: 'K', itemNumber: 'K.6', text: 'Estimate reviewed by senior estimator', status: 'not_started' },
    ],
  },
];

type FilterStatus = 'all' | ChecklistStatus;

export default function MasterChecklistPage() {
  const [checklist, setChecklist] = useState<ChecklistSection[]>(INITIAL_CHECKLIST);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['A']));
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('demo-1');

  // Toggle section expansion
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  // Update item status
  const updateItemStatus = (sectionId: string, itemId: string, newStatus: ChecklistStatus) => {
    setChecklist(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item =>
            item.id === itemId ? { ...item, status: newStatus } : item
          ),
        };
      }
      return section;
    }));
  };

  // Toggle item flag
  const toggleItemFlag = (sectionId: string, itemId: string) => {
    setChecklist(prev => prev.map(section => {
      if (section.id === sectionId) {
        return {
          ...section,
          items: section.items.map(item =>
            item.id === itemId ? { ...item, flagged: !item.flagged } : item
          ),
        };
      }
      return section;
    }));
  };

  // Calculate stats
  const stats = useMemo(() => {
    const allItems = checklist.flatMap(s => s.items);
    const total = allItems.length;
    const complete = allItems.filter(i => i.status === 'complete').length;
    const inProgress = allItems.filter(i => i.status === 'in_progress').length;
    const notStarted = allItems.filter(i => i.status === 'not_started').length;
    const notApplicable = allItems.filter(i => i.status === 'not_applicable').length;
    const flagged = allItems.filter(i => i.flagged).length;

    return { total, complete, inProgress, notStarted, notApplicable, flagged };
  }, [checklist]);

  // Filter sections and items
  const filteredSections = useMemo(() => {
    return checklist.map(section => ({
      ...section,
      items: section.items.filter(item => {
        const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
        const matchesSearch = !searchQuery ||
          item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.itemNumber.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
      }),
    })).filter(section => section.items.length > 0);
  }, [checklist, filterStatus, searchQuery]);

  const progressPercent = Math.round((stats.complete / stats.total) * 100);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#111827', margin: '0 0 6px 0' }}>
            Master HVAC Estimating Checklist
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Comprehensive checklist for HVAC project estimating quality control
          </p>
        </div>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          style={{
            padding: '10px 14px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            backgroundColor: 'white',
            minWidth: '280px',
          }}
        >
          <option value="demo-1">Downtown Medical Center HVAC</option>
          <option value="demo-2">Tech Campus Building B</option>
          <option value="demo-3">Riverside Apartments Complex</option>
        </select>
      </div>

      {/* Progress Card */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        padding: '20px',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#111827', margin: 0 }}>
            Overall Progress
          </h2>
          <span style={{ fontSize: '24px', fontWeight: 700, color: '#0ea5e9' }}>
            {progressPercent}%
          </span>
        </div>
        <div style={{ height: '10px', backgroundColor: '#e5e7eb', borderRadius: '5px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{
            width: `${progressPercent}%`,
            height: '100%',
            backgroundColor: '#0ea5e9',
            transition: 'width 0.3s ease',
          }} />
        </div>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <StatBadge label="Complete" value={stats.complete} color="#10b981" />
          <StatBadge label="In Progress" value={stats.inProgress} color="#3b82f6" />
          <StatBadge label="Not Started" value={stats.notStarted} color="#6b7280" />
          <StatBadge label="N/A" value={stats.notApplicable} color="#9ca3af" />
          {stats.flagged > 0 && <StatBadge label="Flagged" value={stats.flagged} color="#ef4444" />}
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '20px',
        alignItems: 'center',
      }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '350px' }}>
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
            placeholder="Search checklist items..."
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
        <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
          {(['all', 'not_started', 'in_progress', 'complete', 'not_applicable'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 14px',
                backgroundColor: filterStatus === status ? 'white' : 'transparent',
                color: filterStatus === status ? '#111827' : '#6b7280',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: filterStatus === status ? 500 : 400,
                boxShadow: filterStatus === status ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
              }}
            >
              {status === 'all' ? 'All' :
               status === 'not_started' ? 'Not Started' :
               status === 'in_progress' ? 'In Progress' :
               status === 'complete' ? 'Complete' : 'N/A'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpandedSections(new Set(checklist.map(s => s.id)))}
          style={{
            padding: '10px 14px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Expand All
        </button>
        <button
          onClick={() => setExpandedSections(new Set())}
          style={{
            padding: '10px 14px',
            backgroundColor: 'white',
            color: '#374151',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Collapse All
        </button>
      </div>

      {/* Checklist Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredSections.map((section) => {
          const isExpanded = expandedSections.has(section.id);
          const sectionComplete = section.items.filter(i => i.status === 'complete').length;
          const sectionTotal = section.items.length;
          const sectionProgress = sectionTotal > 0 ? Math.round((sectionComplete / sectionTotal) * 100) : 0;

          return (
            <div
              key={section.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                overflow: 'hidden',
              }}
            >
              {/* Section Header */}
              <div
                onClick={() => toggleSection(section.id)}
                style={{
                  padding: '16px 20px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  backgroundColor: isExpanded ? '#f9fafb' : 'white',
                  borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none',
                }}
              >
                <svg
                  style={{
                    width: '20px',
                    height: '20px',
                    color: '#6b7280',
                    transition: 'transform 0.2s ease',
                    transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: sectionProgress === 100 ? '#dcfce7' : '#f3f4f6',
                  color: sectionProgress === 100 ? '#16a34a' : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                }}>
                  {section.id}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#111827', margin: '0 0 2px 0' }}>
                    {section.title}
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                    {section.description}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: sectionProgress === 100 ? '#16a34a' : '#374151', margin: '0 0 4px 0' }}>
                    {sectionComplete}/{sectionTotal}
                  </p>
                  <div style={{ width: '80px', height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${sectionProgress}%`,
                      height: '100%',
                      backgroundColor: sectionProgress === 100 ? '#10b981' : '#0ea5e9',
                    }} />
                  </div>
                </div>
              </div>

              {/* Section Items */}
              {isExpanded && (
                <div>
                  {section.items.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        padding: '12px 20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        borderBottom: index < section.items.length - 1 ? '1px solid #f3f4f6' : 'none',
                        backgroundColor: item.flagged ? '#fef2f2' : 'white',
                      }}
                    >
                      {/* Status selector */}
                      <select
                        value={item.status}
                        onChange={(e) => updateItemStatus(section.id, item.id, e.target.value as ChecklistStatus)}
                        style={{
                          padding: '6px 10px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '6px',
                          fontSize: '12px',
                          backgroundColor: item.status === 'complete' ? '#dcfce7' :
                                          item.status === 'in_progress' ? '#dbeafe' :
                                          item.status === 'not_applicable' ? '#f3f4f6' : 'white',
                          color: item.status === 'complete' ? '#16a34a' :
                                 item.status === 'in_progress' ? '#1d4ed8' :
                                 item.status === 'not_applicable' ? '#6b7280' : '#374151',
                          fontWeight: 500,
                          cursor: 'pointer',
                          minWidth: '110px',
                        }}
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="complete">Complete</option>
                        <option value="not_applicable">N/A</option>
                      </select>

                      {/* Item number and text */}
                      <span style={{ fontSize: '13px', color: '#9ca3af', fontWeight: 500, minWidth: '40px' }}>
                        {item.itemNumber}
                      </span>
                      <span style={{
                        flex: 1,
                        fontSize: '14px',
                        color: item.status === 'complete' ? '#6b7280' : '#111827',
                        textDecoration: item.status === 'complete' ? 'line-through' : 'none',
                      }}>
                        {item.text}
                      </span>

                      {/* Flag button */}
                      <button
                        onClick={() => toggleItemFlag(section.id, item.id)}
                        style={{
                          padding: '6px',
                          backgroundColor: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: item.flagged ? '#ef4444' : '#d1d5db',
                        }}
                        title={item.flagged ? 'Remove flag' : 'Flag for review'}
                      >
                        <svg width="18" height="18" fill={item.flagged ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {filteredSections.length === 0 && (
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
            No items found
          </h3>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
}

// Stat badge component
function StatBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: color,
      }} />
      <span style={{ fontSize: '14px', color: '#374151' }}>
        <strong>{value}</strong> {label}
      </span>
    </div>
  );
}
