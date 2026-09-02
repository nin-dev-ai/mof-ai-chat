import { ApiResponse } from '../models/api';
import {
  ChatHistoryDetail,
  StartupData,
  UserLookupItem,
  ChatSession,
  SharedChatMemberGroup,
} from '../models/startup';
import { authFetch, getAccessToken } from './authSession';
import { GENERAL_CHAT_WEBHOOK_URL } from '../constants/chatConstants';

const emptyApiResponse = <T>(data: T): ApiResponse<T> => ({
  success: true,
  responseTimeStamp: new Date().toISOString(),
  data,
  errors: [],
  validationErrors: [],
  validationInfo: [],
});

export class BackendService {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, headers?: Record<string, string>) {
    this.baseUrl = (baseUrl || '').replace(/\/$/, '');
    this.headers = {
      "Content-Type": "application/json",
      ...headers,
    };
  }

  private getToken(): string {
    return getAccessToken() || this.headers['Token'] || this.headers['token'] || '';
  }

  private authHeaders(includeJson = true): Record<string, string> {
    const headers: Record<string, string> = {};
    const token = this.getToken();
    if (token) {
      headers.Token = token;
    }
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  private unwrapList<T>(responseData: unknown): T[] {
    if (Array.isArray(responseData)) {
      const first = responseData[0] as { data?: T[]; Data?: T[] } | undefined;
      if (first && Array.isArray(first.data)) return first.data;
      if (first && Array.isArray(first.Data)) return first.Data;
      return responseData as T[];
    }

    if (responseData && typeof responseData === 'object') {
      const record = responseData as { data?: T[]; Data?: T[] };
      if (Array.isArray(record.data)) return record.data;
      if (Array.isArray(record.Data)) return record.Data;
    }

    return [];
  }

  private async FetchAudioTranscriptData<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers();
    if (this.headers["Token"]) {
      headers.set("token", this.headers["Token"]);
    }
    const response = await authFetch(`${this.baseUrl}/${endpoint}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json() as T;
  }

  async getStartupData(): Promise<ApiResponse<StartupData>> {
    const response = await authFetch(`${this.baseUrl}/user/startup`, {
      method: 'GET',
      headers: this.authHeaders(true),
    });
    if (!response.ok) {
      throw new Error(`Startup request failed: ${response.status} ${response.statusText}`);
    }
    const result = await response.json() as ApiResponse<StartupData> | ApiResponse<StartupData>[];
    const startup = Array.isArray(result) ? result[0] : result;
    if (startup?.data) {
      startup.data.generalChatWebhookUrl = GENERAL_CHAT_WEBHOOK_URL;
    }
    return startup;
  }

  async PostAudioTranscript(data: FormData): Promise<{ text: string }[]> {
    const url = `c23226ce-a245-4fa4-a170-49e8c85de56a`;
    return this.FetchAudioTranscriptData<{ text: string }[]>(url, {
      method: "POST",
      body: data,
    });
  }

  async togglePinnedService(serviceId: number): Promise<ApiResponse<boolean>> {
    return emptyApiResponse(true);
  }

  async getChatSessions(): Promise<{ success: boolean; data?: ChatSession[] }> {
    try {
      const response = await authFetch(`${this.baseUrl}/user/chat/session`, {
        method: "GET",
        headers: this.authHeaders(true),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error("API Error Response:", errorData);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = this.unwrapList<ChatSession>(await response.json());
      return { success: true, data };
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      return { success: false };
    }
  }

  async deleteChatSession(sessionId: number): Promise<{ success: boolean }> {
    if (!sessionId || Number.isNaN(sessionId)) {
      return { success: false };
    }

    try {
      const response = await authFetch(`${this.baseUrl}/user/chat/session/${sessionId}`, {
        method: "DELETE",
        headers: this.authHeaders(false),
      });

      if (response.ok || response.status === 204) {
        return { success: true };
      }

      if (response.status === 404 || response.status === 405) {
        const fallback = await authFetch(`${this.baseUrl}/user/chat/session?id=${sessionId}`, {
          method: "DELETE",
          headers: this.authHeaders(false),
        });
        if (fallback.ok || fallback.status === 204) {
          return { success: true };
        }
      }

      console.error("API Error Deleting Session:", await response.text());
      return { success: false };
    } catch (error) {
      console.error("Error deleting chat session:", sessionId, error);
      return { success: false };
    }
  }

  async getChatHistoryDetail(
    sessionId: number
  ): Promise<{ success: boolean; data?: ChatHistoryDetail[] }> {
    try {
      const urls = [`${this.baseUrl}/chat/history?id=${sessionId}`];

      for (const url of urls) {
        const response = await authFetch(url, {
          method: "GET",
          headers: this.authHeaders(true),
        });
        if (!response.ok) continue;

        const data = this.unwrapList<ChatHistoryDetail>(await response.json());
        return { success: true, data };
      }

      return { success: true, data: [] };
    } catch (error) {
      console.error("Error fetching chat sessions:", error);
      return { success: false };
    }
  }

  /**
   * Attachments are protected resources. Fetching the blob here keeps the
   * GoTrue access token in the Token header instead of exposing it in a URL.
   */
  async downloadChatAttachment(attachmentId: number): Promise<Blob> {
    const response = await authFetch(
      `${this.baseUrl}/chat/file?id=${encodeURIComponent(String(attachmentId))}`,
      {
        method: 'GET',
        headers: this.authHeaders(false),
      }
    );

    if (!response.ok) {
      throw new Error(`Attachment download failed: ${response.status}`);
    }

    return response.blob();
  }

  async deleteAllChatSessions(): Promise<{ success: boolean }> {
    try {
      const listed = await this.getChatSessions();
      const sessions = listed.data || [];
      if (!listed.success) {
        return { success: false };
      }
      if (sessions.length === 0) {
        return { success: true };
      }

      const results = await Promise.all(
        sessions.map((session) => this.deleteChatSession(session.id))
      );
      return { success: results.every((result) => result.success) };
    } catch (error) {
      console.error("Error deleting all chat sessions:", error);
      return { success: false };
    }
  }

  async likeChatMessage(_messageId: number): Promise<{ success: boolean }> {
    return { success: true };
  }

  async dislikeChatMessage(_messageId: number): Promise<{ success: boolean }> {
    return { success: true };
  }

  async shareChatSession(
    sessionId: number,
    targetUserId: string,
    serviceId?: number
  ): Promise<ApiResponse<number>> {
    const response = await authFetch(`${this.baseUrl}/user/chat/share`, {
      method: 'POST',
      headers: this.authHeaders(true),
      body: JSON.stringify({ chatSessionId: sessionId, targetUserId, serviceId }),
    });
    const payload = await response.json();
    const result = Array.isArray(payload) ? payload[0] : payload;
    if (!response.ok) {
      return {
        success: false,
        data: 0,
        errors: result?.errors ?? ['Unable to share this chat.'],
        validationErrors: [],
        validationInfo: [],
        responseTimeStamp: new Date().toISOString(),
      };
    }
    return result as ApiResponse<number>;
  }

  async searchUsers(searchText: string): Promise<ApiResponse<UserLookupItem[]>> {
    const query = new URLSearchParams({ searchText: searchText.trim() });
    const response = await authFetch(`${this.baseUrl}/user/search?${query}`, {
      method: 'GET',
      headers: this.authHeaders(false),
    });
    const payload = await response.json();
    const result = Array.isArray(payload) ? payload[0] : payload;
    if (!response.ok) {
      return {
        success: false,
        data: [],
        errors: result?.errors ?? ['Unable to search users.'],
        validationErrors: [],
        validationInfo: [],
        responseTimeStamp: new Date().toISOString(),
      };
    }
    return result as ApiResponse<UserLookupItem[]>;
  }

  async getSharedChatSessions(): Promise<{ success: boolean; data?: SharedChatMemberGroup[] }> {
    try {
      const response = await authFetch(`${this.baseUrl}/user/chat/shared`, {
        method: 'GET',
        headers: this.authHeaders(false),
      });

      if (!response.ok) {
        console.error('Unable to load shared chats:', await response.text());
        return { success: false, data: [] };
      }

      const payload = await response.json();
      const result = Array.isArray(payload) ? payload[0] : payload;
      const groups = Array.isArray(result?.data) ? result.data : [];
      // A shared-chat entry is valid only when it points to a real shared
      // conversation. This prevents empty/default rows from appearing for a
      // newly created account.
      const data = groups
        .map((group: SharedChatMemberGroup) => ({
          ...group,
          conversations: (group.conversations ?? []).filter(conversation =>
            Number.isFinite(Number(conversation.chatSessionId)) &&
            Number(conversation.chatSessionId) > 0 &&
            Boolean(String(conversation.otherUserId ?? '').trim()),
          ),
        }))
        .filter((group: SharedChatMemberGroup) => group.conversations.length > 0);
      return { success: Boolean(result?.success), data };
    } catch (error) {
      console.error('Error loading shared chats:', error);
      return { success: false, data: [] };
    }
  }
}
