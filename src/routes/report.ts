import { FastifyInstance } from 'fastify';
import { createReport } from '../utils/mongodb';

export default async function reportRoutes(fastify: FastifyInstance) {
  fastify.post('/report', {
    schema: {
      description: 'Submit a new report',
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Report title' },
          location: {
            type: 'object',
            properties: {
              coordinates: {
                type: 'array',
                items: { type: 'number' },
                description: 'Coordinates [latitude, longitude]',
              },
              region: { type: 'string', description: 'Region' },
              city: { type: 'string', description: 'City' },
            },
            required: ['coordinates', 'region', 'city'],
          },
          mediaUrls: { type: 'array', items: { type: 'string' }, description: 'Media URLs' },
          body: { type: 'string', description: 'Report body' },
          time: { type: 'string', description: 'Time of the report' },
        },
        required: ['title', 'location', 'body', 'time'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Success message' },
            reportId: { type: 'string', description: 'ID of the created report' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { title, location, mediaUrls, body, time } = request.body as {
      title: string;
      location: { coordinates: [number, number]; region: string; city: string };
      mediaUrls: string[];
      body: string;
      time: string;
    };

    const reportId = await createReport(title, location, mediaUrls, body, time);
    return reply.send({ message: 'Report submitted', reportId });
  });
}
