import { parse } from 'pg-connection-string';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { DataSource, Repository } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Book } from '../entity/Book';
import { Node } from '../entity/Node';
import { EntityManager, MikroORM } from '@mikro-orm/core';
import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import logger from '../util/logger';

export let dataSource: DataSource;
export let nodeRepo: Repository<Node>;
export let bookRepo: Repository<Book>;

export let orm: MikroORM;
export async function initMikroOrm() {
    const config: Options = {
        driver: PostgreSqlDriver,
        // dbName: 'dev',
        clientUrl: process.env.POSTGRES_URL,
        // folder-based discovery setup, using common filename suffix
        entities: ['dist/**/*.entity.js'],
        entitiesTs: ['src/**/*.entity.ts'],
        // we will use the ts-morph reflection, an alternative to the default reflect-metadata provider
        // check the documentation for their differences: https://mikro-orm.io/docs/metadata-providers
        metadataProvider: TsMorphMetadataProvider,
        // enable debug mode to log SQL queries and discovery information
        debug: true,
        forceUndefined: true,
    };

    logger.info('Initing MikroOrm...');
    orm = await MikroORM.init(config);
    logger.info('Inited MikroOrm.');
}

export async function closeDb() {
    await orm.close();
}
export const initDb = async () => { 
    await initMikroOrm();
    const pg = parse(process.env.POSTGRES_URL);
    console.log(`Connect to postgres ${pg.host}`);
    // at local use ts-node, on prod use dist/.js
    const entityPath = __filename.endsWith('.js')
        ? 'dist/entity/*.js'
        : 'src/entity/*.ts';
    const opts: PostgresConnectionOptions = {
        type: 'postgres',
        host: pg.host,
        port: parseInt(pg.port),
        username: pg.user,
        password: pg.password,
        database: pg.database,
        entities: [entityPath],
        synchronize: false,
        logging: false,
        namingStrategy: new SnakeNamingStrategy(),
    };
    dataSource = new DataSource(opts);

    await dataSource.initialize();

    nodeRepo = dataSource.getRepository(Node);
    bookRepo = dataSource.getRepository(Book);
};

export function getEm(): EntityManager {
    return orm.em;
}
