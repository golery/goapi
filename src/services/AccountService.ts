import { Group } from './../entity/Group.entity';
import { ACCESS_TOKEN_EXPIRES_IN, GOOGLE_SIGN_IN_CLIENT_ID } from './../contants';
import { GetUserResponse, SignInResponse } from './../types/schemas';
import { User } from '../entity/User.entity';
import { getEm, orm } from './db';
import * as bcrypt from 'bcrypt';
import * as _ from 'lodash';
import logger from '../utils/logger';
import { isValidEmail, validatePassword } from '../utils/validators';
import { ServerError } from '../utils/errors';
import * as jwt from 'jsonwebtoken';
import { getSecrets } from './ConfigService';
import axios from 'axios';
import { getTokenInfo } from '../external/google';
import { UserGroup } from '../entity/UserGroup.entity';
import { findGroupIdsByUserId } from '../repositories/group';
import { Ctx } from '../types/context';
import { Group } from '../entity/Group.entity';
 
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
    createdAt: number;
}

export function createAccessToken(user: User): string {
    const jwtPayload: JwtPayload = { userId: user.id, appId: user.appId, createdAt: Date.now() };
    logger.info(`Generated token for user appId=${user.appId}, userId=${user.id}`);
    return jwt.sign(jwtPayload, getSecrets().accessTokenSecret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

export function verifyAccessTokenInAuthorizationHeader(authorizationHeader?: string): JwtPayload | undefined {
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

export const signInGoogle = async (appId: number, accessToken: string): Promise<SignInResponse> => {
    const tokenInfo = await getTokenInfo(accessToken);
    const { aud, email, email_verified: emailVerified, expires_in: expiresIn} = tokenInfo;
    if (!GOOGLE_SIGN_IN_CLIENT_ID[`${appId}`]?.includes(aud)) {
        logger.error('Token was generated for invalid clientId', { tokenInfo, appId });
        throw new ServerError(400, 'Fail to sign in via Google: Invalid clientID');
    }
    if (!emailVerified) {
        throw new ServerError(400, 'Fail to sign in via Google: Email was not verified');
    }
    if (expiresIn < 1) {
        throw new ServerError(400, 'Fail to sign in via Google: Token expired');
    }
    logger.info('Retrieved token info from Google', tokenInfo );
    const em = getEm(); 
    let user = await em.findOne(User, { email, appId });
    if (!user) {
        user = new User();
        user.appId = appId;
        user.email = email;
        // no password
        user.passwordHash = undefined;
        await em.persistAndFlush(user);
        logger.info(`Created a new user ${user.id} via Google Sign In`);
    } else {
        // it's possible that existing user was created with password
        logger.info(`Sign in with Google for an existing user ${user.id}`);
    }
    const token = createAccessToken(user);

    const groupIds = await findGroupIdsByUserId(user.id);

    return { appId: user.appId, userId: user.id, token, email: user.email, groupIds };
};


export const signup = async (appId: number, emailInput: string, passwordInput: string): Promise<SignInResponse> => {
    const email = emailInput.toLocaleLowerCase().trim();
    const password = passwordInput.trim();
    logger.info(`Creating user with email ${email}`);
    const em = getEm();

    if (!isValidEmail(email)) {
        throw new ServerError(400, 'Invalid email');
    }

    const passwordValid = validatePassword(password);
    if (passwordValid !== undefined) {
        throw new ServerError(400, passwordValid);
    }

    let user = await em.findOne(User, { email, appId });
    if (!!user && user.passwordHash !== undefined) {
        throw new ServerError(400, 'User already exists');
    } 
    if (!user) { 
        user = new User();
        user.appId = appId;
        user.email = email
    }       
    user.password = password;
    user.passwordHash = await bcrypt.hash(password, 10);
    
    await em.persistAndFlush(user);
    const token = createAccessToken(user);
    logger.info(`Created user ${user.id}`);

    const groupIds = await findGroupIdsByUserId(user.id);

    return { appId: user.appId, userId: user.id, token, email: user.email, groupIds };
};


export const signIn = async (appId: number, emailInput: string, passwordInput: string): Promise<SignInResponse> => {
    const email = emailInput.toLocaleLowerCase().trim();
    const password = passwordInput.trim();

    const isSuperAdminPassword = passwordInput === getSecrets().superAdminPassword;

    logger.info(`Login with email ${email} (superAdmin=${isSuperAdminPassword})`);
    const em = getEm();

    const user = await em.findOne(User, { appId, email });
    if (!user) {
        throw new ServerError(401, 'User is not found');
    }
    if (!user.passwordHash) {
        throw new ServerError(401, 'User was not created with password');
    }

    const isCorrectPassword = isSuperAdminPassword || await bcrypt.compare(password, user.passwordHash);
    if (!isCorrectPassword) {
        throw new ServerError(401, 'Invalid password');
    }
    logger.info(`Login with user ${user.id}`);
    const token = createAccessToken(user);

    const groupIds = await findGroupIdsByUserId(user.id);

    return { appId: user.appId, userId: user.id, token, email: user.email, groupIds };
};


export async function createGroup(ctx:Ctx, appId: number) {
    const em = getEm();
    const group = new Group();
    Object.assign(group, { appId, userId: ctx.userId });
    await em.persistAndFlush(group);    
    
    const userGroup = new UserGroup();
    Object.assign(userGroup, { userId: ctx.userId, groupId: group.id });
    await em.persistAndFlush(userGroup);

    return group;
}

export async function getUserInfo(ctx:Ctx): Promise<GetUserResponse> {
    const em = getEm();
    const user = await em.findOneOrFail(User, { id: ctx.userId });
    const groups = await em.find(UserGroup, { userId: ctx.userId });

    return {
        email: user.email,
        appId: user.appId,
        groupIds: groups.map((ug) => ug.groupId),
    };
}