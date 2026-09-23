import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from '../utils/jwt';

let io: SocketIOServer;

export const initSocket = (httpServer: HttpServer, allowedOrigins: string | string[]) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    try {
      // 1. Try to get token from cookie header
      const cookieHeader = socket.request.headers.cookie;
      let token = '';

      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const tokenCookie = cookies.find(c => c.startsWith('token='));
        if (tokenCookie) {
          token = tokenCookie.split('=')[1];
        }
      }

      // 2. If no cookie, check auth payload (some clients send it here if not using cookies natively in socket.io setup though standard browser will send cookie)
      if (!token && socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const payload = verifyToken(token);
      
      // Store user info in socket
      socket.data.user = payload;

      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user;
    
    // Join user-specific room
    if (user && user.userId) {
      const room = `user:${user.userId}`;
      socket.join(room);
      console.log(`Socket connected and joined room ${room} (Socket ID: ${socket.id})`);
    }

    socket.on('disconnect', () => {
      console.log(`Socket disconnected (Socket ID: ${socket.id})`);
    });
  });

  return io;
};

export const getIo = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO has not been initialized');
  }
  return io;
};
