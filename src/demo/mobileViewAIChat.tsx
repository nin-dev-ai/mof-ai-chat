import React from 'react';
import { createRoot } from 'react-dom/client';
import { WeaveAiChat } from '../components/WeaveAiChat';
import { WeaveAiChatProps } from '../components/WeaveAiChat';
import inputCss from '../styles/input.css?inline'; 

declare global {
  interface Window {
    __VEAVE_AI_CHAT_PROPS__?: Partial<WeaveAiChatProps>;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const props = window.__VEAVE_AI_CHAT_PROPS__;
  const container = document.getElementById('root');

  if (!props) {
    console.error('No props found on window.__VEAVE_AI_CHAT_PROPS__');
    return;
  }

  if (!container) {
    console.error('Container element with id "root" not found.');
    return;
  }

  // Optional: manually inject styles like in Web Components
  const style = document.createElement('style');
  style.textContent = inputCss;
  document.head.appendChild(style);

  const root = createRoot(container);
  root.render(<WeaveAiChat {...props} />);
});
