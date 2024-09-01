import { SignUpResponse } from './../types/schemas';
import { User } from '../entity/user.entity';
import { orm } from './Init';
import * as bcrypt from 'bcrypt';
import logger from '../util/logger';
import { isValidEmail, isValidPassword } from '../util/validators';
import { ServerError } from '../util/errors';
 
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

    if (!isValidPassword(password)) {
        throw new ServerError(400, 'Invalid password');
    }

    const existingUser = await em.findOne(User, { email });
    if (existingUser !== null) {
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


