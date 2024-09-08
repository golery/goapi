import { UserGroup } from "../entity/UserGroup.entity";
import { getEm } from "../services/db";

export async function findGroupIdsByUserId(userId: number): Promise<number[]> {
    const em = getEm();
    const userGroups = em.find(UserGroup, { user_id: userId });
    return (await userGroups).map((ug) => ug.group_id);
}