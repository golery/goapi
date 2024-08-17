import { group } from 'console';
import { Ctx } from 'types/context';

export const MOCK_TOKEN = 'mock_token';

export const sync = (ctx: Ctx, dataMap: Record<string, object[]>) => {
    const objects = Object.entries(dataMap).flatMap(([key, value]) => {
      return value.map(item => ({
        ...item,
        userId: ctx.userId,
        appId: ctx.appId,
        groupId: ctx.groupId,
        type: key,
      }));
    });
    return objects;
  };
  