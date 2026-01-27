'use client';

import { useState } from 'react';
import * as turf from '@turf/turf';
import type { AIDetectedFeature, AIDetectResponse, MapBounds } from '@/lib/ai/types';

interface AIDetectionButtonProps {
  onCaptureRequest: () => Promise<{
    image: string;
    bounds: MapBounds;
    zoom: number;
    width: number;
    height: number;
  } | null>;
  onDetectionComplete: (features: AIDetectedFeature[]) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  /** Optional polygon to limit detection area */
  selectionPolygon?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  /** Show only features within selection */
  filterToSelection?: boolean;
}

type DetectionStatus = 'idle' | 'capturing' | 'analyzing' | 'complete' | 'error';

export function AIDetectionButton({
  onCaptureRequest,
  onDetectionComplete,
  onError,
  disabled = false,
  selectionPolygon,
  filterToSelection = false,
}: AIDetectionButtonProps) {
  const [status, setStatus] = useState<DetectionStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter features to only those within the selection polygon
  const filterFeaturesToSelection = (features: AIDetectedFeature[], polygon: GeoJSON.Polygon | GeoJSON.MultiPolygon): AIDetectedFeature[] => {
    const selectionFeature = turf.feature(polygon);

    return features.filter((feature) => {
      try {
        // Check if feature geometry intersects with selection
        const featureGeom = turf.feature(feature.geometry);

        // For points, check if within
        if (feature.geometry.type === 'Point') {
          return turf.booleanPointInPolygon(feature.geometry.coordinates as [number, number], selectionFeature);
        }

        // For polygons/lines, check intersection or containment
        return turf.booleanIntersects(featureGeom, selectionFeature) ||
               turf.booleanWithin(featureGeom, selectionFeature);
      } catch {
        return false;
      }
    });
  };

  const handleDetect = async () => {
    if (status !== 'idle' && status !== 'error') return;

    setStatus('capturing');
    setProgress(10);
    setErrorMessage(null);

    try {
      // Step 1: Capture map
      const captureResult = await onCaptureRequest();
      if (!captureResult) {
        throw new Error('Failed to capture map image');
      }

      setProgress(30);
      setStatus('analyzing');

      // Step 2: Send to AI detection API
      const response = await fetch('/api/ai-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: captureResult.image,
          bounds: captureResult.bounds,
          zoom: captureResult.zoom,
          imageWidth: captureResult.width,
          imageHeight: captureResult.height,
          industry: 'all',
        }),
      });

      setProgress(80);

      const result: AIDetectResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Detection failed');
      }

      setProgress(100);
      setStatus('complete');

      // Filter to selection if enabled and polygon provided
      let finalFeatures = result.features;
      if (filterToSelection && selectionPolygon) {
        finalFeatures = filterFeaturesToSelection(result.features, selectionPolygon);
      }

      // Notify parent with detected features
      onDetectionComplete(finalFeatures);

      // Reset after a moment
      setTimeout(() => {
        setStatus('idle');
        setProgress(0);
      }, 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Detection failed';
      setErrorMessage(message);
      setStatus('error');
      onError?.(message);
    }
  };

  const getButtonContent = () => {
    switch (status) {
      case 'capturing':
        return (
          <>
            <span className="ai-spinner" />
            Capturing...
          </>
        );
      case 'analyzing':
        return (
          <>
            <span className="ai-spinner" />
            Analyzing...
          </>
        );
      case 'complete':
        return (
          <>
            <span className="ai-check">&#10003;</span>
            Features Detected
          </>
        );
      case 'error':
        return (
          <>
            <span className="ai-error">!</span>
            Retry Detection
          </>
        );
      default:
        return (
          <>
            <span className="ai-icon">&#10024;</span>
            {filterToSelection && selectionPolygon ? 'Detect in Selection' : 'Detect Features'}
          </>
        );
    }
  };

  return (
    <div className="ai-detection-button-wrapper">
      <button
        className={`ai-detection-button ${status}`}
        onClick={handleDetect}
        disabled={disabled || (status !== 'idle' && status !== 'error')}
        title={errorMessage || 'Use AI to detect site features'}
      >
        {getButtonContent()}
      </button>

      {(status === 'capturing' || status === 'analyzing') && (
        <div className="ai-progress-bar">
          <div className="ai-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {errorMessage && status === 'error' && (
        <div className="ai-error-message">{errorMessage}</div>
      )}

      <style jsx>{`
        .ai-detection-button-wrapper {
          position: relative;
        }

        .ai-detection-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .ai-detection-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .ai-detection-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ai-detection-button.capturing,
        .ai-detection-button.analyzing {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        .ai-detection-button.complete {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .ai-detection-button.error {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
        }

        .ai-icon {
          font-size: 16px;
        }

        .ai-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        .ai-check {
          font-size: 16px;
        }

        .ai-error {
          font-size: 16px;
          font-weight: bold;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .ai-progress-bar {
          position: absolute;
          bottom: -6px;
          left: 0;
          right: 0;
          height: 3px;
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .ai-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #8b5cf6);
          transition: width 0.3s ease;
        }

        .ai-error-message {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 8px;
          padding: 8px 12px;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 4px;
          color: #dc2626;
          font-size: 12px;
          white-space: nowrap;
          z-index: 10;
        }
      `}</style>
    </div>
  );
}

export default AIDetectionButton;
