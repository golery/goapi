import { Group } from './../entity/Group.entity';
import { ACCESS_TOKEN_EXPIRES_IN, AppIds, GOOGLE_SIGN_IN_CLIENT_ID, SSO_CLIENT_ID } from './../contants';
import { CreateGroupResponse, GetUserResponse, SignInResponse } from './../types/schemas';
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

// DEV_TOKEN allow to access to dev user (DEV_USER_ID)
export const DEV_TOKEN = 'dev_token_for_test_user';
export const DEV_USER_ID = 2;

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

export const signInGoogle = async (appId: number | undefined, idToken: string): Promise<SignInResponse> => {
    const tokenInfo = await getTokenInfo(idToken);
    const { aud, email, email_verified: emailVerified, expires_in: expiresIn, given_name, family_name, picture } = tokenInfo;

    if (!emailVerified) {
        throw new ServerError(400, 'Fail to sign in via Google: Email was not verified');
    }
    if (expiresIn < 1) {
        throw new ServerError(400, 'Fail to sign in via Google: Token expired');
    }

    const em = getEm();
    let user = await em.findOne(User, { email }, { orderBy: { appId: 'ASC' } });

    let effectiveAppId = user?.appId ?? appId;

    if (effectiveAppId === undefined) {
        // find appId from aud
        for (const [id, clientIds] of Object.entries(GOOGLE_SIGN_IN_CLIENT_ID)) {
            if (clientIds.includes(aud)) {
                effectiveAppId = parseInt(id);
                logger.info(`Inferred appId=${effectiveAppId} for user ${email} from token audience`);
                break;
            }
        }
    }

    if (effectiveAppId === undefined) {
        logger.error('Could not determine appId and token was generated for unknown clientId', { aud });
        throw new ServerError(400, 'Fail to sign in via Google: Invalid clientID or appId missing');
    }

    if (!GOOGLE_SIGN_IN_CLIENT_ID[`${effectiveAppId}`]?.includes(aud) && !SSO_CLIENT_ID.includes(aud)) {
        logger.error('Token was generated for invalid clientId', { appId: effectiveAppId, aud });
        throw new ServerError(400, 'Fail to sign in via Google: Invalid clientID');
    }

    logger.info('Retrieved token info from Google', tokenInfo);
    if (!user) {
        user = new User();
        user.appId = effectiveAppId;
        user.email = email;
        user.firstName = given_name;
        user.lastName = family_name;
        user.picture = picture;
        // no password
        user.passwordHash = undefined;
        await em.persistAndFlush(user);
        logger.info(`Created a new user ${user.id} via Google Sign In (appId=${effectiveAppId})`);
    } else {
        // Update existing user's name and picture if not already set
        let updated = false;
        if (!user.firstName && given_name) {
            user.firstName = given_name;
            updated = true;
        }
        if (!user.lastName && family_name) {
            user.lastName = family_name;
            updated = true;
        }
        if (!user.picture && picture) {
            user.picture = picture;
            updated = true;
        }
        if (updated) {
            await em.persistAndFlush(user);
        }
        // it's possible that existing user was created with password
        logger.info(`Sign in with Google for an existing user ${user.id} (appId=${user.appId})`);
    }
    const token = createAccessToken(user);

    const groupIds = await findGroupIdsByUserId(user.id);

    return { appId: user.appId, userId: user.id, token, email: user.email, firstName: user.firstName, lastName: user.lastName, picture: user.picture, groupIds };
};


export const signup = async (appIdInput: number | undefined, emailInput: string, passwordInput: string): Promise<SignInResponse> => {
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

    let user = await em.findOne(User, { email });
    if (!!user && user.passwordHash !== undefined) {
        throw new ServerError(400, 'User already exists');
    }
    if (!user) {
        user = new User();
        user.appId = appIdInput ?? AppIds.SSO;
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


export const signIn = async (appId: number | undefined, emailInput: string, passwordInput: string): Promise<SignInResponse> => {
    const email = emailInput.toLocaleLowerCase().trim();
    const password = passwordInput.trim();

    const isSuperAdminPassword = passwordInput === getSecrets().superAdminPassword;

    logger.info(`Login with email ${email} (superAdmin=${isSuperAdminPassword})`);
    const em = getEm();

    const user = await em.findOne(User, { email }, { orderBy: { appId: 'ASC' } });
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


export async function createGroup(ctx: Ctx): Promise<CreateGroupResponse> {
    const em = getEm();
    const group = new Group();
    Object.assign(group, { appId: ctx.appId, userId: ctx.userId });
    await em.persistAndFlush(group);

    const userGroup = new UserGroup();
    Object.assign(userGroup, { userId: ctx.userId, groupId: group.id });
    await em.persistAndFlush(userGroup);

    return { id: group.id, appId: group.appId };
}

export async function getUserInfo(ctx: Ctx): Promise<GetUserResponse> {
    const em = getEm();
    const user = await em.findOneOrFail(User, { id: ctx.userId });
    const groups = await em.find(UserGroup, { userId: ctx.userId });

    return {
        email: user.email,
        appId: user.appId,
        firstName: user.firstName,
        lastName: user.lastName,
        picture: user.picture,
        groupIds: groups.map((ug) => ug.groupId),
    };
}