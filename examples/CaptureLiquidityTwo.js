const TradingView = require('../main');

const VALID_TIMEFRAMES = ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'];
let timeframe = process.argv[2] || '1';

if (!VALID_TIMEFRAMES.includes(timeframe)) {
    console.warn(`⚠️  Invalid timeframe: ${timeframe}`);
    timeframe = '1';
}

const client = new TradingView.Client();
const chart = new client.Session.Chart();

let priceHistory = [];
let liquidityZones = {};

chart.setMarket('BTCUSD', {
    timeframe: timeframe,
});

chart.onError((...err) => {
    console.error('❌ Chart error:', ...err);
});

chart.onSymbolLoaded(() => {
    console.log(`\n📊 ${chart.infos.description} with Liquidity Analysis`);
    console.log(`Timeframe: ${timeframe}`);
    console.log('─'.repeat(60));
});

function roundToLiquidity(price, precision = 100) {
    return Math.round(price / precision) * precision;
}

// Analyze historical price data to find liquidity zones
function analyzePriceHistory() {
    if (priceHistory.length === 0) return;

    const newZones = {};

    // Analyze all prices, highs, lows from history
    priceHistory.forEach(candle => {
        [candle.price, candle.high, candle.low].forEach(price => {
            const level = roundToLiquidity(price);
            newZones[level] = (newZones[level] || 0) + 1;
        });
    });

    return newZones;
}

chart.onUpdate(() => {
    if (!chart.periods[0]) return;

    const candle = chart.periods[0];
    const close = candle?.close ?? null;
    const high = candle?.high ?? null;
    const low = candle?.low ?? null;
    const open = candle?.open ?? null;

    if (!close || !high || !low) return;

    const timestamp = new Date().toLocaleTimeString();

    priceHistory.push({ price: close, high, low, time: timestamp, open });

    const previousPrice = priceHistory.length > 1
        ? priceHistory[priceHistory.length - 2].price
        : close;
    const change = ((close - previousPrice) / previousPrice * 100).toFixed(2);
    const changeSymbol = close >= previousPrice ? '📈' : '📉';

    console.log(
        `${changeSymbol} [${timestamp}] $${close.toFixed(2)} High: $${high.toFixed(2)} Low: $${low.toFixed(2)} (${change > 0 ? '+' : ''}${change}%)`
    );

    // Analyze and show liquidity zones every 15 updates
    if (priceHistory.length % 15 === 0) {
        liquidityZones = analyzePriceHistory();
        
        console.log(`\n💧 Liquidity Zones from ${priceHistory.length} candles:`);

        const sortedZones = Object.entries(liquidityZones)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        sortedZones.forEach(([level, count]) => {
            const bar = '█'.repeat(Math.min(count, 20));
            console.log(`   $${parseFloat(level).toFixed(0).padEnd(10)} ${bar} (${count} touches)`);
        });

        console.log('─'.repeat(60));
    }
});

setTimeout(() => {
    liquidityZones = analyzePriceHistory();
    
    console.log('\n\n📈 Final Liquidity Report from Historical Data:');
    console.log(`Total candles analyzed: ${priceHistory.length}`);

    const prices = priceHistory.map(p => p.price);
    console.log(`Highest: $${Math.max(...prices).toFixed(2)}`);
    console.log(`Lowest: $${Math.min(...prices).toFixed(2)}`);

    console.log(`\n💧 Top 10 Liquidity Zones from History:`);
    Object.entries(liquidityZones)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .forEach(([level, count]) => {
            const bar = '█'.repeat(Math.min(count, 30));
            console.log(`   $${parseFloat(level).toFixed(0).padEnd(10)} ${bar} (${count} interactions)`);
        });

    chart.delete();
    client.end();
}, 600000);