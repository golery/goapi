import { parse } from 'pg-connection-string';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { DataSource, Repository } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { Book } from '../entity/Book';
import { Node } from '../entity/Node';
import { EntityManager, MikroORM, ReflectMetadataProvider } from '@mikro-orm/core';
import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';
import logger from '../utils/logger';
import { getSecrets, isDev } from './ConfigService';

export let dataSource: DataSource;
export let nodeRepo: Repository<Node>;
export let bookRepo: Repository<Book>;

export let orm: MikroORM;
export async function initMikroOrm() {
    const config: Options = {
        driver: PostgreSqlDriver,
        // dbName: 'dev',
        clientUrl: getSecrets().postgresUrl,
        // folder-based discovery setup, using common filename suffix
        entities: ['dist/**/*.entity.js'],
        // this is used during development when running with ts-node
        entitiesTs: ['src/**/*.entity.ts'],
        // we will use the ts-morph reflection, an alternative to the default reflect-metadata provider
        // check the documentation for their differences: https://mikro-orm.io/docs/metadata-providers
        // metadataProvider: TsMorphMetadataProvider,
        metadataProvider: ReflectMetadataProvider,

        // enable debug mode to log SQL queries and discovery information
        debug: isDev(),
        forceUndefined: true,

        
    };

    logger.info('Initing MikroOrm...');
    orm = await MikroORM.init(config);
    logger.info('Inited MikroOrm.', { something: 1233});
}

export async function closeDb() {
    await orm.close();
}
export const initDb = async () => { 
    await initMikroOrm();
    const pg = parse(getSecrets().postgresUrl);
    console.log(`Connect to postgres ${pg.host}`);
    // at local use ts-node, on prod use dist/.js
    const entityPath = __filename.endsWith('.js')
        ? 'dist/entity/*.js'
        : 'src/entity/*.ts';
    const opts: PostgresConnectionOptions = {
        type: 'postgres',
        host: pg.host!,
        port: parseInt(pg.port!),
        username: pg.user,
        password: pg.password,
        database: pg.database!,
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
