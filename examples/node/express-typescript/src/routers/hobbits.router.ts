import { Router } from "express";

import * as hobbitsService from "../services/hobbits.service";

const router = Router();

// @nanoapi method:GET path:/api/v0/hobbits/
router.get("/", async (_req, res) => {
  const hobbits = await hobbitsService.findAll();
  res.send(hobbits);
});

// @nanoapi method:GET path:/api/v0/hobbits/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const hobbit = await hobbitsService.findById(id);
  res.send(hobbit);
});

// @nanoapi method:POST path:/api/v0/hobbits/
router.post("/", async (req, res) => {
  const hobbit = req.body;
  const newHobbit = await hobbitsService.create(hobbit);
  res.send(newHobbit);
});

export default router;
