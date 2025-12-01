import { pgView } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orderUsers, orders, users } from "../schema";

export const creditorPendingClaims = pgView("creditor_pending_claims").as(
    (qb) =>
        qb
            .select({
                creditorId: orders.creator_id,
                debtorId: orderUsers.user_id,
                debtorName:
                    sql<string>`${users.first_name} || ' ' || ${users.last_name}`.as(
                        "debtor_name"
                    ),
                order_id: orders.id,
                amount_owed: orderUsers.amount_owed,
            })
            .from(orderUsers)
            .innerJoin(orders, sql`${orderUsers.order_id} = ${orders.id}`)
            .innerJoin(users, sql`${orderUsers.user_id} = ${users.id}`)
            .where(sql`${orderUsers.settlement_status} = 'claimed'`)
);
