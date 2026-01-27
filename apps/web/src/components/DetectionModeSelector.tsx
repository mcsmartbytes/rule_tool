'use client';

import { useState } from 'react';

export type DetectionMode = 'quick' | 'full' | 'custom';

export interface FeatureTypeOption {
  id: string;
  label: string;
  description: string;
  category: 'surfaces' | 'structures' | 'striping' | 'linear';
}

export const FEATURE_TYPE_OPTIONS: FeatureTypeOption[] = [
  // Surfaces
  { id: 'parking-surface', label: 'Parking Surfaces', description: 'Asphalt/concrete parking areas', category: 'surfaces' },
  { id: 'drive-lane', label: 'Drive Lanes', description: 'Traffic lanes and driveways', category: 'surfaces' },
  { id: 'sidewalk', label: 'Sidewalks', description: 'Pedestrian walkways', category: 'surfaces' },
  { id: 'loading-area', label: 'Loading Areas', description: 'Loading docks and zones', category: 'surfaces' },

  // Structures
  { id: 'building-footprint', label: 'Buildings', description: 'Building footprints to exclude', category: 'structures' },
  { id: 'median', label: 'Medians', description: 'Raised dividers', category: 'structures' },
  { id: 'island', label: 'Islands', description: 'Landscaped/concrete islands', category: 'structures' },
  { id: 'ada-ramp', label: 'ADA Ramps', description: 'Curb cut ramps', category: 'structures' },

  // Striping
  { id: 'parking-stall', label: 'Parking Stalls', description: 'Individual parking spaces', category: 'striping' },
  { id: 'ada-space', label: 'ADA Spaces', description: 'Handicap parking', category: 'striping' },
  { id: 'directional-arrow', label: 'Arrows', description: 'Directional arrows', category: 'striping' },
  { id: 'crosswalk', label: 'Crosswalks', description: 'Pedestrian crossings', category: 'striping' },

  // Linear
  { id: 'curb', label: 'Curbs', description: 'Curb lines', category: 'linear' },
  { id: 'crack', label: 'Cracks', description: 'Pavement cracks', category: 'linear' },
  { id: 'fire-lane', label: 'Fire Lanes', description: 'Fire lane markings', category: 'linear' },
  { id: 'edge-line', label: 'Edge Lines', description: 'Boundary lines', category: 'linear' },
];

export const QUICK_PRESETS: Record<string, string[]> = {
  'Surfaces Only': ['parking-surface', 'drive-lane', 'sidewalk', 'loading-area', 'building-footprint'],
  'Striping Only': ['parking-stall', 'ada-space', 'directional-arrow', 'crosswalk', 'fire-lane'],
  'Concrete Only': ['sidewalk', 'curb', 'median', 'island', 'ada-ramp'],
  'Condition Survey': ['parking-surface', 'drive-lane', 'crack', 'building-footprint'],
};

interface DetectionModeSelectorProps {
  onSelect: (featureTypes: string[]) => void;
  onCancel: () => void;
}

export function DetectionModeSelector({ onSelect, onCancel }: DetectionModeSelectorProps) {
  const [mode, setMode] = useState<DetectionMode>('quick');
  const [selectedPreset, setSelectedPreset] = useState<string>('Surfaces Only');
  const [customSelection, setCustomSelection] = useState<Set<string>>(new Set(['parking-surface', 'building-footprint']));

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
  };

  const toggleFeature = (featureId: string) => {
    const newSelection = new Set(customSelection);
    if (newSelection.has(featureId)) {
      newSelection.delete(featureId);
    } else {
      newSelection.add(featureId);
    }
    setCustomSelection(newSelection);
  };

  const selectAllInCategory = (category: string) => {
    const newSelection = new Set(customSelection);
    FEATURE_TYPE_OPTIONS
      .filter(f => f.category === category)
      .forEach(f => newSelection.add(f.id));
    setCustomSelection(newSelection);
  };

  const clearCategory = (category: string) => {
    const newSelection = new Set(customSelection);
    FEATURE_TYPE_OPTIONS
      .filter(f => f.category === category)
      .forEach(f => newSelection.delete(f.id));
    setCustomSelection(newSelection);
  };

  const handleDetect = () => {
    let featureTypes: string[];

    if (mode === 'full') {
      featureTypes = []; // Empty means detect all
    } else if (mode === 'quick') {
      featureTypes = QUICK_PRESETS[selectedPreset] || [];
    } else {
      featureTypes = Array.from(customSelection);
    }

    onSelect(featureTypes);
  };

  const categories = [
    { id: 'surfaces', label: 'Surfaces', color: '#3b82f6' },
    { id: 'structures', label: 'Structures', color: '#8b5cf6' },
    { id: 'striping', label: 'Striping', color: '#f59e0b' },
    { id: 'linear', label: 'Linear Features', color: '#10b981' },
  ];

  return (
    <div className="detection-selector-overlay">
      <div className="detection-selector-modal">
        <div className="modal-header">
          <h3>What do you want to detect?</h3>
          <button className="close-btn" onClick={onCancel}>&times;</button>
        </div>

        <div className="mode-tabs">
          <button
            className={`mode-tab ${mode === 'quick' ? 'active' : ''}`}
            onClick={() => setMode('quick')}
          >
            Quick Select
          </button>
          <button
            className={`mode-tab ${mode === 'custom' ? 'active' : ''}`}
            onClick={() => setMode('custom')}
          >
            Custom
          </button>
          <button
            className={`mode-tab ${mode === 'full' ? 'active' : ''}`}
            onClick={() => setMode('full')}
          >
            Detect All
          </button>
        </div>

        <div className="mode-content">
          {mode === 'quick' && (
            <div className="preset-grid">
              {Object.keys(QUICK_PRESETS).map((preset) => (
                <button
                  key={preset}
                  className={`preset-btn ${selectedPreset === preset ? 'selected' : ''}`}
                  onClick={() => handlePresetChange(preset)}
                >
                  <span className="preset-name">{preset}</span>
                  <span className="preset-count">{QUICK_PRESETS[preset].length} types</span>
                </button>
              ))}
            </div>
          )}

          {mode === 'custom' && (
            <div className="custom-selection">
              {categories.map((category) => (
                <div key={category.id} className="category-group">
                  <div className="category-header" style={{ borderLeftColor: category.color }}>
                    <span className="category-label">{category.label}</span>
                    <div className="category-actions">
                      <button onClick={() => selectAllInCategory(category.id)}>All</button>
                      <button onClick={() => clearCategory(category.id)}>None</button>
                    </div>
                  </div>
                  <div className="feature-checkboxes">
                    {FEATURE_TYPE_OPTIONS
                      .filter(f => f.category === category.id)
                      .map((feature) => (
                        <label key={feature.id} className="feature-checkbox">
                          <input
                            type="checkbox"
                            checked={customSelection.has(feature.id)}
                            onChange={() => toggleFeature(feature.id)}
                          />
                          <span className="checkbox-label">
                            <span className="feature-name">{feature.label}</span>
                            <span className="feature-desc">{feature.description}</span>
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {mode === 'full' && (
            <div className="full-mode-info">
              <div className="info-icon">&#9888;</div>
              <p>Full detection will identify <strong>all feature types</strong> in the visible area.</p>
              <p className="warning">This may take longer and produce more results to review.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="cancel-btn" onClick={onCancel}>Cancel</button>
          <button
            className="detect-btn"
            onClick={handleDetect}
            disabled={mode === 'custom' && customSelection.size === 0}
          >
            {mode === 'custom' && customSelection.size > 0
              ? `Detect ${customSelection.size} Types`
              : mode === 'quick'
              ? `Detect ${QUICK_PRESETS[selectedPreset]?.length || 0} Types`
              : 'Detect All Features'
            }
          </button>
        </div>
      </div>

      <style jsx>{`
        .detection-selector-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .detection-selector-modal {
          background: white;
          border-radius: 12px;
          width: 500px;
          max-width: 95vw;
          max-height: 85vh;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #111827;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }

        .close-btn:hover {
          color: #111827;
        }

        .mode-tabs {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 20px;
        }

        .mode-tab {
          flex: 1;
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-tab:hover {
          color: #111827;
        }

        .mode-tab.active {
          color: #6366f1;
          border-bottom-color: #6366f1;
        }

        .mode-content {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
        }

        .preset-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .preset-btn {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 16px;
          background: #f9fafb;
          border: 2px solid #e5e7eb;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .preset-btn:hover {
          border-color: #6366f1;
          background: #f5f3ff;
        }

        .preset-btn.selected {
          border-color: #6366f1;
          background: #eef2ff;
        }

        .preset-name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .preset-count {
          font-size: 12px;
          color: #6b7280;
        }

        .custom-selection {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .category-group {
          background: #f9fafb;
          border-radius: 8px;
          overflow: hidden;
        }

        .category-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #f3f4f6;
          border-left: 3px solid;
        }

        .category-label {
          font-weight: 600;
          font-size: 13px;
          color: #374151;
        }

        .category-actions {
          display: flex;
          gap: 8px;
        }

        .category-actions button {
          background: none;
          border: none;
          color: #6366f1;
          font-size: 12px;
          cursor: pointer;
          padding: 2px 6px;
        }

        .category-actions button:hover {
          text-decoration: underline;
        }

        .feature-checkboxes {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 4px;
          padding: 8px;
        }

        .feature-checkbox {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.1s;
        }

        .feature-checkbox:hover {
          background: #e5e7eb;
        }

        .feature-checkbox input {
          margin-top: 2px;
        }

        .checkbox-label {
          display: flex;
          flex-direction: column;
        }

        .feature-name {
          font-size: 13px;
          font-weight: 500;
          color: #111827;
        }

        .feature-desc {
          font-size: 11px;
          color: #6b7280;
        }

        .full-mode-info {
          text-align: center;
          padding: 40px 20px;
        }

        .info-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .full-mode-info p {
          margin: 8px 0;
          color: #374151;
        }

        .full-mode-info .warning {
          color: #f59e0b;
          font-size: 13px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .cancel-btn {
          padding: 10px 20px;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          cursor: pointer;
        }

        .cancel-btn:hover {
          background: #f3f4f6;
        }

        .detect-btn {
          padding: 10px 24px;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .detect-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .detect-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default DetectionModeSelector;
