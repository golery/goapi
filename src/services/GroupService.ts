import { Group } from '../entity/Group.entity';
import { GroupInvite } from '../entity/GroupInvite.entity';
import { User } from '../entity/User.entity';
import { MembershipRole, UserGroup } from '../entity/UserGroup.entity';
import { Ctx } from '../types/context';
import { getEm } from './db';
import { ServerError } from '../utils/errors';

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const INVITE_CODE_LENGTH = 6;
const INVITE_TTL_MS = 2 * 60 * 60 * 1000;
const GROUP_NAME_MAX = 60;
export const DEFAULT_GROUP_NAME = 'Personal';

export function displayNameFromEmail(email: string): string {
    const at = email.indexOf('@');
    return at >= 0 ? email.slice(0, at) : email;
}

export function validateGroupName(raw: string): string {
    const name = raw.trim();
    if (name.length < 1 || name.length > GROUP_NAME_MAX) {
        throw new ServerError(400, 'Invalid group name');
    }
    return name;
}

function parsePositiveInt(value: string, label: string): number {
    const n = Number.parseInt(value, 10);
    if (!Number.isFinite(n) || n < 1) {
        throw new ServerError(404, `Unknown ${label}`);
    }
    return n;
}

async function loadGroupForApp(groupId: number, appId: number): Promise<Group | undefined> {
    const em = getEm();
    const group = await em.findOne(Group, { id: groupId });
    if (!group || group.appId !== appId) {
        return undefined;
    }
    return group;
}

export async function loadMembership(
    ctx: Ctx,
    groupId: number,
): Promise<{ group: Group; membership: UserGroup }> {
    const group = await loadGroupForApp(groupId, ctx.appId);
    if (!group) {
        throw new ServerError(404, 'Group not found');
    }
    const em = getEm();
    const membership = await em.findOne(UserGroup, { userId: ctx.userId, groupId });
    if (!membership) {
        throw new ServerError(404, 'Group not found');
    }
    return { group, membership };
}

function requireOwner(membership: UserGroup): void {
    if (membership.role !== 'owner') {
        throw new ServerError(403, 'Forbidden');
    }
}

async function countOwners(groupId: number): Promise<number> {
    const em = getEm();
    return em.count(UserGroup, { groupId, role: 'owner' });
}

function generateInviteCode(): string {
    let code = '';
    for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
        const idx = Math.floor(Math.random() * INVITE_CODE_CHARS.length);
        code += INVITE_CODE_CHARS[idx];
    }
    return code;
}

async function createUniqueInviteCode(em: ReturnType<typeof getEm>): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
        const code = generateInviteCode();
        const existing = await em.findOne(GroupInvite, { code });
        if (!existing) {
            return code;
        }
    }
    throw new ServerError(500, 'Failed to generate invite code');
}

function groupSummary(group: Group, role: MembershipRole) {
    return { id: group.id, name: group.name ?? null, role };
}

function memberJson(user: User, role: MembershipRole) {
    return {
        userId: user.id,
        name: displayNameFromEmail(user.email),
        role,
    };
}

export async function ensurePersonalGroup(ctx: Ctx): Promise<void> {
    const em = getEm();
    const membershipCount = await em.count(UserGroup, { userId: ctx.userId });
    if (membershipCount > 0) {
        return;
    }

    const group = new Group();
    group.appId = ctx.appId;
    group.name = DEFAULT_GROUP_NAME;
    await em.persist(group);

    const membership = new UserGroup();
    membership.userId = ctx.userId;
    membership.groupId = group.id;
    membership.role = 'owner';
    await em.persistAndFlush(membership);
}

export async function listGroups(ctx: Ctx) {
    await ensurePersonalGroup(ctx);
    const em = getEm();
    const memberships = await em.find(UserGroup, { userId: ctx.userId }, { orderBy: { groupId: 'ASC' } });
    const groups: { id: number; name: string | null; role: MembershipRole }[] = [];
    for (const m of memberships) {
        const group = await em.findOne(Group, { id: m.groupId, appId: ctx.appId });
        if (group) {
            groups.push(groupSummary(group, m.role));
        }
    }
    groups.sort((a, b) => a.id - b.id);
    return { groups };
}

export async function createGroup(ctx: Ctx, nameInput: string) {
    const name = validateGroupName(nameInput);
    const em = getEm();
    const group = new Group();
    group.appId = ctx.appId;
    group.name = name;
    await em.persistAndFlush(group);

    const membership = new UserGroup();
    membership.userId = ctx.userId;
    membership.groupId = group.id;
    membership.role = 'owner';
    await em.persistAndFlush(membership);

    return { group: groupSummary(group, 'owner') };
}

export async function renameGroup(ctx: Ctx, groupIdInput: string, nameInput: string) {
    const groupId = parsePositiveInt(groupIdInput, 'group');
    const name = validateGroupName(nameInput);
    const { group, membership } = await loadMembership(ctx, groupId);
    requireOwner(membership);
    group.name = name;
    await getEm().persistAndFlush(group);
    return groupSummary(group, membership.role);
}

async function loadUsersByIds(userIds: number[]): Promise<Map<number, User>> {
    const em = getEm();
    const users = await em.find(User, { id: { $in: userIds } });
    return new Map(users.map((u) => [u.id, u]));
}

export async function getPeople(ctx: Ctx, groupIdInput: string) {
    const groupId = parsePositiveInt(groupIdInput, 'group');
    const { membership: callerMembership } = await loadMembership(ctx, groupId);
    const em = getEm();
    const memberships = await em.find(UserGroup, { groupId }, { orderBy: { userId: 'ASC' } });
    const userMap = await loadUsersByIds(memberships.map((m) => m.userId));
    const members = memberships.map((m) => {
        const user = userMap.get(m.userId);
        if (!user) {
            throw new ServerError(500, 'Member user not found');
        }
        return memberJson(user, m.role);
    });
    const callerUser = userMap.get(ctx.userId) ?? (await em.findOneOrFail(User, { id: ctx.userId }));
    const result: Record<string, unknown> = {
        membership: memberJson(callerUser, callerMembership.role),
        members,
    };
    if (callerMembership.role === 'owner') {
        const now = new Date();
        const invites = await em.find(GroupInvite, {
            groupId,
            usedAt: null,
            revokedAt: null,
            expiresAt: { $gt: now },
        });
        result.invites = invites.map((inv) => ({
            code: inv.code,
            role: 'staff' as const,
            expiresAt: inv.expiresAt.toISOString(),
        }));
    }
    return result;
}

export async function createInvite(ctx: Ctx, groupIdInput: string) {
    const groupId = parsePositiveInt(groupIdInput, 'group');
    const { membership } = await loadMembership(ctx, groupId);
    requireOwner(membership);
    const em = getEm();
    const code = await createUniqueInviteCode(em);
    const invite = new GroupInvite();
    invite.code = code;
    invite.groupId = groupId;
    invite.expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    await em.persistAndFlush(invite);
    return {
        code: invite.code,
        role: 'staff' as const,
        expiresAt: invite.expiresAt.toISOString(),
    };
}

function normalizeInviteCode(code: string): string {
    return code.trim().toUpperCase();
}

export async function revokeInvite(ctx: Ctx, groupIdInput: string, codeInput: string) {
    const groupId = parsePositiveInt(groupIdInput, 'group');
    const { membership } = await loadMembership(ctx, groupId);
    requireOwner(membership);
    const code = normalizeInviteCode(codeInput);
    const em = getEm();
    const invite = await em.findOne(GroupInvite, { code, groupId });
    const now = new Date();
    if (!invite || invite.usedAt || invite.revokedAt || invite.expiresAt <= now) {
        throw new ServerError(404, 'Invite not found');
    }
    invite.revokedAt = now;
    await em.persistAndFlush(invite);
    return {};
}

export async function joinGroup(ctx: Ctx, codeInput: string) {
    const code = normalizeInviteCode(codeInput);
    const em = getEm();

    return em.transactional(async (tem) => {
        const conn = tem.getConnection();
        const rows = (await conn.execute(
            'SELECT id, group_id, expires_at, used_at, revoked_at FROM group_invite WHERE code = ? FOR UPDATE',
            [code],
        )) as {
            id: number;
            group_id: number;
            expires_at: Date;
            used_at: Date | null;
            revoked_at: Date | null;
        }[];

        if (!rows.length) {
            throw new ServerError(404, 'Invite not found');
        }
        const row = rows[0];
        if (row.used_at || row.revoked_at) {
            throw new ServerError(409, 'Invite already used or revoked');
        }
        const expiresAt = new Date(row.expires_at);
        if (Date.now() >= expiresAt.getTime()) {
            throw new ServerError(410, 'Invite expired');
        }

        const group = await tem.findOne(Group, { id: row.group_id });
        if (!group || group.appId !== ctx.appId) {
            throw new ServerError(404, 'Invite not found');
        }

        const existing = await tem.findOne(UserGroup, { userId: ctx.userId, groupId: row.group_id });
        if (existing) {
            throw new ServerError(409, 'Already a member');
        }

        const membership = new UserGroup();
        membership.userId = ctx.userId;
        membership.groupId = row.group_id;
        membership.role = 'staff';
        tem.persist(membership);

        const invite = await tem.findOneOrFail(GroupInvite, { id: row.id });
        invite.usedAt = new Date();
        invite.usedByUserId = ctx.userId;

        const user = await tem.findOneOrFail(User, { id: ctx.userId });
        await tem.flush();

        return {
            group: groupSummary(group, 'staff'),
            membership: memberJson(user, 'staff'),
        };
    });
}

export async function deleteMember(ctx: Ctx, groupIdInput: string, targetUserIdInput: string) {
    const groupId = parsePositiveInt(groupIdInput, 'group');
    const targetUserId = parsePositiveInt(targetUserIdInput, 'member');
    const { membership: callerMembership } = await loadMembership(ctx, groupId);
    const em = getEm();
    const target = await em.findOne(UserGroup, { userId: targetUserId, groupId });
    if (!target) {
        throw new ServerError(404, 'Member not found');
    }

    if (targetUserId !== ctx.userId) {
        requireOwner(callerMembership);
    }

    if (target.role === 'owner' && (await countOwners(groupId)) <= 1) {
        throw new ServerError(409, 'Cannot remove the last owner');
    }

    await em.removeAndFlush(target);
    return {};
}

export async function patchMemberRole(
    ctx: Ctx,
    groupIdInput: string,
    targetUserIdInput: string,
    role: MembershipRole,
) {
    if (role !== 'owner' && role !== 'staff') {
        throw new ServerError(400, 'Invalid role');
    }
    const groupId = parsePositiveInt(groupIdInput, 'group');
    const targetUserId = parsePositiveInt(targetUserIdInput, 'member');
    const { membership: callerMembership } = await loadMembership(ctx, groupId);
    requireOwner(callerMembership);

    const em = getEm();
    const target = await em.findOne(UserGroup, { userId: targetUserId, groupId });
    if (!target) {
        throw new ServerError(404, 'Member not found');
    }

    if (target.role === 'owner' && role === 'staff' && (await countOwners(groupId)) <= 1) {
        throw new ServerError(409, 'Cannot demote the last owner');
    }

    target.role = role;
    await em.persistAndFlush(target);

    const user = await em.findOneOrFail(User, { id: targetUserId });
    return memberJson(user, role);
}
