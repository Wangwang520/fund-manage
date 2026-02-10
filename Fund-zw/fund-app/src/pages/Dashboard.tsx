import React, { useEffect, useMemo, useCallback } from 'react';
import Card from 'antd/es/card';
import Row from 'antd/es/row';
import Col from 'antd/es/col';

import Spin from 'antd/es/spin';
import Table from 'antd/es/table';
import Tag from 'antd/es/tag';
import Empty from 'antd/es/empty';
import Tabs from 'antd/es/tabs';
import { WalletOutlined, FundOutlined, StockOutlined } from '@ant-design/icons';
import { useFundStore } from '../store/fundStore';
import { useStockStore } from '../store/stockStore';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { profitCalculator } from '../services/calculator/profitCalculator';
import type { UserHolding, UserStockHolding } from '../models';

// 优化渲染性能的组件
const FundRow = React.memo(({ record }: { record: UserHolding }) => {
    return (
        <>
            <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{record.fundName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{record.fundCode}</div>
            </div>
        </>
    );
});

const StockRow = React.memo(({ record }: { record: UserStockHolding }) => {
    return (
        <>
            <div>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{record.stockName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{record.stockCode}</div>
            </div>
        </>
    );
});

export const Dashboard: React.FC = React.memo(() => {
    const { 
        dashboard: fundDashboard, 
        loading: fundLoading, 
        loadHoldings: loadFundHoldings, 
        holdings: fundHoldings, 
        quotes: fundQuotes, 
        settings 
    } = useFundStore();
    const { 
        holdings: stockHoldings, 
        quotes: stockQuotes, 
        loadHoldings: loadStockHoldings 
    } = useStockStore();

    // 启用自动刷新
    useAutoRefresh();

    useEffect(() => {
        // 并行获取基金和股票数据，避免瀑布流
        Promise.all([
            loadFundHoldings(),
            loadStockHoldings()
        ]).catch(error => {
            console.error('获取持仓数据失败:', error);
        });
    }, [loadFundHoldings, loadStockHoldings]);

    // 根据设置获取涨跌颜色
    const getProfitColor = useCallback((value: number) => {
        if (settings?.colorScheme === 'green-red') {
            return value >= 0 ? 'var(--color-success)' : 'var(--color-danger)';
        }
        return value >= 0 ? 'var(--color-danger)' : 'var(--color-success)';
    }, [settings?.colorScheme]);

    // 计算合并的统计数据
    const combinedStats = useMemo(() => {
        // 基金统计
        const fundAsset = fundDashboard.totalAsset;
        const fundProfit = fundDashboard.totalProfit;
        const fundDayProfit = fundDashboard.dayProfit;

        // 股票统计
        let stockAsset = 0;
        let stockCost = 0;
        let stockDayProfit = 0;

        stockHoldings.forEach(holding => {
            const quote = stockQuotes.get(holding.stockCode);
            const currentPrice = quote?.price || holding.costPrice;
            const asset = currentPrice * holding.quantity;
            const cost = holding.costPrice * holding.quantity;
            
            stockAsset += asset;
            stockCost += cost;
            
            if (quote) {
                stockDayProfit += (quote.price - quote.preClose) * holding.quantity;
            }
        });

        const stockProfit = stockAsset - stockCost;

        // 合并统计
        const totalAsset = fundAsset + stockAsset;
        const totalCost = (fundAsset - fundProfit) + (stockAsset - stockProfit);
        const totalProfit = fundProfit + stockProfit;
        const totalProfitRate = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;
        const totalDayProfit = fundDayProfit + stockDayProfit;

        return {
            totalAsset,
            totalProfit,
            totalProfitRate,
            totalDayProfit,
            fundAsset,
            stockAsset,
        };
    }, [fundDashboard, stockHoldings, stockQuotes]);

    // 基金持仓列表列定义
    const fundColumns = useMemo(() => [
        {
            title: '基金名称',
            dataIndex: 'fundName',
            key: 'fundName',
            render: (_: unknown, record: UserHolding) => (
                <FundRow record={record} />
            ),
        },
        {
            title: '持有份额',
            dataIndex: 'share',
            key: 'share',
            render: (val: number) => val.toFixed(2),
        },
        {
            title: '当前净值',
            key: 'currentPrice',
            render: (_: unknown, record: UserHolding) => {
                const quote = fundQuotes.get(record.fundCode);
                if (!quote) return '--';
                return (
                    <div>
                        <div>¥{quote.price.toFixed(4)}</div>
                        {quote.isEst && (
                            <Tag color="blue" style={{ fontSize: 10 }}>估值</Tag>
                        )}
                    </div>
                );
            },
        },
        {
            title: '涨跌幅',
            key: 'changeRate',
            render: (_: unknown, record: UserHolding) => {
                const quote = fundQuotes.get(record.fundCode);
                if (!quote) return '--';
                const color = getProfitColor(quote.increaseRate);
                return (
                    <span style={{ color, fontWeight: 600 }}>
                        {quote.increaseRate >= 0 ? '+' : ''}{quote.increaseRate.toFixed(2)}%
                    </span>
                );
            },
        },
        {
            title: '持仓市值',
            key: 'marketValue',
            render: (_: unknown, record: UserHolding) => {
                const quote = fundQuotes.get(record.fundCode);
                if (!quote) return '--';
                const value = profitCalculator.calculateMarketValue(record, quote.price);
                return `¥${value.toFixed(2)}`;
            },
        },
        {
            title: '持仓收益',
            key: 'profit',
            render: (_: unknown, record: UserHolding) => {
                const quote = fundQuotes.get(record.fundCode);
                if (!quote) return '--';
                const profit = profitCalculator.calculateProfit(record, quote.price);
                const rate = profitCalculator.calculateProfitRate(record, quote.price);
                const color = getProfitColor(profit);
                return (
                    <span style={{ color, fontWeight: 600 }}>
                        {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)} ({rate.toFixed(2)}%)
                    </span>
                );
            },
        },
    ], [fundQuotes, getProfitColor]);

    // 股票持仓列表列定义
    const stockColumns = useMemo(() => [
        {
            title: '股票名称',
            dataIndex: 'stockName',
            key: 'stockName',
            render: (_: unknown, record: UserStockHolding) => (
                <StockRow record={record} />
            ),
        },
        {
            title: '持有数量',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (val: number) => val.toFixed(0),
        },
        {
            title: '当前价格',
            key: 'currentPrice',
            render: (_: unknown, record: UserStockHolding) => {
                const quote = stockQuotes.get(record.stockCode);
                if (!quote) return '--';
                return `¥${quote.price.toFixed(3)}`;
            },
        },
        {
            title: '涨跌幅',
            key: 'changeRate',
            render: (_: unknown, record: UserStockHolding) => {
                const quote = stockQuotes.get(record.stockCode);
                if (!quote) return '--';
                const color = getProfitColor(quote.increaseRate);
                return (
                    <span style={{ color, fontWeight: 600 }}>
                        {quote.increaseRate >= 0 ? '+' : ''}{quote.increaseRate.toFixed(2)}%
                    </span>
                );
            },
        },
        {
            title: '持仓市值',
            key: 'marketValue',
            render: (_: unknown, record: UserStockHolding) => {
                const quote = stockQuotes.get(record.stockCode);
                const price = quote?.price || record.costPrice;
                const value = price * record.quantity;
                return `¥${value.toFixed(2)}`;
            },
        },
        {
            title: '持仓收益',
            key: 'profit',
            render: (_: unknown, record: UserStockHolding) => {
                const quote = stockQuotes.get(record.stockCode);
                const currentPrice = quote?.price || record.costPrice;
                const profit = (currentPrice - record.costPrice) * record.quantity;
                const rate = record.costPrice > 0 
                    ? ((currentPrice - record.costPrice) / record.costPrice) * 100 
                    : 0;
                const color = getProfitColor(profit);
                return (
                    <span style={{ color, fontWeight: 600 }}>
                        {profit >= 0 ? '+' : ''}¥{profit.toFixed(2)} ({rate.toFixed(2)}%)
                    </span>
                );
            },
        },
    ], [stockQuotes, getProfitColor]);

    if (fundLoading) {
        return (
            <div className="loading-container">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <div className="page-header">
                <h1 className="page-title">
                    <FundOutlined style={{ marginRight: 12 }} />
                    仪表盘
                </h1>
            </div>

            {/* 统计卡片 - 合并显示 */}
            <Row gutter={[16, 16]} className="dashboard-stats">
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        className="stat-card" 
                        variant="borderless"
                        hoverable
                        style={{
                            transition: 'all 0.3s ease',
                            borderRadius: 12,
                            overflow: 'hidden',
                        }}
                    >
                        <div className="stat-card-content">
                            <div className="stat-card-title">总资产</div>
                            <div className="stat-card-value">
                                ¥{combinedStats.totalAsset.toFixed(2)}
                            </div>
                            <div className="stat-card-subtitle">
                                基金: ¥{combinedStats.fundAsset.toFixed(2)} | 股票: ¥{combinedStats.stockAsset.toFixed(2)}
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        className="stat-card" 
                        variant="borderless"
                        hoverable
                        style={{
                            transition: 'all 0.3s ease',
                            borderRadius: 12,
                            overflow: 'hidden',
                        }}
                    >
                        <div className="stat-card-content">
                            <div className="stat-card-title">总收益</div>
                            <div 
                                className="stat-card-value" 
                                style={{ color: getProfitColor(combinedStats.totalProfit) }}
                            >
                                {combinedStats.totalProfit >= 0 ? '+' : ''}¥{combinedStats.totalProfit.toFixed(2)}
                            </div>
                            <div className="stat-card-subtitle">
                                收益率: {combinedStats.totalProfitRate.toFixed(2)}%
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        className="stat-card" 
                        variant="borderless"
                        hoverable
                        style={{
                            transition: 'all 0.3s ease',
                            borderRadius: 12,
                            overflow: 'hidden',
                        }}
                    >
                        <div className="stat-card-content">
                            <div className="stat-card-title">总收益率</div>
                            <div 
                                className="stat-card-value" 
                                style={{ color: getProfitColor(combinedStats.totalProfitRate) }}
                            >
                                {combinedStats.totalProfitRate.toFixed(2)}%
                            </div>
                            <div className="stat-card-subtitle">
                                {combinedStats.totalProfitRate >= 0 ? '盈利' : '亏损'}
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card 
                        className="stat-card" 
                        variant="borderless"
                        hoverable
                        style={{
                            transition: 'all 0.3s ease',
                            borderRadius: 12,
                            overflow: 'hidden',
                        }}
                    >
                        <div className="stat-card-content">
                            <div className="stat-card-title">今日收益</div>
                            <div 
                                className="stat-card-value" 
                                style={{ color: getProfitColor(combinedStats.totalDayProfit) }}
                            >
                                {combinedStats.totalDayProfit >= 0 ? '+' : ''}¥{combinedStats.totalDayProfit.toFixed(2)}
                            </div>
                            <div className="stat-card-subtitle">
                                {combinedStats.totalDayProfit >= 0 ? '上涨' : '下跌'}
                            </div>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* 持仓列表 - 使用 Tabs 切换基金和股票 */}
            <Card 
                className="dashboard-holdings-card" 
                variant="borderless"
                title={
                    <span style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600 }}>
                        <WalletOutlined style={{ marginRight: 8 }} />
                        我的持仓
                    </span>
                }
            >
                <Tabs
                    items={[
                        {
                            key: 'funds',
                            label: (
                                <span>
                                    <FundOutlined style={{ marginRight: 6 }} />
                                    基金持仓 ({fundHoldings.length})
                                </span>
                            ),
                            children: fundHoldings.length === 0 ? (
                                <Empty 
                                    description="暂无基金持仓" 
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            ) : (
                                <Table
                                    columns={fundColumns}
                                    dataSource={fundHoldings}
                                    rowKey="id"
                                    pagination={false}
                                    size="middle"
                                    scroll={{ x: 800 }}
                                />
                            ),
                        },
                        {
                            key: 'stocks',
                            label: (
                                <span>
                                    <StockOutlined style={{ marginRight: 6 }} />
                                    股票持仓 ({stockHoldings.length})
                                </span>
                            ),
                            children: stockHoldings.length === 0 ? (
                                <Empty 
                                    description="暂无股票持仓" 
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                />
                            ) : (
                                <Table
                                    columns={stockColumns}
                                    dataSource={stockHoldings}
                                    rowKey="id"
                                    pagination={false}
                                    size="middle"
                                    scroll={{ x: 800 }}
                                />
                            ),
                        },
                    ]}
                />
            </Card>
        </div>
    );
});

Dashboard.displayName = 'Dashboard';
