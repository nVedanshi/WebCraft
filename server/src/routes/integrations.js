import { Router } from 'express'
import { z } from 'zod'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { catchAsync, AppError } from '../middleware/error.js'
import { config } from '../config/index.js'
import { providerConfigService, SUPPORTED_PROVIDERS } from '../services/integrations/providerConfig.service.js'
import { githubService } from '../services/integrations/github.service.js'

const router = Router()

// ── AI provider configuration ──────────────────────────────────────────────
router.get(
  '/providers',
  protect,
  catchAsync(async (req, res) => {
    const providers = await providerConfigService.list(req.user.id)
    res.json({ success: true, data: { providers, supported: SUPPORTED_PROVIDERS } })
  })
)

const keySchema = z.object({ apiKey: z.string().min(8) })
const billingModeSchema = z.object({ billingMode: z.enum(['system', 'byok']) })
const connectSchema = z.object({
  projectId: z.string().cuid(),
  owner: z.string().min(1),
  repo: z.string().min(1),
  branch: z.string().min(1),
})
const createRepoSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  private: z.boolean().optional(),
})
const syncSchema = z.object({
  projectId: z.string().cuid(),
  commitMessage: z.string().optional(),
})
const resolveSchema = z.object({
  projectId: z.string().cuid(),
  path: z.string().min(1),
  resolution: z.enum(['ours', 'theirs']),
})

router.post(
  '/providers/:provider/key',
  protect,
  validate({ body: keySchema }),
  catchAsync(async (req, res) => {
    const { provider } = req.params
    const { apiKey } = req.validatedBody || req.body
    const result = await providerConfigService.saveKey(req.user.id, provider, apiKey)
    res.json({ success: true, data: result })
  })
)

router.post(
  '/providers/:provider/test',
  protect,
  catchAsync(async (req, res) => {
    const result = await providerConfigService.test(req.user.id, req.params.provider)
    res.json({ success: true, data: result })
  })
)

router.post(
  '/providers/:provider/default',
  protect,
  catchAsync(async (req, res) => {
    const result = await providerConfigService.setDefault(req.user.id, req.params.provider)
    res.json({ success: true, data: result })
  })
)

router.post(
  '/providers/:provider/billing-mode',
  protect,
  validate({ body: billingModeSchema }),
  catchAsync(async (req, res) => {
    const { billingMode } = req.validatedBody || req.body
    const result = await providerConfigService.setBillingMode(
      req.user.id,
      req.params.provider,
      billingMode
    )
    res.json({ success: true, data: result })
  })
)

router.delete(
  '/providers/:provider',
  protect,
  catchAsync(async (req, res) => {
    const result = await providerConfigService.disconnect(req.user.id, req.params.provider)
    res.json({ success: true, data: result })
  })
)

// ── GitHub OAuth ───────────────────────────────────────────────────────────
router.get(
  '/github/status',
  protect,
  catchAsync(async (req, res) => {
    const status = await githubService.status(req.user.id)
    res.json({ success: true, data: status })
  })
)

router.get(
  '/github/authorize',
  protect,
  catchAsync(async (req, res) => {
    const url = await githubService.createAuthorization(req.user.id)
    res.json({ success: true, data: { url } })
  })
)

// Callback is a browser redirect from GitHub; state binds it to the user.
router.get(
  '/github/callback',
  catchAsync(async (req, res) => {
    const { code, state } = req.query
    try {
      await githubService.handleCallback({ code, state })
      res.redirect(`${config.clientUrl}/integrations?github=connected`)
    } catch (err) {
      res.redirect(`${config.clientUrl}/integrations?github=error`)
    }
  })
)

router.delete(
  '/github',
  protect,
  catchAsync(async (req, res) => {
    const result = await githubService.disconnect(req.user.id)
    res.json({ success: true, data: result })
  })
)

router.get(
  '/github/repos',
  protect,
  catchAsync(async (req, res) => {
    const repos = await githubService.listRepos(req.user.id)
    res.json({ success: true, data: { repos } })
  })
)

router.get(
  '/github/repos/:owner/:repo/branches',
  protect,
  catchAsync(async (req, res) => {
    const branches = await githubService.listBranches(req.user.id, req.params.owner, req.params.repo)
    res.json({ success: true, data: { branches } })
  })
)

// ── GitHub Project ↔ Repo linking ────────────────────────────────────

router.post(
  '/github/connect',
  protect,
  validate({ body: connectSchema }),
  catchAsync(async (req, res) => {
    const { projectId, owner, repo, branch } = req.validatedBody || req.body
    const result = await githubService.connectProject(req.user.id, projectId, { owner, repo, branch })
    res.json({ success: true, data: result })
  })
)

router.delete(
  '/github/project',
  protect,
  catchAsync(async (req, res) => {
    const projectId = req.query?.projectId || req.body?.projectId
    if (!projectId) throw new AppError(400, 'MISSING_PROJECT_ID', 'projectId is required')
    const result = await githubService.disconnectProject(req.user.id, projectId)
    res.json({ success: true, data: result })
  })
)

router.get(
  '/github/project/:projectId',
  protect,
  catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const link = await githubService.getProjectGitHub(req.user.id, projectId)
    res.json({ success: true, data: { link } })
  })
)

// ── Repository creation ──────────────────────────────────────────────

router.post(
  '/github/create-repo',
  protect,
  validate({ body: createRepoSchema }),
  catchAsync(async (req, res) => {
    const { name, description, private: isPrivate } = req.validatedBody || req.body
    const result = await githubService.createRepo(req.user.id, { name, description, private: isPrivate })
    res.json({ success: true, data: result })
  })
)

// ── Push / Pull / Sync ───────────────────────────────────────────────

router.post(
  '/github/publish',
  protect,
  validate({ body: syncSchema }),
  catchAsync(async (req, res) => {
    const { projectId, commitMessage } = req.validatedBody || req.body
    const result = await githubService.publishProject(req.user.id, projectId, { commitMessage })
    res.json({ success: true, data: result })
  })
)

router.post(
  '/github/pull',
  protect,
  validate({ body: syncSchema }),
  catchAsync(async (req, res) => {
    const { projectId, commitMessage } = req.validatedBody || req.body
    const result = await githubService.pullProject(req.user.id, projectId, { commitMessage })
    res.json({ success: true, data: result })
  })
)

router.post(
  '/github/sync',
  protect,
  validate({ body: syncSchema }),
  catchAsync(async (req, res) => {
    const { projectId, commitMessage } = req.validatedBody || req.body
    const result = await githubService.syncProject(req.user.id, projectId, { commitMessage })
    res.json({ success: true, data: result })
  })
)

router.post(
  '/github/sync/resolve',
  protect,
  validate({ body: resolveSchema }),
  catchAsync(async (req, res) => {
    const { projectId, path, resolution } = req.validatedBody || req.body
    const result = await githubService.resolveConflict(req.user.id, projectId, { path, resolution })
    res.json({ success: true, data: result })
  })
)

router.get(
  '/github/sync-status/:projectId',
  protect,
  catchAsync(async (req, res) => {
    const { projectId } = req.validatedParams || req.params
    const result = await githubService.getSyncStatus(req.user.id, projectId)
    res.json({ success: true, data: result })
  })
)

export default router