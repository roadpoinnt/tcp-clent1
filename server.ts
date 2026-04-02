import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import net from 'net';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    },
  });

  // API routes FIRST
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // TCP Client Logic
  const activeConnections = new Map<string, { socket: net.Socket | null, interval: NodeJS.Timeout | null }>();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('connect_tcp', ({ ip, port }) => {
      if (activeConnections.has(socket.id) && activeConnections.get(socket.id)?.socket) {
        socket.emit('log', { type: 'error', message: 'Already connected to a TCP server.' });
        return;
      }

      socket.emit('log', { type: 'info', message: `Connecting to ${ip}:${port}...` });

      const tcpSocket = new net.Socket();

      tcpSocket.connect(port, ip, () => {
        socket.emit('log', { type: 'success', message: `Connected to ${ip}:${port}` });
        socket.emit('tcp_connected');
        activeConnections.set(socket.id, { socket: tcpSocket, interval: null });
      });

      tcpSocket.on('data', (data) => {
        socket.emit('log', { type: 'received', message: `Received: ${data.toString()}` });
      });

      tcpSocket.on('close', () => {
        socket.emit('log', { type: 'info', message: 'Connection closed by server.' });
        const conn = activeConnections.get(socket.id);
        if (conn) {
          if (conn.interval) clearInterval(conn.interval);
          activeConnections.delete(socket.id);
        }
        socket.emit('tcp_disconnected');
      });

      tcpSocket.on('error', (err) => {
        socket.emit('log', { type: 'error', message: `TCP Error: ${err.message}` });
        socket.emit('tcp_disconnected');
      });
    });

    socket.on('disconnect_tcp', () => {
      const conn = activeConnections.get(socket.id);
      if (conn) {
        if (conn.interval) clearInterval(conn.interval);
        if (conn.socket) conn.socket.destroy();
        activeConnections.delete(socket.id);
        socket.emit('log', { type: 'info', message: 'Disconnected from TCP server.' });
        socket.emit('tcp_disconnected');
      }
    });

    socket.on('start_sending', ({ locationPacketTemplate }) => {
      const conn = activeConnections.get(socket.id);
      if (!conn || !conn.socket) {
        socket.emit('log', { type: 'error', message: 'Not connected to TCP server.' });
        return;
      }
      if (conn.interval) {
        socket.emit('log', { type: 'error', message: 'Already sending packets.' });
        return;
      }

      const getUtcDateTime = () => {
        const now = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        const dateStr = `${pad(now.getUTCDate())}${pad(now.getUTCMonth() + 1)}${now.getUTCFullYear()}`;
        const timeStr = `${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}`;
        return { dateStr, timeStr };
      };

      let frameNumber = 1;
      conn.interval = setInterval(() => {
        const { dateStr, timeStr } = getUtcDateTime();
        const paddedFrameNo = String(frameNumber).padStart(6, '0');
        const packetToSend = locationPacketTemplate
          .replace(/{FRAME_NO}/g, paddedFrameNo)
          .replace(/{DATE}/g, dateStr)
          .replace(/{TIME}/g, timeStr);
        
        conn.socket?.write(packetToSend);
        socket.emit('log', { type: 'sent', message: `Sent Location (Frame ${frameNumber}): ${packetToSend}` });
        
        frameNumber++;
      }, 10000);

      socket.emit('sending_started');
      socket.emit('log', { type: 'info', message: 'Started sending location packets.' });
    });

    socket.on('stop_sending', () => {
      const conn = activeConnections.get(socket.id);
      if (conn && conn.interval) {
        clearInterval(conn.interval);
        conn.interval = null;
        socket.emit('sending_stopped');
        socket.emit('log', { type: 'info', message: 'Stopped sending location packets.' });
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      const conn = activeConnections.get(socket.id);
      if (conn) {
        if (conn.interval) clearInterval(conn.interval);
        if (conn.socket) conn.socket.destroy();
        activeConnections.delete(socket.id);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
