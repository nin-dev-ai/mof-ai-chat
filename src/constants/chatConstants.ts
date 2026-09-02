/** Browser-facing n8n webhook host. All frontend HTTP calls go through n8n. */
export const N8N_WEBHOOK_BASE_URL = 'http://172.26.129.185/webhook';

/** The only direct non-n8n browser connection: live chat status and responses. */
export const WEBSOCKET_URL = 'http://172.26.129.186/socket.io/';

/** n8n webhook used for general chat and local service catalog. */
export const GENERAL_CHAT_WEBHOOK_URL =
  `${N8N_WEBHOOK_BASE_URL}/eaf662ae-38af-4953-bb20-e7f97c08536e/chat`;

export const MOF_BRANDMARK_SRC =
  '/UAE_MOF_brandmark_Horizontal_CMYK_E-1-scaled-removebg-preview.png';
export const HISTORY_ICON_SRC = '/2961948.png';
