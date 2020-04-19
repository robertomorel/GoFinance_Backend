import fs from 'fs';
import csv from 'csv-parse';
import Transaction from '../models/Transaction';
import CreateTransactionService from './CreateTransactionService';

import AppError from '../errors/AppError';

interface Request {
  filePath: string;
}

interface CSVParser {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ filePath }: Request): Promise<Transaction[]> {
    const parsedTransactions = await this.getParsedCSV(filePath);
    const transactions = await this.createTransaction(parsedTransactions);

    return transactions;
  }

  private async createTransaction(
    csvParsed: CSVParser[],
  ): Promise<Transaction[]> {
    const transactions = [] as Transaction[];
    const createTransactionService = new CreateTransactionService();

    /*
    csvParsed.map(async data => {
      const transaction = await createTransactionService.execute(data);
      transactions.push(transaction);
    });
    */
    // eslint-disable-next-line no-restricted-syntax
    for (const data of csvParsed) {
      // eslint-disable-next-line no-await-in-loop
      const transaction = await createTransactionService.execute(data);
      transactions.push(transaction);
    }

    return transactions;
  }

  private getParsedCSV(filePath: string): Promise<CSVParser[]> {
    return new Promise<CSVParser[]>((resolve, _) => {
      const parsers = [] as CSVParser[];
      const stream = fs
        .createReadStream(filePath)
        .pipe(csv({ columns: true, from_line: 1, trim: true }))
        .on('data', data => {
          try {
            stream.pause();
            parsers.push(data);
          } finally {
            stream.resume();
          }
        })
        .on('end', () => {
          fs.promises.unlink(filePath);
          resolve(parsers);
        })
        .on('error', err => new AppError(err.message));
    });
  }
}

export default ImportTransactionsService;
