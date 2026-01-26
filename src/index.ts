import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import http from 'http';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { initChatSocket } from './websocket/chatSocket.js';


const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/user', userRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
initChatSocket(server);

server.listen(PORT, () => {
  // Silent start
});

