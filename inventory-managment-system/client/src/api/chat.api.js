import axios from "axios";
import axiosInstance from "@/lib/axiosInstance";
import store from "@/store";
import { logout, setAccessToken, setError } from "@/store/slices/authSlice";

const getBaseUrl = () =>
  axiosInstance.defaults.baseURL || "http://localhost:5000";

const getAccessToken = () => store.getState().auth.accessToken;

const refreshAuthToken = async () => {
  try {
    const response = await axios.post(
      `${getBaseUrl()}/api/v1/auth/refresh-auth`,
      {},
      {
        withCredentials: true,
      },
    );

    const { accessToken } = response.data;
    if (accessToken) {
      store.dispatch(setAccessToken(accessToken));
    }

    return accessToken;
  } catch (error) {
    store.dispatch(logout());
    store.dispatch(setError("Session expired. Please login again."));
    throw error;
  }
};

const parseSseBuffer = (buffer, onPayload) => {
  let workingBuffer = buffer;

  while (true) {
    const delimiterIndex = workingBuffer.indexOf("\n\n");
    if (delimiterIndex === -1) break;

    const rawEvent = workingBuffer.slice(0, delimiterIndex).trim();
    workingBuffer = workingBuffer.slice(delimiterIndex + 2);

    if (!rawEvent) continue;

    const dataLines = rawEvent
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart());

    if (!dataLines.length) continue;

    try {
      const payload = JSON.parse(dataLines.join("\n"));
      onPayload(payload);
    } catch (error) {
      console.error("Failed to parse chatbot stream payload:", error.message);
    }
  }

  return workingBuffer;
};

export const chatWithAI = (data, config = {}) => {
  return axiosInstance
    .post("/api/v1/ai/chat", data, config)
    .then((res) => res.data);
};

export const chatWithAIStream = async (data = {}, handlers = {}) => {
  const { signal, ...payload } = data;
  const streamUrl = `${getBaseUrl()}/api/v1/ai/chat/stream`;

  const executeRequest = async (retried = false) => {
    const accessToken = getAccessToken();

    const response = await fetch(streamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify(payload),
      signal,
    });

    if (response.status === 401 && !retried) {
      await refreshAuthToken();
      return executeRequest(true);
    }

    if (!response.ok) {
      const errorText = await response.text();
      const error = new Error(
        errorText || `Request failed with status ${response.status}`,
      );
      error.response = {
        status: response.status,
        data: {
          message: errorText,
        },
      };
      throw error;
    }

    if (!response.body) {
      throw new Error("Streaming response is not available");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalPayload = null;

    try {
      while (true) {
        if (signal?.aborted) {
          const abortError = new DOMException(
            "The request was aborted.",
            "AbortError",
          );
          throw abortError;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        buffer = parseSseBuffer(buffer, (payloadEvent) => {
          handlers.onEvent?.(payloadEvent);

          if (payloadEvent.type === "chunk") {
            handlers.onChunk?.(payloadEvent.content || "", payloadEvent);
          }

          if (payloadEvent.type === "tool") {
            handlers.onTool?.(payloadEvent);
          }

          if (payloadEvent.type === "complete") {
            finalPayload = payloadEvent;
            handlers.onComplete?.(payloadEvent);
          }

          if (payloadEvent.type === "error") {
            const streamError = new Error(
              payloadEvent.message || "Streaming request failed",
            );
            streamError.response = { data: payloadEvent };
            handlers.onError?.(streamError);
            throw streamError;
          }
        });
      }

      buffer += decoder.decode();
      buffer = parseSseBuffer(buffer, (payloadEvent) => {
        handlers.onEvent?.(payloadEvent);

        if (payloadEvent.type === "chunk") {
          handlers.onChunk?.(payloadEvent.content || "", payloadEvent);
        }

        if (payloadEvent.type === "tool") {
          handlers.onTool?.(payloadEvent);
        }

        if (payloadEvent.type === "complete") {
          finalPayload = payloadEvent;
          handlers.onComplete?.(payloadEvent);
        }

        if (payloadEvent.type === "error") {
          const streamError = new Error(
            payloadEvent.message || "Streaming request failed",
          );
          streamError.response = { data: payloadEvent };
          handlers.onError?.(streamError);
          throw streamError;
        }
      });

      return finalPayload;
    } finally {
      reader.releaseLock();
    }
  };

  return executeRequest();
};

export const getChatHistory = (params = {}) => {
  return axiosInstance
    .get("/api/v1/ai/chat/history", { params })
    .then((res) => res.data);
};

export const clearContext = (data = {}) => {
  return axiosInstance
    .delete("/api/v1/ai/chat/context", { data })
    .then((res) => res.data);
};

export const getChatAnalytics = () => {
  return axiosInstance.get("/api/v1/ai/chat/analytics").then((res) => res.data);
};
