import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  output: string;
  sessionDetails: {
    messageId: string;
    sessionId: string;
    userMessageId: number;
    aiMessageId: number;
    weaveChatid: number;
    chatLock: boolean;
    chatLockMessage?: string;
    chatLockAnimation?: 'default' | string;
    download?: boolean;
    fileName?: string;
    chartDisplay?: boolean;
    chartType?: number;
    altType?: number[];
    chartData?: {
      data: Array<Record<string, unknown>>;
      xField: string;
      yField: string;
      series: Array<{
        type: string;
        name: string;
        valueYField: string;
        categoryXField: string;
      }>;
    };
  };
  actionButtons?: {
    buttons: Array<{
      label: string;
      actionButtonType: string;
      id?: string;
      mimeType?: string;
      singleUpload?: boolean;
      file_id?: string;
    }>;
  };
  intermediateSteps?: Array<{
    action: {
      tool: string;
      toolInput: Record<string, unknown>;
      toolCallId: string;
      log: string;
      messageLog: Array<{
        lc: number;
        type: string;
        id: string[];
        kwargs: Record<string, unknown>;
      }>;
    };
    observation: string;
  }>;
  chartData?: Array<{
    chartDisplay: boolean;
    chartType: number;
    altType: number[];
    chartData: {
      data: Array<Record<string, unknown>>;
      xField: string;
      yField: string;
      series: Array<{
        type: string;
        name: string;
        valueYField: string;
        categoryXField: string;
      }>;
    };
  }>;
}

export type WebSocketEventCallback = (message: WebSocketMessage) => void;
export type WebSocketConnectionCallback = (socketId: string) => void;
export type WebSocketErrorCallback = (error: Error) => void;

function parseSocketIoTarget(rawUrl: string): { origin: string; path: string } {
  const defaultPath = '/socket.io/';
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return { origin: '', path: defaultPath };
  }

  try {
    const withProtocol = /^[a-z]+:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    const url = new URL(withProtocol);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const isEnginePath = pathname === '/socket.io' || pathname.endsWith('/socket.io');

    if (isEnginePath) {
      return { origin: url.origin, path: `${pathname}/` };
    }

    return {
      origin: `${url.origin}${pathname === '/' ? '' : pathname}`,
      path: defaultPath,
    };
  } catch {
    return { origin: trimmed.replace(/\/+$/, ''), path: defaultPath };
  }
}

export class SocketService {
  private socket: Socket | null = null;
  private serverUrl: string;
  private socketPath: string;
  private sessionId: string;
  private socketId: string | null = null;
  private messageCallbacks: Map<string, WebSocketEventCallback[]> = new Map();
  private connectionCallbacks: WebSocketConnectionCallback[] = [];
  private disconnectionCallbacks: (() => void)[] = [];
  private errorCallbacks: WebSocketErrorCallback[] = [];
  private listenersAttached = false;
  private connectPromise: Promise<string> | null = null;
  private connectAttemptErrors = 0;
  private readonly maxConnectAttempts = 5;

  constructor(serverUrl: string, sessionId: string) {
    const target = parseSocketIoTarget(serverUrl);
    this.serverUrl = target.origin;
    this.socketPath = target.path;
    this.sessionId = sessionId;
  }

  private ensureSocketInstance(): Socket {
    if (this.socket) {
      return this.socket;
    }

    this.socket = io(this.serverUrl, {
      path: this.socketPath,
      // Polling first avoids WS upgrade timeouts on some networks/proxies.
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxConnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 30000,
      autoConnect: false,
      query: {
        sessionId: this.sessionId,
      },
    });

    this.attachSocketListeners();
    return this.socket;
  }

  private attachSocketListeners(): void {
    if (!this.socket || this.listenersAttached) {
      return;
    }

    this.listenersAttached = true;

    this.socket.on('connect', () => {
      this.socketId = this.socket?.id || null;
      this.connectAttemptErrors = 0;
      this.socket?.emit('join', { sessionId: this.sessionId });

      this.connectionCallbacks.forEach((callback) => {
        if (this.socketId) {
          callback(this.socketId);
        }
      });
    });

    this.socket.on('disconnect', () => {
      this.disconnectionCallbacks.forEach((callback) => callback());
    });

    this.socket.on('connect_error', (error: Error) => {
      this.connectAttemptErrors += 1;
      this.errorCallbacks.forEach((callback) => callback(error));
    });

    this.socket.on('n8n_response', (data: WebSocketMessage) => {
      this.handleIncomingMessage('n8n_response', data);
    });

    this.socket.on(
      'chat_lock_update',
      (data: { sessionId: string; chatLock: boolean; chatLockMessage?: string }) => {
        this.handleIncomingMessage('chat_lock_update', data as unknown as WebSocketMessage);
      },
    );
  }

  connect(): Promise<string> {
    if (this.socket?.connected && this.socketId) {
      return Promise.resolve(this.socketId);
    }

    if (this.connectPromise) {
      return this.connectPromise;
    }

    const socket = this.ensureSocketInstance();
    this.connectAttemptErrors = 0;

    this.connectPromise = new Promise((resolve, reject) => {
      let settled = false;

      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onConnectError);
        this.connectPromise = null;
      };

      const finish = (action: () => void) => {
        if (settled) return;
        settled = true;
        cleanup();
        action();
      };

      const onConnect = () => {
        finish(() => resolve(this.socketId!));
      };

      const onConnectError = (error: Error) => {
        if (this.connectAttemptErrors >= this.maxConnectAttempts) {
          finish(() =>
            reject(
              error instanceof Error
                ? error
                : new Error(`Failed to connect after ${this.maxConnectAttempts} attempts`),
            ),
          );
        }
      };

      socket.on('connect', onConnect);
      socket.on('connect_error', onConnectError);

      if (!socket.connected) {
        socket.connect();
      } else {
        onConnect();
      }
    });

    return this.connectPromise;
  }

  private normalizeIncomingMessage(data: WebSocketMessage): WebSocketMessage {
    const raw = data as WebSocketMessage & {
      chatLock?: boolean | string;
      chatLockMessage?: string;
      chatLockAnimation?: string;
      sessionId?: string;
    };

    if (raw.sessionDetails) {
      const lock = raw.sessionDetails.chatLock as boolean | string;
      if (typeof lock === 'string') {
        raw.sessionDetails.chatLock = lock.toLowerCase() === 'true';
      }
      return raw;
    }

    if (raw.chatLock !== undefined || raw.sessionId) {
      const isLocked = String(raw.chatLock).toLowerCase() === 'true';

      return {
        output: raw.output ?? '',
        sessionDetails: {
          messageId: '',
          sessionId: raw.sessionId ?? this.sessionId,
          userMessageId: 0,
          aiMessageId: 0,
          weaveChatid: 0,
          chatLock: isLocked,
          chatLockMessage: raw.chatLockMessage,
          chatLockAnimation: raw.chatLockAnimation,
        },
      };
    }

    return raw;
  }

  private handleIncomingMessage(eventName: string, data: WebSocketMessage): void {
    const normalized = this.normalizeIncomingMessage(data);

    if (
      normalized.sessionDetails?.sessionId &&
      normalized.sessionDetails.sessionId !== this.sessionId
    ) {
      return;
    }

    const eventCallbacks = this.messageCallbacks.get(eventName) || [];
    eventCallbacks.forEach((callback) => callback(normalized));

    const allCallbacks = this.messageCallbacks.get('all') || [];
    allCallbacks.forEach((callback) => callback(normalized));
  }

  onMessage(eventName: string, callback: WebSocketEventCallback): void {
    if (!this.messageCallbacks.has(eventName)) {
      this.messageCallbacks.set(eventName, []);
    }
    this.messageCallbacks.get(eventName)!.push(callback);
  }

  offMessage(eventName: string, callback: WebSocketEventCallback): void {
    const callbacks = this.messageCallbacks.get(eventName);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  onConnect(callback: WebSocketConnectionCallback): void {
    this.connectionCallbacks.push(callback);
    if (this.socket?.connected && this.socketId) {
      callback(this.socketId);
    }
  }

  onDisconnect(callback: () => void): void {
    this.disconnectionCallbacks.push(callback);
  }

  onError(callback: WebSocketErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  getSocketId(): string | null {
    return this.socketId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  setSessionId(sessionId: string): void {
    if (this.sessionId === sessionId) {
      return;
    }

    if (this.socket?.connected) {
      this.socket.emit('leave', { sessionId: this.sessionId });
    }

    this.sessionId = sessionId;

    if (this.socket) {
      this.socket.io.opts.query = { sessionId: this.sessionId };
    }

    if (this.socket?.connected) {
      this.socket.emit('join', { sessionId: this.sessionId });
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  disconnect(): void {
    this.connectPromise = null;
    this.connectAttemptErrors = 0;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.socketId = null;
      this.listenersAttached = false;
    }
  }
}
