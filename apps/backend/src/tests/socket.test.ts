import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initSocket, getIo } from '../services/socket';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as jwtUtils from '../utils/jwt';

// Mock Socket.IO server
vi.mock('socket.io', () => {
  const mockServer = vi.fn().mockImplementation(() => {
    return {
      use: vi.fn(),
      on: vi.fn(),
    };
  });
  return { Server: mockServer };
});

vi.mock('../utils/jwt', () => ({
  verifyToken: vi.fn(),
}));

describe('Socket Service', () => {
  let mockHttpServer: any;

  beforeEach(() => {
    mockHttpServer = new HttpServer();
    vi.clearAllMocks();
  });

  it('initializes Socket.IO server', () => {
    const io = initSocket(mockHttpServer, 'http://localhost:3000');
    expect(io).toBeDefined();
    expect(getIo()).toBe(io);
  });

  it('authenticates socket connection with cookie', () => {
    const io = initSocket(mockHttpServer, 'http://localhost:3000');
    const useMock = (io.use as any).mock.calls[0][0];

    const mockSocket = {
      request: {
        headers: {
          cookie: 'token=valid_token; other=123',
        },
      },
      handshake: {},
      data: {},
    };

    const nextMock = vi.fn();
    (jwtUtils.verifyToken as any).mockReturnValue({ userId: 'user1' });

    useMock(mockSocket, nextMock);

    expect(jwtUtils.verifyToken).toHaveBeenCalledWith('valid_token');
    expect(mockSocket.data.user).toEqual({ userId: 'user1' });
    expect(nextMock).toHaveBeenCalledWith(); // Called without error
  });

  it('rejects unauthenticated socket connection', () => {
    const io = initSocket(mockHttpServer, 'http://localhost:3000');
    const useMock = (io.use as any).mock.calls[0][0];

    const mockSocket = {
      request: { headers: {} },
      handshake: {},
      data: {},
    };

    const nextMock = vi.fn();

    useMock(mockSocket, nextMock);

    expect(nextMock).toHaveBeenCalledWith(expect.any(Error));
    expect(nextMock.mock.calls[0][0].message).toContain('No token provided');
  });

  it('places authenticated user in their specific room', () => {
    const io = initSocket(mockHttpServer, 'http://localhost:3000');
    const onConnectMock = (io.on as any).mock.calls[0][1];

    const mockSocket = {
      id: 'socket-1',
      data: { user: { userId: 'user1' } },
      join: vi.fn(),
      on: vi.fn(),
    };

    onConnectMock(mockSocket);

    expect(mockSocket.join).toHaveBeenCalledWith('user:user1');
  });
});
