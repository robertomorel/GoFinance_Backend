import { getRepository } from 'typeorm';
import Category from '../models/Category';
import AppError from '../errors/AppError';

interface Request {
  title: string;
}

class CreateCategoryService {
  public async execute({ title }: Request): Promise<Category> {
    const categoryRepository = getRepository(Category);
    try {
      const category = categoryRepository.create({ title });
      await categoryRepository.save(category);
      return category;
    } catch (err) {
      throw new AppError('Fail to create a new category!', 400);
    }
  }
}

export default CreateCategoryService;
