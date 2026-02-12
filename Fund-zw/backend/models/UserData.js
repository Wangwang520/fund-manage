const mongoose = require('mongoose');

const userDataSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true
  },
  fundHoldings: [{
    id: String,
    fundCode: String,
    fundName: String,
    share: Number,
    costPrice: Number,
    addTime: Number,
    notes: String,
    groupId: String
  }],
  stockHoldings: [{
    id: String,
    stockCode: String,
    stockName: String,
    quantity: Number,
    costPrice: Number,
    addTime: Number,
    notes: String,
    groupId: String
  }],
  accountGroups: [{
    id: String,
    name: String,
    color: String,
    description: String,
    createdAt: Number,
    updatedAt: Number
  }],
  settings: {
    colorScheme: {
      type: String,
      default: 'red-green'
    },
    refreshInterval: {
      type: Number,
      default: 60000
    },
    lastSyncTime: {
      type: Number,
      default: null
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

const UserData = mongoose.model('UserData', userDataSchema);

module.exports = UserData;
