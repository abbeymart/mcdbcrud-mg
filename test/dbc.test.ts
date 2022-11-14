import {assertEquals, mcTest, postTestResult} from "@mconnect/mctest";
import {appDb, dbOptions} from "./config";
import {newDbMongo} from "../src";

(async () => {
    await mcTest({
        name    : "should successfully connect to the MongoDB - Client",
        testFunc: async () => {
            let pResult = false
            const dbInstance = newDbMongo(appDb, dbOptions);
            console.log("db-URI: ", dbInstance.dbUri)
            console.log("server-URI: ", dbInstance.serverUri)
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
            const dbInstance = newDbMongo(appDb, dbOptions);
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
            const dbInstance = newDbMongo(appDb, dbOptions);
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
            const dbInstance = newDbMongo(appDb, dbOptions);
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
