import { CrudParamsType, GetResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../../src/config/secure/config";
import {
    auditColl, categoryColl, CategoryModel, crudParamOptions, GetCategoryById, GetCategoryByIds, GetCategoryByParams,
    testUserInfo
} from "../../src/config/transTestData";
import { newTest, testResult, UnitTestResult } from "@mconnect/mctest";

(async () => {
    // DB clients/handles
    const appDbInstance = newDbMongo(appDbLocal, dbOptionsLocal);
    const auditDbInstance = newDbMongo(auditDbLocal, dbOptionsLocal);

    const appDbHandle = await appDbInstance.openDb();
    const appDbClient = await appDbInstance.mgServer();
    const auditDbHandle = await auditDbInstance.openDb();
    const auditDbClient = await auditDbInstance.mgServer();

    const crudParams: CrudParamsType = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDbLocal.database || "",
        tableName  : categoryColl,
        userInfo   : testUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDbLocal.database;
    crudParamOptions.auditTable = auditColl;

    const results: Array<UnitTestResult> = []

    const test1 = newTest({
        name: "should get records by Id and return success:",
    })
    crudParams.recordIds = [GetCategoryById]
    crudParams.queryParams = {}
    let res = await CategoryModel.get(crudParams, crudParamOptions);
    let resValue = res.value as unknown as GetResultType
    let recLen = resValue.records?.length || 0
    let recCount = resValue.stats?.recordsCount || 0
    test1.setTestFunction(async () => {
        test1.assertEquals(res.code, "success", `response-code should be: success`);
        test1.assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
        test1.assertEquals(recLen, 1, `response-value-records-length should be: 1`);
        test1.assertEquals(recCount, 1, `response-value-stats-recordsCount should be: 1`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    const test2 = newTest({
        name: "should get records by Ids and return success:",
    })
    crudParams.recordIds = GetCategoryByIds;
    crudParams.queryParams = {};
    res = await CategoryModel.get(crudParams, crudParamOptions);
    resValue = res.value as unknown as GetResultType
    recLen = resValue.records?.length || 0
    recCount = resValue.stats?.recordsCount || 0
    test2.setTestFunction(() => {
        test2.assertEquals(res.code, "success", `response-code should be: success`);
        test2.assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
        test2.assertEquals(recLen, 2, `response-value-records-length should be: 2`);
        test2.assertEquals(recCount, 2, `response-value-stats-recordsCount should be: 2`);
    });
    const test2Result = test2.runTest()
    results.push(test2Result)

    const test3 = newTest({
        name: "should get records by query-params and return success:",
    })
    crudParams.recordIds = [];
    crudParams.queryParams = GetCategoryByParams;
    res = await CategoryModel.get(crudParams, crudParamOptions);
    resValue = res.value as unknown as GetResultType;
    recLen = resValue.records?.length || 0;
    recCount = resValue.stats?.recordsCount || 0;

    test3.setTestFunction(() => {
        test3.assertEquals(res.code, "success", `response-code should be: success`);
        test3.assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
        test3.assertEquals(recLen > 0, true, `response-value-records-length should be: > 0`);
        test3.assertEquals(recCount > 0, true, `response-value-stats-recordsCount should be:  > 0`);
    })
    const test3Result = test3.runTest()
    results.push(test3Result)

    const test4 = newTest({
        name: "should get all records and return success:",
    })
    crudParams.tableName = categoryColl
    crudParams.recordIds = []
    crudParams.queryParams = {}
    crudParamOptions.getAllRecords = true
    crudParamOptions.checkAccess = false;
    res = await CategoryModel.lookupGet(crudParams, crudParamOptions);
    resValue = res.value as unknown as GetResultType
    recLen = resValue.records?.length || 0
    recCount = resValue.stats?.recordsCount || 0

    test4.setTestFunction(() => {
        test4.assertEquals(res.code, "success", `response-code should be: success`);
        test4.assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
        test4.assertEquals(recLen > 5, true, `response-value-records-length should be: > 5`);
        test4.assertEquals(recCount > 5, true, `response-value-stats-recordsCount should be:  > 5`);
    })
    const test4Result = test4.runTest()
    results.push(test4Result)

    const test5 = newTest({
        name: "should get all records by limit/skip(offset) and return success:",
    })
    crudParams.tableName = categoryColl
    crudParams.recordIds = []
    crudParams.queryParams = {}
    crudParams.skip = 0
    crudParams.limit = 5
    crudParamOptions.getAllRecords = true
    res = await CategoryModel.get(crudParams, crudParamOptions);
    resValue = res.value as unknown as GetResultType
    recLen = resValue.records?.length || 0
    recCount = resValue.stats?.recordsCount || 0
    test5.setTestFunction(() => {
        test5.assertEquals(res.code, "success", `response-code should be: success`);
        test5.assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
        test5.assertEquals(recLen, 5, `response-value-records-length should be: 5`);
        test5.assertEquals(recCount, 5, `response-value-stats-recordsCount should be: 5`);
    })
    const test5Result = test5.runTest()
    results.push(test5Result)

    testResult(results);
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0);

})();
