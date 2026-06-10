import { CrudParamsType, CrudResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../../src/config/secure/config";
import {
    auditColl, crudParamOptions, groupCollCreate, GroupCreateActionParams, GroupCreateRec1,
    GroupCreateRecNameConstraint, GroupModel, testUserInfo,
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
        tableName  : groupCollCreate,
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
        name: "should create ten new records and return success:",
    })
    crudParams.actionParams = GroupCreateActionParams;
    crudParams.recordIds = [];
    crudParams.queryParams = {};
    let recLen = crudParams.actionParams?.length || 0;
    let res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("create-result: ", res);
    let resValue = res.value as unknown as CrudResultType;
    let idLen = resValue.recordIds?.length || 0;
    let recCount = resValue.recordsCount || 0;

    test1.setTestFunction(() => {
        test1.assertEquals(res.code, "success", `create-task should return code: success`);
        test1.assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
        test1.assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    const test2 = newTest({
        name: "should return error creating a non-unique/existing record/document:",
    })
    crudParams.actionParams = [GroupCreateRec1];
    crudParams.recordIds = [];
    crudParams.queryParams = {};
    res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("create-result: ", res);
    test2.setTestFunction(() => {
        test2.assertEquals(res.code === "exists" || res.code === "recordExist", true, `create-task should return recordExist`);
        test2.assertEquals(res.code !== "success", true, `create-task should return existError`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    const test3 = newTest({
        name: "should return error creating a record/document due to name-length constraint error:",
    })
    crudParams.actionParams = [GroupCreateRecNameConstraint];
    crudParams.recordIds = [];
    crudParams.queryParams = {};
    res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("create-result: ", res);

    test3.setTestFunction(() => {
        test3.assertEquals(res.code === "paramsError", true, `create-task should return paramsError`);
        test3.assertEquals(res.code !== "success", true, `create-task should return paramsError`);
    })
    const test3Result = test3.runTest()
    results.push(test3Result)

    testResult(results);
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0);

})();
