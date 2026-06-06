const express = require('express');
const router = express.Router();
const Contract = require('../models/Contract');
const ChangeRecord = require('../models/ChangeRecord');
const PaymentPlan = require('../models/PaymentPlan');
const CleanupLog = require('../models/CleanupLog');
const moment = require('moment');

router.get('/', async (req, res) => {
  try {
    const { type, status, minAmount, maxAmount, expiryStart, expiryEnd, sortBy, order, keyword } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (status) filter.status = status;
    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }
    if (expiryStart || expiryEnd) {
      filter.expiryDate = {};
      if (expiryStart) filter.expiryDate.$gte = new Date(expiryStart);
      if (expiryEnd) filter.expiryDate.$lte = new Date(expiryEnd);
    }
    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: 'i' } },
        { contractNo: { $regex: keyword, $options: 'i' } },
        { 'partyA.name': { $regex: keyword, $options: 'i' } },
        { 'partyB.name': { $regex: keyword, $options: 'i' } }
      ];
    }

    const sort = {};
    if (sortBy) sort[sortBy] = order === 'desc' ? -1 : 1;
    else sort.createdAt = -1;

    const contracts = await Contract.find(filter).sort(sort);
    res.json({ success: true, data: contracts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/recycle', async (req, res) => {
  try {
    const contracts = await Contract.find({ isDeleted: true }).setOptions({ includeDeleted: true }).sort({ deletedAt: -1 });
    const data = contracts.map(c => {
      const obj = c.toObject();
      const daysLeft = 30 - moment().diff(moment(c.deletedAt), 'days');
      obj.daysLeft = Math.max(0, daysLeft);
      obj.willExpire = daysLeft <= 0;
      return obj;
    });
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/recycle/count', async (req, res) => {
  try {
    const count = await Contract.countDocuments({ isDeleted: true }).setOptions({ includeDeleted: true });
    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: '合同不存在' });
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const contract = new Contract(req.body);
    await contract.save();
    res.status(201).json({ success: true, data: contract });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!contract) return res.status(404).json({ success: false, message: '合同不存在' });
    res.json({ success: true, data: contract });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );
    if (!contract) return res.status(404).json({ success: false, message: '合同不存在' });

    const now = new Date();
    await PaymentPlan.updateMany(
      { contractId: contract._id },
      { isDeleted: true, deletedAt: now }
    );
    await ChangeRecord.updateMany(
      { contractId: contract._id },
      { isDeleted: true, deletedAt: now }
    );

    res.json({ success: true, message: '合同已移入回收站，将保留30天' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/recycle/restore/:id', async (req, res) => {
  try {
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    ).setOptions({ includeDeleted: true });
    if (!contract) {
      return res.status(404).json({ success: false, message: '合同不存在或未在回收站中' });
    }

    await PaymentPlan.updateMany(
      { contractId: contract._id },
      { isDeleted: false, deletedAt: null }
    ).setOptions({ includeDeleted: true });
    await ChangeRecord.updateMany(
      { contractId: contract._id },
      { isDeleted: false, deletedAt: null }
    ).setOptions({ includeDeleted: true });

    res.json({ success: true, message: '合同及关联的付款计划、变更记录已恢复' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/recycle/permanent/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).setOptions({ includeDeleted: true });
    if (!contract || !contract.isDeleted) {
      return res.status(404).json({ success: false, message: '合同不存在或未在回收站中' });
    }

    const paymentCount = await PaymentPlan.countDocuments({ contractId: contract._id }).setOptions({ includeDeleted: true });
    const changeCount = await ChangeRecord.countDocuments({ contractId: contract._id }).setOptions({ includeDeleted: true });

    await PaymentPlan.deleteMany({ contractId: contract._id }).setOptions({ includeDeleted: true });
    await ChangeRecord.deleteMany({ contractId: contract._id }).setOptions({ includeDeleted: true });
    await Contract.findByIdAndDelete(contract._id).setOptions({ includeDeleted: true });

    await CleanupLog.create({
      contractId: contract._id,
      contractNo: contract.contractNo,
      contractName: contract.name,
      deletedPaymentCount: paymentCount,
      deletedChangeCount: changeCount,
      cleanupType: 'manual',
      cleanedBy: req.body.cleanedBy || '系统管理员'
    });

    res.json({ success: true, message: '合同及其关联数据已彻底删除' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/recycle/empty', async (req, res) => {
  try {
    const contracts = await Contract.find({ isDeleted: true }).setOptions({ includeDeleted: true });
    let totalPayments = 0;
    let totalChanges = 0;

    for (const contract of contracts) {
      const paymentCount = await PaymentPlan.countDocuments({ contractId: contract._id }).setOptions({ includeDeleted: true });
      const changeCount = await ChangeRecord.countDocuments({ contractId: contract._id }).setOptions({ includeDeleted: true });
      totalPayments += paymentCount;
      totalChanges += changeCount;

      await PaymentPlan.deleteMany({ contractId: contract._id }).setOptions({ includeDeleted: true });
      await ChangeRecord.deleteMany({ contractId: contract._id }).setOptions({ includeDeleted: true });

      await CleanupLog.create({
        contractId: contract._id,
        contractNo: contract.contractNo,
        contractName: contract.name,
        deletedPaymentCount: paymentCount,
        deletedChangeCount: changeCount,
        cleanupType: 'manual',
        cleanedBy: req.body.cleanedBy || '系统管理员'
      });
    }

    await Contract.deleteMany({ isDeleted: true }).setOptions({ includeDeleted: true });

    res.json({
      success: true,
      message: `回收站已清空，共删除 ${contracts.length} 个合同、${totalPayments} 条付款计划、${totalChanges} 条变更记录`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/import', async (req, res) => {
  try {
    const { contracts } = req.body;
    const result = await Contract.insertMany(contracts, { ordered: false });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
