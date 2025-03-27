import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'url';
import type { Request, Response } from 'express';
import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4'; // Make sure the version matches
import { authenticateToken } from './services/auth-service.js';  // Middleware to verify token
import { typeDefs, resolvers } from './schemas/index.js';
import db from './config/connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const app = express();

// Create the context for Apollo Server
const context = ({ req }: { req: Request }) => {
  // If using authenticateToken, the user data will be set on req.user
  const user = req.user || null;  // If there's no user, return null
  
  // Return the context, which will be available in all resolvers
  return { user };
};

// Create a new instance of an Apollo server with the GraphQL schema
const startApolloServer = async () => {
  await server.start();
  await db;

  app.use(express.urlencoded({ extended: false }));
  app.use(express.json());

  // Use authenticateToken middleware to verify token before hitting Apollo Server
  app.use('/graphql', authenticateToken, expressMiddleware(server as any, {
    context: context as any,  // Explicitly type the context if necessary
  }));

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../../client/dist')));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}!`);
    console.log(`Use GraphQL at http://localhost:${PORT}/graphql`);
  });
};

// Call the async function to start the server
startApolloServer();