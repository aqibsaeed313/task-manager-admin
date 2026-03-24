import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinTask: (taskId: string) => void;
  leaveTask: (taskId: string) => void;
  emitTyping: (taskId: string, username: string) => void;
  emitStopTyping: (taskId: string) => void;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Get API URL from env and convert http to ws
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socketUrl = apiUrl.replace(/^http/, "ws");

    // Initialize socket connection
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["polling"], // Forced polling to prevent Vercel websocket noise
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
      setIsConnected(false);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const joinTask = (taskId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("join-task", taskId);
    }
  };

  const leaveTask = (taskId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("leave-task", taskId);
    }
  };

  const emitTyping = (taskId: string, username: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("typing", { taskId, username });
    }
  };

  const emitStopTyping = (taskId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("stop-typing", { taskId });
    }
  };

  const value: SocketContextType = {
    socket: socketRef.current,
    isConnected,
    joinTask,
    leaveTask,
    emitTyping,
    emitStopTyping,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}
