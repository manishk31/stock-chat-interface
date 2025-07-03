# Stock Chat Interface 🚀

A comprehensive stock analysis and portfolio management interface built with Next.js, featuring AI-powered insights, real-time data, and interactive charts.

## ✨ Features

### 🤖 AI-Powered Stock Analysis
- **Intelligent Insights**: Get detailed stock analysis using OpenAI GPT
- **Sentiment Analysis**: Analyze news sentiment for stocks
- **Historical Data**: Access 6 months of historical stock data
- **PDF Export**: Download insights as PDF reports

### 📊 Portfolio Management
- **Portfolio Tracking**: Add and track your stock positions
- **Performance Analytics**: Real-time P&L calculations
- **Risk Metrics**: Volatility, Beta, and Sharpe ratio analysis
- **Smart Recommendations**: AI-powered portfolio optimization suggestions
- **Sector Breakdown**: Visualize your sector allocation

### 👀 Watchlist
- **Stock Watchlist**: Track stocks you're interested in
- **Real-time Updates**: Get current prices and changes
- **Quick Add**: Easily add stocks to your watchlist

### 📈 Interactive Charts
- **Price History**: Visualize stock price trends
- **Technical Indicators**: RSI, PE Ratio, and more
- **Responsive Design**: Charts work on all devices

### 💬 Chat Interface
- **Natural Language**: Ask questions in plain English
- **Command System**: Use slash commands for quick actions
- **Conversation History**: Keep track of all your queries
- **Floating Chat Bot**: Always accessible interface

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set Environment Variables**
   ```bash
   # Create .env.local file
   OPENAI_API_KEY=your_openai_api_key_here
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📝 Usage Guide

### Chat Commands

#### Portfolio Management
- `/portfolio` - View your portfolio summary
- `/add SYMBOL SHARES PRICE` - Add stocks to portfolio
  - Example: `/add AAPL 10 150.50`
- `/watch SYMBOL` - Add stock to watchlist
  - Example: `/watch TSLA`

#### Stock Analysis
- Simply type a stock symbol or company name
- Ask questions like "Analyze INFOSYS" or "What's the outlook for TCS?"

### Tab Navigation

1. **💬 Chat Tab**: Main AI analysis and insights
2. **📊 Portfolio Tab**: Portfolio management and analytics
3. **👀 Watchlist Tab**: Track stocks of interest
4. **📈 Charts Tab**: Interactive price charts

## 🔧 API Endpoints

### Stock Data API
- `GET /api/stock?symbol=SYMBOL` - Get current stock data
- `GET /api/stock?symbol=SYMBOL&history=1` - Get historical data
- `GET /api/stock?symbol=SYMBOL&realtime=1` - Get real-time updates
- `GET /api/stock?symbol=SYMBOL&sentiment=1` - Get sentiment analysis

### Insights API
- `POST /api/insights` - Generate AI-powered stock insights
- Supports individual stock analysis and advanced screening

### Portfolio API
- `POST /api/portfolio` - Analyze portfolio performance
- Returns risk metrics, recommendations, and analytics

### Sentiment API
- `POST /api/sentiment` - Analyze news sentiment for stocks

## 🎨 Features in Detail

### AI Insights
The system uses OpenAI's GPT model to provide:
- **Fundamental Analysis**: PE ratios, ROE, debt levels
- **Technical Analysis**: RSI, price trends, support/resistance
- **Market Sentiment**: News analysis and social sentiment
- **Investment Recommendations**: Buy/sell/hold suggestions

### Portfolio Analytics
Advanced portfolio analysis including:
- **Performance Metrics**: Total return, individual stock performance
- **Risk Assessment**: Volatility, beta, Sharpe ratio
- **Diversification Analysis**: Sector allocation, concentration risk
- **Smart Recommendations**: AI-powered optimization suggestions

### Real-time Data
- **Live Prices**: Current stock prices and changes
- **Historical Trends**: 6 months of price history
- **Technical Indicators**: RSI, PE ratios, market cap
- **Market Data**: Volume, market cap, institutional holdings

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: CSS Modules with responsive design
- **Charts**: Chart.js with react-chartjs-2
- **AI**: OpenAI GPT API
- **Data**: Google Cloud Storage
- **PDF Export**: html2pdf.js
- **Search**: Fuse.js for fuzzy search

## 📱 Responsive Design

The interface is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones
- All modern browsers

## 🔒 Data Privacy

- All data is stored locally in your browser
- No personal information is sent to external servers
- Stock data comes from public APIs
- AI analysis is processed securely

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables
4. Deploy automatically

### Other Platforms
The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean
- AWS

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.

## 🆘 Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify your OpenAI API key is set correctly
3. Ensure you have a stable internet connection
4. Try refreshing the page

## 🎯 Roadmap

- [ ] Real-time price alerts
- [ ] Advanced technical indicators
- [ ] Social sentiment analysis
- [ ] Portfolio backtesting
- [ ] Mobile app version
- [ ] Multi-currency support
- [ ] Options analysis
- [ ] Cryptocurrency support

---

**Happy Trading! 📈💰**
