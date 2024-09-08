import { Group } from "../entity/Group.entity";
import { Ctx } from "../types/context";
import { getEm } from "./db";

export function createGroup(ctx:Ctx, appId: number) {
    const em = getEm();
    const group = new Group();
    Object.assign(group, { appId, userId: ctx.userId });
    em.persist(group);
    return group;
}