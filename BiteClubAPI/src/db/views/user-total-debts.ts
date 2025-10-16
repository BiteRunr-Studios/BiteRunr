import { pgView } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { orderUsers, orders, users } from "../schema";

export const userTotalDebts = pgView("user_total_debts").as((qb) =>
    qb
        .select({
            debtorId: orderUsers.user_id,
            creditorId: orders.creator_id,
            creditorName:
                sql<string>`${users.first_name} || ' ' || ${users.last_name}`.as(
                    "creditor_name"
                ),
            totalOwed: sql<string>`SUM(${orderUsers.amount_owed})`.as(
                "total_owed"
            ),
            unsettledOrdersCount: sql<number>`COUNT(*)`.as(
                "unsettled_orders_count"
            ),
        })
        .from(orderUsers)
        .innerJoin(orders, sql`${orderUsers.order_id} = ${orders.id}`)
        .innerJoin(users, sql`${orders.creator_id} = ${users.id}`)
        .where(
            sql`${orderUsers.settlement_status} IN ('unpaid', 'claimed') 
          AND ${orderUsers.amount_owed} > 0`
        )
        .groupBy(
            orderUsers.user_id,
            orders.creator_id,
            users.first_name,
            users.last_name
        )
);
