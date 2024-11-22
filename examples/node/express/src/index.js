import express from "express";

import elvesRouter from "./routers/elves.router.js";
import wizardsRouter from "./wizards/wizards.router.js";
import hobbitsRouter from "./routers/hobbits.router.js";
import config from "./config.js";

const app = express();

app.use(express.json());

// @nanoapi path:/api/v0/elves
app.use("/api/v0/elves", elvesRouter);

// @nanoapi path:/api/v0/wizards
app.use("/api/v0/wizards", wizardsRouter);

// @nanoapi path:/api/v0/hobbits
app.use("/api/v0/hobbits", hobbitsRouter);

app.listen(config.port, () => {
  console.log(`Server is running on port ${config.port}`);
});
