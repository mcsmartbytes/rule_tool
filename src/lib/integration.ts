/**
 * Integration API for Area Bid Pro
 * Allows communication with parent websites when embedded via iframe
 */

export interface MeasurementData {
  totalArea: number;          // in square feet
  totalPerimeter: number;     // in feet
  unit: 'imperial' | 'metric';
  shapes: ShapeData[];
  heights: HeightData[];
  notes: string;
  timestamp: string;
}

export interface ShapeData {
  id: string;
  type: 'polygon' | 'rectangle' | 'circle' | 'line' | 'freehand';
  area: number;               // square feet
  perimeter: number;          // feet
  coordinates: [number, number][];
  label?: string;
}

export interface HeightData {
  id: string;
  value: number;
  unit: string;
  coordinates: [number, number];
  label?: string;
}

export interface QuoteData extends MeasurementData {
  customerId?: string;
  jobId?: string;
  customerName?: string;
  jobName?: string;
  address?: string;
}

// Message types for postMessage communication
export type MessageType =
  | 'AREA_BID_PRO_READY'
  | 'AREA_BID_PRO_MEASUREMENT'
  | 'AREA_BID_PRO_EXPORT_QUOTE'
  | 'AREA_BID_PRO_REQUEST_CONTEXT'
  | 'PARENT_SET_CONTEXT'
  | 'PARENT_REQUEST_MEASUREMENT';

export interface IntegrationMessage {
  type: MessageType;
  payload?: any;
  source: 'area-bid-pro';
}

class IntegrationAPI {
  private parentOrigin: string | null = null;
  private contextData: { customerId?: string; jobId?: string; customerName?: string; jobName?: string; address?: string } = {};
  private listeners: Map<MessageType, ((data: any) => void)[]> = new Map();

  constructor() {
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  private init() {
    // Listen for messages from parent
    window.addEventListener('message', this.handleMessage.bind(this));

    // Check if we're in an iframe
    if (window.parent !== window) {
      // Notify parent that Area Bid Pro is ready
      this.notifyReady();
    }

    // Also check URL params for context
    const params = new URLSearchParams(window.location.search);
    if (params.get('customerId')) this.contextData.customerId = params.get('customerId')!;
    if (params.get('jobId')) this.contextData.jobId = params.get('jobId')!;
    if (params.get('customerName')) this.contextData.customerName = params.get('customerName')!;
    if (params.get('jobName')) this.contextData.jobName = params.get('jobName')!;
    if (params.get('address')) this.contextData.address = params.get('address')!;
  }

  private handleMessage(event: MessageEvent) {
    // Validate message structure
    if (!event.data || typeof event.data !== 'object') return;
    if (event.data.source === 'area-bid-pro') return; // Ignore our own messages

    const { type, payload } = event.data;

    switch (type) {
      case 'PARENT_SET_CONTEXT':
        // Parent is setting customer/job context
        this.contextData = { ...this.contextData, ...payload };
        this.parentOrigin = event.origin;
        this.emit('PARENT_SET_CONTEXT', payload);
        break;

      case 'PARENT_REQUEST_MEASUREMENT':
        // Parent is requesting current measurement data
        this.parentOrigin = event.origin;
        this.emit('PARENT_REQUEST_MEASUREMENT', payload);
        break;
    }
  }

  private notifyReady() {
    this.sendToParent('AREA_BID_PRO_READY', { version: '1.0.0' });
  }

  private sendToParent(type: MessageType, payload?: any) {
    if (window.parent !== window) {
      const message: IntegrationMessage = {
        type,
        payload,
        source: 'area-bid-pro'
      };
      // Send to parent with wildcard origin (or specific origin if known)
      window.parent.postMessage(message, this.parentOrigin || '*');
    }
  }

  // Public API methods

  /**
   * Send measurement data to parent website
   */
  sendMeasurement(data: MeasurementData) {
    this.sendToParent('AREA_BID_PRO_MEASUREMENT', data);
  }

  /**
   * Send quote/estimate data to parent website
   */
  exportToQuote(measurementData: MeasurementData) {
    const quoteData: QuoteData = {
      ...measurementData,
      ...this.contextData
    };
    this.sendToParent('AREA_BID_PRO_EXPORT_QUOTE', quoteData);
  }

  /**
   * Request context (customer/job info) from parent
   */
  requestContext() {
    this.sendToParent('AREA_BID_PRO_REQUEST_CONTEXT', {});
  }

  /**
   * Get current context data
   */
  getContext() {
    return { ...this.contextData };
  }

  /**
   * Check if embedded in iframe
   */
  isEmbedded(): boolean {
    if (typeof window === 'undefined') return false;
    return window.parent !== window;
  }

  /**
   * Subscribe to messages from parent
   */
  on(type: MessageType, callback: (data: any) => void) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(callback);
    return () => this.off(type, callback);
  }

  /**
   * Unsubscribe from messages
   */
  off(type: MessageType, callback: (data: any) => void) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  private emit(type: MessageType, data: any) {
    const callbacks = this.listeners.get(type);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }
}

// Singleton instance
export const integrationAPI = typeof window !== 'undefined' ? new IntegrationAPI() : null;
