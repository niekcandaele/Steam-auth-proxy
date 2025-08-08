import { config } from './config';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import oidcRoutes from './routes/oidc';
import steamCallbackRoutes from './routes/steam-callback';
import cors from 'cors';
import path from 'path';
import https from 'https';
import http from 'http';
import logger from './utils/logger';

const app = express();

app.use(cors());
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('HTTP Request', {
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
  secret: config.sessionSecret || 'secret',
  name: config.sessionName || 'steam_auth_session',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production' || config.localHttps,
    httpOnly: true,
  }
}));

app.use(oidcRoutes);
app.use(steamCallbackRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'steam-auth-proxy'
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/test-client.html'));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  res.status(500).send('Something broke!');
});

let server: http.Server | https.Server;

if (config.localHttps) {
  import('self-signed').then(selfsigned => {
    const pems = selfsigned.default.generate(null, { days: 365 });
    server = https.createServer({ key: pems.private, cert: pems.cert }, app).listen(config.port, () => {
      logger.info(`Server is running on https://localhost:${config.port}`);
    });
  }).catch(err => {
    logger.error('Failed to load self-signed module', { error: err.message });
    logger.warn('Falling back to HTTP');
    server = app.listen(config.port, () => {
      logger.info(`Server is running on http://localhost:${config.port}`);
    });
  });
} else {
  server = app.listen(config.port, () => {
    logger.info(`Server is running on http://localhost:${config.port}`);
  });
}

const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Closed out remaining connections.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
