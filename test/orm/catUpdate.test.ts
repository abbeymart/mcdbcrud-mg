import { CrudParamsType, CrudResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../../src/config/secure/config";
import {
    auditColl, categoryColl, CategoryModel, CategoryUpdateActionParams, CategoryUpdateActionParamsUniqueConstraint,
    crudParamOptions, groupColl, GroupModel, GroupUpdateCategoryCascade, testUserInfo,
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
        tableName  : categoryColl,
        userInfo   : testUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    // let crudParamOptions: CrudOptionsType = {};
    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDbLocal.database;
    crudParamOptions.auditTable = auditColl;

    const results: Array<UnitTestResult> = []

    const test1 = newTest({
        name: "should update two existing records and return success:",
    })
    crudParams.tableName = categoryColl;
    crudParams.actionParams = CategoryUpdateActionParams;
    crudParams.recordIds = []
    crudParams.queryParams = {}
    let recLen = crudParams.actionParams?.length || 0
    let res = await CategoryModel.save(crudParams, crudParamOptions);
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
        name: "should return recordExist for unique-constraint update:",
    })
    crudParams.tableName = categoryColl;
    crudParams.actionParams = [CategoryUpdateActionParamsUniqueConstraint]
    crudParams.recordIds = []
    crudParams.queryParams = {};
    recLen = crudParams.actionParams.length
    res = await CategoryModel.save(crudParams, crudParamOptions);
    console.log("update-result: ", res);
    resValue = res.value as unknown as CrudResultType;
    recCount = resValue.recordsCount || 0
    test2.setTestFunction(() => {
        test2.assertEquals(res.code === "exists" || res.code === "saveError", true, `update-task should return recordExist`);
        test2.assertEquals(res.code !== "success", true, `update-task should return existError or updateError`);
        test2.assertEquals(recCount < recLen, true, `response-value-recordsCount < ${recLen} should be true`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    const test3 = newTest({
        name: "should update group and return success:"
    })
    crudParams.tableName = groupColl;
    crudParams.actionParams = [GroupUpdateCategoryCascade];
    crudParams.recordIds = []
    crudParams.queryParams = {}
    recLen = crudParams.actionParams.length
    res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("update-result: ", res);
    resValue = res.value as unknown as CrudResultType;
    recCount = resValue.recordsCount || 0
    test3.setTestFunction(() => {
        test3.assertEquals(res.code, "success", `update-task should return code: success`);
        test3.assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    })
    const test3Result = test3.runTest();
    results.push(test3Result);

    testResult(results);
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0);

})();
