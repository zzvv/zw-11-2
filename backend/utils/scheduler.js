const cron = require('node-cron');
const moment = require('moment');
const Contract = require('../models/Contract');
const PaymentPlan = require('../models/PaymentPlan');
const ChangeRecord = require('../models/ChangeRecord');
const CleanupLog = require('../models/CleanupLog');

const startScheduler = () => {
  cron.schedule('0 9 * * *', async () => {
    console.log('[' + new Date().toISOString() + '] 执行定时提醒任务...');
    const now = new Date();

    await PaymentPlan.updateMany(
      { status: '待付款', dueDate: { $lt: now } },
      { status: '已逾期' }
    );

    await Contract.updateMany(
      { status: '执行中', expiryDate: { $lt: now } },
      { status: '已到期' }
    );

    const d30 = moment().add(30, 'days').toDate();
    const d60 = moment().add(60, 'days').toDate();
    const d90 = moment().add(90, 'days').toDate();

    await Contract.updateMany(
      { status: '执行中', expiryDate: { $lte: d30, $gt: now } },
      { alertSent30: true }
    );
    await Contract.updateMany(
      { status: '执行中', expiryDate: { $lte: d60, $gt: d30 } },
      { alertSent60: true }
    );
    await Contract.updateMany(
      { status: '执行中', expiryDate: { $lte: d90, $gt: d60 } },
      { alertSent90: true }
    );

    const d7 = moment().add(7, 'days').toDate();
    await PaymentPlan.updateMany(
      { status: '待付款', dueDate: { $lte: d7, $gt: now } },
      { alertSent7: true }
    );

    console.log('定时提醒任务执行完成');

    console.log('[' + new Date().toISOString() + '] 执行回收站自动清理任务...');
    const expireDate = moment().subtract(30, 'days').toDate();
    const expiredContracts = await Contract.find({
      isDeleted: true,
      deletedAt: { $lte: expireDate }
    }).setOptions({ includeDeleted: true });

    let cleanedCount = 0;
    for (const contract of expiredContracts) {
      const paymentCount = await PaymentPlan.countDocuments({ contractId: contract._id });
      const changeCount = await ChangeRecord.countDocuments({ contractId: contract._id });

      await PaymentPlan.deleteMany({ contractId: contract._id });
      await ChangeRecord.deleteMany({ contractId: contract._id });
      await Contract.findByIdAndDelete(contract._id).setOptions({ includeDeleted: true });

      await CleanupLog.create({
        contractId: contract._id,
        contractNo: contract.contractNo,
        contractName: contract.name,
        deletedPaymentCount: paymentCount,
        deletedChangeCount: changeCount,
        cleanupType: 'auto',
        cleanedBy: '系统自动清理'
      });
      cleanedCount++;
    }

    console.log(`回收站自动清理完成，共清理 ${cleanedCount} 个过期合同`);
  });
};

module.exports = { startScheduler };
