import { assertEquals, newTest, testResult, UnitTestResult } from '@mconnect/mctest';
import { checkTaskType, CrudParamsType, newDbMongo, TaskTypes } from "../src";
import {
    AuditCreateActionParams, AuditUpdateActionParams, AuditUpdateRecordById, GetTable, TestUserInfo, UpdateAuditById,
    UpdateTable
} from "../src/config/testData";
import { appDbLocal, dbOptionsLocal } from "../src/config/secure/config";


(async () => {

    const appDbInstance = newDbMongo(appDbLocal, dbOptionsLocal);

    // DB clients/handles
    const appDbHandle = await appDbInstance.openDb()
    const appDbClient = await appDbInstance.mgServer()

    const crudParams: CrudParamsType = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDbLocal.database || "mcdev",
        tableName  : GetTable,
        userInfo   : TestUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    const results: Array<UnitTestResult> = []

    // TEST1
    const test1 = newTest({
        name: 'check task-type - CREATE',
    })
    crudParams.actionParams = AuditCreateActionParams
    crudParams.recordIds = []
    crudParams.queryParams = {}
    let taskType = checkTaskType(crudParams);
    console.log("taskType: ", taskType)
    test1.setTestFunction(() => {
        test1.assertEquals(taskType, TaskTypes.CREATE, `task type should be: ${TaskTypes.CREATE}`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    // TEST2
    const test2 = newTest({
        name: 'check task-type - UPDATE',
    })
    crudParams.tableName = UpdateTable
    crudParams.actionParams = AuditUpdateActionParams
    crudParams.recordIds = []
    crudParams.queryParams = {}
    taskType = checkTaskType(crudParams);
    console.log("taskType: ", taskType)
    test2.setTestFunction(() => {
        test2.assertEquals(taskType, TaskTypes.UPDATE, `task type should be: ${TaskTypes.UPDATE}`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    // TEST3
    const test3 = newTest({
        name: 'check task-type - UPDATE [by record id]',
    })
    crudParams.tableName = UpdateTable
    crudParams.actionParams = [AuditUpdateRecordById]
    crudParams.recordIds = [UpdateAuditById]
    crudParams.queryParams = {}
    taskType = checkTaskType(crudParams);
    console.log("taskType: ", taskType)
    test3.setTestFunction(() => {
        test3.assertEquals(taskType, TaskTypes.UPDATE, `task type should be: ${TaskTypes.UPDATE}`);
    })
    const test3Result = test3.runTest()
    results.push(test3Result)

    // TEST4
    const test4 = newTest({
        name: 'check task-type - UNKNOWN',
    })
    crudParams.tableName = UpdateTable
    crudParams.actionParams = [...AuditCreateActionParams, ...AuditUpdateActionParams]
    crudParams.recordIds = []
    crudParams.queryParams = {}
    taskType = checkTaskType(crudParams);
    console.log("taskType: ", taskType)
    test4.setTestFunction(() => {
        test4.assertEquals(taskType, TaskTypes.UNKNOWN, `task type should be: ${TaskTypes.UNKNOWN}`);
    })
    const test4Result = test4.runTest()
    console.log("test4Result: ", test4Result)
    results.push(test4Result)

    testResult(results);
    await appDbInstance?.closeDb();
    process.exit(0)
})();
