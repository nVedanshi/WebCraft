/**
 * Request validation middleware using Zod.
 *
 * Validates req.body, req.query, and/or req.params against Zod schemas before
 * the handler runs. On failure it throws a 400 so the centralized error
 * middleware returns a consistent envelope. Treats all input as untrusted.
 */
import { ZodError } from 'zod'

export function validate(schema) {
  return (req, res, next) => {
    try {
      const data = {}

      if (schema.body) {
        data.body = schema.body.parse(req.body)
      }
      if (schema.query) {
        data.query = schema.query.parse(req.query)
      }
      if (schema.params) {
        data.params = schema.params.parse(req.params)
      }

      // Attach validated data to the request so handlers use clean input.
      // validatedParams always contains every route param: validated params are
      // coerced (e.g. take -> int), unvalidated params pass through. This avoids
      // the empty-object truthiness pitfall of `req.validatedParams || req.params`.
      if (data.body) req.validatedBody = data.body
      if (data.query) req.validatedQuery = data.query
      req.validatedParams = { ...req.params, ...(data.params || {}) }

      next()
    } catch (err) {
      if (err instanceof ZodError) {
        next(err) // error middleware converts ZodError to 400
      }
      next(err)
    }
  }
}

export default { validate }
