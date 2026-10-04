# Groups

> A group is one inventory. A user can belong to more than one group. The phone stores the group last opened on that device. This file is the API and the rules for the backend.

**Status:** Decided  
**Decided:** 4 Oct 2026

The owner-facing commitment is [Groups](product-features.md#groups).

This replaces the 27 Sep 2026 phone-demo API. That demo had no account, one group per phone, and a code with no expiry. Sign-up, sign-in, and Google sign-in already exist. This design adds groups on that account.

The phone still sends a fixed `groupId` header. A later phone change will send the selected group id. This document does not change the sync routes in [offline-sync.md](offline-sync.md).

## Rules

- Sign-up creates a group named Personal. The new user is its owner.
- A user can create more groups. The user is the owner of each group they create.
- A user can be a member of more than one group at the same time.
- Only an owner can create an invite code, revoke a code, rename the group, remove a member, or change a role.
- One code admits one signed-in user. The code expires 2 hours after the server creates it.
- An owner can have more than one unused code at the same time. Each code still admits one user.
- A member can leave. An owner can remove another member. The last owner cannot leave, be removed, or become Staff.
- The phone stores the selected group for this user on this device. The server does not store it.
- A stock change stores the user id and the member's name at the time of the change. Removing a member does not change past stock lines.
- Every location in the group stays visible to every member.

## Records

Ids are integers. They match `groupIds` on the current access token.

**User.** The account. In API responses, `name` is the text before `@` in the email. A stock line copies that name at the time of the change.

**Group.** `name`. Each group belongs to one app (`app_id` on the group row). List and `groupIds` order is by group id.

**Membership.** One row per user per group, keyed by `(userId, groupId)`. `role` is `owner` or `staff`.

**Invite.** Stored with a surrogate id. The API uses `code`, `groupId`, `expiresAt`, `usedAt`, `usedByUserId`, `revokedAt`. Join always creates a staff membership. Invite responses include `"role": "staff"` but the server does not store invite role.

The code is six characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`. The server chooses it. The server stores it in upper case. A join request accepts either case. The server generates a new code when the chosen code already exists.

## Auth

Sign-up, sign-in, and Google sign-in stay public:

- `POST /api/public/signup`
- `POST /api/public/signin`
- `POST /api/public/signinGoogle`

Every other call sends `Authorization: Bearer <token>`.

A call that names a group checks that the token's user has a membership in that group. A user who is not a member gets **404**. A member whose role cannot do the action gets **403**.

## Sign-up and sign-in

Sign-up does all of this in one transaction:

1. Create the user.
2. Create a group named `Personal`.
3. Create an owner membership for that user.

A new Google user uses the same steps.

The response adds `groups` to the current access token. `groupIds` stays, in the same order as `groups`. The server lists groups by group id.

```json
{
  "appId": 1,
  "userId": 12,
  "token": "…",
  "email": "alex@shop.example",
  "groupIds": [3, 9],
  "groups": [
    { "id": 3, "name": "Personal", "role": "owner" },
    { "id": 9, "name": "Shop", "role": "staff" }
  ]
}
```

When a user has no membership, sign-in creates Personal with the same steps as sign-up. This covers accounts created before this feature.

## Selected group

The phone stores the selected group id for this user on this device. The server does not store it, and there is no select-group route. Two devices for the same user can open different groups.

The phone opens the stored id when that id is in `groupIds`. When the phone has no stored id, or the user is no longer a member of that group, the phone opens the first id in `groupIds`.

After sign-up, the phone stores the only group id. After the user creates a group or joins a group, the phone stores that group id.

`GET /api/groups` returns the same `groups` array as sign-in.

## Create a group

`POST /api/groups`

```json
{ "name": "Shop" }
```

The server trims `name`. The length after trim is 1 to 60 characters. Two groups may use the same name.

The server creates the group and an owner membership. The phone stores this group id on the device.

```json
{
  "group": { "id": 10, "name": "Shop", "role": "owner" }
}
```

`role` is the caller's role in that group.

## Rename

`PATCH /api/groups/{groupId}`

Owner only.

```json
{ "name": "Main shop" }
```

The name uses the same trim and length rules as create.

```json
{ "id": 10, "name": "Main shop", "role": "owner" }
```

## People

`GET /api/groups/{groupId}/people`

Any member can read the people. The owner also receives unused codes that have not expired. A staff response has no `invites` field.

```json
{
  "membership": { "userId": 12, "name": "alex", "role": "owner" },
  "members": [
    { "userId": 12, "name": "alex", "role": "owner" },
    { "userId": 15, "name": "maya", "role": "staff" }
  ],
  "invites": [
    { "code": "K7MQ4R", "role": "staff", "expiresAt": "2026-10-04T17:27:00Z" }
  ]
}
```

`membership` is the caller. `name` is the user's name. `expiresAt` is UTC.

## Invite

`POST /api/groups/{groupId}/invites`

Owner only. The body is empty. The new member will be staff.

The server sets `expiresAt` to 2 hours after the server time.

```json
{ "code": "K7MQ4R", "role": "staff", "expiresAt": "2026-10-04T17:27:00Z" }
```

`DELETE /api/groups/{groupId}/invites/{code}`

Owner only. This revokes a code that is unused and not expired. The response is `{}`. A used, revoked, expired, or unknown code gets **404**.

## Join

The caller is already signed in. The body has the code and no group id.

`POST /api/groups/join`

```json
{ "code": "K7MQ4R" }
```

The server does this in one transaction:

1. Lock the invite row.
2. Refuse an unknown code with **404**.
3. Refuse a used or revoked code with **409**.
4. Refuse an expired code with **410**. Do not mark it used.
5. Refuse when the user is already a member of that group with **409**. Do not mark the code used.
6. Insert a staff membership.
7. Mark the code used, with the user id and the server time.

The phone stores this group id on the device.

```json
{
  "group": { "id": 9, "name": "Shop", "role": "staff" },
  "membership": { "userId": 15, "name": "maya", "role": "staff" }
}
```

A second request with the same code gets **409**.

## Leave, remove, and role

`DELETE /api/groups/{groupId}/members/{userId}`

The caller may delete their own membership. That is leave. An owner may delete another member. That is remove. Staff cannot delete another member.

The server keeps past stock lines. Those lines already store the user id and the name.

The last owner gets **409**. The response body for a successful delete is `{}`.

The phone drops a stored id that is no longer in `groupIds` and opens the first remaining id.

`PATCH /api/groups/{groupId}/members/{userId}`

Owner only.

```json
{ "role": "owner" }
```

`role` is `owner` or `staff`. The last owner gets **409** when the new role is `staff`.

```json
{ "userId": 15, "name": "maya", "role": "owner" }
```

There is no route to delete a group.

## Inventory routes

A route that reads or writes one group's products, places, stock, or files must require a membership in that group. The group id is the `groupId` header until the phone sends the selected id. A user who is not a member gets **404**.

Staff may change stock. The server accepts the operation when the token's user is a member of the group in the `groupId` header.

## Errors

| Status | When |
|---|---|
| 400 | The group name is blank or longer than 60 characters after trim |
| 401 | The token is missing or unknown |
| 403 | Staff invited, revoked, renamed, removed another member, or changed a role |
| 404 | Unknown group, unknown member, unknown code, or the user is not a member |
| 409 | The user is already in the group, the code is used or revoked, or this would leave, remove, or demote the last owner |
| 410 | The code is unused and the server time is at or after `expiresAt` |

Successful deletes return **200** and `{}`. The current phone treats only **200** as success.
