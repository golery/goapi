import express from 'express';
import compression from 'compression'; // compresses requests
import bodyParser from 'body-parser';
import cors from 'cors';
import 'reflect-metadata';
import {getApiRouter} from './router/api';
import { RequestContext } from '@mikro-orm/core';
import { orm } from './services/Init';
const app = express();

app.set('port', process.env.PORT || 8200);
app.use(cors());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use((req, res, next) => {
    res.locals.user = req.user;
    // fork orm.em for each request
    RequestContext.create(orm.em, next);
});

app.use('/api2', getApiRouter());
app.use('/', (req, res) => {
    res.send('ping');
});


export default app;

