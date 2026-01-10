'use client';

import { useSiteStore } from '@/lib/site/store';
import type { SiteObjectType } from '@/lib/supabase/types';

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

function formatMeasurement(obj: { measurements: { area?: number; length?: number; count?: number } }): string {
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

export function ObjectPanel() {
  const objects = useSiteStore((s) => s.objects);
  const selectedObjectId = useSiteStore((s) => s.selectedObjectId);
  const selectObject = useSiteStore((s) => s.selectObject);
  const removeObject = useSiteStore((s) => s.removeObject);
  const clearObjects = useSiteStore((s) => s.clearObjects);

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
