import { newTest, testResult, UnitTestResult } from "@mconnect/mctest";
import { auditDbLocal, dbOptionsLocal } from "../src/config/secure/config";
import { AuditLogParamsType, AuditLogTypes, AuditParamsType, LogRecordsType, newAuditLog, newDbMongo, } from "../src";

const tableName = "services"
const userId = "085f48c5-8763-4e22-a1c6-ac1a68ba07de"
const recs = {name: "Abi", desc: "Testing only", url: "localhost:9000", priority: 1, cost: 1000.00}
const newRecs = {
    name: "Abi Akindele", desc: "Testing only - updated", url: "localhost:9900", priority: 1, cost: 2000.00
}
const readP = {keywords: ["lagos", "nigeria", "ghana", "accra"]};

const dbc = newDbMongo(auditDbLocal, dbOptionsLocal);

(async () => {
    const dbHandle = await dbc.openDb()
    // expected db-connection result
    const mcLogResult = {auditDb: dbHandle, auditColl: "audits"};
    // audit-log instance
    const mcLog = newAuditLog(dbHandle, {auditTable: "audits"});

    const results: Array<UnitTestResult> = []

    const test1 = newTest({
        name: 'should connect to the DB and return an instance object',
    })
    test1.setTestFunction(() => {
        test1.assertEquals(mcLog.getAuditTable(), mcLogResult.auditColl, `audit-table should be: ${mcLogResult.auditColl}`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    const test2 = newTest({
        name: 'should store create-transaction log and return success:',
    })
    const logRecs2: LogRecordsType = {
        logRecords: recs,
    }
    const logParams2: AuditLogParamsType = {
        logRecords: logRecs2,
        tableName : tableName,
        logBy     : userId,
    }
    const res2 = await mcLog.createLog(userId, logParams2)
    test2.setTestFunction(async () => {
        test2.assertEquals(res2.code, "success", `res.Code should be: success`);
        test2.assertEquals(res2.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    const test3 = newTest({
        name: 'should store update-transaction log and return success:',
    })
    const logRecs3: LogRecordsType = {
        logRecords: recs,
    }
    const newLogRecs3: LogRecordsType = {
        logRecords: newRecs,
    }
    const logParams3: AuditLogParamsType = {
        logRecords   : logRecs3,
        newLogRecords: newLogRecs3,
        tableName    : tableName,
        logBy        : userId,
    }
    const res3 = await mcLog.updateLog(userId, logParams3)
    test3.setTestFunction(async () => {
        test3.assertEquals(res3.code, "success", `res.Code should be: success`);
        test3.assertEquals(res3.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test3Result = test3.runTest()
    results.push(test3Result)

    const test4 = newTest({
        name: 'should store read-transaction log and return success:',
    })
    const logRecs4: LogRecordsType = {
        logRecords: readP,
    }
    const logParams4: AuditLogParamsType = {
        logRecords: logRecs4,
        tableName : tableName,
        logBy     : userId,
    }
    const res4 = await mcLog.readLog(logParams4)
    test4.setTestFunction(async () => {
        test4.assertEquals(res4.code, "success", `res.Code should be: success`);
        test4.assertEquals(res4.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test4Result = test4.runTest()
    results.push(test4Result)

    const test5 = newTest({
        name: 'should store delete-transaction log and return success:',
    })
    const logRecs5: LogRecordsType = {
        logRecords: recs,
    }
    const logParams5: AuditLogParamsType = {
        logRecords: logRecs5,
        tableName : tableName,
        logBy     : userId,
    }
    const res5 = await mcLog.deleteLog(userId, logParams5)
    test5.setTestFunction(async () => {
        test5.assertEquals(res5.code, "success", `res.Code should be: success`);
        test5.assertEquals(res5.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test5Result = test5.runTest()
    results.push(test5Result)

    const test6 = newTest({
        name: 'should store login-transaction log and return success:',
    })
    const logRecs6: LogRecordsType = {
        logRecords: recs,
    }
    const logParams6: AuditLogParamsType = {
        logRecords: logRecs6,
    }
    const res6 = await mcLog.loginLog(logParams6)
    test6.setTestFunction(async () => {
        test6.assertEquals(res6.code, "success", `res.Code should be: success`);
        test6.assertEquals(res6.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test6Result = test6.runTest()
    results.push(test6Result)

    const test7 = newTest({
        name: 'should store logout-transaction log and return success:',
    })
    const logRecs7: LogRecordsType = {
        logRecords: recs,
    }
    const logParams7: AuditLogParamsType = {
        logRecords: logRecs7,
    }
    const res7 = await mcLog.logoutLog(userId, logParams7)
    test7.setTestFunction(async () => {
        test7.assertEquals(res7.code, "success", `res.Code should be: success`);
        test7.assertEquals(res7.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test7Result = test7.runTest()
    results.push(test7Result)

    const test8 = newTest({
        name: 'should return paramsError for incomplete/undefined inputs:',
    })
    const logRecs8: LogRecordsType = {
        logRecords: recs,
    }
    const logParams8: AuditLogParamsType = {
        logRecords: logRecs8,
        // tableName: tableName,
        logBy: userId,
    }
    const res8 = await mcLog.createLog(userId, logParams8)
    test8.setTestFunction(async () => {
        test8.assertEquals(res8.code, "paramsError", `res.Code should be: paramsError`);
        test8.assertEquals(res8.message.includes("Table or Collection name is required"), true, `res-message should include: Table or Collection name is required`);
    })
    const test8Result = test8.runTest()
    results.push(test8Result)

    const test9 = newTest({
        name: 'should store custom log and return success:',
    })
    const logRecs9: LogRecordsType = {
        logRecords: recs,
    }
    const logParams9: AuditParamsType = {
        logRecords: logRecs9,
        tableName : tableName,
        logType   : AuditLogTypes.APPLOG,
        logBy     : "abbeymart",
    }
    const res9 = await mcLog.customLog(logParams9)
    test9.setTestFunction(async () => {
        test9.assertEquals(res9.code, "success", `res.Code should be: success`);
        test9.assertEquals(res9.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test9Result = test9.runTest()
    results.push(test9Result)

    testResult(results);
    await dbc?.closeDb()
})();
