'use client';

import { useState } from 'react';
import { useSiteStore } from '@/lib/site/store';
import type { SiteObjectType } from '@/lib/supabase/types';

interface ObjectTypeOption {
  type: SiteObjectType;
  label: string;
  icon: string;
  subTypes?: { value: string; label: string }[];
}

const SURFACE_TYPES: ObjectTypeOption[] = [
  {
    type: 'parking-surface',
    label: 'Parking Surface',
    icon: '🅿️',
    subTypes: [
      { value: 'asphalt', label: 'Asphalt' },
      { value: 'concrete', label: 'Concrete' },
      { value: 'gravel', label: 'Gravel' },
    ],
  },
  { type: 'drive-lane', label: 'Drive Lane', icon: '🛣️' },
  { type: 'loading-area', label: 'Loading Area', icon: '📦' },
  {
    type: 'sidewalk',
    label: 'Sidewalk',
    icon: '🚶',
    subTypes: [
      { value: 'concrete', label: 'Concrete' },
      { value: 'pavers', label: 'Pavers' },
    ],
  },
  { type: 'plaza', label: 'Plaza', icon: '🏛️' },
];

const LINEAR_TYPES: ObjectTypeOption[] = [
  {
    type: 'curb',
    label: 'Curb',
    icon: '➖',
    subTypes: [
      { value: 'straight', label: 'Straight' },
      { value: 'rolled', label: 'Rolled' },
      { value: 'mountable', label: 'Mountable' },
    ],
  },
  { type: 'crack', label: 'Crack', icon: '⚡' },
  { type: 'edge-line', label: 'Edge Line', icon: '📏' },
  { type: 'fire-lane', label: 'Fire Lane', icon: '🚒' },
];

const MARKING_TYPES: ObjectTypeOption[] = [
  { type: 'parking-stall', label: 'Parking Stall', icon: '🚗' },
  { type: 'ada-space', label: 'ADA Space', icon: '♿' },
  { type: 'crosswalk', label: 'Crosswalk', icon: '🚸' },
  { type: 'directional-arrow', label: 'Arrow', icon: '➡️' },
  { type: 'symbol', label: 'Symbol', icon: '⭐' },
];

const STRUCTURE_TYPES: ObjectTypeOption[] = [
  { type: 'median', label: 'Median', icon: '🔲' },
  { type: 'island', label: 'Island', icon: '🏝️' },
  { type: 'ada-ramp', label: 'ADA Ramp', icon: '♿' },
];

export function ObjectClassifier() {
  const isOpen = useSiteStore((s) => s.isClassifierOpen);
  const pendingGeometry = useSiteStore((s) => s.pendingGeometry);
  const closeClassifier = useSiteStore((s) => s.closeClassifier);
  const addObject = useSiteStore((s) => s.addObject);
  const site = useSiteStore((s) => s.site);

  const [selectedType, setSelectedType] = useState<SiteObjectType | null>(null);
  const [selectedSubType, setSelectedSubType] = useState<string | null>(null);
  const [label, setLabel] = useState('');

  if (!isOpen || !pendingGeometry) return null;

  // Determine geometry type for filtering options
  const isPolygon = pendingGeometry.type === 'Polygon' || pendingGeometry.type === 'MultiPolygon';
  const isLine = pendingGeometry.type === 'LineString' || pendingGeometry.type === 'MultiLineString';
  const isPoint = pendingGeometry.type === 'Point';

  // Get available options based on geometry type
  const getOptions = (): { category: string; options: ObjectTypeOption[] }[] => {
    if (isPolygon) {
      return [
        { category: 'Surfaces', options: SURFACE_TYPES },
        { category: 'Structures', options: STRUCTURE_TYPES },
      ];
    }
    if (isLine) {
      return [
        { category: 'Linear Features', options: LINEAR_TYPES },
      ];
    }
    if (isPoint) {
      return [
        { category: 'Markings', options: MARKING_TYPES },
      ];
    }
    return [];
  };

  const categories = getOptions();
  const selectedOption = categories
    .flatMap((c) => c.options)
    .find((o) => o.type === selectedType);

  const handleSave = () => {
    if (!selectedType || !pendingGeometry) return;

    addObject({
      site_id: site?.id || '',
      object_type: selectedType,
      sub_type: selectedSubType,
      tags: [],
      geometry: pendingGeometry,
      properties: {},
      source: 'manual',
      confidence: null,
      label: label || null,
      color: null,
    });

    // Reset and close
    setSelectedType(null);
    setSelectedSubType(null);
    setLabel('');
    closeClassifier();
  };

  const handleCancel = () => {
    setSelectedType(null);
    setSelectedSubType(null);
    setLabel('');
    closeClassifier();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="classifier-modal glass" onClick={(e) => e.stopPropagation()}>
        <div className="classifier-header">
          <h3>Classify Object</h3>
          <span className="geometry-badge">
            {isPolygon ? 'Polygon' : isLine ? 'Line' : 'Point'}
          </span>
        </div>

        <div className="classifier-content">
          {categories.map(({ category, options }) => (
            <div key={category} className="classifier-category">
              <div className="category-label">{category}</div>
              <div className="type-grid">
                {options.map((option) => (
                  <button
                    key={option.type}
                    className={`type-button ${selectedType === option.type ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedType(option.type);
                      setSelectedSubType(null);
                    }}
                  >
                    <span className="type-icon">{option.icon}</span>
                    <span className="type-label">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* Sub-type selection */}
          {selectedOption?.subTypes && (
            <div className="classifier-subtypes">
              <div className="category-label">Material / Type</div>
              <div className="subtype-buttons">
                {selectedOption.subTypes.map((sub) => (
                  <button
                    key={sub.value}
                    className={`subtype-button ${selectedSubType === sub.value ? 'selected' : ''}`}
                    onClick={() => setSelectedSubType(sub.value)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Optional label */}
          <div className="classifier-label">
            <label htmlFor="object-label">Label (optional)</label>
            <input
              id="object-label"
              type="text"
              placeholder="e.g., North Lot, Section A"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
        </div>

        <div className="classifier-actions">
          <button className="btn" onClick={handleCancel}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={!selectedType}
          >
            Add Object
          </button>
        </div>
      </div>
    </div>
  );
}

export default ObjectClassifier;
