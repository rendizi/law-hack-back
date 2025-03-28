import { FastifyInstance } from 'fastify';
import { createChat, addMessage, getChatHistory } from '../utils/mongodb';
import { sendMessageToChatGPT } from '../utils/openai';

export default async function chatRoutes(fastify: FastifyInstance) {
  fastify.post('/init', {
    schema: {
      description: 'Initialize a new chat',
      response: {
        200: {
          type: 'object',
          properties: {
            chatId: { type: 'string', description: 'ID of the created chat' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { userId } = (request as any).cookies;
    const chatId = await createChat(userId);
    return reply.send({ chatId });
  });

  fastify.post('/message', {
    schema: {
      description: 'Send a message in a chat',
      body: {
        type: 'object',
        properties: {
          chatId: { type: 'string', description: 'Chat ID' },
          message: { type: 'string', nullable: true, description: 'Message content (for text)' },
          type: { type: 'string', enum: ['text', 'image', 'video'], description: 'Message type' },
          mediaUrl: { type: 'string', nullable: true, description: 'URL of the media (for image or video)' },
        },
        required: ['chatId', 'type'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            response: { type: 'string', nullable: true, description: 'Response from ChatGPT (if applicable)' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { chatId, message, type, mediaUrl } = request.body as { chatId: string; message?: string; type: string; mediaUrl?: string };

    const content = type === 'text' ? message : mediaUrl;
    const response = type === 'text' ? await sendMessageToChatGPT(message || '') : null;

    await addMessage(chatId, type, content || "", response);

    return reply.send({ response });
  });

  fastify.get('/history/:chatId', {
    schema: {
      description: 'Get chat history',
      params: {
        type: 'object',
        properties: {
          chatId: { type: 'string', description: 'Chat ID' },
        },
        required: ['chatId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            history: { type: 'array', items: { type: 'object' }, description: 'Chat history' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    const history = await getChatHistory(chatId);
    return reply.send({ history });
  });
}
