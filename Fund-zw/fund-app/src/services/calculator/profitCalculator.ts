import type { UserHolding, FundQuote, DashboardDTO } from '../../models';

/**
 * 收益计算引擎
 */
export class ProfitCalculator {
    /**
     * 计算单个持仓的市值
     */
    calculateMarketValue(holding: UserHolding, currentPrice: number): number {
        return holding.share * currentPrice;
    }

    /**
     * 计算单个持仓的成本
     */
    calculateCost(holding: UserHolding): number {
        return holding.share * holding.costPrice;
    }

    /**
     * 计算单个持仓的收益
     */
    calculateProfit(holding: UserHolding, currentPrice: number): number {
        const marketValue = this.calculateMarketValue(holding, currentPrice);
        const cost = this.calculateCost(holding);
        return marketValue - cost;
    }

    /**
     * 计算单个持仓的收益率
     */
    calculateProfitRate(holding: UserHolding, currentPrice: number): number {
        const cost = this.calculateCost(holding);
        if (cost === 0) return 0;
        const profit = this.calculateProfit(holding, currentPrice);
        return (profit / cost) * 100;
    }

    /**
     * 计算单个持仓的今日收益
     */
    calculateDayProfit(holding: UserHolding, quote: FundQuote): number {
        return holding.share * (quote.price - quote.preClose);
    }

    /**
     * 计算仪表盘数据 (聚合所有持仓)
     */
    calculateDashboardData(
        holdings: UserHolding[],
        quotes: Map<string, FundQuote>
    ): DashboardDTO {
        let totalAsset = 0;
        let totalCost = 0;
        let dayProfit = 0;

        holdings.forEach(holding => {
            const quote = quotes.get(holding.fundCode);
            if (!quote) return;

            totalAsset += this.calculateMarketValue(holding, quote.price);
            totalCost += this.calculateCost(holding);
            dayProfit += this.calculateDayProfit(holding, quote);
        });

        const totalProfit = totalAsset - totalCost;
        const totalProfitRate = totalCost === 0 ? 0 : (totalProfit / totalCost) * 100;

        return {
            totalAsset,
            totalProfit,
            totalProfitRate,
            dayProfit,
        };
    }
}

export const profitCalculator = new ProfitCalculator();
