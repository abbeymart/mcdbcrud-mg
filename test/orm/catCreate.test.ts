import { CrudParamsType, CrudResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../../src/config/secure/config";
import {
    auditColl, categoryColl, CategoryCreateActionParams, CategoryModel, crudParamOptions, testUserInfo
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

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDbLocal.database;
    crudParamOptions.auditTable = auditColl;

    const results: Array<UnitTestResult> = []

    const test1 = newTest({
        name: "should create ten new category documents and return success:",
    })
    crudParams.actionParams = CategoryCreateActionParams;
    crudParams.recordIds = []
    crudParams.queryParams = {}
    let recLen = crudParams.actionParams?.length || 0
    let res = await CategoryModel.save(crudParams, crudParamOptions);
    console.log("create-result: ", res);
    let resValue = res.value as unknown as CrudResultType
    let idLen = resValue.recordIds?.length || 0
    let recCount = resValue.recordsCount || 0
    test1.setTestFunction(() => {
        test1.assertEquals(res.code, "success", `create-task should return code: success`);
        test1.assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
        test1.assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    testResult(results);
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0);
})();
