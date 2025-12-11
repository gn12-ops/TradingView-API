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
let liquidityZones = {}; // Price levels where volume concentrates

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

// Function to round price to nearest liquidity level (round numbers)
function roundToLiquidity(price, precision = 100) {
  return Math.round(price / precision) * precision;
}

// Function to detect liquidity zones
function updateLiquidityZones(high, low, close) {
  const level = roundToLiquidity(close);
  
  liquidityZones[level] = (liquidityZones[level] || 0) + 1;
}

chart.onUpdate(() => {
  if (!chart.periods[0]) return;

  const { close, open, high, low } = chart.periods[0];
  const timestamp = new Date().toLocaleTimeString();
  
  priceHistory.push({ price: close, high, low, time: timestamp, open });
  updateLiquidityZones(high, low, close);

  const previousPrice = priceHistory.length > 1 
    ? priceHistory[priceHistory.length - 2].price 
    : close;
  const change = ((close - previousPrice) / previousPrice * 100).toFixed(2);
  const changeSymbol = close >= previousPrice ? '📈' : '📉';

  console.log(
    `${changeSymbol} [${timestamp}] $${close.toFixed(2)} High: $${high.toFixed(2)} Low: $${low.toFixed(2)} (${change > 0 ? '+' : ''}${change}%)`
  );

  // Show liquidity zones every 15 updates
  if (priceHistory.length % 15 === 0) {
    console.log(`\n💧 Liquidity Zones (${priceHistory.length} candles):`);
    
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
  console.log('\n\n📈 Final Liquidity Report:');
  console.log(`Total candles: ${priceHistory.length}`);
  
  const prices = priceHistory.map(p => p.price);
  console.log(`Highest: $${Math.max(...prices).toFixed(2)}`);
  console.log(`Lowest: $${Math.min(...prices).toFixed(2)}`);
  
  console.log(`\n💧 Top 10 Liquidity Zones:`);
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