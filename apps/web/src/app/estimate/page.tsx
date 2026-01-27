'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { DetectedArea, DetectedDimension, DetectedMaterial } from '@/lib/blueprint/analysis-types';

interface EstimateLineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  category: 'area' | 'linear' | 'material' | 'labor';
  sourceId?: string;
}

interface BlueprintAnalysisData {
  documentId: string;
  areas: DetectedArea[];
  dimensions: DetectedDimension[];
  materials: DetectedMaterial[];
  timestamp: number;
}

// Default unit prices by type
const DEFAULT_PRICES: Record<string, number> = {
  'parking': 3.50, // per SF
  'sidewalk': 8.50, // per SF
  'curb': 12.00, // per LF
  'striping': 0.35, // per LF
  'concrete': 7.50, // per SF
  'asphalt': 4.00, // per SF
  'roofing': 6.50, // per SF
  'default': 5.00,
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function EstimateHeader({ projectName, onSave, onCreateBid }: {
  projectName: string;
  onSave: () => void;
  onCreateBid: () => void;
}) {
  return (
    <header style={{
      background: 'white',
      borderBottom: '1px solid #e5e7eb',
      padding: '16px 24px',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      flexShrink: 0,
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/blueprint"
            style={{
              padding: '8px',
              color: '#6b7280',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', margin: 0 }}>Estimate Breakdown</h1>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '4px 0 0' }}>{projectName || 'Blueprint Analysis'}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onSave}
            style={{
              padding: '8px 16px',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Draft
          </button>
          <button
            onClick={onCreateBid}
            style={{
              padding: '8px 16px',
              background: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Create Bid
          </button>
        </div>
      </div>
    </header>
  );
}

function LineItemRow({ item, onUpdate, onDelete }: {
  item: EstimateLineItem;
  onUpdate: (id: string, updates: Partial<EstimateLineItem>) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
      <td style={{ padding: '12px 16px' }}>
        {isEditing ? (
          <input
            type="text"
            value={item.description}
            onChange={(e) => onUpdate(item.id, { description: e.target.value })}
            onBlur={() => setIsEditing(false)}
            autoFocus
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            style={{ cursor: 'pointer', color: '#111827', fontWeight: 500 }}
          >
            {item.description}
          </span>
        )}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => {
            const qty = parseFloat(e.target.value) || 0;
            onUpdate(item.id, { quantity: qty, total: qty * item.unitPrice });
          }}
          style={{
            width: '80px',
            padding: '6px 8px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'right',
          }}
        />
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
        {item.unit}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        <input
          type="number"
          value={item.unitPrice}
          step="0.01"
          onChange={(e) => {
            const price = parseFloat(e.target.value) || 0;
            onUpdate(item.id, { unitPrice: price, total: item.quantity * price });
          }}
          style={{
            width: '90px',
            padding: '6px 8px',
            border: '1px solid #e5e7eb',
            borderRadius: '4px',
            fontSize: '14px',
            textAlign: 'right',
          }}
        />
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500, color: '#111827' }}>
        {formatCurrency(item.total)}
      </td>
      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
        <button
          onClick={() => onDelete(item.id)}
          style={{
            padding: '6px',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#9ca3af',
          }}
          onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'}
          onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
        >
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </td>
    </tr>
  );
}

function SummarySection({ lineItems, markup, onMarkupChange }: {
  lineItems: EstimateLineItem[];
  markup: number;
  onMarkupChange: (markup: number) => void;
}) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const markupAmount = subtotal * (markup / 100);
  const total = subtotal + markupAmount;

  // Group by category for breakdown
  const categoryTotals = lineItems.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.total;
    return acc;
  }, {} as Record<string, number>);

  const categoryLabels: Record<string, string> = {
    area: 'Area Work',
    linear: 'Linear Work',
    material: 'Materials',
    labor: 'Labor',
  };

  return (
    <div style={{
      background: 'white',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      overflow: 'hidden',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>Estimate Summary</h3>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Category Breakdown */}
        <div style={{ marginBottom: '16px' }}>
          {Object.entries(categoryTotals).map(([category, amount]) => (
            <div key={category} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ color: '#6b7280', fontSize: '14px' }}>{categoryLabels[category] || category}</span>
              <span style={{ color: '#111827', fontSize: '14px' }}>{formatCurrency(amount)}</span>
            </div>
          ))}
        </div>

        {/* Subtotal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #e5e7eb' }}>
          <span style={{ fontWeight: 500, color: '#111827' }}>Subtotal</span>
          <span style={{ fontWeight: 500, color: '#111827' }}>{formatCurrency(subtotal)}</span>
        </div>

        {/* Markup */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#6b7280' }}>Markup</span>
            <input
              type="number"
              value={markup}
              onChange={(e) => onMarkupChange(parseFloat(e.target.value) || 0)}
              style={{
                width: '60px',
                padding: '4px 8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px',
                textAlign: 'right',
              }}
            />
            <span style={{ color: '#6b7280' }}>%</span>
          </div>
          <span style={{ color: '#111827' }}>{formatCurrency(markupAmount)}</span>
        </div>

        {/* Total */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '16px',
          marginTop: '8px',
          background: '#2563eb',
          borderRadius: '8px',
        }}>
          <span style={{ fontSize: '18px', fontWeight: 600, color: 'white' }}>Total Estimate</span>
          <span style={{ fontSize: '24px', fontWeight: 700, color: 'white' }}>{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  );
}

export default function EstimatePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [analysisData, setAnalysisData] = useState<BlueprintAnalysisData | null>(null);
  const [lineItems, setLineItems] = useState<EstimateLineItem[]>([]);
  const [markup, setMarkup] = useState(15);
  const [projectName, setProjectName] = useState('');

  // Load analysis data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem('blueprintAnalysis');
    if (stored) {
      try {
        const data: BlueprintAnalysisData = JSON.parse(stored);
        setAnalysisData(data);

        // Convert areas to line items
        const items: EstimateLineItem[] = [];

        // Add areas
        if (data.areas) {
          data.areas.forEach((area, index) => {
            const type = area.type.toLowerCase();
            const price = DEFAULT_PRICES[type] || DEFAULT_PRICES['default'];
            const quantity = area.areaSqFt || 0;

            items.push({
              id: `area-${index}`,
              description: area.label || `${area.subType || area.type} - ${area.type}`,
              quantity,
              unit: 'SF',
              unitPrice: price,
              total: quantity * price,
              category: 'area',
              sourceId: area.id,
            });
          });
        }

        // Add dimensions as linear items
        if (data.dimensions) {
          data.dimensions.forEach((dim, index) => {
            if (dim.value > 0) {
              const type = dim.measures?.toLowerCase() || 'linear';
              const price = DEFAULT_PRICES[type] || 2.50;

              items.push({
                id: `dim-${index}`,
                description: `${dim.measures || 'Linear'} - ${dim.text}`,
                quantity: dim.value,
                unit: dim.unit || 'LF',
                unitPrice: price,
                total: dim.value * price,
                category: 'linear',
                sourceId: dim.id,
              });
            }
          });
        }

        // Add materials
        if (data.materials) {
          data.materials.forEach((mat, index) => {
            const price = 50.00; // Default material price
            const quantity = 1;

            items.push({
              id: `mat-${index}`,
              description: `${mat.material}${mat.appliesTo ? ` (${mat.appliesTo})` : ''}`,
              quantity,
              unit: 'EA',
              unitPrice: price,
              total: quantity * price,
              category: 'material',
              sourceId: mat.id,
            });
          });
        }

        setLineItems(items);
      } catch (err) {
        console.error('Failed to parse analysis data:', err);
      }
    }
    setIsLoading(false);
  }, []);

  const updateLineItem = useCallback((id: string, updates: Partial<EstimateLineItem>) => {
    setLineItems((prev) => prev.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const deleteLineItem = useCallback((id: string) => {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addLineItem = useCallback(() => {
    const newItem: EstimateLineItem = {
      id: `custom-${Date.now()}`,
      description: 'New Line Item',
      quantity: 0,
      unit: 'EA',
      unitPrice: 0,
      total: 0,
      category: 'labor',
    };
    setLineItems((prev) => [...prev, newItem]);
  }, []);

  const handleSave = useCallback(() => {
    // Save to localStorage for now
    const estimateData = {
      projectName,
      lineItems,
      markup,
      total: lineItems.reduce((sum, item) => sum + item.total, 0) * (1 + markup / 100),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem('savedEstimate', JSON.stringify(estimateData));
    alert('Estimate saved!');
  }, [projectName, lineItems, markup]);

  const handleCreateBid = useCallback(() => {
    // Store estimate data and navigate to bid creation
    const estimateData = {
      projectName: projectName || 'Blueprint Estimate',
      lineItems,
      markup,
      subtotal: lineItems.reduce((sum, item) => sum + item.total, 0),
      total: lineItems.reduce((sum, item) => sum + item.total, 0) * (1 + markup / 100),
    };
    sessionStorage.setItem('estimateForBid', JSON.stringify(estimateData));
    router.push('/dashboard?createBid=true');
  }, [projectName, lineItems, markup, router]);

  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            margin: '0 auto 16px',
            border: '4px solid #2563eb',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ color: '#4b5563' }}>Loading estimate...</div>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!analysisData && lineItems.length === 0) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <div style={{
          background: 'white',
          padding: '48px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          textAlign: 'center',
          maxWidth: '400px',
        }}>
          <svg style={{ width: '64px', height: '64px', margin: '0 auto 16px', color: '#d1d5db' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#111827', marginBottom: '8px' }}>No Analysis Data</h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Analyze a blueprint with AI first to generate an estimate breakdown.
          </p>
          <Link
            href="/blueprint"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 24px',
              background: '#2563eb',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Go to Blueprints
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      background: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <EstimateHeader
        projectName={projectName}
        onSave={handleSave}
        onCreateBid={handleCreateBid}
      />

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Project Name Input */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#374151', marginBottom: '8px' }}>
              Project Name
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="Enter project name..."
              style={{
                width: '100%',
                maxWidth: '400px',
                padding: '10px 14px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '24px' }}>
            {/* Line Items Table */}
            <div style={{
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              overflow: 'hidden',
            }}>
              <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid #e5e7eb',
                background: '#f9fafb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#111827' }}>
                  Line Items ({lineItems.length})
                </h3>
                <button
                  onClick={addLineItem}
                  style={{
                    padding: '6px 12px',
                    background: '#2563eb',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <svg style={{ width: '14px', height: '14px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' }}>Description</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' }}>Qty</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' }}>Unit</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' }}>Unit Price</th>
                      <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
                      <th style={{ padding: '12px 16px', width: '50px' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <LineItemRow
                        key={item.id}
                        item={item}
                        onUpdate={updateLineItem}
                        onDelete={deleteLineItem}
                      />
                    ))}
                    {lineItems.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '48px', textAlign: 'center', color: '#6b7280' }}>
                          No line items. Add items from blueprint analysis or manually.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <SummarySection
              lineItems={lineItems}
              markup={markup}
              onMarkupChange={setMarkup}
            />
          </div>

          {/* Analysis Source Info */}
          {analysisData && (
            <div style={{
              marginTop: '24px',
              padding: '16px 20px',
              background: '#eff6ff',
              borderRadius: '8px',
              border: '1px solid #bfdbfe',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <svg style={{ width: '20px', height: '20px', color: '#2563eb' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1e40af', fontWeight: 500 }}>
                    Generated from AI Blueprint Analysis
                  </p>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#3b82f6' }}>
                    {analysisData.areas?.length || 0} areas, {analysisData.dimensions?.length || 0} dimensions, {analysisData.materials?.length || 0} materials detected
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
