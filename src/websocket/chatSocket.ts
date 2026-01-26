import crypto from 'crypto';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Server } from 'http';

const MAX_MEDIA_BYTES = 5 * 1024 * 1024;

type Participant = {
  id: string;
  name: string;
};

type Room = {
  roomId: string;
  roomName: string;
  maxUsers: number;
  ownerId: string;
  participants: Participant[];
};

const rooms = new Map<string, Room>();
const socketMeta = new Map<WebSocket, { roomId?: string; userId: string; userName?: string }>();

const send = (ws: WebSocket, payload: unknown) => {
  try {
    ws.send(JSON.stringify(payload));
  } catch {
    // ignore send errors
  }
};

const broadcastToRoom = (roomId: string, payload: unknown) => {
  for (const [ws, meta] of socketMeta.entries()) {
    if (meta.roomId === roomId) {
      send(ws, payload);
    }
  }
};

const roomStatePayload = (room: Room, selfId?: string) => ({
  type: 'roomState',
  roomId: room.roomId,
  roomName: room.roomName,
  maxUsers: room.maxUsers,
  ownerId: room.ownerId,
  participants: room.participants,
  selfId
});

const sendRoomState = (room: Room) => {
  for (const [ws, meta] of socketMeta.entries()) {
    if (meta.roomId === room.roomId) {
      send(ws, roomStatePayload(room, meta.userId));
    }
  }
};

const removeFromRoom = (ws: WebSocket) => {
  const meta = socketMeta.get(ws);
  if (!meta?.roomId) return;
  const room = rooms.get(meta.roomId);
  if (!room) return;

  room.participants = room.participants.filter((p) => p.id !== meta.userId);
  sendRoomState(room);

  if (room.participants.length === 0) {
    rooms.delete(room.roomId);
  } else if (room.ownerId === meta.userId) {
    const nextOwner = room.participants[0]?.id;
    if (nextOwner) {
      room.ownerId = nextOwner;
      sendRoomState(room);
    }
  }
};

export const initChatSocket = (server: Server) => {
  const wss = new WebSocketServer({ server, path: '/chat' });

  wss.on('connection', (ws: WebSocket) => {
    const userId = crypto.randomUUID();
    socketMeta.set(ws, { userId });

    ws.on('message', (raw: Buffer) => {
      let data: any;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        return send(ws, { type: 'error', message: 'Invalid JSON' });
      }

      const meta = socketMeta.get(ws);
      if (!meta) return;

      switch (data.type) {
        case 'createRoom': {
          const roomId = data.roomId?.trim() || crypto.randomUUID().slice(0, 8);
          const roomName = (data.roomName || 'Room').toString().trim().slice(0, 40);
          const maxUsers = Math.min(Math.max(parseInt(data.maxUsers ?? 2, 10), 2), 10);
          const userName = (data.userName || 'User').toString().trim().slice(0, 24);

          if (rooms.has(roomId)) {
            return send(ws, { type: 'error', message: 'Room already exists' });
          }

          const room: Room = {
            roomId,
            roomName,
            maxUsers,
            ownerId: userId,
            participants: [{ id: userId, name: userName }]
          };
          rooms.set(roomId, room);
          socketMeta.set(ws, { roomId, userId, userName });

          send(ws, { type: 'roomCreated', roomId });
          sendRoomState(room);
          return;
        }
        case 'joinRoom': {
          const roomId = data.roomId?.trim();
          const userName = (data.userName || 'User').toString().trim().slice(0, 24);
          if (!roomId) return send(ws, { type: 'error', message: 'Room ID required' });

          const room = rooms.get(roomId);
          if (!room) return send(ws, { type: 'error', message: 'Room not found' });
          if (room.participants.length >= room.maxUsers) {
            return send(ws, { type: 'error', message: 'Room is full' });
          }

          room.participants.push({ id: userId, name: userName });
          socketMeta.set(ws, { roomId, userId, userName });
          sendRoomState(room);
          return;
        }
        case 'leaveRoom': {
          removeFromRoom(ws);
          socketMeta.set(ws, { userId });
          return;
        }
        case 'removeUser': {
          const targetUserId = data.targetUserId;
          const roomId = meta.roomId;
          if (!roomId) return;
          const room = rooms.get(roomId);
          if (!room || room.ownerId !== userId) {
            return send(ws, { type: 'error', message: 'Not authorized' });
          }
          room.participants = room.participants.filter((p) => p.id !== targetUserId);
          for (const [otherWs, otherMeta] of socketMeta.entries()) {
            if (otherMeta.roomId === roomId && otherMeta.userId === targetUserId) {
              socketMeta.set(otherWs, { userId: otherMeta.userId });
              send(otherWs, { type: 'removed', roomId });
            }
          }
          sendRoomState(room);
          return;
        }
        case 'message': {
          const roomId = meta.roomId;
          if (!roomId) return send(ws, { type: 'error', message: 'Not in a room' });
          const room = rooms.get(roomId);
          if (!room) return send(ws, { type: 'error', message: 'Room not found' });

          const msgType = data.messageType;
          const payload = data.payload ?? '';
          if (msgType === 'image' || msgType === 'video') {
            if (typeof payload !== 'string' || payload.length > MAX_MEDIA_BYTES * 1.4) {
              return send(ws, { type: 'error', message: 'Media too large' });
            }
          }

          broadcastToRoom(roomId, {
            type: 'message',
            messageId: crypto.randomUUID(),
            roomId,
            senderId: userId,
            senderName: meta.userName ?? 'User',
            messageType: msgType,
            payload,
            timestamp: Date.now()
          });
          return;
        }
        default:
          return send(ws, { type: 'error', message: 'Unknown message type' });
      }
    });

    ws.on('close', () => {
      removeFromRoom(ws);
      socketMeta.delete(ws);
    });
  });
};
