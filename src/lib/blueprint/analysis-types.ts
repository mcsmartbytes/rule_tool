/**
 * Blueprint AI Analysis Types
 * Shared types for blueprint analysis API and UI components
 */

export interface BlueprintAnalysisRequest {
  documentId: string;
  pageNumber: number;
  imageDataUrl?: string;
  analysisType: 'full' | 'areas-only' | 'alignment-only';
}

export interface DetectedArea {
  id: string;
  type: string;
  subType?: string;
  label?: string;
  polygon: [number, number][];
  areaSqFt?: number;
  confidence: number;
}

export interface DetectedDimension {
  id: string;
  text: string;
  value: number;
  unit: string;
  position: [number, number];
  measures?: string;
  confidence: number;
}

export interface DetectedMaterial {
  id: string;
  material: string;
  category?: string;
  appliesTo?: string;
  areaId?: string;
  quantity?: string | null;
  confidence: number;
}

export interface DetectedLinearFeature {
  id: string;
  type: string;
  subType?: string;
  points: [number, number][];
  lengthFt?: number;
  confidence: number;
}

export interface ScaleInfo {
  detected: boolean;
  scaleText?: string;
  pixelsPerFoot?: number;
  confidence: number;
}

export interface FootprintInfo {
  polygon: [number, number][];
  widthFt?: number;
  depthFt?: number;
  northArrow?: { x: number; y: number; direction: number };
  referencePoints?: { name: string; position: [number, number] }[];
  confidence: number;
}

export interface BlueprintAnalysisResult {
  success: boolean;
  documentId: string;
  pageNumber: number;
  scale?: ScaleInfo;
  areas?: DetectedArea[];
  dimensions?: DetectedDimension[];
  materials?: DetectedMaterial[];
  footprint?: FootprintInfo;
  linearFeatures?: DetectedLinearFeature[];
  pageType?: string;
  summary?: string;
  processingTimeMs: number;
  error?: string;
}
