import express from 'express';

import elvesRouter from './routers/elves.router';
import hobbitsRouter from './routers/hobbits.router';
import wizardsRouter from './wizards/wizards.router';
import config from './config';

const app = express();

app.use(express.json());

// @nanoapi path:/api/v0/elves
app.use('/api/v0/elves', elvesRouter);

// @nanoapi path:/api/v0/wizards
app.use('/api/v0/wizards', wizardsRouter);

// @nanoapi path:/api/v0/hobbits
app.use('/api/v0/hobbits', hobbitsRouter);

app.listen(config.port, () => {
  console.info(`Server is running on port ${config.port}`);
});