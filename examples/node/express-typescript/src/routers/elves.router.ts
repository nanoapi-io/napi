import { Router } from "express";

import * as elvesService from "../services/elves.service";

const router = Router();

// @nanoapi method:GET path:/api/v0/elves/
router.get("/", async (_req, res) => {
  const elves = await elvesService.findAll();
  res.send(elves);
});

// @nanoapi method:GET path:/api/v0/elves/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const elf = await elvesService.findById(id);
  res.send(elf);
});

// @nanoapi method:POST path:/api/v0/elves/
router.post("/", async (req, res) => {
  const elf = req.body;
  const newElf = await elvesService.create(elf);
  res.send(newElf);
});

export default router;
