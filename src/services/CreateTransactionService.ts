import { getCustomRepository } from 'typeorm';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import AppError from '../errors/AppError';

interface Request {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transactions = await transactionsRepository.find();
    const { total } = await transactionsRepository.getBalance(transactions);

    if (type === 'outcome' && value > total) {
      throw new AppError('You dont have enough balance');
    }

    const categoryFound = await transactionsRepository.findOrSaveACategory({
      title: category,
    });

    try {
      const transaction = transactionsRepository.create({
        title,
        type,
        value,
        category_id: categoryFound.id,
      });
      await transactionsRepository.save(transaction);
      return transaction;
    } catch (err) {
      throw new AppError('Fail to create a new transaction!', 400);
    }
  }
}

export default CreateTransactionService;
