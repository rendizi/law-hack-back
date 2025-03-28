import { FastifyInstance } from 'fastify';
import { getAdminChats, terminateChat, saveAnnouncement, getAnnouncementsForUser, getReports, closeReport } from '../utils/mongodb';
import { sendAnnouncementSMS } from '../utils/twilio';

export default async function adminRoutes(fastify: FastifyInstance) {
  fastify.get('/chats', {
    schema: {
      description: 'Get all active chats for the admin',
      response: {
        200: {
          type: 'object',
          properties: {
            chats: { type: 'array', items: { type: 'object' }, description: 'List of active chats' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { userId } = (request as any).cookies;
    const chats = await getAdminChats(userId);
    return reply.send({ chats });
  });

  fastify.delete('/chats/:chatId', {
    schema: {
      description: 'Terminate a chat',
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
            message: { type: 'string', description: 'Success message' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { chatId } = request.params as { chatId: string };
    await terminateChat(chatId);
    return reply.send({ message: 'Chat terminated' });
  });

  fastify.post('/announcement', {
    schema: {
      description: 'Create a new announcement',
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Announcement title' },
          body: { type: 'string', description: 'Announcement body' },
          media: { type: 'array', items: { type: 'string' }, description: 'Media URLs' },
          region: { type: 'string', description: 'Target region' },
          city: { type: 'string', description: 'Target city' },
        },
        required: ['title', 'body', 'region', 'city'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Success message' },
            announcementId: { type: 'string', description: 'ID of the created announcement' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { title, body, media, region, city } = request.body as { title: string; body: string; media: string[]; region: string; city: string };

    const announcementId = await saveAnnouncement(title, body, media, region, city);
    await sendAnnouncementSMS(title, body, media, region, city);

    return reply.send({ message: 'Announcement sent', announcementId });
  });

  fastify.get('/announcements', {
    schema: {
      description: 'Get announcements for the admin',
      response: {
        200: {
          type: 'object',
          properties: {
            announcements: { type: 'array', items: { type: 'object' }, description: 'List of announcements' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { userId } = (request as any).cookies;
    const announcements = await getAnnouncementsForUser(userId);
    return reply.send({ announcements });
  });

  fastify.get('/reports', {
    schema: {
      description: 'Get all open reports',
      response: {
        200: {
          type: 'object',
          properties: {
            reports: { type: 'array', items: { type: 'object' }, description: 'List of open reports' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const reports = await getReports();
    return reply.send({ reports });
  });

  fastify.post('/reports/:reportId/close', {
    schema: {
      description: 'Close a report',
      params: {
        type: 'object',
        properties: {
          reportId: { type: 'string', description: 'Report ID' },
        },
        required: ['reportId'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Success message' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { reportId } = request.params as { reportId: string };
    await closeReport(reportId);
    return reply.send({ message: 'Report closed' });
  });
}
