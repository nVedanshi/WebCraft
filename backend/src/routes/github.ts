import { Router } from "express";
import { publishToGitHub } from "../services/github-service";

const router = Router();

router.post("/publish", async (req, res) => {
  const { githubToken, projectName, files, description, isPrivate } = req.body;

  if (!githubToken) {
    return res.status(400).json({ error: "GitHub token is required" });
  }

  if (!projectName || !files) {
    return res.status(400).json({ error: "Project name and files are required" });
  }

  try {
    const result = await publishToGitHub({
      githubToken,
      projectName,
      files,
      description,
      isPrivate,
    });

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
