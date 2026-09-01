/** Reverse-proxied origin shared by GoTrue (`/auth/`) and Socket.IO (`/socket.io/`). */
export const INTERNAL_ORIGIN = 'http://172.26.129.186';

/** Socket.IO relay for async n8n responses. Empty string disables WebSocket. */
export const WEBSOCKET_URL = `${INTERNAL_ORIGIN}/socket.io/`;

/** GoTrue auth service, reverse-proxied from `/auth/` to `gotrue:9999`. */
export const GOTRUE_URL = `${INTERNAL_ORIGIN}/auth`;

/** n8n webhook used for general chat and local service catalog. */
export const GENERAL_CHAT_WEBHOOK_URL =
  'https://uat-esolutions.solutionsplus.ae/ai/eaf662ae-38af-4953-bb20-e7f97c08536e/chat';

export const MOF_BRANDMARK_SRC =
  '/UAE_MOF_brandmark_Horizontal_CMYK_E-1-scaled-removebg-preview.png';
export const HISTORY_ICON_SRC = '/2961948.png';
