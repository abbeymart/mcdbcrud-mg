import {assertEquals, mcTest, postTestResult} from "@mconnect/mctest";
import {appDb, appDbMongo, auditDbMongo} from "./config";

(async () => {
    await mcTest({
        name    : "should successfully connect to the MongoDB - Client",
        testFunc: async () => {
            let pResult = false
            const dbInstance = appDbMongo;
            try {
                const dbClient = await dbInstance.mgServer()
                const db = await dbClient.db(appDb.database)
                if (db.databaseName === appDb.database) {
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
            const dbInstance = appDbMongo
            try {
                const db = await dbInstance.openDb()
                if (db.databaseName === appDb.database) {
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
            const dbInstance = auditDbMongo;
            try {
                const dbClient = await dbInstance.mgServer()
                const db = await dbClient.db(appDb.database)
                if (db.databaseName === appDb.database) {
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
            const dbInstance = auditDbMongo
            try {
                const db = await dbInstance.openDb()
                if (db.databaseName === appDb.database) {
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
