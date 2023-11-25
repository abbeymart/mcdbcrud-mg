import { assertEquals, mcTest, postTestResult } from "@mconnect/mctest";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "./config";
import { newDbMongo } from "../src";

(async () => {
    await mcTest({
        name    : "should successfully connect to the MongoDB - Client",
        testFunc: async () => {
            let pResult = false
            const dbInstance = newDbMongo(appDbLocal, dbOptionsLocal);
            console.log("db-URI: ", dbInstance.dbUri)
            console.log("server-URI: ", dbInstance.serverUri)
            try {
                const dbClient = await dbInstance.mgServer()
                const db = dbClient.db(appDbLocal.database)
                if (db.databaseName === appDbLocal.database) {
                    pResult = true
                }
            } catch (e) {
                console.log("dbc-client-connection-error: ", e)
                pResult = false
            } finally {
                await dbInstance.closeDb()
            }
            assertEquals(pResult, true, `client-result-connected: true`);
        }
    });

    await mcTest({
        name    : "should successfully connect to the MongoDB - Handle",
        testFunc: async () => {
            let pResult = false
            const dbInstance = newDbMongo(appDbLocal, dbOptionsLocal);
            try {
                const db = await dbInstance.openDb()
                if (db.databaseName === appDbLocal.database) {
                    pResult = true
                }
            } catch (e) {
                console.log("dbc-client-connection-error: ", e)
                pResult = false
            } finally {
                await dbInstance.closeDb()
            }
            assertEquals(pResult, true, `client-result-connected: true`);
        }
    });

    await mcTest({
        name    : "should successfully connect to the Audit MongoDB - Client",
        testFunc: async () => {
            let pResult = false
            const dbInstance = newDbMongo(auditDbLocal, dbOptionsLocal);
            try {
                const dbClient = await dbInstance.mgServer()
                const db = await dbClient.db(auditDbLocal.database)
                if (db.databaseName === auditDbLocal.database) {
                    pResult = true
                }
            } catch (e) {
                console.log("dbc-client-connection-error: ", e)
                pResult = false
            } finally {
                await dbInstance.closeDb()
            }
            assertEquals(pResult, true, `client-result-connected: true`);
        }
    });

    await mcTest({
        name    : "should successfully connect to the Audit MongoDB - Handle",
        testFunc: async () => {
            let pResult = false
            const dbInstance = newDbMongo(auditDbLocal, dbOptionsLocal);
            try {
                const db = await dbInstance.openDb()
                if (db.databaseName === auditDbLocal.database) {
                    pResult = true
                }
            } catch (e) {
                console.log("dbc-client-connection-error: ", e)
                pResult = false
            } finally {
                await dbInstance.closeDb()
            }
            assertEquals(pResult, true, `client-result-connected: true`);
        }
    });

    await postTestResult();

})();
