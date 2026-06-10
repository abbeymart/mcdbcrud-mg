import { newTest, testResult, UnitTestResult } from '@mconnect/mctest';
import { CrudOptionsType, CrudParamsType, CrudResultType, newDbMongo, newSaveRecord } from "../src";
import {
    AuditCreateActionParams, AuditTable, AuditUpdateActionParams, AuditUpdateRecordById, AuditUpdateRecordByParam,
    GetTable, TestUserInfo, UpdateAuditById, UpdateAuditByIds, UpdateAuditByParams, UpdateTable
} from "../src/config/testData";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../src/config/secure/config";

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
        name: 'should create two new records and return success:',
    })
    crudParams.actionParams = AuditCreateActionParams
    crudParams.recordIds = []
    crudParams.queryParams = {}
    let recLen = crudParams.actionParams.length
    let crud = newSaveRecord(crudParams, crudOptions);
    let res = await crud.saveRecord()
    console.log("create-result: ", res)
    let resValue = res.value as CrudResultType
    let idLen = resValue.recordIds?.length || 0
    let recCount = resValue.recordsCount || 0
    test1.setTestFunction(() => {
        test1.assertEquals(res.code, "success", `create-task should return code: success`);
        test1.assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
        test1.assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    const test2 = newTest({
        name: 'should update two existing records and return success:',
    })
    crudParams.tableName = UpdateTable
    crudParams.actionParams = AuditUpdateActionParams
    crudParams.recordIds = []
    crudParams.queryParams = {}
    recLen = crudParams.actionParams.length
    crud = newSaveRecord(crudParams, crudOptions);
    res = await crud.saveRecord()
    console.log("update-result: ", res)
    resValue = res.value as CrudResultType
    recCount = resValue.recordsCount || 0
    test2.setTestFunction(() => {
        test2.assertEquals(res.code, "success", `update-task should return code: success`);
        test2.assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    const test3 = newTest({
        name: 'should update a record by Id and return success:',
    })
    crudParams.tableName = UpdateTable
    crudParams.actionParams = [AuditUpdateRecordById]
    crudParams.recordIds = [UpdateAuditById]
    crudParams.queryParams = {}
    recLen = crudParams.recordIds.length
    crud = newSaveRecord(crudParams, crudOptions);
    res = await crud.saveRecord()
    console.log("update-by-id-res: ", res)
    resValue = res.value as CrudResultType
    recCount = resValue.recordsCount || 0
    test3.setTestFunction(() => {
        test3.assertEquals(res.code, "success", `update-by-id-task should return code: success`);
        test3.assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    })
    const test3Result = test3.runTest()
    results.push(test3Result)

    const test4 = newTest({
        name: 'should update records by Ids and return success:',
    })
    crudParams.tableName = UpdateTable
    crudParams.actionParams = [AuditUpdateRecordById]
    crudParams.recordIds = UpdateAuditByIds
    crudParams.queryParams = {}
    recLen = crudParams.recordIds.length
    crud = newSaveRecord(crudParams, crudOptions);
    res = await crud.saveRecord()
    console.log("update-by-ids-res: ", res)
    resValue = res.value as CrudResultType
    recCount = resValue.recordsCount || 0
    test4.setTestFunction(() => {
        test4.assertEquals(res.code, "success", `update-by-id-task should return code: success`);
        test4.assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    })
    const test4Result = test4.runTest()
    results.push(test4Result)

    const test5 = newTest({
        name: 'should update records by query-params and return success:',
    })
    crudParams.tableName = UpdateTable
    crudParams.actionParams = [AuditUpdateRecordByParam]
    crudParams.recordIds = []
    crudParams.queryParams = UpdateAuditByParams
    recLen = 0
    crud = newSaveRecord(crudParams, crudOptions);
    res = await crud.saveRecord()
    console.log("update-by-queryParams-res: ", res)
    resValue = res.value as CrudResultType
    recCount = resValue.recordsCount || 0
    test5.setTestFunction(() => {
        const codeRes = res.code === "success" || res.code === "notFound"
        test5.assertEquals(codeRes, true, `update-task should return code: success or notFound`);
        test5.assertEquals(recCount >= recLen, true, `response-value-recordsCount should be >: ${recLen}`);
    })
    const test5Result = test5.runTest()
    results.push(test5Result)

    testResult(results);
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0)
})();
