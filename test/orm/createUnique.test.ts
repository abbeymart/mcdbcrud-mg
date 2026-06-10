import { CrudParamsType, CrudResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../../src/config/secure/config";
import {
    auditColl, crudParamOptions, groupColl, GroupCreateNonUniqueDocuments, GroupModel, testUserInfo
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
        tableName  : groupColl,
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
        name: "should return record-exists or saveError for creating duplicate documents:",
    })
    crudParams.actionParams = GroupCreateNonUniqueDocuments;
    crudParams.recordIds = [];
    crudParams.queryParams = {};
    const recLen = crudParams.actionParams?.length || 0;
    const res = await GroupModel.save(crudParams, crudParamOptions);
    console.log("create-result: ", res);
    const resValue = res.value as unknown as CrudResultType;
    const recCount = resValue.recordsCount || 0;

    test1.setTestFunction(() => {
        test1.assertEquals(res.code === "exists" || res.code === "recordExist" || res.code === "saveError", true, `create-task should return record-exists or saveError`);
        test1.assertEquals(res.code !== "success", true, `create-task should return record-exists or saveError`);
        test1.assertEquals(recCount < recLen, true, `response-value-recordsCount < ${recLen} should be true`);
    });
    const test1Result = test1.runTest();
    results.push(test1Result);


    testResult(results);
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0);

})();
