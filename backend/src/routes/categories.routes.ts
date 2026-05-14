import { Router } from 'express'
import { CategoryController } from '@/controllers/category.controller.ts'

const router = Router()
const categories = new CategoryController()

router.get('/', categories.list)

export default router
