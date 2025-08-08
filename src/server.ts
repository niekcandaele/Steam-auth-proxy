import { config } from './config';
import express, { NextFunction, Request, Response } from 'express';
import session from 'express-session';
import oidcRoutes from './routes/oidc';
import steamCallbackRoutes from './routes/steam-callback';
import cors from 'cors';
import path from 'path';
import https from 'https';
import http from 'http';

const app = express();

app.use(cors());
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${req.method} ${req.url}`);
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/test-client.html'));
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

let server: http.Server | https.Server;

if (config.localHttps) {
  import('self-signed').then(selfsigned => {
    const pems = selfsigned.default.generate(null, { days: 365 });
    server = https.createServer({ key: pems.private, cert: pems.cert }, app).listen(config.port, () => {
      console.log(`Server is running on https://localhost:${config.port}`);
    });
  }).catch(err => {
    console.error('Failed to load self-signed module:', err);
    console.error('Falling back to HTTP');
    server = app.listen(config.port, () => {
      console.log(`Server is running on http://localhost:${config.port}`);
    });
  });
} else {
  server = app.listen(config.port, () => {
    console.log(`Server is running on http://localhost:${config.port}`);
  });
}

const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('Closed out remaining connections.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
