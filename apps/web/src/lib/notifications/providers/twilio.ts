/**
 * Twilio SMS Provider
 * Handles sending SMS via Twilio API
 */

import type { SMSContent, TwilioResponse } from '../types';

export class TwilioProvider {
  private accountSid: string;
  private authToken: string;
  private defaultFrom: string;
  private apiUrl: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid) {
      throw new Error('TWILIO_ACCOUNT_SID environment variable is not set');
    }
    if (!authToken) {
      throw new Error('TWILIO_AUTH_TOKEN environment variable is not set');
    }
    if (!fromNumber) {
      throw new Error('TWILIO_FROM_NUMBER environment variable is not set');
    }

    this.accountSid = accountSid;
    this.authToken = authToken;
    this.defaultFrom = fromNumber;
    this.apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  }

  async sendSMS(content: SMSContent): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    response?: TwilioResponse;
  }> {
    try {
      // Validate phone number
      const toNumber = this.normalizePhoneNumber(content.to);
      if (!toNumber) {
        return {
          success: false,
          error: 'Invalid phone number format',
        };
      }

      // Validate message length (SMS limit is 1600 chars, but shorter is better)
      if (content.body.length > 1600) {
        return {
          success: false,
          error: 'Message exceeds maximum length of 1600 characters',
        };
      }

      // Build form data
      const formData = new URLSearchParams();
      formData.append('To', toNumber);
      formData.append('From', content.from || this.defaultFrom);
      formData.append('Body', content.body);

      // Make API request
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const responseBody = await response.json();

      if (response.ok) {
        const twilioResponse: TwilioResponse = {
          sid: responseBody.sid,
          status: responseBody.status,
          dateCreated: responseBody.date_created,
          errorCode: responseBody.error_code,
          errorMessage: responseBody.error_message,
        };

        return {
          success: true,
          messageId: responseBody.sid,
          response: twilioResponse,
        };
      }

      // Handle Twilio errors
      const errorMessage = responseBody.message || `Twilio API error: ${response.status}`;
      return {
        success: false,
        error: errorMessage,
        response: {
          sid: responseBody.sid || '',
          status: 'failed',
          dateCreated: new Date().toISOString(),
          errorCode: responseBody.code || response.status,
          errorMessage: errorMessage,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Twilio request failed: ${errorMessage}`,
      };
    }
  }

  /**
   * Normalize phone number to E.164 format
   * Accepts: +1234567890, 1234567890, (123) 456-7890, etc.
   * Returns: +1234567890 or null if invalid
   */
  normalizePhoneNumber(phone: string): string | null {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // If starts with +, keep it
    if (normalized.startsWith('+')) {
      // Validate length (E.164 max is 15 digits)
      if (normalized.length >= 10 && normalized.length <= 16) {
        return normalized;
      }
      return null;
    }

    // If 10 digits, assume US and add +1
    if (normalized.length === 10) {
      return `+1${normalized}`;
    }

    // If 11 digits starting with 1, assume US
    if (normalized.length === 11 && normalized.startsWith('1')) {
      return `+${normalized}`;
    }

    // Invalid format
    return null;
  }

  /**
   * Validate phone number format
   */
  static isValidPhoneNumber(phone: string): boolean {
    const instance = new TwilioProvider();
    return instance.normalizePhoneNumber(phone) !== null;
  }

  /**
   * Get estimated SMS segment count
   * Standard SMS: 160 chars, Unicode: 70 chars
   */
  static getSegmentCount(message: string): number {
    // Check if message contains non-GSM characters (Unicode)
    const gsmRegex = /^[\x00-\x7F\u00A0-\u00FF]*$/;
    const isGSM = gsmRegex.test(message);

    const charLimit = isGSM ? 160 : 70;
    const multipartLimit = isGSM ? 153 : 67; // Headers take some space in multipart

    if (message.length <= charLimit) {
      return 1;
    }

    return Math.ceil(message.length / multipartLimit);
  }
}

// Singleton instance
let twilioInstance: TwilioProvider | null = null;

export function getTwilioProvider(): TwilioProvider {
  if (!twilioInstance) {
    twilioInstance = new TwilioProvider();
  }
  return twilioInstance;
}
