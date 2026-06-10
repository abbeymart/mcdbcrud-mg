import { newTest, testResult, UnitTestResult } from '@mconnect/mctest';
import { CrudOptionsType, CrudParamsType, newDbMongo, newDeleteRecord, } from "../src";
import {
    AuditTable, DeleteAllTable, DeleteAuditById, DeleteAuditByIds, DeleteAuditByParams, DeleteTable, GetTable,
    TestUserInfo,
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
        name: 'should prevent the delete of all table records and return removeError:',
    })
    crudParams.tableName = DeleteAllTable
    crudParams.recordIds = []
    crudParams.queryParams = {}
    let crud = newDeleteRecord(crudParams, crudOptions);
    let res = await crud.deleteRecord()
    console.log("delete-all-res: ", res)
    test1.setTestFunction(() => {
        test1.assertEquals(res.code, "removeError", `delete-task permitted by ids or queryParams only: removeError code expected`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    const test2 = newTest({
        name: 'should delete record by Id and return success or notFound[delete-record-method]:',
    })
    crudParams.tableName = DeleteTable
    crudParams.recordIds = [DeleteAuditById]
    crudParams.queryParams = {}
    crud = newDeleteRecord(crudParams, crudOptions);
    res = await crud.deleteRecord()
    console.log("delete-by-id-res: ", res)
    let resCode = res.code == "success" || res.code == "notFound"
    test2.setTestFunction(() => {
        test2.assertEquals(resCode, true, `res-code should be success or notFound:`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    const test3 = newTest({
        name: 'should delete record by Ids and return success or notFound[delete-record-method]:',
    })
    crudParams.tableName = DeleteTable
    crudParams.recordIds = DeleteAuditByIds
    crudParams.queryParams = {}
    crud = newDeleteRecord(crudParams, crudOptions);
    res = await crud.deleteRecord()
    console.log("delete-by-ids-res: ", res)
    resCode = res.code == "success" || res.code == "notFound"
    test3.setTestFunction(() => {
        test3.assertEquals(resCode, true, `res-code should be success or notFound:`);
    })
    const test3Result = test3.runTest()
    results.push(test3Result)

    const test4 = newTest({
        name: 'should delete records by query-params and return success or notFound[delete-record-method]:',
    })
    crudParams.tableName = DeleteTable
    crudParams.recordIds = []
    crudParams.queryParams = DeleteAuditByParams
    crud = newDeleteRecord(crudParams, crudOptions);
    res = await crud.deleteRecord()
    console.log("delete-by-params-res: ", res)
    resCode = res.code == "success" || res.code == "notFound"
    test4.setTestFunction(() => {
        test4.assertEquals(resCode, true, `res-code should be success or notFound:`);
    })
    const test4Result = test4.runTest()
    results.push(test4Result)

    testResult(results);
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0)
})();
