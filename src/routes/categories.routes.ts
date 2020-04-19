import { Router } from 'express';

import { getRepository } from 'typeorm';
import Category from '../models/Category';
import CreateCategoryService from '../services/CreateCategoryService';

const categoriesRouter = Router();

categoriesRouter.get('/', async (request, response) => {
  const categoriesReposiroty = getRepository(Category);
  const categories = await categoriesReposiroty.find();
  return response.json(categories);
});

categoriesRouter.post('/', async (request, response) => {
  const { title } = request.body;
  const createCategoryService = new CreateCategoryService();
  const category = await createCategoryService.execute(title);
  return response.json(category);
});

export default categoriesRouter;
