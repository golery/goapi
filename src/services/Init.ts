import {parse} from 'pg-connection-string';
import {PostgresConnectionOptions} from 'typeorm/driver/postgres/PostgresConnectionOptions';
import {createConnection} from 'typeorm';
import {SnakeNamingStrategy} from 'typeorm-naming-strategies';

export const initDb = async () => {
    const pg = parse(process.env.POSTGRES_URL);
    const opts: PostgresConnectionOptions = {
        type: 'postgres',
        host: pg.host,
        port: parseInt(pg.port),
        username: pg.user,
        password: pg.password,
        database: pg.database,
        entities: [
            'src/entity/*{.ts,.js}'
        ],
        synchronize: false,
        logging: true,
        namingStrategy: new SnakeNamingStrategy(),
    };
    await createConnection(opts);
};
