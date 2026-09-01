# Weave AI Chat Component

A modern, framework-agnostic chat interface component built with React and Tailwind CSS. This component can be used in React, Vue, or Angular projects.

## Features

- 🎨 Modern UI with Tailwind CSS
- 🌐 Framework agnostic
- 🔤 i18n ready
- 📎 File attachment support
- 🎤 Voice input support
- ⌨️ TypeScript support
- 📱 Responsive design
- 🎯 Customizable styling

## Installation

```bash
npm install weave-ai-chat
# or
yarn add weave-ai-chat
```

## Usage

### React

```tsx
import WeaveAiChat from 'weave-ai-chat';
import 'weave-ai-chat/dist/styles.css';

function App() {
  const handleSendMessage = async (message: string) => {
    // Handle sending message
    console.log('Sending message:', message);
  };

  const handleFileUpload = async (file: File) => {
    // Handle file upload
    console.log('Uploading file:', file.name);
  };

  const handleVoiceInput = async () => {
    // Handle voice input
    console.log('Starting voice input');
  };

  return (
    <div style={{ height: '600px' }}>
      <WeaveAiChat
        onSendMessage={handleSendMessage}
        onAttachFile={handleFileUpload}
        onVoiceInput={handleVoiceInput}
        placeholder="Ask me anything..."
      />
    </div>
  );
}
```

### Vue 3

```vue
<template>
  <div style="height: 600px">
    <WeaveAiChat
      :onSendMessage="handleSendMessage"
      :onAttachFile="handleFileUpload"
      :onVoiceInput="handleVoiceInput"
      placeholder="Ask me anything..."
    />
  </div>
</template>

<script setup lang="ts">
import WeaveAiChat from 'weave-ai-chat';
import 'weave-ai-chat/dist/styles.css';

const handleSendMessage = async (message: string) => {
  // Handle sending message
  console.log('Sending message:', message);
};

const handleFileUpload = async (file: File) => {
  // Handle file upload
  console.log('Uploading file:', file.name);
};

const handleVoiceInput = async () => {
  // Handle voice input
  console.log('Starting voice input');
};
</script>
```

### Angular

```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [BrowserModule],
  bootstrap: [AppComponent],
})
export class AppModule {}

// app.component.ts
import { Component } from '@angular/core';
import WeaveAiChat from 'weave-ai-chat';
import 'weave-ai-chat/dist/styles.css';

@Component({
  selector: 'app-root',
  template: `
    <div style="height: 600px">
      <weave-ai-chat
        [onSendMessage]="handleSendMessage"
        [onAttachFile]="handleFileUpload"
        [onVoiceInput]="handleVoiceInput"
        placeholder="Ask me anything..."
      ></weave-ai-chat>
    </div>
  `,
})
export class AppComponent {
  handleSendMessage = async (message: string) => {
    // Handle sending message
    console.log('Sending message:', message);
  };

  handleFileUpload = async (file: File) => {
    // Handle file upload
    console.log('Uploading file:', file.name);
  };

  handleVoiceInput = async () => {
    // Handle voice input
    console.log('Starting voice input');
  };
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| onSendMessage | `(message: string) => Promise<void>` | Callback when a message is sent |
| onAttachFile | `(file: File) => Promise<void>` | Callback when a file is attached |
| onVoiceInput | `() => Promise<void>` | Callback when voice input is triggered |
| className | `string` | Additional CSS classes |
| placeholder | `string` | Input placeholder text |
| initialMessages | `Message[]` | Initial messages to display |

## Types

```typescript
interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}
```

## Customization

The component uses Tailwind CSS for styling. You can customize the appearance by:

1. Overriding the default Tailwind CSS classes
2. Providing custom CSS classes through the `className` prop
3. Modifying the Tailwind configuration

## License

MIT 