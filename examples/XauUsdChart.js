const TradingView = require('../main');

/**
 * Bitcoin price tracker - monitors BTC/USD prices in real-time
 * Usage: npm run example examples/BtcChart.js 1
 *        npm run example examples/BtcChart.js 5
 *        npm run example examples/BtcChart.js 15
 *        npm run example examples/BtcChart.js 30
 */

// Valid timeframes in TradingView
const VALID_TIMEFRAMES = ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'];

// Get timeframe from command line argument
let timeframe = process.argv[2] || '1';

// Validate timeframe
if (!VALID_TIMEFRAMES.includes(timeframe)) {
  console.warn(`⚠️  Invalid timeframe: ${timeframe}`);
  console.log(`Valid options: ${VALID_TIMEFRAMES.join(', ')}`);
  timeframe = '1';
  console.log(`Using default timeframe: ${timeframe}`);
}

const client = new TradingView.Client();
const chart = new client.Session.Chart();

let priceHistory = [];
let startTime = Date.now();

chart.setMarket('XAUUSD', {
  timeframe: timeframe,
});

chart.onError((...err) => {
  console.error('❌ Chart error:', ...err);
});

chart.onSymbolLoaded(() => {
  console.log(`\n📊 ${chart.infos.description} Price Tracker Started`);
  console.log(`Currency: ${chart.infos.currency_id}`);
  console.log(`Timeframe: ${timeframe}`);
  console.log('─'.repeat(50));
});

chart.onUpdate(() => {
  if (!chart.periods[0]) return;

  const currentPrice = chart.periods[0].close;
  const timestamp = new Date().toLocaleTimeString();
  
  priceHistory.push({
    price: currentPrice,
    time: timestamp,
    open: chart.periods[0].open,
    high: chart.periods[0].high,
    low: chart.periods[0].low,
  });

  // Display current price
  const previousPrice = priceHistory.length > 1 
    ? priceHistory[priceHistory.length - 2].price 
    : currentPrice;
  const change = ((currentPrice - previousPrice) / previousPrice * 100).toFixed(2);
  const changeSymbol = currentPrice >= previousPrice ? '📈' : '📉';

  console.log(
    `${changeSymbol} [${timestamp}] $${currentPrice.toFixed(2)} (${change > 0 ? '+' : ''}${change}%)`
  );

  // Show stats every 10 updates
  if (priceHistory.length % 10 === 0) {
    const prices = priceHistory.map(p => p.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const avg = (prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2);
    
    console.log(`\n📊 Stats (${priceHistory.length} candles):`);
    console.log(`   High: $${high.toFixed(2)} | Low: $${low.toFixed(2)} | Avg: $${avg}`);
    console.log('─'.repeat(50));
  }
});

// Run for 10 minutes
setTimeout(() => {
  console.log('\n\n📈 Final Report:');
  console.log(`Total candles tracked: ${priceHistory.length}`);
  console.log(`Highest: $${Math.max(...priceHistory.map(p => p.price)).toFixed(2)}`);
  console.log(`Lowest: $${Math.min(...priceHistory.map(p => p.price)).toFixed(2)}`);
  
  chart.delete();
  client.end();
}, 600000);