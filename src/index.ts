import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { connectToDatabase } from './utils/mongodb';
import authRoutes from './routes/auth';
import chatRoutes from './routes/chat';
import adminRoutes from './routes/admin';
import reportRoutes from './routes/report';
import { uploadRouter } from "./routes/uploadthing";
import { createRouteHandler } from "uploadthing/fastify";
import dotenv from "dotenv";
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';

dotenv.config();

const fastify = Fastify({ logger: true });
const httpServer = createServer(fastify.server);
const io = new Server(httpServer);

const activeChats = new Map(); // Store active chats temporarily

// Plugins
fastify.register(fastifyCookie);

// Swagger setup
fastify.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'Law Hack API',
      description: 'API documentation for the Law Hack project',
      version: '1.0.0',
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
});
fastify.register(fastifySwaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false,
  },
  staticCSP: true,
  transformSpecification: (swaggerObject: any, req: any, res: any) => {
    return swaggerObject;
  },
  transformSpecificationClone: true,
});

// Routes
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(chatRoutes, { prefix: '/chat' });
fastify.register(adminRoutes, { prefix: '/admin' });
fastify.register(reportRoutes, { prefix: '/report' });
fastify
  .register(createRouteHandler, {
    router: uploadRouter,
  });

// Socket.io
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('startChat', ({ userId, adminId }) => {
    const chatId = `${userId}-${adminId}`;
    activeChats.set(chatId, { userId, adminId, messages: [] });
    socket.join(chatId);
    io.to(chatId).emit('chatStarted', { chatId });
  });

  socket.on('sendMessage', ({ chatId, sender, message, type, mediaUrl }) => {
    const chat = activeChats.get(chatId);
    if (chat) {
      const newMessage = {
        sender,
        type, // 'text', 'image', or 'video'
        content: type === 'text' ? message : mediaUrl,
        timestamp: new Date(),
      };

      chat.messages.push(newMessage);
      io.to(chatId).emit('newMessage', newMessage);
    }
  });

  // WebRTC signaling events
  socket.on('offer', ({ chatId, offer }) => {
    socket.to(chatId).emit('offer', { offer });
  });

  socket.on('answer', ({ chatId, answer }) => {
    socket.to(chatId).emit('answer', { answer });
  });

  socket.on('iceCandidate', ({ chatId, candidate }) => {
    socket.to(chatId).emit('iceCandidate', { candidate });
  });

  socket.on('terminateChat', ({ chatId }) => {
    activeChats.delete(chatId);
    io.to(chatId).emit('chatTerminated', { chatId });
    io.socketsLeave(chatId);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const start = async () => {
  try {
    await connectToDatabase();
    await fastify.listen({ port: 3000 });
    console.log('Server is running at http://localhost:3000');
    console.log('Swagger docs available at http://localhost:3000/docs');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
