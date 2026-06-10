import { newTest, testResult, UnitTestResult } from '@mconnect/mctest';
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../src/config/secure/config";
import { AuditType, CrudOptionsType, CrudParamsType, GetResultType, newDbMongo, newGetRecord } from "../src";
import {
    AuditTable, GetAuditById, GetAuditByIds, GetAuditByParams, GetTable, TestUserInfo,
} from "../src/config/testData";

const appDbInstance = newDbMongo(appDbLocal, dbOptionsLocal);
const auditDbInstance = newDbMongo(auditDbLocal, dbOptionsLocal);

(async () => {
    // DB clients/handles
    const appDbHandle = await appDbInstance.openDb()
    const appDbClient = await appDbInstance.mgServer()
    const auditDbHandle = await auditDbInstance.openDb()
    const auditDbClient = await auditDbInstance.mgServer()

    const crudParams: CrudParamsType = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDbLocal.database || "mcdev",
        tableName  : GetTable,
        userInfo   : TestUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    const crudOptions: CrudOptionsType = {
        auditDb      : auditDbHandle,
        auditDbClient: auditDbClient,
        auditDbName  : auditDbLocal.database || "mcdevaudit",
        auditTable   : AuditTable,
        userId       : TestUserInfo.userId,
        checkAccess  : false,
        logCrud      : true,
        logRead      : true,
        logCreate    : true,
        logDelete    : true,
        logUpdate    : true,
        cacheResult  : false,
    }

    const results: Array<UnitTestResult> = []

    const test1 = newTest({
        name: 'should get records by Id and return success:',
    })
    crudParams.recordIds = [GetAuditById]
    crudParams.queryParams = {}
    let crud = newGetRecord(crudParams, crudOptions);
    let res = await crud.getRecord()
    let resValue = res.value as GetResultType
    let recLen = resValue.records?.length || 0
    let recCount = resValue.stats?.recordsCount || 0
    let record = resValue.records[0] as AuditType
    test1.setTestFunction(() => {
        test1.assertEquals(res.code, "success", `response-code should be: success`);
        test1.assertEquals(record._id?.toString() === GetAuditById, true, "mongodb _id field value must match proxy id field value")
        test1.assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
        test1.assertEquals(recLen, 1, `response-value-records-length should be: 1`);
        test1.assertEquals(recCount, 1, `response-value-stats-recordsCount should be: 1`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    const test2 = newTest({
        name: 'should get records by Ids and return success:',
    })
    crudParams.recordIds = GetAuditByIds
    crudParams.queryParams = {}
    crud = newGetRecord(crudParams, crudOptions);
    res = await crud.getRecord()
    resValue = res.value as GetResultType
    recLen = resValue.records?.length || 0
    recCount = resValue.stats?.recordsCount || 0
    test2.setTestFunction(() => {
        test2.assertEquals(res.code, "success", `response-code should be: success`);
        test2.assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
        test2.assertEquals(recLen, 2, `response-value-records-length should be: 2`);
        test2.assertEquals(recCount, 2, `response-value-stats-recordsCount should be: 2`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    const test3 = newTest({
        name: 'should get records by query-params and return success:',
    })
    crudParams.recordIds = []
    crudParams.queryParams = GetAuditByParams
    crud = newGetRecord(crudParams, crudOptions);
    res = await crud.getRecord()
    resValue = res.value as GetResultType
    recLen = resValue.records?.length || 0
    recCount = resValue.stats?.recordsCount || 0
    test3.setTestFunction(() => {
        test3.assertEquals(res.code, "success", `response-code should be: success`);
        test3.assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
        test3.assertEquals(recLen > 0, true, `response-value-records-length should be: > 0`);
        test3.assertEquals(recCount > 0, true, `response-value-stats-recordsCount should be:  > 0`);
    })
    const test3Result = test3.runTest()
    results.push(test3Result)

    const test4 = newTest({
        name: 'should get all records and return success:',
    })
    crudParams.tableName = GetTable
    crudParams.recordIds = []
    crudParams.queryParams = {}
    crudOptions.getAllRecords = true
    crud = newGetRecord(crudParams, crudOptions);
    res = await crud.getRecord()
    resValue = res.value as GetResultType
    recLen = resValue.records?.length || 0
    recCount = resValue.stats?.recordsCount || 0
    test4.setTestFunction(() => {
        test4.assertEquals(res.code, "success", `response-code should be: success`);
        test4.assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
        test4.assertEquals(recLen > 20, true, `response-value-records-length should be: > 20`);
        test4.assertEquals(recCount > 20, true, `response-value-stats-recordsCount should be:  > 20`);
    })
    const test4Result = test4.runTest()
    results.push(test4Result)

    const test5 = newTest({
        name: 'should get all records by limit/skip(offset) and return success:',
    })
    crudParams.tableName = GetTable
    crudParams.recordIds = []
    crudParams.queryParams = {}
    crudParams.skip = 0
    crudParams.limit = 20
    crudOptions.getAllRecords = true
    crud = newGetRecord(crudParams, crudOptions);
    res = await crud.getRecord()
    resValue = res.value as GetResultType
    recLen = resValue.records?.length || 0
    recCount = resValue.stats?.recordsCount || 0
    test5.setTestFunction(() => {
        test5.assertEquals(res.code, "success", `response-code should be: success`);
        test5.assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
        test5.assertEquals(recLen, 20, `response-value-records-length should be: 20`);
        test5.assertEquals(recCount, 20, `response-value-stats-recordsCount should be: 20`);
    })
    const test5Result = test5.runTest()
    results.push(test5Result)

    testResult(results);
    console.log("app-db: ", appDbInstance.dbUri)
    await appDbInstance?.closeDb();
    console.log("app-db-closed")
    console.log("audit-db: ", auditDbInstance.dbUri)
    await auditDbInstance?.closeDb();
    console.log("audit-db-closed")
    process.exit(0)
})();
