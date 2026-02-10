import axios from 'axios';
import type { FundInfo, FundQuote } from '../../models';
import { API_CONFIG } from '../../config';

// 缓存配置
interface CacheItem<T> {
    data: T;
    timestamp: number;
}

/**
 * 基金 API 服务
 */
export class FundApiService {
    private cache = new Map<string, CacheItem<FundQuote>>();
    private cacheExpiry = 60000; // 缓存过期时间 (ms)

    /**
     * 检查缓存是否有效
     */
    private isCacheValid(key: string): boolean {
        const item = this.cache.get(key);
        if (!item) return false;
        return Date.now() - item.timestamp < this.cacheExpiry;
    }

    /**
     * 获取基金实时行情 (通过 JSONP)
     * 天天基金网接口: https://fundgz.1234567.com.cn/js/{code}.js
     */
    async getRealTimeQuote(code: string): Promise<FundQuote | null> {
        // 检查缓存
        const cacheKey = `fund_${code}`;
        if (this.isCacheValid(cacheKey)) {
            return this.cache.get(cacheKey)?.data || null;
        }

        try {
            const url = `${API_CONFIG.EASTMONEY_FUND_DETAIL}${code}.js`;
            const response = await axios.get(url, {
                transformResponse: [(data) => {
                    // 解析 JSONP 格式: jsonpgz({"fundcode":"000001",...})
                    const match = data.match(/jsonpgz\((.*)\)/);
                    if (match && match[1]) {
                        return JSON.parse(match[1]);
                    }
                    return null;
                }],
                timeout: 10000, // 添加超时
            });

            const data = response.data;
            if (!data) return null;

            const quote: FundQuote = {
                code: data.fundcode,
                price: parseFloat(data.gsz || data.dwjz || '0'),
                increaseRate: parseFloat(data.gszzl || '0'),
                increaseAmount: parseFloat(data.gsz || '0') - parseFloat(data.dwjz || '0'),
                navTime: data.gztime || data.jzrq || '',
                preClose: parseFloat(data.dwjz || '0'),
                isEst: !!data.gsz, // 有估值则为 true
            };

            // 更新缓存
            this.cache.set(cacheKey, {
                data: quote,
                timestamp: Date.now(),
            });

            return quote;
        } catch (error) {
            console.error(`获取基金 ${code} 行情失败:`, error);
            // 尝试从缓存返回
            return this.cache.get(cacheKey)?.data || null;
        }
    }

    /**
     * 批量获取实时行情
     */
    async getRealTimeQuotes(codes: string[]): Promise<Map<string, FundQuote>> {
        const results = new Map<string, FundQuote>();
        const requests: string[] = [];

        // 分离需要请求和从缓存获取的代码
        codes.forEach(code => {
            const cacheKey = `fund_${code}`;
            if (this.isCacheValid(cacheKey)) {
                const cachedData = this.cache.get(cacheKey)?.data;
                if (cachedData) {
                    results.set(code, cachedData);
                }
            } else {
                requests.push(code);
            }
        });

        // 并发请求所有需要的基金，每批最多 10 个
        const batchSize = 10;
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const promises = batch.map(code => this.getRealTimeQuote(code));
            const quotes = await Promise.all(promises);

            quotes.forEach((quote, index) => {
                if (quote) {
                    results.set(batch[index], quote);
                }
            });
        }

        return results;
    }

    /**
     * 搜索基金 (简化版，实际可对接更完整的搜索 API)
     */
    async searchFunds(): Promise<FundInfo[]> {
        // TODO: 对接真实的基金搜索 API
        // 这里返回模拟数据作为示例
        console.warn('搜索功能暂未实现，请手动输入基金代码');
        return [];
    }

    /**
     * 获取基金详情
     */
    async getFundDetail(code: string): Promise<FundInfo | null> {
        try {
            const url = `${API_CONFIG.EASTMONEY_FUND_DETAIL}${code}.js`;
            const response = await axios.get(url, {
                transformResponse: [(data) => {
                    // 解析 JSONP 格式: jsonpgz({"fundcode":"000001",...})
                    const match = data.match(/jsonpgz\((.*)\)/);
                    if (match && match[1]) {
                        return JSON.parse(match[1]);
                    }
                    return null;
                }]
            });

            const data = response.data;
            if (!data) return null;

            // 从API响应中提取基金信息
            return {
                code: data.fundcode,
                name: data.name || `基金${data.fundcode}`, // 使用API返回的真实名称
                type: '混合型', // API中没有类型信息,使用默认值
                updateTime: Date.now(),
            };
        } catch (error) {
            console.error(`获取基金 ${code} 详情失败:`, error);
            return null;
        }
    }
}

export const fundApiService = new FundApiService();
