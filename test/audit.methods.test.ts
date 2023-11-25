import { assertEquals, mcTest, postTestResult } from "@mconnect/mctest";
import { auditDbLocal, dbOptionsLocal } from "./config";
import { AuditParamsType, LogDocumentsType, newAuditLog, newDbMongo } from "../src";

const collName = "services"
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
    const mcLog = newAuditLog(dbHandle, {auditColl: "audits"});

    await mcTest({
        name    : 'should connect to the DB and return an instance object',
        testFunc: () => {
            assertEquals(mcLog.getAuditColl(), mcLogResult.auditColl, `audit-table should be: ${mcLogResult.auditColl}`);
        }
    });

    await mcTest({
        name    : 'should store create-transaction log and return success:',
        testFunc: async () => {
            const collDocs: LogDocumentsType = {
                logDocuments: recs,
            }
            const res = await mcLog.createLog(collName, collDocs, userId)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await mcTest({
        name    : 'should store update-transaction log and return success:',
        testFunc: async () => {
            const collDocs: LogDocumentsType = {
                logDocuments: recs,
            }
            const newCollDocs: LogDocumentsType = {
                logDocuments: newRecs,
            }
            const res = await mcLog.updateLog(collName, collDocs, newCollDocs, userId)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });
    await mcTest({
        name    : 'should store read-transaction log and return success:',
        testFunc: async () => {
            const collDocs: LogDocumentsType = {
                logDocuments: readP,
            }
            const res = await mcLog.readLog(collName, collDocs, userId)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });
    await mcTest({
        name    : 'should store delete-transaction log and return success:',
        testFunc: async () => {
            const collDocs: LogDocumentsType = {
                logDocuments: recs,
            }
            const res = await mcLog.deleteLog(collName, collDocs, userId)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });
    await mcTest({
        name    : 'should store login-transaction log and return success:',
        testFunc: async () => {
            const collDocs: LogDocumentsType = {
                logDocuments: recs,
            }
            const res = await mcLog.loginLog(collDocs, userId)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await mcTest({
        name    : 'should store logout-transaction log and return success:',
        testFunc: async () => {
            const collDocs: LogDocumentsType = {
                logDocuments: recs,
            }
            const res = await mcLog.logoutLog(collDocs, userId)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await mcTest({
        name    : 'should return paramsError for incomplete/undefined inputs:',
        testFunc: async () => {
            const collDocs: LogDocumentsType = {
                logDocuments: recs,
            }
            const res = await mcLog.createLog("", collDocs, userId)
            assertEquals(res.code, "paramsError", `res.Code should be: paramsError`);
            assertEquals(res.message.includes("Table or Collection name is required"), true, `res-message should include: Table or Collection name is required`);
        }
    });

    await mcTest({
        name    : 'should store custom log and return success:',
        testFunc: async () => {
            const auditParams: AuditParamsType = {
                collDocuments: recs,
                logType      : "mcpa-service",
                logBy        : "abbeymart",
            }
            const res = await mcLog.customLog(auditParams)
            assertEquals(res.code, "success", `res.Code should be: success`);
            assertEquals(res.message.includes("successfully"), true, `res-message should include: successfully`);
        }
    });

    await postTestResult();
    await dbc.closeDb()
})();