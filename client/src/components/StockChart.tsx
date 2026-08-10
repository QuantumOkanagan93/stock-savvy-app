import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface StockChartProps {
    candles: { timestamp: number; close: number }[];
}

export default function StockChart({ candles }: StockChartProps) {
    if (!candles || candles.length === 0) {
        return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No chart data available</div>;
    }

    // Format data for the chart
    const data = candles.map((c) => ({
        date: new Date(c.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: c.close,
    }));

    // Color: Green if last price > first price, Red if lower
    const firstPrice = data[0]?.price || 0;
    const lastPrice = data[data.length - 1]?.price || 0;
    const chartColor = lastPrice >= firstPrice ? '#2e7d32' : '#c62828'; // Matches your CSS vars

    return (
        <div style={{ width: '100%', height: '220px', marginTop: 'var(--space-4)' }}>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#888' }}
                        axisLine={false}
                        tickLine={false}
                        minTickGap={20}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 10, fill: '#888' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(value) => `$${value}`}
                        width={45}
                    />
                    <Tooltip
                        formatter={(value: any) => {
                            if (typeof value !== 'number') return ['$0.00', 'Price'];
                            return [`$${value.toFixed(2)}`, 'Price'];
                        }}
                        labelFormatter={(label) => `Date: ${label}`}
                        contentStyle={{ borderRadius: '6px', border: '1px solid #e0e0e0', fontSize: '0.8rem' }}
                    />
                    <Area
                        type="monotone"
                        dataKey="price"
                        stroke={chartColor}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorPrice)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}