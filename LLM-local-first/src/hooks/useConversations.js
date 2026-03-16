import { useEffect, useMemo, useRef, useState } from "react";
import { createConversation } from "../utils/conversation";
import { readStoredState, writeStoredState } from "../utils/storage";

export const useConversations = () => {
  const initialConversationRef = useRef(null);
  const storedStateRef = useRef(null);

  if (!initialConversationRef.current) {
    initialConversationRef.current = createConversation();
  }
  if (storedStateRef.current === null) {
    storedStateRef.current = readStoredState();
  }

  const storedState = storedStateRef.current;

  const [conversations, setConversations] = useState(() =>
    storedState?.conversations?.length
      ? storedState.conversations
      : [initialConversationRef.current],
  );
  const [activeConversationId, setActiveConversationId] = useState(() => {
    if (storedState?.conversations?.length) {
      return storedState.activeConversationId || storedState.conversations[0].id;
    }
    return initialConversationRef.current.id;
  });

  useEffect(() => {
    writeStoredState({
      conversations,
      activeConversationId,
    });
  }, [conversations, activeConversationId]);

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === activeConversationId,
      ),
    [conversations, activeConversationId],
  );

  const updateConversation = (conversationId, updater) => {
    setConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === conversationId
          ? updater(conversation)
          : conversation,
      ),
    );
  };

  const startNewConversation = () => {
    const next = createConversation();
    setConversations((prev) => [next, ...prev]);
    setActiveConversationId(next.id);
    return next.id;
  };

  const appendMessage = (conversationId, message) => {
    updateConversation(conversationId, (conversation) => {
      const nextMessages = [...conversation.messages, message];
      const nextTitle =
        conversation.title === "New chat" && message.role === "user"
          ? message.content.slice(0, 32)
          : conversation.title;
      return { ...conversation, messages: nextMessages, title: nextTitle };
    });
  };

  const updateLastAssistantMessage = (conversationId, content) => {
    updateConversation(conversationId, (conversation) => {
      const nextMessages = [...conversation.messages];
      if (nextMessages.length === 0) {
        return conversation;
      }
      const lastIndex = nextMessages.length - 1;
      nextMessages[lastIndex] = {
        ...nextMessages[lastIndex],
        content,
      };
      return { ...conversation, messages: nextMessages };
    });
  };

  const clearConversation = () => {
    if (!activeConversation) {
      return;
    }
    updateConversation(activeConversation.id, (conversation) => ({
      ...conversation,
      title: "New chat",
      messages: [],
    }));
  };

  return {
    conversations,
    activeConversationId,
    setActiveConversationId,
    activeConversation,
    startNewConversation,
    appendMessage,
    updateLastAssistantMessage,
    clearConversation,
  };
};
