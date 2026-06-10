import { newTest, testResult, UnitTestResult } from "@mconnect/mctest";
import {
    auditColl, categoryColl, CategoryModel, crudParamOptions, DeleteCategoryWithSubItemById,
    DeleteGroupWithCategoriesById, groupColl, GroupModel, testUserInfo
} from "../../src/config/ormTestData";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../../src/config/secure/config";
import { CrudParamsType, newDbMongo } from "../../src";

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
        name: "should return subItems for record/document with sub-items (different table/collection, i.e. foreignKey):",
    })
    crudParams.tableName = groupColl
    crudParams.recordIds = [DeleteGroupWithCategoriesById]
    crudParams.queryParams = {}
    let res = await GroupModel.delete(crudParams, crudParamOptions);
    console.log("delete-by-id-res: ", res)
    test1.setTestFunction(() => {
        test1.assertEquals(res.code, "subItems", `res-code should be subItems:`);
    })
    const test1Result = test1.runTest()
    results.push(test1Result)

    const test2 = newTest({
        name: "should return subItems for record/document with sub-items (same table/collection, i.e. parentId):",
    })
    crudParams.tableName = categoryColl
    crudParams.recordIds = [DeleteCategoryWithSubItemById]
    crudParams.queryParams = {}
    res = await CategoryModel.delete(crudParams, crudParamOptions);
    console.log("delete-by-id-res: ", res)
    const resCode = res.code === "subItems"
    test2.setTestFunction(() => {
        test2.assertEquals(resCode, true, `res-code should be subItems:`);
        test2.assertEquals(res.code, "subItems", `res-code should be subItems:`);
    })
    const test2Result = test2.runTest()
    results.push(test2Result)

    testResult(results);
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0);

})();
