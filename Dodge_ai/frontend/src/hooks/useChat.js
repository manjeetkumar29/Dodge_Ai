import { useCallback, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import { clearChatSession, sendChatMessage } from "../services/api";

export function useChat() {
  const sessionId = useRef(uuidv4());
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I can help you analyze the Order to Cash process.",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [lastQueryResult, setLastQueryResult] = useState(null);

  const sendMessage = useCallback(
    async (text, onHighlight) => {
      if (!text.trim() || loading) return;

      const userMessage = {
        id: uuidv4(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => {
        // Strip out old follow-up questions from previous chat messages
        const updated = prev.map((m) => ({ ...m, followUpQuestions: [] }));
        return [...updated, userMessage];
      });
      setLoading(true);

      try {
        const response = await sendChatMessage(text, sessionId.current);
        const data = response.data;
        let rawContent = data.answer;
        let finalContent = data.answer || "";
        let finalCypher = data.cypher;
        let followUpQuestions = data.followUpQuestions || [];

        // Try parsing JSON if the response came back as a raw stringified object
        if (typeof rawContent === "string" && rawContent.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(rawContent);
            if (parsed.answer) finalContent = parsed.answer;
            if (parsed.cypher && !finalCypher) finalCypher = parsed.cypher;
            if (parsed.follow_up_questions && followUpQuestions.length === 0) followUpQuestions = parsed.follow_up_questions;
          } catch (e) {
            // It's just a regular string
          }
        }

        // Remove any markdown json blocks that leak into the text (e.g. ```json ... ```)
        finalContent = finalContent.replace(/```json[\s\S]*?```/g, "").trim();
        // Also remove generic inline text like "Here is the JSON object..."
        finalContent = finalContent.replace(/Here is the JSON object with the Cypher query and explanation:?/g, "").trim();

        // Extract Follow-up questions (fallback for older payload formats)
        const followupMarker = "Follow-up questions could include:";
        const followupIdx = finalContent.lastIndexOf(followupMarker);
        if (followupIdx !== -1) {
          const questionsBlock = finalContent.slice(followupIdx + followupMarker.length).trim();
          finalContent = finalContent.slice(0, followupIdx).trim();

          // Split questions by '?' and filter out empty strings
          if (followUpQuestions.length === 0) {
            followUpQuestions = questionsBlock
              .split("?")
              .map((q) => q.trim())
              .filter((q) => q)
              .map((q) => q + "?");
          }
        }

        const assistantMessage = {
          id: uuidv4(),
          role: "assistant",
          content: finalContent,
          cypher: finalCypher,
          results: data.results,
          followUpQuestions: followUpQuestions,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setLastQueryResult(data);
        if (onHighlight && data.highlights?.length > 0) {
          onHighlight(data.highlights);
        }
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            id: uuidv4(),
            role: "assistant",
            content: "Sorry, I encountered an error. Please try again.",
            error: true,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading]
  );

  const clearChat = useCallback(async () => {
    await clearChatSession(sessionId.current);
    sessionId.current = uuidv4();
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! I can help you analyze the Order to Cash process.",
        timestamp: new Date(),
      },
    ]);
    setLastQueryResult(null);
  }, []);

  return {
    messages,
    loading,
    lastQueryResult,
    sendMessage,
    clearChat,
    sessionId: sessionId.current,
  };
}
