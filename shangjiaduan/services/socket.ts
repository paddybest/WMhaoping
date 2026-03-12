import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from '../constants';

let socket: Socket | null = null;

export const connectSocket = (token: string, merchantId?: number) => {
  if (socket?.connected) {
    socket.disconnect();
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    path: '/socket.io',
  });

  socket.on('connect', () => {
    console.log('Socket connected');
    if (merchantId) {
      joinMerchantRoom(merchantId);
    }
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinMerchantRoom = (merchantId: number) => {
  if (socket) {
    socket.emit('join-merchant', merchantId);
    console.log(`Joined merchant room: ${merchantId}`);
  }
};

export const leaveMerchantRoom = (merchantId: number) => {
  if (socket) {
    socket.emit('leave-merchant', merchantId);
    console.log(`Left merchant room: ${merchantId}`);
  }
};

export const onNewReview = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('new-review', callback);
  }
};

export const onLotteryResult = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('lottery-result', callback);
  }
};

export const removeNewReviewListener = (callback: (data: any) => void) => {
  if (socket) {
    socket.off('new-review', callback);
  }
};

export const removeLotteryResultListener = (callback: (data: any) => void) => {
  if (socket) {
    socket.off('lottery-result', callback);
  }
};