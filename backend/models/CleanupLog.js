const mongoose = require('mongoose');

const cleanupLogSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract' },
  contractNo: { type: String },
  contractName: { type: String },
  deletedPaymentCount: { type: Number, default: 0 },
  deletedChangeCount: { type: Number, default: 0 },
  cleanupType: { type: String, enum: ['manual', 'auto'], required: true },
  cleanedBy: { type: String },
  cleanedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('CleanupLog', cleanupLogSchema);
