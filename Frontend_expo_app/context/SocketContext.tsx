import React, { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/Config';

interface SocketContextType {
  socket: Socket | null;
  unreadCount: number;
  setUnreadCount: React.Dispatch<React.SetStateAction<number>>;
  notifications: any[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  unreadCount: 0,
  setUnreadCount: () => {},
  notifications: [],
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    let newSocket: Socket | null = null;

    const initSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        if (!token) return;

        // Parse base URL to get root domain (remove /api/v1)
        const socketUrl = API_BASE_URL.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

        newSocket = io(socketUrl, {
          auth: { token },
        });

        newSocket.on('connect', () => {
          console.log('Socket connected to:', socketUrl);
        });

        newSocket.on('newNotification', (payload: any) => {
          setUnreadCount((prev) => prev + 1);
          setNotifications((prev) => [payload, ...prev].slice(0, 10));
        });

        setSocket(newSocket);
      } catch (err) {
        console.error('Failed to init socket', err);
      }
    };

    initSocket();

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, unreadCount, setUnreadCount, notifications }}>
      {children}
    </SocketContext.Provider>
  );
};
