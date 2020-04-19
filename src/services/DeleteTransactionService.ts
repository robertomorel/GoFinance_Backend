import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface Request {
  id: string;
}

class DeleteTransactionService {
  public async execute({ id }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const transaction = await transactionsRepository.findOne({
      where: { id },
    });
    if (!transaction) {
      throw new AppError('Transaction not found!', 400);
    }
    try {
      await transactionsRepository.delete(id);
    } catch (err) {
      throw new AppError(`Fail to delete the transaction with id ${id}`, 400);
    }
  }
}

export default DeleteTransactionService;
