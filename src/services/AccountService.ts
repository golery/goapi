import { SignInResponse, SignUpResponse } from './../types/schemas';
import { User } from '../entity/user.entity';
import { orm } from './Init';
import * as bcrypt from 'bcrypt';
import * as _ from 'lodash';
import logger from '../util/logger';
import { isValidEmail, validatePassword } from '../util/validators';
import { ServerError } from '../util/errors';
import * as jwt from 'jsonwebtoken';
import { ACCESS_TOKEN_EXPIRES_IN } from '../contants';
import { getSecrets } from './ConfigService';

export const MOCK_TOKEN = 'mock_token';

// Deprecated, used by pencil service
export const login = (username: string, password: string) => {
    if (username === 'hly') {
        return { token: MOCK_TOKEN };
    }
};

interface JwtPayload {
    userId: number;
    appId: number;
}
function createJwt(user: User): string {
    const jwtPayload: JwtPayload = { userId: user.id, appId: user.appId };
    return jwt.sign(jwtPayload, getSecrets().accessTokenSecret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function verifyJwt(authorizationHeader?: string): JwtPayload | undefined {
    if (authorizationHeader === undefined || !authorizationHeader.startsWith('Bearer ')) {
        return undefined;
    }
    try {
        const token = authorizationHeader.substring(7);
        const verifyResult = jwt.verify(token, getSecrets().accessTokenSecret);
        return _.pick(verifyResult, ['userId', 'appId']) as JwtPayload;
    } catch (err) {
        logger.error('Failed to verify jwt', { err });
        return undefined;
    }

}

export const signup = async (appId: number, emailInput: string, passwordInput: string): Promise<SignUpResponse> => {
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
    user.appId = appId;
    user.email = email;
    user.password = password;
    user.passwordHash = await bcrypt.hash(password, 10);
    await em.persistAndFlush(user);
    const token = createJwt(user);
    logger.info(`Created user ${user.id}`);
    return { appId: user.appId, userId: user.id, token };
};


export const signIn = async (appId: number, emailInput: string, passwordInput: string): Promise<SignInResponse> => {
    const email = emailInput.toLocaleLowerCase().trim();
    const password = passwordInput.trim();

    const isSuperAdminPassword = passwordInput === getSecrets().superAdminPassword;

    logger.info(`Login with email ${email} (superAdmin=${isSuperAdminPassword})`);
    const em = orm.em;

    const user = await em.findOne(User, { appId, email });
    if (!user) {
        throw new ServerError(401, 'User is not found');
    }

    const isCorrectPassword = isSuperAdminPassword || await bcrypt.compare(password, user.passwordHash);
    if (!isCorrectPassword) {
        throw new ServerError(401, 'Invalid password');
    }
    logger.info(`Login with user ${user.id}`);
    const token = createJwt(user);

    return { appId: user.appId, userId: user.id, token };
};

