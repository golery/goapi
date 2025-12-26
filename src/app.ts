import express from 'express';
import compression from 'compression'; // compresses requests
import cors from 'cors';
import 'reflect-metadata';
import {getApiRouter} from './router/api';
import { RequestContext } from '@mikro-orm/core';
import { getEm, orm } from './services/db';
import { loadConfig } from './services/ConfigService';
import { v4 as uuidv4 } from 'uuid';
import 'reflect-metadata';
export const app = express();
loadConfig();
app.set('port', process.env.PORT || 8200);
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use((req, res, next) => {
    res.locals.user = req.user;
    // fork orm.em for each request
    RequestContext.create(getEm(), next);
    Object.assign(req, { apiRequestId: uuidv4() });
});

app.use('/api', getApiRouter());
app.use('/', (req, res) => {
    res.send('ping');
});


export default app;

