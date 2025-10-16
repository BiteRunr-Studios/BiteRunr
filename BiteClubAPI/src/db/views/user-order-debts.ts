import { pgView } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orderUsers, orders, users } from "../schema";

export const userOrderDebts = pgView("user_order_debts").as((qb) =>
    qb
        .select({
            debtorId: orderUsers.user_id,
            creditorId: orders.creator_id,
            order_id: orders.id,
            creditorName:
                sql<string>`${users.first_name} || ' ' || ${users.last_name}`.as(
                    "creditor_name"
                ),
            amount_owed: orderUsers.amount_owed,
            settlement_status: orderUsers.settlement_status,
            orderDate: orders.created_at,
            orderNotes: orders.comments,
        })
        .from(orderUsers)
        .innerJoin(orders, sql`${orderUsers.order_id} = ${orders.id}`)
        .innerJoin(users, sql`${orders.creator_id} = ${users.id}`)
        .where(sql`${orderUsers.amount_owed} > 0`)
        .orderBy(sql`${orders.created_at} DESC`)
);
