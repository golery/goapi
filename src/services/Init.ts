import {parse} from 'pg-connection-string';
import {PostgresConnectionOptions} from 'typeorm/driver/postgres/PostgresConnectionOptions';
import {DataSource, Repository} from 'typeorm';
import {SnakeNamingStrategy} from 'typeorm-naming-strategies';
import {Book} from '../entity/Book';
import {Node} from '../entity/Node';

export let dataSource: DataSource;
export let nodeRepo: Repository<Node>;
export let bookRepo: Repository<Book>;

export const initDb = async () => {
    const pg = parse(process.env.POSTGRES_URL);
    console.log(`Connect to postgres ${pg.host}`);
    // at local use ts-node, on prod use dist/.js
    const entityPath = __filename.endsWith('.js') ? 'dist/entity/*.js': 'src/entity/*.ts';
    const opts: PostgresConnectionOptions = {
        type: 'postgres',
        host: pg.host,
        port: parseInt(pg.port),
        username: pg.user,
        password: pg.password,
        database: pg.database,
        entities: [
            entityPath
        ],
        synchronize: false,
        logging: false,
        namingStrategy: new SnakeNamingStrategy(),
    };
    dataSource = new DataSource(opts);

    await dataSource.initialize();

    nodeRepo = dataSource.getRepository(Node);
    bookRepo = dataSource.getRepository(Book);
};

