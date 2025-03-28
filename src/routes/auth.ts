import { FastifyInstance } from 'fastify';
import { sendVerificationCode, verifyCode } from '../utils/twilio';
import { getUserByPhone, createUser } from '../utils/mongodb';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/login', {
    schema: {
      description: 'Login with phone number and verification code',
      body: {
        type: 'object',
        properties: {
          phoneNumber: { type: 'string', description: 'User phone number' },
          code: { type: 'string', nullable: true, description: 'Verification code' },
          region: { type: 'string', description: 'User region' },
          city: { type: 'string', description: 'User city' },
        },
        required: ['phoneNumber', 'region', 'city'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Success message' },
            role: { type: 'string', description: 'User role (admin or user)' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { phoneNumber, code, region, city } = request.body as { phoneNumber: string; code?: string; region: string; city: string };

    if (!code) {
      await sendVerificationCode(phoneNumber);
      return reply.send({ message: 'Verification code sent' });
    }

    const isVerified = await verifyCode(phoneNumber, code);
    if (!isVerified) {
      return reply.status(400).send({ error: 'Invalid verification code' });
    }

    let user = await getUserByPhone(phoneNumber);
    if (!user) {
      const role = phoneNumber === '+77777777777' ? 'admin' : 'user';
      user = await createUser(phoneNumber, role, region, city);
    }

    reply.setCookie('token', user._id, { httpOnly: true });
    return reply.send({ message: 'Login successful', role: user.role });
  });
}
