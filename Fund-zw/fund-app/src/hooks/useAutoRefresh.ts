import { useEffect, useRef } from 'react';
import { useFundStore } from '../store/fundStore';

/**
 * 自动刷新行情的 Hook
 */
export const useAutoRefresh = () => {
    const { refreshQuotes, holdings, settings } = useFundStore();
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (holdings.length === 0) return;

        // 立即刷新一次
        refreshQuotes();

        // 启动定时器，使用设置中的刷新间隔
        timerRef.current = setInterval(() => {
            refreshQuotes();
        }, settings.refreshInterval);

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, [holdings, refreshQuotes, settings.refreshInterval]);
};
