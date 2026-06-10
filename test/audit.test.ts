import { newTest, testResult, UnitTestResult } from "@mconnect/mctest";
import { auditDbLocal, dbOptionsLocal } from "../src/config/secure/config";
import { AuditLogParamsType, AuditLogTypes, LogRecordsType, newAuditLog, newDbMongo } from "../src";

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

    // TEST1
    const test1 = newTest({
        name: 'should connect to the DB and return an instance object',
    })
    test1.setTestFunction(() => {
        test1.assertEquals(mcLog.getAuditTable(), mcLogResult.auditColl, `audit-table should be: ${mcLogResult.auditColl}`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    // TEST2
    const logRecs2: LogRecordsType = {
        logRecords: recs,
    }
    const logParams2: AuditLogParamsType = {
        logRecords: logRecs2,
        tableName : tableName,
        logBy     : userId,
    }
    const res2 = await mcLog.auditLog(AuditLogTypes.CREATE, logParams2)

    const test2 = newTest({
        name: 'should store create-transaction log and return success [re: logBy]:',
    })
    test2.setTestFunction(async () => {
        test2.assertEquals(res2.code, "success", `res.Code should be: success`);
        test2.assertEquals(res2.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    // TEST3
    const logRecs3: LogRecordsType = {
        logRecords: recs,
    }
    const logParams3: AuditLogParamsType = {
        logRecords: logRecs3,
        tableName : tableName,
    }
    const res3 = await mcLog.auditLog(AuditLogTypes.CREATE, logParams3, userId)
    const test3 = newTest({
        name: 'should store create-transaction log and return success [re: userId]:',
    })
    test3.setTestFunction(async () => {
        test3.assertEquals(res3.code, "success", `res.Code should be: success`);
        test3.assertEquals(res3.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test3Result = test3.runTest()
    results.push(test3Result)

    // TEST4
    const logRecs4: LogRecordsType = {
        logRecords: recs,
    }
    const newLogRecs4: LogRecordsType = {
        logRecords: newRecs,
    }
    const logParams4: AuditLogParamsType = {
        logRecords   : logRecs4,
        newLogRecords: newLogRecs4,
        tableName    : tableName,
        logBy        : userId,
    }
    const res4 = await mcLog.auditLog(AuditLogTypes.UPDATE, logParams4)
    const test4 = newTest({
        name: 'should store update-transaction log and return success:',
    })
    test4.setTestFunction(async () => {
        test4.assertEquals(res4.code, "success", `res.Code should be: success`);
        test4.assertEquals(res4.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test4Result = test4.runTest()
    results.push(test4Result)

    // TEST5
    const logRecs5: LogRecordsType = {
        logRecords: readP,
    }
    const logParams5: AuditLogParamsType = {
        logRecords: logRecs5,
        tableName : tableName,
        logBy     : userId,
    }
    const res5 = await mcLog.auditLog(AuditLogTypes.READ, logParams5)
    const test5 = newTest({
        name: 'should store read-transaction log and return success:',
    })
    test5.setTestFunction(async () => {
        test5.assertEquals(res5.code, "success", `res.Code should be: success`);
        test5.assertEquals(res5.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test5Result = test5.runTest()
    results.push(test5Result)

    // TEST6
    const logRecs6: LogRecordsType = {
        logRecords: recs,
    }
    const logParams6: AuditLogParamsType = {
        logRecords: logRecs6,
        tableName : tableName,
        logBy     : userId,
    }
    const res6 = await mcLog.auditLog(AuditLogTypes.DELETE, logParams6)
    const test6 = newTest({
        name: 'should store delete-transaction log and return success:',
    })
    test6.setTestFunction(async () => {
        test6.assertEquals(res6.code, "success", `res.Code should be: success`);
        test6.assertEquals(res6.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test6Result = test6.runTest()
    results.push(test6Result)

    // TEST7
    const logRecs7: LogRecordsType = {
        logRecords: recs,
    }
    const logParams7: AuditLogParamsType = {
        logRecords: logRecs7,
        tableName : tableName,
        logBy     : userId,
    }
    const res7 = await mcLog.auditLog(AuditLogTypes.LOGIN, logParams7)
    const test7 = newTest({
        name: 'should store login-transaction log and return success:',
    })
    test7.setTestFunction(async () => {
        test7.assertEquals(res7.code, "success", `res.Code should be: success`);
        test7.assertEquals(res7.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test7Result = test7.runTest()
    results.push(test7Result)

    // TEST8
    const logRecs8: LogRecordsType = {
        logRecords: recs,
    }
    const logParams8: AuditLogParamsType = {
        logRecords: logRecs8,
        tableName : tableName,
        logBy     : userId,
    }
    const res8 = await mcLog.auditLog(AuditLogTypes.LOGOUT, logParams8)
    const test8 = newTest({
        name: 'should store logout-transaction log and return success:',
    })
    test8.setTestFunction(async () => {
        test8.assertEquals(res8.code, "success", `res.Code should be: success`);
        test8.assertEquals(res8.message.includes("successfully"), true, `res-message should include: successfully`);
    })
    const test8Result = test8.runTest()
    results.push(test8Result)

    // TEST9
    const logRecs9: LogRecordsType = {
        logRecords: recs,
    }
    const logParams9: AuditLogParamsType = {
        logRecords: logRecs9,
        logBy     : userId,
    }
    const res9 = await mcLog.auditLog(AuditLogTypes.CREATE, logParams9)
    const test9 = newTest({
        name: 'should return paramsError for incomplete/undefined inputs:',
    })
    test9.setTestFunction(async () => {
        test9.assertEquals(res9.code, "paramsError", `res.Code should be: paramsError`);
        test9.assertEquals(res9.message.includes("Table or Collection name is required"), true, `res-message should include: Table or Collection name is required`);
    })
    const test9Result = test9.runTest()
    results.push(test9Result)

    testResult(results);
    await dbc?.closeDb()
})();
