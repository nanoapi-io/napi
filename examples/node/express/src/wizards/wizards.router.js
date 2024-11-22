import { Router } from "express";

import * as wizardsService from "./wizards.service.js";

const router = Router();

// @nanoapi path:/api/v0/wizards/ method:GET
router.get("/", async (req, res) => {
  const wizards = await wizardsService.findAll();
  res.send(wizards);
});

// @nanoapi path:/api/v0/wizards/:id method:GET
router.get("/:id", async (req, res) => {
  const wizard = await wizardsService.findById(req.params.id);
  res.send(wizard);
});

// @nanoapi path:/api/v0/wizards/ method:POST
router.post("/", async (req, res) => {
  const wizard = req.body;
  const newWizard = await wizardsService.create(wizard);
  res.send(newWizard);
});

export default router;
