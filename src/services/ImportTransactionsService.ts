import { getCustomRepository, getRepository, In } from 'typeorm';
import csvParse from 'csv-parse';
// import csv from 'csv-parse';
import fs from 'fs';
import Transaction from '../models/Transaction';
import Category from '../models/Category';
// import CreateTransactionService from './CreateTransactionService';
import TransactionsRepository from '../repositories/TransactionsRepository';

// import AppError from '../errors/AppError';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

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
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const contactsReadStrem = fs.createReadStream(filePath);
    const parsers = csvParse({
      delimiter: ',', // -- padrão para a separação das colunas do CSV
      from_line: 2, // -- Vai começar a leitura partir da linha 2
    });
    // -- Vai lendo as linhas à medida em que tiverem disponíveis (pipa)
    const parseCSV = contactsReadStrem.pipe(parsers);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    /**
     * 'data' é o nome do evento
     * A cada parâmetro de line (a cada linha), os campos vão estar sendo desestruturados
     * com um trim() para tirar os espaços
     */
    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value) return;
      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    /**
     * Pode ser que a primeira chamada do método 'on' do parseCSV não termine antes
     * de passar para a linha de baixo.
     *
     * Deste modo, uma estratégia é criar outra Promise para "parar" a leitura das
     * linhas de baixo até que o evento 'end' do parseCSV seja chamado.
     * Quando isso acontecer, o método map finalizou.
     */

    await new Promise(resolve => parseCSV.on('end', resolve));

    // ------- Será usada a estratégia chamada BookInsert ----------------------
    /**
     * MAPEAR PRIMEIRO TODO O ARQUIVO PARA SALVAR SÓ DEPOIS.
     * é MAIS PERFORMÁTICO DO QUE ABRIR E FECHAR CONEXÕES DEPENDENDO DA QUANTIDADE
     * DE LINHAS DO ARQUIVO.
     */
    // -------------------------------------------------------------------------

    /**
     * Mapear as categorias no banco de dados
     * Verifica com o método "In" se uma das categorias do arquivo estão no DB
     */
    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    /**
     * Retorna um array de todos os títulos de categorias existentes
     */
    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    /**
     * Filtra das categiras existentes, aquelas que não estão no banco de dados
     */
    const addCategoryTitles = categories
      .filter(
        (category: string) => !existentCategoriesTitles.includes(category),
      )
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const finalCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(filePath);

    return createdTransactions;
  }

  /*
  async execute_old({ filePath }: Request): Promise<Transaction[]> {
    const parsedTransactions = await this.getParsedCSV(filePath);
    const transactions = await this.createTransaction(parsedTransactions);

    return transactions;
  }

  private async createTransaction(
    csvParsed: CSVParser[],
  ): Promise<Transaction[]> {
    const transactions = [] as Transaction[];
    const createTransactionService = new CreateTransactionService();

    / *
    csvParsed.map(async data => {
      const transaction = await createTransactionService.execute(data);
      transactions.push(transaction);
    });
    * /
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
  */
}

export default ImportTransactionsService;
