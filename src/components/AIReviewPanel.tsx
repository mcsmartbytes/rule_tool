'use client';

import { useState, useMemo } from 'react';
import type { AIDetectedFeature } from '@/lib/ai/types';
import * as turf from '@turf/turf';

interface AIReviewPanelProps {
  features: AIDetectedFeature[];
  onApprove: (features: AIDetectedFeature[]) => void;
  onReject: (featureIds: string[]) => void;
  onClose: () => void;
  onHover?: (featureId: string | null) => void;
}

// Icons for object types
const TYPE_ICONS: Record<string, string> = {
  'parking-surface': '🅿️',
  'drive-lane': '🛣️',
  'loading-area': '📦',
  'sidewalk': '🚶',
  'plaza': '🏛️',
  'curb': '➖',
  'crack': '⚡',
  'edge-line': '📏',
  'fire-lane': '🚒',
  'building-footprint': '🏢',
  'median': '🔲',
  'island': '🏝️',
  'ada-ramp': '♿',
  'ada-space': '♿',
  'parking-stall': '🚗',
  'crosswalk': '🚸',
  'directional-arrow': '➡️',
  'symbol': '⭐',
};

// Calculate measurement from geometry
function getMeasurement(geometry: GeoJSON.Geometry): { value: number; unit: string } {
  try {
    if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') {
      const feature = turf.feature(geometry);
      const area = turf.area(feature) * 10.764; // m² to ft²
      return { value: Math.round(area), unit: 'sq ft' };
    }
    if (geometry.type === 'LineString' || geometry.type === 'MultiLineString') {
      const feature = turf.feature(geometry);
      const length = turf.length(feature, { units: 'feet' });
      return { value: Math.round(length), unit: 'ft' };
    }
    return { value: 1, unit: 'ea' };
  } catch {
    return { value: 0, unit: '' };
  }
}

// Format confidence as percentage with color
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return '#10b981'; // green
  if (confidence >= 0.7) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

export function AIReviewPanel({
  features,
  onApprove,
  onReject,
  onClose,
  onHover,
}: AIReviewPanelProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Calculate stats
  const stats = useMemo(() => {
    const avgConfidence = features.length
      ? features.reduce((sum, f) => sum + f.confidence, 0) / features.length
      : 0;
    return {
      total: features.length,
      avgConfidence: Math.round(avgConfidence * 100),
    };
  }, [features]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(features.map((f) => f.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const approveSelected = () => {
    const approved = features.filter((f) => selectedIds.has(f.id));
    if (approved.length > 0) {
      onApprove(approved);
      // Remove approved from selection
      const remaining = features.filter((f) => !selectedIds.has(f.id));
      if (remaining.length === 0) {
        onClose();
      }
    }
  };

  const rejectSelected = () => {
    const rejectedIds = Array.from(selectedIds);
    if (rejectedIds.length > 0) {
      onReject(rejectedIds);
      setSelectedIds(new Set());
    }
  };

  const approveAll = () => {
    onApprove(features);
    onClose();
  };

  const rejectAll = () => {
    onReject(features.map((f) => f.id));
    onClose();
  };

  if (features.length === 0) {
    return null;
  }

  return (
    <div className="ai-review-panel">
      <div className="ai-review-header">
        <div className="ai-review-title">
          <span className="ai-icon">&#10024;</span>
          AI Detected Features
        </div>
        <button className="ai-review-close" onClick={onClose}>
          &times;
        </button>
      </div>

      <div className="ai-review-stats">
        Found {stats.total} features ({stats.avgConfidence}% avg confidence)
      </div>

      <div className="ai-review-actions-top">
        <button className="ai-action-btn" onClick={selectAll}>
          Select All
        </button>
        <button className="ai-action-btn" onClick={deselectAll}>
          Deselect All
        </button>
      </div>

      <div className="ai-review-list">
        {features.map((feature) => {
          const measurement = getMeasurement(feature.geometry);
          const isSelected = selectedIds.has(feature.id);
          const icon = TYPE_ICONS[feature.type] || '📍';

          return (
            <div
              key={feature.id}
              className={`ai-feature-item ${isSelected ? 'selected' : ''}`}
              onClick={() => toggleSelection(feature.id)}
              onMouseEnter={() => onHover?.(feature.id)}
              onMouseLeave={() => onHover?.(null)}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleSelection(feature.id)}
                onClick={(e) => e.stopPropagation()}
              />

              <span className="feature-icon">{icon}</span>

              <div className="feature-info">
                <div className="feature-type">
                  {feature.type.replace(/-/g, ' ')}
                  {feature.subType && (
                    <span className="feature-subtype">({feature.subType})</span>
                  )}
                </div>
                <div className="feature-measurement">
                  {measurement.value.toLocaleString()} {measurement.unit}
                </div>
                {feature.label && (
                  <div className="feature-label">{feature.label}</div>
                )}
              </div>

              <div
                className="feature-confidence"
                style={{ color: getConfidenceColor(feature.confidence) }}
              >
                {Math.round(feature.confidence * 100)}%
              </div>
            </div>
          );
        })}
      </div>

      <div className="ai-review-actions">
        <button
          className="ai-btn ai-btn-approve"
          onClick={approveSelected}
          disabled={selectedIds.size === 0}
        >
          Approve ({selectedIds.size})
        </button>
        <button
          className="ai-btn ai-btn-reject"
          onClick={rejectSelected}
          disabled={selectedIds.size === 0}
        >
          Reject
        </button>
      </div>

      <div className="ai-review-bulk">
        <button className="ai-bulk-btn approve" onClick={approveAll}>
          Approve All ({features.length})
        </button>
        <button className="ai-bulk-btn reject" onClick={rejectAll}>
          Reject All
        </button>
      </div>

      <style jsx>{`
        .ai-review-panel {
          position: absolute;
          top: 60px;
          right: 16px;
          width: 320px;
          max-height: calc(100vh - 120px);
          background: white;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          z-index: 1000;
          overflow: hidden;
        }

        .ai-review-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
        }

        .ai-review-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
        }

        .ai-icon {
          font-size: 16px;
        }

        .ai-review-close {
          background: none;
          border: none;
          color: white;
          font-size: 24px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          opacity: 0.8;
        }

        .ai-review-close:hover {
          opacity: 1;
        }

        .ai-review-stats {
          padding: 12px 16px;
          background: #f8fafc;
          font-size: 13px;
          color: #64748b;
          border-bottom: 1px solid #e2e8f0;
        }

        .ai-review-actions-top {
          display: flex;
          gap: 8px;
          padding: 8px 16px;
          border-bottom: 1px solid #e2e8f0;
        }

        .ai-action-btn {
          flex: 1;
          padding: 6px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          font-size: 12px;
          cursor: pointer;
          color: #64748b;
        }

        .ai-action-btn:hover {
          background: #f8fafc;
        }

        .ai-review-list {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .ai-feature-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .ai-feature-item:hover {
          background: #f8fafc;
        }

        .ai-feature-item.selected {
          background: #ede9fe;
        }

        .ai-feature-item input[type='checkbox'] {
          width: 16px;
          height: 16px;
          accent-color: #6366f1;
        }

        .feature-icon {
          font-size: 18px;
        }

        .feature-info {
          flex: 1;
          min-width: 0;
        }

        .feature-type {
          font-size: 13px;
          font-weight: 500;
          color: #1e293b;
          text-transform: capitalize;
        }

        .feature-subtype {
          font-weight: 400;
          color: #64748b;
          margin-left: 4px;
        }

        .feature-measurement {
          font-size: 12px;
          color: #64748b;
        }

        .feature-label {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .feature-confidence {
          font-size: 12px;
          font-weight: 600;
        }

        .ai-review-actions {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #e2e8f0;
        }

        .ai-btn {
          flex: 1;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .ai-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ai-btn-approve {
          background: #10b981;
          color: white;
        }

        .ai-btn-approve:hover:not(:disabled) {
          background: #059669;
        }

        .ai-btn-reject {
          background: #f1f5f9;
          color: #64748b;
        }

        .ai-btn-reject:hover:not(:disabled) {
          background: #e2e8f0;
        }

        .ai-review-bulk {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
        }

        .ai-bulk-btn {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid;
          border-radius: 6px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }

        .ai-bulk-btn.approve {
          border-color: #10b981;
          background: white;
          color: #10b981;
        }

        .ai-bulk-btn.approve:hover {
          background: #10b981;
          color: white;
        }

        .ai-bulk-btn.reject {
          border-color: #ef4444;
          background: white;
          color: #ef4444;
        }

        .ai-bulk-btn.reject:hover {
          background: #ef4444;
          color: white;
        }
      `}</style>
    </div>
  );
}

export default AIReviewPanel;
