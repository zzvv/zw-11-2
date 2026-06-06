const mongoose = require('mongoose');

const changeRecordSchema = new mongoose.Schema({
  contractId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contract', required: true },
  changeType: { type: String, enum: ['金额调整', '延期', '补充协议', '终止'], required: true },
  version: { type: Number, required: true },
  previousVersion: { type: Number, required: true },
  changes: {
    field: { type: String },
    oldValue: { type: mongoose.Schema.Types.Mixed },
    newValue: { type: mongoose.Schema.Types.Mixed }
  },
  reason: { type: String, required: true },
  changedBy: { type: String, required: true },
  changedAt: { type: Date, default: Date.now },
  snapshot: { type: mongoose.Schema.Types.Mixed },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date }
}, { timestamps: true });

changeRecordSchema.pre(/^find/, function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

changeRecordSchema.pre('countDocuments', function(next) {
  if (!this.getOptions().includeDeleted) {
    this.where({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model('ChangeRecord', changeRecordSchema);
