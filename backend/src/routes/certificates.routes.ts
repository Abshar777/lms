import { Router } from 'express'
import { authenticate } from '@/middleware/auth.middleware.ts'
import { CertificateService } from '@/services/certificate.service.ts'
import { sendSuccess, sendError } from '@/utils/response.ts'
import type { Request, Response, NextFunction } from 'express'

const router  = Router()
const certSvc = new CertificateService()

/* GET /certificates/:enrollmentId — generate + download PDF */
router.get('/:enrollmentId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { buffer, filename, certId, studentName, courseTitle, completedAt } =
      await certSvc.generate(String(req.params['enrollmentId'] ?? ''), req.user!.id)

    res.setHeader('Content-Type',        'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    res.setHeader('X-Cert-Id',           certId)
    res.setHeader('X-Student',           studentName)
    res.setHeader('X-Course',            encodeURIComponent(courseTitle))
    res.setHeader('X-Completed-At',      completedAt.toISOString())
    res.end(buffer)
  } catch (err) { next(err) }
})

/* GET /certificates/verify/:certId — public verification endpoint */
router.get('/verify/:certId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await certSvc.verify(String(req.params['certId'] ?? ''))
    sendSuccess(res, result)
  } catch (err) { next(err) }
})

export default router
