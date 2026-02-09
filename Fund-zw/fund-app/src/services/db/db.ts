import Dexie, { type Table } from 'dexie';
import type { UserHolding, FundInfo, AccountGroup, UserStockHolding, StockInfo } from '../../models';

export class FundDatabase extends Dexie {
    holdings!: Table<UserHolding>;
    funds!: Table<FundInfo>;
    groups!: Table<AccountGroup>;
    stockHoldings!: Table<UserStockHolding>;
    stocks!: Table<StockInfo>;

    constructor() {
        super('FundManagerDB');
        this.version(3).stores({
            holdings: '++id, fundCode, groupId', // id 自增，索引 fundCode 和 groupId
            funds: 'code, name',                  // code 主键，索引 name
            groups: 'id, name',                   // id 主键，索引 name
            stockHoldings: '++id, stockCode, groupId', // 股票持仓表
            stocks: 'code, name'                  // 股票信息表
        });
    }
}

export const db = new FundDatabase();
