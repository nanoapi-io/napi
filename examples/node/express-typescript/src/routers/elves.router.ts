import { Router } from "express";

import * as elvesService from "../services/elves.service";

const router = Router();

// @nanoapi path:/api/v0/elves/ method:GET
router.get("/", async (_req, res) => {
  const elves = await elvesService.findAll();
  res.send(elves);
});

// @nanoapi path:/api/v0/elves/:id method:GET
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const elf = await elvesService.findById(id);
  res.send(elf);
});

// @nanoapi path:/api/v0/elves/ method:POST
router.post("/", async (req, res) => {
  const elf = req.body;
  const newElf = await elvesService.create(elf);
  res.send(newElf);
});

export default router;
