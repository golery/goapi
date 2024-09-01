import { SignInResponse, SignUpResponse } from './../types/schemas';
import { User } from '../entity/user.entity';
import { orm } from './Init';
import * as bcrypt from 'bcrypt';
import logger from '../util/logger';
import { isValidEmail, validatePassword } from '../util/validators';
import { ServerError } from '../util/errors';
import * as jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_EXPIRES_IN } from '../contants';
import { ConfigService, getSecrets } from './ConfigService';
 
export const MOCK_TOKEN = 'mock_token';

export const login = (username: string, password: string) => {
    if (username === 'hly') {
        return { token: MOCK_TOKEN };
    }
};


export const signup = async (emailInput: string, passwordInput: string): Promise<SignUpResponse> => {
    const email = emailInput.toLocaleLowerCase().trim();
    const password = passwordInput.trim();
    logger.info(`Creating user with email ${email}`);
    const em = orm.em;

    if (!isValidEmail(email)) {
        throw new ServerError(400, 'Invalid email');
    }

    const passwordValid = validatePassword(password);
    if (passwordValid !== undefined) {
        throw new ServerError(400, passwordValid);
    }

    const existingUser = await em.findOne(User, { email });
    if (!!existingUser) {
        throw new ServerError(400, 'User already exists');
    }

    const user = new User();
    user.email = email;
    user.password = password;
    user.passwordHash = await bcrypt.hash(password, 10);
    await em.persistAndFlush(user);
    logger.info(`Created user ${user.id}`);
    return { userId: user.id };
};


export const signIn = async (emailInput: string, passwordInput: string): Promise<SignInResponse> => {
    const email = emailInput.toLocaleLowerCase().trim();
    const password = passwordInput.trim();
    logger.info(`Login with email ${email}`);
    const em = orm.em;

    const user = await em.findOne(User, { email });
    if (!user) {
        throw new ServerError(401, 'User is not found');
    }
    const isCorrectPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isCorrectPassword) {
        throw new ServerError(401, 'Invalid password');
    }
    logger.info(`Login with user ${user.id}`);
    const token = jwt.sign({ userId: user.id }, getSecrets().accessTokenSecret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
    return { userId: user.id, token };
};

 