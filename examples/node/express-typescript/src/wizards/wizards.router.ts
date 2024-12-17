import { Router } from "express";

import * as wizardsService from "./wizards.service";

const router = Router();

// @nanoapi method:GET path:/api/v0/wizards/
router.get("/", async (_req, res) => {
  const wizards = await wizardsService.findAll();
  res.send(wizards);
});

// @nanoapi method:GET path:/api/v0/wizards/:id
router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const wizard = await wizardsService.findById(id);
  res.send(wizard);
});

// @nanoapi method:POST path:/api/v0/wizards/
router.post("/", async (req, res) => {
  const wizard = req.body;
  const newWizard = await wizardsService.create(wizard);
  res.send(newWizard);
});

export default router;
