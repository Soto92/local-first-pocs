const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const createConversation = () => ({
  id: createId(),
  title: "New chat",
  messages: [],
});
