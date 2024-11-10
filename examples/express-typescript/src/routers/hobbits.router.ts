import { Router } from "express";

import * as hobbitsService from "../services/hobbits.service";

const router = Router();

// @nanoapi path:/api/v0/hobbits/ method:GET
router.get("/", async (_req, res) => {
  const hobbits = await hobbitsService.findAll();
  res.send(hobbits);
});

// @nanoapi path:/api/v0/hobbits/:id method:GET
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const hobbit = await hobbitsService.findById(id);
  res.send(hobbit);
});

// @nanoapi path:/api/v0/hobbits/ method:POST
router.post("/", async (req, res) => {
  const hobbit = req.body;
  const newHobbit = await hobbitsService.create(hobbit);
  res.send(newHobbit);
});

export default router;
