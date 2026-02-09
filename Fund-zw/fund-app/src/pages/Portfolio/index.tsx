import React, { useState } from 'react';
import { Tabs } from 'antd';
import { WalletOutlined, StockOutlined, FolderOutlined } from '@ant-design/icons';
import { FundPortfolio } from './FundPortfolio';
import { StockPortfolio } from './StockPortfolio';
import { GroupManager } from '../../components/GroupManager';

// 重新导出组件
export { FundPortfolio, StockPortfolio };

export const Portfolio: React.FC = () => {
    const [activeTab, setActiveTab] = useState('funds');

    return (
        <div className="animate-fade-in">
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'funds',
                        label: (
                            <span>
                                <WalletOutlined style={{ marginRight: 8 }} />
                                基金持仓
                            </span>
                        ),
                        children: <FundPortfolio />,
                    },
                    {
                        key: 'stocks',
                        label: (
                            <span>
                                <StockOutlined style={{ marginRight: 8 }} />
                                股票持仓
                            </span>
                        ),
                        children: <StockPortfolio />,
                    },
                    {
                        key: 'groups',
                        label: (
                            <span>
                                <FolderOutlined style={{ marginRight: 8 }} />
                                分组管理
                            </span>
                        ),
                        children: <GroupManager />,
                    },
                ]}
            />
        </div>
    );
};
