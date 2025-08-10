import express, { Request, Response } from "express";
import { storage } from "../storage";
import { log } from "../logger";

const router = express.Router();

// List people for a user
router.get("/users/:userId/people", async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId)) return res.status(400).json({ message: "Invalid userId" });
    const people = await storage.getPeopleByUserId(userId);
    return res.json(people);
  } catch (error) {
    log(`GET /users/:userId/people error: ${(error as Error).message}`, "error");
    return res.status(500).json({ message: "Failed to fetch people" });
  }
});

// Create person
router.post("/people", async (req: Request, res: Response) => {
  try {
    const { userId, name, relationship } = req.body || {};
    if (!userId || !name) return res.status(400).json({ message: "Missing required fields" });
    const created = await storage.createPerson({
      userId: Number(userId),
      name: String(name),
      relationship: relationship ? String(relationship) : null,
      createdAt: new Date(),
    } as any);
    return res.status(201).json(created);
  } catch (error) {
    log(`POST /people error: ${(error as Error).message}`, "error");
    return res.status(500).json({ message: "Failed to create person" });
  }
});

// Update person
router.patch("/people/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { name, relationship } = req.body || {};
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid person id" });
    const updated = await storage.updatePerson(id, {
      ...(name ? { name: String(name) } : {}),
      ...(relationship !== undefined ? { relationship: relationship ? String(relationship) : null } : {}),
    });
    if (!updated) return res.status(404).json({ message: "Person not found" });
    return res.json(updated);
  } catch (error) {
    log(`PATCH /people/:id error: ${(error as Error).message}`, "error");
    return res.status(500).json({ message: "Failed to update person" });
  }
});

// Delete person
router.delete("/people/:id", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: "Invalid person id" });
    await storage.deletePerson(id);
    return res.json({ success: true });
  } catch (error) {
    log(`DELETE /people/:id error: ${(error as Error).message}`, "error");
    return res.status(500).json({ message: "Failed to delete person" });
  }
});

export default router;

