import { EntityRepository, Repository, getRepository } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
import CreateCategoryService from '../services/CreateCategoryService';
import AppError from '../errors/AppError';

interface CategoryParam {
  title: string;
}

interface CategoryDTO {
  id: string;
  title: string;
}

interface TransactionDTO {
  id: string;
  title: string;
  value: number;
  type: string;
  category: CategoryDTO;
}

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    const { income, outcome } = transactions.reduce(
      (accumulator, transaction) => {
        switch (transaction.type) {
          case 'income':
            accumulator.income += Number(transaction.value);
            break;
          case 'outcome':
            accumulator.outcome += Number(transaction.value);
            break;
          default:
            break;
        }
        return accumulator;
      },
      {
        income: 0,
        outcome: 0,
        total: 0,
      },
    );
    const total = income - outcome;
    return { income, outcome, total };
  }

  /*
  public async getBalance(transactions: Transaction[]): Promise<Balance> {
    const income = transactions
      .map(t => (t.type === 'income' ? t.value : 0))
      .reduce((p, n) => Number(p) + Number(n), 0);
    const outcome = transactions
      .map(t => (t.type === 'outcome' ? t.value : 0))
      .reduce((p, n) => Number(p) + Number(n), 0);
    return {
      income,
      outcome,
      total: income - outcome,
    };
  }
  */

  public format(transactions: Transaction[]): TransactionDTO[] {
    const formatedTransactions = [] as TransactionDTO[];
    transactions.forEach(t => {
      const { id, title, value, type, category } = t;
      formatedTransactions.push({
        id,
        title,
        value,
        type,
        category: { id: category.id, title: category.title },
      });
    });
    return formatedTransactions;
  }

  public async findOrSaveACategory({
    title,
  }: CategoryParam): Promise<Category> {
    const categoryRepository = getRepository(Category);
    let categoryFound = await categoryRepository.findOne({
      where: { title },
    });

    if (!categoryFound) {
      const createCategoryService = new CreateCategoryService();
      categoryFound = await createCategoryService.execute({ title });
    }

    if (!categoryFound) {
      throw new AppError('Unexpected error while saving a new category!', 500);
    }

    return categoryFound;
  }
}

export default TransactionsRepository;
