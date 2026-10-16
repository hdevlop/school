/**
 * najm-chatbot asks its `i18n` function for its own English captions. This is
 * the catalog key School answers each one with. A caption the widget adds later
 * and this map does not know stays in English rather than showing a raw key.
 * The default system instruction is deliberately absent: it is sent to the
 * model, not shown as interface text.
 */
export const CHATBOT_LABEL_KEYS: Readonly<Record<string, string>> = {
  'AI Assistant': 'chatbot.assistant',
  'API Key': 'chatbot.apiKey',
  'Ask anything': 'chatbot.askAnything',
  'Back to chat': 'chatbot.backToChat',
  'Base URL': 'chatbot.baseUrl',
  'Clear chat': 'chatbot.clearChat',
  Close: 'chatbot.close',
  Connected: 'chatbot.connected',
  Copied: 'chatbot.copied',
  Copy: 'chatbot.copy',
  'Get key': 'chatbot.getKey',
  Instruction: 'chatbot.instruction',
  'Invalid settings': 'chatbot.invalidSettings',
  'Messages sent to LLM': 'chatbot.messagesSentToLlm',
  Model: 'chatbot.model',
  'Remember messages for this session and use them in follow-up replies.': 'chatbot.memoryHint',
  'Remove model': 'chatbot.removeModel',
  Resize: 'chatbot.resize',
  Save: 'chatbot.save',
  'Saved key': 'chatbot.savedKey',
  Saved: 'chatbot.saved',
  Send: 'chatbot.send',
  'Settings look ready': 'chatbot.settingsReady',
  Settings: 'chatbot.settings',
  'Show model suggestions': 'chatbot.showModelSuggestions',
  Stop: 'chatbot.stop',
  'Stored memory limit': 'chatbot.memoryLimit',
  'Test connection': 'chatbot.testConnection',
  'Use conversation memory': 'chatbot.useMemory',
};

export const chatbotTranslator = (t: (key: string) => string) =>
  (caption: string) => {
    const key = CHATBOT_LABEL_KEYS[caption];
    return key ? t(key) : caption;
  };
