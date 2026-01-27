/**
 * SendGrid Email Provider
 * Handles sending emails via SendGrid API
 */

import type { EmailContent, SendGridResponse } from '../types';

const SENDGRID_API_URL = 'https://api.sendgrid.com/v3/mail/send';

interface SendGridError {
  message: string;
  field?: string;
  help?: string;
}

interface SendGridErrorResponse {
  errors: SendGridError[];
}

export class SendGridProvider {
  private apiKey: string;
  private defaultFrom: string;
  private defaultFromName: string;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (!apiKey) {
      throw new Error('SENDGRID_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
    this.defaultFrom = process.env.SENDGRID_FROM_EMAIL || 'noreply@ruletool.com';
    this.defaultFromName = process.env.SENDGRID_FROM_NAME || 'Rule Tool';
  }

  async sendEmail(content: EmailContent): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
    response?: SendGridResponse;
  }> {
    try {
      const payload = this.buildPayload(content);

      const response = await fetch(SENDGRID_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      // SendGrid returns 202 Accepted for successful sends
      if (response.status === 202) {
        const messageId = responseHeaders['x-message-id'] || `sg-${Date.now()}`;
        return {
          success: true,
          messageId,
          response: {
            statusCode: response.status,
            body: '',
            headers: responseHeaders,
          },
        };
      }

      // Handle errors
      let errorMessage = `SendGrid API error: ${response.status}`;
      try {
        const errorBody: SendGridErrorResponse = await response.json();
        if (errorBody.errors && errorBody.errors.length > 0) {
          errorMessage = errorBody.errors.map(e => e.message).join(', ');
        }
      } catch {
        // Couldn't parse error body
      }

      return {
        success: false,
        error: errorMessage,
        response: {
          statusCode: response.status,
          body: errorMessage,
          headers: responseHeaders,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `SendGrid request failed: ${errorMessage}`,
      };
    }
  }

  private buildPayload(content: EmailContent): Record<string, unknown> {
    // If using a dynamic template
    if (content.templateId) {
      return {
        personalizations: [
          {
            to: [{ email: content.to }],
            dynamic_template_data: content.dynamicTemplateData || {},
          },
        ],
        from: {
          email: content.from || this.defaultFrom,
          name: content.fromName || this.defaultFromName,
        },
        template_id: content.templateId,
      };
    }

    // Standard email
    const payload: Record<string, unknown> = {
      personalizations: [
        {
          to: [{ email: content.to }],
          subject: content.subject,
        },
      ],
      from: {
        email: content.from || this.defaultFrom,
        name: content.fromName || this.defaultFromName,
      },
      content: [
        {
          type: 'text/plain',
          value: content.text,
        },
      ],
    };

    // Add HTML content if provided
    if (content.html) {
      (payload.content as Array<{ type: string; value: string }>).push({
        type: 'text/html',
        value: content.html,
      });
    }

    return payload;
  }

  // Validate email address format
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

// Singleton instance
let sendGridInstance: SendGridProvider | null = null;

export function getSendGridProvider(): SendGridProvider {
  if (!sendGridInstance) {
    sendGridInstance = new SendGridProvider();
  }
  return sendGridInstance;
}
