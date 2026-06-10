import { CrudParamsType, CrudResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../../src/config/secure/config";
import {
    auditColl, crudParamOptions, groupCollUpdate, GroupModel, GroupUpdateActionParams, GroupUpdateRecordById,
    GroupUpdateRecordByParam, testUserInfo, UpdateGroupById, UpdateGroupByIds, UpdateGroupByParams
} from "../../src/config/ormTestData";
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
        tableName  : groupCollUpdate,
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
        name: "should update two existing documents and return success:"
    })
    crudParams.tableName = groupCollUpdate;
    crudParams.actionParams = GroupUpdateActionParams;
    crudParams.recordIds = []
    crudParams.queryParams = {}
    let recLen = crudParams.actionParams?.length || 0
    let res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("update-result: ", res);
    let resValue = res.value as unknown as CrudResultType;
    let recCount = resValue.recordsCount || 0
    test1.setTestFunction(() => {
        test1.assertEquals(res.code, "success", `update-task should return code: success`);
        test1.assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    const test2 = newTest({
        name: "should update a record by Id and return success:",
    })
    crudParams.tableName = groupCollUpdate
    crudParams.actionParams = [GroupUpdateRecordById]
    crudParams.recordIds = [UpdateGroupById]
    crudParams.queryParams = {}
    recLen = crudParams.recordIds.length;
    res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("update-result: ", res);
    resValue = res.value as unknown as CrudResultType;
    recCount = resValue.recordsCount || 0;
    test2.setTestFunction(() => {
        test2.assertEquals(res.code, "success", `update-by-id-task should return code: success`);
        test2.assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    const test3 = newTest({
        name: "should update records by query-params and return success for updating single record:",
    })
    crudParams.tableName = groupCollUpdate;
    crudParams.actionParams = [GroupUpdateRecordByParam]
    crudParams.recordIds = []
    crudParams.queryParams = UpdateGroupByParams;
    recLen = 0
    res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("update-result: ", res);
    resValue = res.value as unknown as CrudResultType;
    recCount = resValue.recordsCount || 0
    test3.setTestFunction(() => {
        test3.assertEquals(res.code, "success", `create-task should return code: success`);
        test3.assertEquals(recCount > recLen, true, `response-value-recordsCount should be >: ${recLen}`);
    })
    const test3Result = test3.runTest()
    results.push(test3Result)

    const test4 = newTest({
        name: "should return unique-error [paramsError, exists or saveError] for updating multiple-records by Ids:",
    })
    crudParams.tableName = groupCollUpdate
    crudParams.actionParams = [GroupUpdateRecordById]
    crudParams.recordIds = UpdateGroupByIds
    crudParams.queryParams = {}
    recLen = crudParams.recordIds.length;
    res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("update-result: ", res);
    resValue = res.value as unknown as CrudResultType;
    recCount = resValue.recordsCount || 0;
    test4.setTestFunction(() => {
        test4.assertEquals(res.code === "paramsError" || res.code === "exists" || res.code === "recExists" || res.code === "saveError", true, `update-task should return paramsError for multiple records update`);
        test4.assertEquals(res.code !== "success", true, `create-task should return existError or updateError`);
        test4.assertEquals(recCount < recLen, true, `response-value-recordsCount < ${recLen} should be true`);
    })
    const test4Result = test4.runTest()
    results.push(test4Result)

    const test5 = newTest({
        name: "should return error updating a non-unique/existing document:",
    })
    crudParams.tableName = groupCollUpdate
    crudParams.actionParams = [GroupUpdateRecordByParam]
    crudParams.recordIds = [UpdateGroupById]
    crudParams.queryParams = {};
    res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("create-result: ", res);
    test5.setTestFunction(() => {
        test5.assertEquals(res.code === "recordExist" || res.code === "exists", true, `create-task should return recordExist/exist`);
        test5.assertEquals(res.code !== "success", true, `create-task should return recordExist or updateError`);
    })
    const test5Result = test5.runTest()
    results.push(test5Result)

    testResult(results);
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0);

})();
