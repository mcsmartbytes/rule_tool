'use client';

import { useSiteStore } from '@/lib/site/store';
import type { SiteObject, SiteObjectType, Trade, Service } from '@/lib/supabase/types';

// Object type display info
const OBJECT_TYPE_INFO: Record<SiteObjectType, { label: string; icon: string; category: string }> = {
  // Surfaces
  'parking-surface': { label: 'Parking Surface', icon: '🅿️', category: 'Surfaces' },
  'drive-lane': { label: 'Drive Lane', icon: '🛣️', category: 'Surfaces' },
  'loading-area': { label: 'Loading Area', icon: '📦', category: 'Surfaces' },
  'sidewalk': { label: 'Sidewalk', icon: '🚶', category: 'Surfaces' },
  'plaza': { label: 'Plaza', icon: '🏛️', category: 'Surfaces' },
  // Linear
  'curb': { label: 'Curb', icon: '➖', category: 'Linear' },
  'gutter': { label: 'Gutter', icon: '〰️', category: 'Linear' },
  'edge-line': { label: 'Edge Line', icon: '📏', category: 'Linear' },
  'crack': { label: 'Crack', icon: '⚡', category: 'Linear' },
  // Points
  'drain': { label: 'Drain', icon: '🕳️', category: 'Points' },
  'bollard': { label: 'Bollard', icon: '🔶', category: 'Points' },
  'light-pole': { label: 'Light Pole', icon: '💡', category: 'Points' },
  'sign': { label: 'Sign', icon: '🪧', category: 'Points' },
  // Structures
  'building-footprint': { label: 'Building', icon: '🏢', category: 'Structures' },
  'median': { label: 'Median', icon: '🔲', category: 'Structures' },
  'island': { label: 'Island', icon: '🏝️', category: 'Structures' },
  // Markings
  'ada-ramp': { label: 'ADA Ramp', icon: '♿', category: 'Markings' },
  'ada-space': { label: 'ADA Space', icon: '♿', category: 'Markings' },
  'fire-lane': { label: 'Fire Lane', icon: '🚒', category: 'Markings' },
  'crosswalk': { label: 'Crosswalk', icon: '🚸', category: 'Markings' },
  'parking-stall': { label: 'Parking Stall', icon: '🚗', category: 'Markings' },
  'stall-group': { label: 'Stall Group', icon: '🚗', category: 'Markings' },
  'directional-arrow': { label: 'Arrow', icon: '➡️', category: 'Markings' },
  'symbol': { label: 'Symbol', icon: '⭐', category: 'Markings' },
};

function formatMeasurement(obj: { measurements: { area?: number; length?: number; count?: number; perimeter?: number } }): string {
  if (obj.measurements.area) {
    return `${obj.measurements.area.toLocaleString()} sq ft`;
  }
  if (obj.measurements.length) {
    return `${obj.measurements.length.toLocaleString()} ft`;
  }
  if (obj.measurements.count) {
    return `${obj.measurements.count} ea`;
  }
  return '';
}

function formatCurrency(amount: number): string {
  return '$' + amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Calculate costs for a specific object
interface ObjectCostBreakdown {
  tradeName: string;
  tradeCode: string;
  serviceName: string;
  quantity: number;
  unit: string;
  unitRate: number;
  laborCost: number;
  materialCost: number;
  equipmentCost: number;
  subtotal: number;
  formula: string;
}

function calculateObjectCosts(
  obj: SiteObject,
  trades: Trade[],
  services: Service[]
): ObjectCostBreakdown[] {
  const breakdowns: ObjectCostBreakdown[] = [];

  for (const trade of trades) {
    const consumes = trade.consumes as Array<{
      objectType: SiteObjectType;
      subTypes?: string[];
      quantitySource: string;
      serviceId: string;
      wasteFactor?: number;
    }>;

    if (!consumes) continue;

    for (const mapping of consumes) {
      // Check if this mapping applies to our object
      if (mapping.objectType !== obj.object_type) continue;
      if (mapping.subTypes && mapping.subTypes.length > 0) {
        if (!obj.sub_type || !mapping.subTypes.includes(obj.sub_type)) continue;
      }

      // Find the service
      const service = services.find((s) => s.id === mapping.serviceId);
      if (!service) continue;

      // Calculate quantity
      let quantity = 0;
      let unit = 'ea';
      let formula = '';

      switch (mapping.quantitySource) {
        case 'area':
          quantity = obj.measurements.area || 0;
          unit = 'sq ft';
          formula = `Area: ${quantity.toLocaleString()} sq ft`;
          break;
        case 'perimeter':
          quantity = obj.measurements.perimeter || 0;
          unit = 'lin ft';
          formula = `Perimeter: ${quantity.toLocaleString()} lin ft`;
          break;
        case 'length':
          quantity = obj.measurements.length || 0;
          unit = 'lin ft';
          formula = `Length: ${quantity.toLocaleString()} lin ft`;
          break;
        case 'count':
          quantity = obj.measurements.count || 1;
          unit = 'ea';
          formula = `Count: ${quantity}`;
          break;
        default:
          quantity = 1;
          unit = 'ea';
          formula = `Fixed: 1 ea`;
      }

      // Apply waste factor
      const wasteFactor = mapping.wasteFactor || 1;
      if (wasteFactor !== 1) {
        formula += ` × ${wasteFactor} waste factor`;
        quantity = quantity * wasteFactor;
      }

      // Get rates from service
      const laborRate = (service.labor_rate || 0);
      const materialRate = (service.material_cost || 0);
      const equipmentRate = (service.equipment_cost_hourly || 0);
      const unitRate = laborRate + materialRate + equipmentRate;

      const laborCost = quantity * laborRate;
      const materialCost = quantity * materialRate;
      const equipmentCost = quantity * equipmentRate;
      const subtotal = laborCost + materialCost + equipmentCost;

      breakdowns.push({
        tradeName: trade.name,
        tradeCode: trade.code,
        serviceName: service.name,
        quantity,
        unit,
        unitRate,
        laborCost,
        materialCost,
        equipmentCost,
        subtotal,
        formula,
      });
    }
  }

  return breakdowns;
}

// Selected object detail panel
function ObjectDetailPanel({ obj, onClose }: { obj: SiteObject; onClose: () => void }) {
  const trades = useSiteStore((s) => s.trades);
  const services = useSiteStore((s) => s.services);
  const removeObject = useSiteStore((s) => s.removeObject);

  const info = OBJECT_TYPE_INFO[obj.object_type] || { label: obj.object_type, icon: '📍', category: 'Other' };
  const costBreakdowns = calculateObjectCosts(obj, trades, services);
  const totalCost = costBreakdowns.reduce((sum, b) => sum + b.subtotal, 0);

  return (
    <div className="object-detail-panel">
      <div className="object-detail-header" onClick={onClose} style={{ cursor: 'pointer' }}>
        <div className="object-detail-title">
          <span className="object-icon-lg">{info.icon}</span>
          <div>
            <h3>{obj.label || info.label}</h3>
            {obj.sub_type && <span className="object-subtype-lg">{obj.sub_type}</span>}
          </div>
        </div>
        <span className="object-detail-collapse" title="Click to collapse">▲</span>
      </div>

      {/* Measurements Section */}
      <div className="object-detail-section">
        <h4>Measurements</h4>
        <div className="measurement-grid">
          {obj.measurements.area && (
            <div className="measurement-item">
              <span className="measurement-label">Area</span>
              <span className="measurement-value">{obj.measurements.area.toLocaleString()} sq ft</span>
            </div>
          )}
          {obj.measurements.perimeter && (
            <div className="measurement-item">
              <span className="measurement-label">Perimeter</span>
              <span className="measurement-value">{obj.measurements.perimeter.toLocaleString()} lin ft</span>
            </div>
          )}
          {obj.measurements.length && (
            <div className="measurement-item">
              <span className="measurement-label">Length</span>
              <span className="measurement-value">{obj.measurements.length.toLocaleString()} lin ft</span>
            </div>
          )}
          {obj.measurements.count && (
            <div className="measurement-item">
              <span className="measurement-label">Count</span>
              <span className="measurement-value">{obj.measurements.count} ea</span>
            </div>
          )}
        </div>
      </div>

      {/* Cost Breakdown Section */}
      {costBreakdowns.length > 0 ? (
        <div className="object-detail-section">
          <h4>Cost Breakdown</h4>
          {costBreakdowns.map((breakdown, idx) => (
            <div key={idx} className="cost-breakdown-card">
              <div className="cost-breakdown-header">
                <span className="trade-badge">{breakdown.tradeCode}</span>
                <span className="service-name">{breakdown.serviceName}</span>
              </div>

              <div className="cost-formula">
                <div className="formula-row">
                  <span className="formula-label">Quantity:</span>
                  <span className="formula-value">{breakdown.formula}</span>
                </div>
                <div className="formula-row">
                  <span className="formula-label">Unit Rate:</span>
                  <span className="formula-value">{formatCurrency(breakdown.unitRate)} / {breakdown.unit}</span>
                </div>
              </div>

              <div className="cost-calculation">
                <div className="calc-row">
                  <span>Labor ({breakdown.quantity.toLocaleString()} × ${(breakdown.laborCost / breakdown.quantity || 0).toFixed(2)})</span>
                  <span>{formatCurrency(breakdown.laborCost)}</span>
                </div>
                <div className="calc-row">
                  <span>Material ({breakdown.quantity.toLocaleString()} × ${(breakdown.materialCost / breakdown.quantity || 0).toFixed(2)})</span>
                  <span>{formatCurrency(breakdown.materialCost)}</span>
                </div>
                {breakdown.equipmentCost > 0 && (
                  <div className="calc-row">
                    <span>Equipment</span>
                    <span>{formatCurrency(breakdown.equipmentCost)}</span>
                  </div>
                )}
                <div className="calc-row total">
                  <span>Subtotal</span>
                  <span>{formatCurrency(breakdown.subtotal)}</span>
                </div>
              </div>
            </div>
          ))}

          <div className="object-total">
            <span>Total for this object</span>
            <span className="object-total-amount">{formatCurrency(totalCost)}</span>
          </div>
        </div>
      ) : (
        <div className="object-detail-section">
          <h4>Cost Breakdown</h4>
          <p className="no-costs-msg">No services configured for this object type yet.</p>
        </div>
      )}

      {/* Source Info */}
      {obj.source && (
        <div className="object-detail-section">
          <h4>Source</h4>
          <div className="source-info">
            <span className={`source-badge ${obj.source}`}>
              {obj.source === 'ai-suggested' ? '🤖 AI Detected' :
               obj.source === 'manual' ? '✏️ Manual' : obj.source}
            </span>
            {obj.confidence && (
              <span className="confidence-badge">
                {Math.round(obj.confidence * 100)}% confidence
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="object-detail-actions">
        <button
          className="btn btn-danger btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            removeObject(obj.id);
            onClose();
          }}
        >
          Delete Object
        </button>
      </div>

      <style jsx>{`
        .object-detail-panel {
          background: #1f2937;
          border-radius: 8px;
          margin-bottom: 12px;
          overflow: hidden;
        }

        .object-detail-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: #374151;
          border-bottom: 1px solid #4b5563;
        }

        .object-detail-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .object-icon-lg {
          font-size: 24px;
        }

        .object-detail-title h3 {
          margin: 0;
          font-size: 16px;
          color: white;
        }

        .object-subtype-lg {
          font-size: 12px;
          color: #9ca3af;
        }

        .object-detail-collapse {
          color: #9ca3af;
          font-size: 14px;
          padding: 0 8px;
          transition: transform 0.2s ease;
        }

        .object-detail-header:hover .object-detail-collapse {
          color: white;
        }

        .object-detail-section {
          padding: 12px;
          border-bottom: 1px solid #374151;
        }

        .object-detail-section:last-child {
          border-bottom: none;
        }

        .object-detail-section h4 {
          margin: 0 0 10px 0;
          font-size: 12px;
          text-transform: uppercase;
          color: #9ca3af;
          letter-spacing: 0.5px;
        }

        .measurement-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .measurement-item {
          background: #374151;
          padding: 8px 10px;
          border-radius: 6px;
        }

        .measurement-label {
          display: block;
          font-size: 11px;
          color: #9ca3af;
          margin-bottom: 2px;
        }

        .measurement-value {
          font-size: 14px;
          font-weight: 600;
          color: white;
        }

        .cost-breakdown-card {
          background: #374151;
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 8px;
        }

        .cost-breakdown-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .trade-badge {
          background: #6366f1;
          color: white;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .service-name {
          font-size: 13px;
          color: white;
          font-weight: 500;
        }

        .cost-formula {
          background: #1f2937;
          border-radius: 4px;
          padding: 8px;
          margin-bottom: 8px;
        }

        .formula-row {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          margin-bottom: 4px;
        }

        .formula-row:last-child {
          margin-bottom: 0;
        }

        .formula-label {
          color: #9ca3af;
        }

        .formula-value {
          color: #60a5fa;
          font-family: monospace;
        }

        .cost-calculation {
          font-size: 12px;
        }

        .calc-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          color: #d1d5db;
        }

        .calc-row.total {
          border-top: 1px solid #4b5563;
          margin-top: 4px;
          padding-top: 8px;
          font-weight: 600;
          color: #10b981;
        }

        .object-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #065f46;
          padding: 10px 12px;
          border-radius: 6px;
          margin-top: 8px;
        }

        .object-total span:first-child {
          font-size: 13px;
          color: #a7f3d0;
        }

        .object-total-amount {
          font-size: 18px;
          font-weight: 700;
          color: white;
        }

        .no-costs-msg {
          color: #9ca3af;
          font-size: 13px;
          font-style: italic;
        }

        .source-info {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .source-badge {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          background: #374151;
          color: #d1d5db;
        }

        .source-badge.ai-suggested {
          background: #312e81;
          color: #c7d2fe;
        }

        .confidence-badge {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          background: #374151;
          color: #fbbf24;
        }

        .object-detail-actions {
          padding: 12px;
          display: flex;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

export function ObjectPanel() {
  const objects = useSiteStore((s) => s.objects);
  const selectedObjectId = useSiteStore((s) => s.selectedObjectId);
  const selectObject = useSiteStore((s) => s.selectObject);
  const removeObject = useSiteStore((s) => s.removeObject);
  const clearObjects = useSiteStore((s) => s.clearObjects);

  // Get selected object
  const selectedObject = objects.find((obj) => obj.id === selectedObjectId);

  // Group objects by category
  const objectsByCategory = objects.reduce((acc, obj) => {
    const info = OBJECT_TYPE_INFO[obj.object_type] || { category: 'Other' };
    if (!acc[info.category]) acc[info.category] = [];
    acc[info.category].push(obj);
    return acc;
  }, {} as Record<string, typeof objects>);

  const categories = Object.keys(objectsByCategory).sort();

  return (
    <div className="object-panel">
      <div className="object-panel-header">
        <h2>Site Objects</h2>
        <span className="object-count">{objects.length}</span>
      </div>

      {/* Selected Object Detail */}
      {selectedObject && (
        <ObjectDetailPanel
          obj={selectedObject}
          onClose={() => selectObject(null)}
        />
      )}

      {objects.length === 0 ? (
        <div className="object-panel-empty">
          <p>No objects yet</p>
          <p className="text-muted">Draw on the map to add objects</p>
        </div>
      ) : (
        <>
          <div className="object-panel-list">
            {categories.map((category) => (
              <div key={category} className="object-category">
                <div className="object-category-header">{category}</div>
                {objectsByCategory[category].map((obj) => {
                  const info = OBJECT_TYPE_INFO[obj.object_type] || { label: obj.object_type, icon: '📍' };
                  const isSelected = obj.id === selectedObjectId;

                  return (
                    <div
                      key={obj.id}
                      className={`object-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => selectObject(isSelected ? null : obj.id)}
                    >
                      <span className="object-icon">{info.icon}</span>
                      <div className="object-info">
                        <div className="object-name">
                          {obj.label || info.label}
                          {obj.sub_type && <span className="object-subtype">({obj.sub_type})</span>}
                        </div>
                        <div className="object-measurement">{formatMeasurement(obj)}</div>
                      </div>
                      <span className="object-expand-indicator">{isSelected ? '▲' : '▼'}</span>
                      <button
                        className="object-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeObject(obj.id);
                        }}
                        title="Delete object"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="object-panel-footer">
            <button className="btn btn-sm btn-danger" onClick={clearObjects}>
              Clear All
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ObjectPanel;
