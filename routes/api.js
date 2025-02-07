// I have utilized ChatGPT a resource for guidance and learning throughout this project. My approach reflects the growing trend of modern developers using AI tools to enhance their coding processes. However, all the final code presented here is my own work, based on own independently thought out prompts and without copying prompts or code from others other than snippets. I believe this practice aligns with the principles of academic honesty, as it emphasizes learning and using technology responsibly.

'use strict';
const axios = require('axios');
const mongoose = require('mongoose');
const helmet = require('helmet');
const express = require('express');

const stockSchema = new mongoose.Schema({
  stock: String,
  likes: { type: Number, default: 0 },
  ips: [String],
});
const Stock = mongoose.model('Stock', stockSchema);

module.exports = function (app) {
  app.use(helmet());
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  }));

  app.route('/api/stock-prices').get(async function (req, res) {
    try {
      let { stock, like } = req.query;
      const ip = req.ip.replace(/\.[0-9]+$/, '.0'); // Anonymizing IP
      
      if (!stock) {
        return res.status(400).json({ error: 'Stock query is required' });
      }
  
      const stocks = Array.isArray(stock) ? stock : [stock];
  
      const stockData = await Promise.all(stocks.map(async (ticker) => {
        try {
          const stockRes = await axios.get(`https://stock-price-checker-proxy.freecodecamp.rocks/v1/stock/${ticker}/quote`);
          if (!stockRes.data || !stockRes.data.symbol) {
            return { error: `Invalid stock: ${ticker}` };
          }
  
          let stockDoc = await Stock.findOne({ stock: ticker });
          if (!stockDoc) {
            stockDoc = new Stock({ stock: ticker });
          }
  
          if (like === 'true' && !stockDoc.ips.includes(ip)) {
            stockDoc.likes += 1;
            stockDoc.ips.push(ip);
            await stockDoc.save();
          }
  
          return { stock: stockDoc.stock, price: stockRes.data.latestPrice, likes: stockDoc.likes };
        } catch (err) {
          console.error(`Error fetching stock data for ${ticker}:`, err.message);
          return { error: `Failed to retrieve stock data for ${ticker}` };
        }
      }));
  
      if (stockData.length === 2) {
        stockData[0].rel_likes = stockData[0].likes - stockData[1].likes;
        stockData[1].rel_likes = stockData[1].likes - stockData[0].likes;
        delete stockData[0].likes;
        delete stockData[1].likes;
      }
  
      res.json({ stockData: stockData.length === 1 ? stockData[0] : stockData });
    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });
  
};
