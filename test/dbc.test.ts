import { newTest, testResult, UnitTestResult } from "@mconnect/mctest";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../src/config/secure/config";
import { newDbMongo } from "../src";

(async () => {

    const results: Array<UnitTestResult> = []

    const test1 = newTest({
        name: "should successfully connect to the MongoDB - Client",
    })
    let pResult: boolean
    const dbInstance = newDbMongo(appDbLocal, dbOptionsLocal)
    console.log("db-URI: ", dbInstance.dbUri)
    console.log("server-URI: ", dbInstance.serverUri)
    const dbClient = await dbInstance.mgServer()
    const db = dbClient.db(appDbLocal.database)
    pResult = db.databaseName === appDbLocal.database;
    test1.setTestFunction(() => {
        test1.assertEquals(pResult, true, `client-result-connected: true`);
    })
    const test1Result = test1.runTest()
    await dbInstance?.closeDb()
    results.push(test1Result)

    const test2 = newTest({
        name: "should successfully connect to the MongoDB - Handle",
    })
    const dbInstance2 = newDbMongo(appDbLocal, dbOptionsLocal);
    const db2 = await dbInstance2.openDb()
    const pResult2 = db2.databaseName === appDbLocal.database;
    test2.setTestFunction(async () => {
        test2.assertEquals(pResult2, true, `client-result-connected: true`);
    })
    const test2Result = test2.runTest()
    await dbInstance2?.closeDb()
    results.push(test2Result)

    const test3 = newTest({
        name: "should successfully connect to the Audit MongoDB - Client",
    })
    const dbInstance3 = newDbMongo(auditDbLocal, dbOptionsLocal);
    const dbClient3 = await dbInstance3.mgServer()
    const db3 = dbClient3.db(auditDbLocal.database)
    const pResult3 = db3.databaseName === auditDbLocal.database;
    test3.setTestFunction(async () => {
        test3.assertEquals(pResult3, true, `client-result-connected: true`);
    })
    const test3Result = test3.runTest()
    await dbInstance3?.closeDb()
    results.push(test3Result)

    const test4 = newTest({
        name: "should successfully connect to the Audit MongoDB - Handle",
    })
    const dbInstance4 = newDbMongo(auditDbLocal, dbOptionsLocal);
    const db4 = await dbInstance4.openDb()
    const pResult4 = db4.databaseName === auditDbLocal.database
    test4.setTestFunction(async () => {
        test4.assertEquals(pResult4, true, `client-result-connected: true`);
    })
    const test4Result = test4.runTest()
    await dbInstance4.closeDb()
    results.push(test4Result)

    testResult(results);

})();
