'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { EquipmentType, DuctworkType, AirDeviceType, ControlType, PipingType } from '@/lib/hvac/types';

// Format currency helper
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

type TakeoffTab = 'equipment' | 'ductwork' | 'air_devices' | 'controls' | 'piping';

const TAKEOFF_TABS: { id: TakeoffTab; label: string; icon: React.ReactNode }[] = [
  {
    id: 'equipment',
    label: 'Equipment',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
  },
  {
    id: 'ductwork',
    label: 'Ductwork',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
      </svg>
    ),
  },
  {
    id: 'air_devices',
    label: 'Air Devices',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
  },
  {
    id: 'controls',
    label: 'Controls',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'piping',
    label: 'Piping',
    icon: (
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

// Equipment type labels
const EQUIPMENT_TYPES: { value: EquipmentType; label: string }[] = [
  { value: 'ahu', label: 'Air Handling Unit' },
  { value: 'rtu', label: 'Rooftop Unit' },
  { value: 'chiller', label: 'Chiller' },
  { value: 'boiler', label: 'Boiler' },
  { value: 'cooling_tower', label: 'Cooling Tower' },
  { value: 'pump', label: 'Pump' },
  { value: 'fan', label: 'Fan' },
  { value: 'vav_box', label: 'VAV Box' },
  { value: 'fcu', label: 'Fan Coil Unit' },
  { value: 'heat_pump', label: 'Heat Pump' },
  { value: 'vrf_outdoor', label: 'VRF Outdoor Unit' },
  { value: 'vrf_indoor', label: 'VRF Indoor Unit' },
  { value: 'exhaust_fan', label: 'Exhaust Fan' },
  { value: 'erv', label: 'Energy Recovery Ventilator' },
  { value: 'humidifier', label: 'Humidifier' },
  { value: 'dehumidifier', label: 'Dehumidifier' },
  { value: 'unit_heater', label: 'Unit Heater' },
  { value: 'cabinet_heater', label: 'Cabinet Heater' },
  { value: 'other', label: 'Other' },
];

// Ductwork type labels
const DUCTWORK_TYPES: { value: DuctworkType; label: string }[] = [
  { value: 'supply', label: 'Supply' },
  { value: 'return', label: 'Return' },
  { value: 'exhaust', label: 'Exhaust' },
  { value: 'outside_air', label: 'Outside Air' },
  { value: 'relief', label: 'Relief' },
  { value: 'transfer', label: 'Transfer' },
];

// Demo data
interface EquipmentItem {
  id: string;
  type: EquipmentType;
  tag: string;
  model: string;
  manufacturer: string;
  capacity: string;
  quantity: number;
  unitCost: number;
  laborHours: number;
  confidence: number;
  notes: string;
}

interface DuctworkItem {
  id: string;
  type: DuctworkType;
  size: string;
  shape: 'rectangular' | 'round' | 'oval';
  length: number;
  insulation: string;
  material: string;
  unitCost: number;
  laborHours: number;
  confidence: number;
}

interface AirDeviceItem {
  id: string;
  type: string;
  size: string;
  cfm: number;
  quantity: number;
  unitCost: number;
  confidence: number;
}

export default function TakeoffEditorPage() {
  const [activeTab, setActiveTab] = useState<TakeoffTab>('equipment');
  const [selectedProject, setSelectedProject] = useState<string>('demo-1');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Demo equipment data
  const [equipment] = useState<EquipmentItem[]>([
    { id: '1', type: 'ahu', tag: 'AHU-1', model: 'M-Series 50T', manufacturer: 'Trane', capacity: '50 tons', quantity: 1, unitCost: 45000, laborHours: 80, confidence: 90, notes: '' },
    { id: '2', type: 'ahu', tag: 'AHU-2', model: 'M-Series 50T', manufacturer: 'Trane', capacity: '50 tons', quantity: 1, unitCost: 45000, laborHours: 80, confidence: 90, notes: '' },
    { id: '3', type: 'ahu', tag: 'AHU-3', model: 'M-Series 35T', manufacturer: 'Trane', capacity: '35 tons', quantity: 1, unitCost: 38000, laborHours: 72, confidence: 85, notes: '' },
    { id: '4', type: 'chiller', tag: 'CH-1', model: '30XA-200', manufacturer: 'Carrier', capacity: '200 tons', quantity: 1, unitCost: 175000, laborHours: 120, confidence: 92, notes: '' },
    { id: '5', type: 'chiller', tag: 'CH-2', model: '30XA-200', manufacturer: 'Carrier', capacity: '200 tons', quantity: 1, unitCost: 175000, laborHours: 120, confidence: 92, notes: '' },
    { id: '6', type: 'boiler', tag: 'B-1', model: 'CB-2000', manufacturer: 'Cleaver-Brooks', capacity: '2000 MBH', quantity: 1, unitCost: 85000, laborHours: 96, confidence: 88, notes: '' },
    { id: '7', type: 'boiler', tag: 'B-2', model: 'CB-2000', manufacturer: 'Cleaver-Brooks', capacity: '2000 MBH', quantity: 1, unitCost: 85000, laborHours: 96, confidence: 88, notes: '' },
    { id: '8', type: 'cooling_tower', tag: 'CT-1', model: 'Series 3000', manufacturer: 'Marley', capacity: '450 tons', quantity: 1, unitCost: 125000, laborHours: 160, confidence: 85, notes: '' },
    { id: '9', type: 'vav_box', tag: 'VAV-1 thru 48', model: 'TVS', manufacturer: 'Trane', capacity: '400-2400 CFM', quantity: 48, unitCost: 1800, laborHours: 4, confidence: 78, notes: 'Various sizes' },
    { id: '10', type: 'pump', tag: 'CWP-1,2', model: 'e-1510', manufacturer: 'Bell & Gossett', capacity: '500 GPM', quantity: 2, unitCost: 12000, laborHours: 24, confidence: 82, notes: '' },
  ]);

  // Demo ductwork data
  const [ductwork] = useState<DuctworkItem[]>([
    { id: '1', type: 'supply', size: '48x24', shape: 'rectangular', length: 450, insulation: '2" Exterior', material: 'Galvanized', unitCost: 28, laborHours: 0.15, confidence: 85 },
    { id: '2', type: 'supply', size: '36x18', shape: 'rectangular', length: 680, insulation: '2" Exterior', material: 'Galvanized', unitCost: 22, laborHours: 0.12, confidence: 82 },
    { id: '3', type: 'supply', size: '24x12', shape: 'rectangular', length: 1250, insulation: '1" Lined', material: 'Galvanized', unitCost: 16, laborHours: 0.10, confidence: 80 },
    { id: '4', type: 'return', size: '60x30', shape: 'rectangular', length: 320, insulation: 'None', material: 'Galvanized', unitCost: 32, laborHours: 0.18, confidence: 88 },
    { id: '5', type: 'return', size: '36x24', shape: 'rectangular', length: 580, insulation: 'None', material: 'Galvanized', unitCost: 24, laborHours: 0.14, confidence: 85 },
    { id: '6', type: 'exhaust', size: '18" dia', shape: 'round', length: 420, insulation: 'None', material: 'Galvanized', unitCost: 14, laborHours: 0.08, confidence: 90 },
    { id: '7', type: 'outside_air', size: '30x24', shape: 'rectangular', length: 180, insulation: '2" Exterior', material: 'Galvanized', unitCost: 26, laborHours: 0.16, confidence: 78 },
  ]);

  // Demo air devices data
  const [airDevices] = useState<AirDeviceItem[]>([
    { id: '1', type: 'Supply Diffuser', size: '24x24', cfm: 800, quantity: 85, unitCost: 145, confidence: 88 },
    { id: '2', type: 'Supply Diffuser', size: '12x12', cfm: 350, quantity: 42, unitCost: 95, confidence: 85 },
    { id: '3', type: 'Linear Slot Diffuser', size: '4-slot 48"', cfm: 600, quantity: 24, unitCost: 285, confidence: 82 },
    { id: '4', type: 'Return Grille', size: '24x24', cfm: 1000, quantity: 48, unitCost: 85, confidence: 90 },
    { id: '5', type: 'Return Grille', size: '18x18', cfm: 600, quantity: 36, unitCost: 65, confidence: 88 },
    { id: '6', type: 'Exhaust Grille', size: '12x12', cfm: 300, quantity: 28, unitCost: 55, confidence: 85 },
    { id: '7', type: 'Transfer Grille', size: '8x8', cfm: 150, quantity: 15, unitCost: 45, confidence: 80 },
  ]);

  // Calculate totals
  const equipmentTotal = equipment.reduce((sum, e) => sum + (e.unitCost * e.quantity), 0);
  const equipmentLaborHours = equipment.reduce((sum, e) => sum + (e.laborHours * e.quantity), 0);
  const ductworkTotal = ductwork.reduce((sum, d) => sum + (d.unitCost * d.length), 0);
  const ductworkLaborHours = ductwork.reduce((sum, d) => sum + (d.laborHours * d.length), 0);
  const airDevicesTotal = airDevices.reduce((sum, a) => sum + (a.unitCost * a.quantity), 0);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#111827', margin: '0 0 4px 0' }}>
            Takeoff Editor
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
            Manage equipment, ductwork, air devices, controls, and piping
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Project selector */}
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            style={{
              padding: '10px 14px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: 'white',
              minWidth: '250px',
            }}
          >
            <option value="demo-1">Downtown Medical Center HVAC</option>
            <option value="demo-2">Tech Campus Building B</option>
            <option value="demo-3">Riverside Apartments Complex</option>
          </select>
          <button
            onClick={() => setIsAddModalOpen(true)}
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
          <button
            style={{
              padding: '10px 16px',
              backgroundColor: '#8b5cf6',
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            AI Extract
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div style={{
        padding: '12px 24px',
        backgroundColor: '#f8fafc',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        gap: '32px',
      }}>
        <div>
          <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Equipment</span>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#059669', margin: '2px 0 0 0' }}>{formatCurrency(equipmentTotal)}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ductwork</span>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#059669', margin: '2px 0 0 0' }}>{formatCurrency(ductworkTotal)}</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Air Devices</span>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#059669', margin: '2px 0 0 0' }}>{formatCurrency(airDevicesTotal)}</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Labor Hours</span>
          <p style={{ fontSize: '16px', fontWeight: 600, color: '#0ea5e9', margin: '2px 0 0 0' }}>{Math.round(equipmentLaborHours + ductworkLaborHours).toLocaleString()} hrs</p>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Grand Total</span>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#111827', margin: '2px 0 0 0' }}>{formatCurrency(equipmentTotal + ductworkTotal + airDevicesTotal)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        padding: '0 24px',
        backgroundColor: 'white',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        gap: '4px',
      }}>
        {TAKEOFF_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 16px',
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

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* Equipment Tab */}
        {activeTab === 'equipment' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={thStyle}>Tag</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Manufacturer</th>
                  <th style={thStyle}>Model</th>
                  <th style={thStyle}>Capacity</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Qty</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Labor Hrs</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Confidence</th>
                  <th style={{ ...thStyle, width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{item.tag}</td>
                    <td style={tdStyle}>{EQUIPMENT_TYPES.find(t => t.value === item.type)?.label || item.type}</td>
                    <td style={tdStyle}>{item.manufacturer}</td>
                    <td style={tdStyle}>{item.model}</td>
                    <td style={tdStyle}>{item.capacity}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(item.unitCost)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{item.laborHours}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <ConfidenceBadge value={item.confidence} />
                    </td>
                    <td style={tdStyle}>
                      <button style={actionBtnStyle}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td colSpan={5} style={{ ...tdStyle, fontWeight: 600 }}>Totals</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                    {equipment.reduce((sum, e) => sum + e.quantity, 0)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                    {formatCurrency(equipmentTotal)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                    {equipmentLaborHours.toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Ductwork Tab */}
        {activeTab === 'ductwork' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Size</th>
                  <th style={thStyle}>Shape</th>
                  <th style={thStyle}>Material</th>
                  <th style={thStyle}>Insulation</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Length (LF)</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>$/LF</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Hrs/LF</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Confidence</th>
                  <th style={{ ...thStyle, width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {ductwork.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}>
                        <span style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: item.type === 'supply' ? '#3b82f6' : item.type === 'return' ? '#10b981' : item.type === 'exhaust' ? '#ef4444' : '#f59e0b',
                        }} />
                        {DUCTWORK_TYPES.find(t => t.value === item.type)?.label || item.type}
                      </span>
                    </td>
                    <td style={tdStyle}>{item.size}</td>
                    <td style={{ ...tdStyle, textTransform: 'capitalize' }}>{item.shape}</td>
                    <td style={tdStyle}>{item.material}</td>
                    <td style={tdStyle}>{item.insulation}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{item.length.toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>${item.unitCost}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{item.laborHours}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <ConfidenceBadge value={item.confidence} />
                    </td>
                    <td style={tdStyle}>
                      <button style={actionBtnStyle}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td colSpan={5} style={{ ...tdStyle, fontWeight: 600 }}>Totals</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                    {ductwork.reduce((sum, d) => sum + d.length, 0).toLocaleString()} LF
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                    {formatCurrency(ductworkTotal)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                    {Math.round(ductworkLaborHours).toLocaleString()}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Air Devices Tab */}
        {activeTab === 'air_devices' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            overflow: 'hidden',
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Size</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>CFM</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Quantity</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Unit Cost</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Extended</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Confidence</th>
                  <th style={{ ...thStyle, width: '60px' }}></th>
                </tr>
              </thead>
              <tbody>
                {airDevices.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{item.type}</td>
                    <td style={tdStyle}>{item.size}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{item.cfm.toLocaleString()}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatCurrency(item.unitCost)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>{formatCurrency(item.unitCost * item.quantity)}</td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <ConfidenceBadge value={item.confidence} />
                    </td>
                    <td style={tdStyle}>
                      <button style={actionBtnStyle}>
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td colSpan={3} style={{ ...tdStyle, fontWeight: 600 }}>Totals</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>
                    {airDevices.reduce((sum, a) => sum + a.quantity, 0)}
                  </td>
                  <td style={tdStyle}></td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                    {formatCurrency(airDevicesTotal)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Controls Tab */}
        {activeTab === 'controls' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '60px',
            textAlign: 'center',
          }}>
            <svg
              style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
              Controls Takeoff
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
              Add BAS controllers, sensors, actuators, and other control components
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Add Control Item
            </button>
          </div>
        )}

        {/* Piping Tab */}
        {activeTab === 'piping' && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            padding: '60px',
            textAlign: 'center',
          }}>
            <svg
              style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#374151', margin: '0 0 8px 0' }}>
              Piping Takeoff
            </h3>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 20px 0' }}>
              Add chilled water, hot water, condensate, and refrigerant piping
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                padding: '12px 24px',
                backgroundColor: '#0ea5e9',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Add Piping Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const thStyle: React.CSSProperties = {
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  borderBottom: '1px solid #e5e7eb',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  fontSize: '14px',
  color: '#374151',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '6px',
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#9ca3af',
  borderRadius: '4px',
};

// Confidence badge component
function ConfidenceBadge({ value }: { value: number }) {
  return (
    <span style={{
      padding: '2px 8px',
      fontSize: '12px',
      fontWeight: 500,
      borderRadius: '4px',
      backgroundColor: value >= 85 ? '#dcfce7' : value >= 70 ? '#fef3c7' : '#fee2e2',
      color: value >= 85 ? '#16a34a' : value >= 70 ? '#d97706' : '#dc2626',
    }}>
      {value}%
    </span>
  );
}
