import { assertEquals, mcTest, postTestResult } from "@mconnect/mctest";
import { auditDbLocal, dbOptionsLocal } from "./config";
import {
    AuditLogParamsType, LogRecordsType, newAuditLog, newDbMongo, AuditParamsType, AuditLogTypes,
} from "../src";

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

    await mcTest({
        name    : 'should connect to the DB and return an instance object',
        testFunc: () => {
            assertEquals(mcLog.getAuditTable(), mcLogResult.auditColl, `audit-table should be: ${mcLogResult.auditColl}`);
        }
    });

    await mcTest({
        name    : 'should store create-transaction log and return success:',
        testFunc: async () => {
            const logRecs: LogRecordsType = {
                logRecords: recs,
            }
            const logParams: AuditLogParamsType = {
                logRecords: logRecs,
                tableName : tableName,
                logBy     : userId,
            }
            const res = await mcLog.createLog(userId, logParams)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await mcTest({
        name    : 'should store update-transaction log and return success:',
        testFunc: async () => {
            const logRecs: LogRecordsType = {
                logRecords: recs,
            }
            const newLogRecs: LogRecordsType = {
                logRecords: newRecs,
            }
            const logParams: AuditLogParamsType = {
                logRecords   : logRecs,
                newLogRecords: newLogRecs,
                tableName    : tableName,
                logBy        : userId,
            }
            const res = await mcLog.updateLog(userId, logParams)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });
    await mcTest({
        name    : 'should store read-transaction log and return success:',
        testFunc: async () => {
            const logRecs: LogRecordsType = {
                logRecords: readP,
            }
            const logParams: AuditLogParamsType = {
                logRecords: logRecs,
                tableName : tableName,
                logBy     : userId,
            }
            const res = await mcLog.readLog(logParams)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });
    await mcTest({
        name    : 'should store delete-transaction log and return success:',
        testFunc: async () => {
            const logRecs: LogRecordsType = {
                logRecords: recs,
            }
            const logParams: AuditLogParamsType = {
                logRecords: logRecs,
                tableName : tableName,
                logBy     : userId,
            }
            const res = await mcLog.deleteLog(userId, logParams)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });
    await mcTest({
        name    : 'should store login-transaction log and return success:',
        testFunc: async () => {
            const logRecs: LogRecordsType = {
                logRecords: recs,
            }
            const logParams: AuditLogParamsType = {
                logRecords: logRecs,
                // tableName: tableName,
                // logBy: userId,
            }
            const res = await mcLog.loginLog(logParams)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await mcTest({
        name    : 'should store logout-transaction log and return success:',
        testFunc: async () => {
            const logRecs: LogRecordsType = {
                logRecords: recs,
            }
            const logParams: AuditLogParamsType = {
                logRecords: logRecs,
                // tableName: tableName,
                // logBy: userId,
            }
            const res = await mcLog.logoutLog(userId, logParams)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await mcTest({
        name    : 'should return paramsError for incomplete/undefined inputs:',
        testFunc: async () => {
            const logRecs: LogRecordsType = {
                logRecords: recs,
            }
            const logParams: AuditLogParamsType = {
                logRecords: logRecs,
                // tableName: tableName,
                logBy: userId,
            }
            const res = await mcLog.createLog(userId, logParams)
            assertEquals(res.code, "paramsError", `res.Code should be: paramsError`);
            assertEquals(res.message.includes("Table or Collection name is required"), true, `res-message should include: Table or Collection name is required`);
        }
    });

    await mcTest({
        name    : 'should store custom log and return success:',
        testFunc: async () => {
            const logRecs: LogRecordsType = {
                logRecords: recs,
            }
            const logParams: AuditParamsType = {
                logRecords: logRecs,
                tableName : tableName,
                logType   : AuditLogTypes.APPLOG,
                logBy     : "abbeymart",
            }
            const res = await mcLog.customLog(logParams)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await postTestResult();
    await dbc.closeDb()
})();
