/**
 * AI Feedback Service
 * Handles communication with the local Glow Bridge server for AI feedback
 */

import type {
  FeedbackRequest,
  FeedbackResponse,
  StreamMessage,
  SuggestedEdit,
} from './types';

/** Default bridge server URL */
const DEFAULT_BRIDGE_URL = 'http://localhost:3847';

/** Callbacks for streaming feedback */
export interface StreamCallbacks {
  /** Called when a text chunk is received */
  onChunk: (content: string) => void;
  /** Called when a suggested edit is received */
  onEdit: (edit: SuggestedEdit) => void;
  /** Called when AI thinking/reasoning is received */
  onThinking: (content: string) => void;
  /** Called when the stream completes successfully */
  onComplete: () => void;
  /** Called when an error occurs */
  onError: (message: string) => void;
}

/** Executor status information */
export interface ExecutorStatus {
  /** Executor name */
  name: string;
  /** Whether the executor is available */
  available: boolean;
}

/** Health check response */
export interface HealthResponse {
  /** Service status */
  status: string;
  /** Service version */
  version: string;
  /** Available executors */
  executors: ExecutorStatus[];
}

/**
 * Service for AI-powered document feedback.
 * Communicates with the local Glow Bridge server.
 */
export class AIFeedbackService {
  private bridgeUrl: string;
  private ws: WebSocket | null = null;

  constructor(bridgeUrl: string = DEFAULT_BRIDGE_URL) {
    this.bridgeUrl = bridgeUrl;
  }

  /**
   * Check if the bridge server is available.
   */
  async checkBridgeAvailable(): Promise<boolean> {
    console.log('[AI Service] Checking bridge availability at', this.bridgeUrl);
    try {
      const response = await fetch(`${this.bridgeUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000),
      });
      console.log('[AI Service] Bridge health response:', response.ok, response.status);
      return response.ok;
    } catch (error) {
      console.error('[AI Service] Bridge health check failed:', error);
      return false;
    }
  }

  /**
   * Get health information from the bridge.
   */
  async getHealth(): Promise<HealthResponse | null> {
    try {
      const response = await fetch(`${this.bridgeUrl}/api/health`);
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * List available executors.
   */
  async listExecutors(): Promise<ExecutorStatus[]> {
    try {
      const response = await fetch(`${this.bridgeUrl}/api/executors`);
      if (!response.ok) return [];
      return await response.json();
    } catch {
      return [];
    }
  }

  /**
   * Request AI feedback on document content.
   * Returns the feedback ID for status polling or WebSocket streaming.
   */
  async requestFeedback(request: FeedbackRequest): Promise<string> {
    console.log('[AI Service] Submitting feedback request to', `${this.bridgeUrl}/api/feedback`);
    console.log('[AI Service] Request payload:', {
      executor: request.executor,
      instruction: request.instruction,
      documentId: request.documentId,
      selectedText: request.selectedText.substring(0, 100),
    });

    const response = await fetch(`${this.bridgeUrl}/api/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    console.log('[AI Service] Feedback response status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.text();
      console.error('[AI Service] Feedback request failed:', error);
      throw new Error(`Failed to submit feedback request: ${error}`);
    }

    const data: FeedbackResponse = await response.json();
    console.log('[AI Service] Got feedback response:', data);
    return data.id;
  }

  /**
   * Get the status of a feedback request.
   */
  async getFeedbackStatus(feedbackId: string): Promise<FeedbackResponse> {
    const response = await fetch(`${this.bridgeUrl}/api/feedback/${feedbackId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Feedback request not found');
      }
      throw new Error(`Failed to get feedback status: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Cancel a feedback request.
   */
  async cancelFeedback(feedbackId: string): Promise<void> {
    const response = await fetch(`${this.bridgeUrl}/api/feedback/${feedbackId}`, {
      method: 'DELETE',
    });

    if (!response.ok && response.status !== 404) {
      throw new Error(`Failed to cancel feedback: ${response.statusText}`);
    }
  }

  /**
   * Stream feedback results via WebSocket.
   */
  streamFeedback(feedbackId: string, callbacks: StreamCallbacks): () => void {
    const wsUrl = `ws://${new URL(this.bridgeUrl).host}/api/feedback/${feedbackId}/ws`;
    console.log('[AI Service] Opening WebSocket to', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('[AI Service] WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: StreamMessage = JSON.parse(event.data);
        console.log('[AI Service] WebSocket message:', message.type, message);

        switch (message.type) {
          case 'chunk':
            callbacks.onChunk(message.content);
            break;
          case 'edit':
            callbacks.onEdit(message.edit);
            break;
          case 'thinking':
            callbacks.onThinking(message.content);
            break;
          case 'complete':
            console.log('[AI Service] Stream complete');
            callbacks.onComplete();
            break;
          case 'error':
            console.error('[AI Service] Stream error:', message.message);
            callbacks.onError(message.message);
            break;
        }
      } catch (error) {
        console.error('[AI Service] Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('[AI Service] WebSocket error:', error);
      callbacks.onError('WebSocket connection error');
    };

    this.ws.onclose = (event) => {
      console.log('[AI Service] WebSocket closed', event.code, event.reason);
    };

    // Return cleanup function
    return () => {
      if (this.ws) {
        this.ws.close();
        this.ws = null;
      }
    };
  }

  /**
   * Interrupt the current streaming operation.
   */
  interrupt(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'interrupt' }));
    }
  }

  /**
   * Close the WebSocket connection.
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/** Singleton instance of the AI feedback service */
export const aiFeedbackService = new AIFeedbackService();
