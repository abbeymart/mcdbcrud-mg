import { CrudParamsType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptions } from "../../src/config/secure/config";
import {
    auditColl, crudParamOptions, DeleteGroupById, DeleteGroupByIds, DeleteGroupByParams, groupCollDelete,
    groupCollDeleteAll, GroupModel, testUserInfo
} from "../../src/config/ormTestData";
import { newTest, testResult, UnitTestResult } from "@mconnect/mctest";

(async () => {
    // DB clients/handles
    const appDbLocalInstance = newDbMongo(appDbLocal, dbOptions);
    const auditDbLocalInstance = newDbMongo(auditDbLocal, dbOptions);

    const appDbLocalHandle = await appDbLocalInstance.openDb();
    const appDbLocalClient = await appDbLocalInstance.mgServer();
    const auditDbLocalHandle = await auditDbLocalInstance.openDb();
    const auditDbLocalClient = await auditDbLocalInstance.mgServer();

    const crudParams: CrudParamsType = {
        appDb      : appDbLocalHandle,
        dbClient   : appDbLocalClient,
        dbName     : appDbLocal.database || "",
        tableName  : groupCollDelete,
        userInfo   : testUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbLocalHandle;
    crudParamOptions.auditDbClient = auditDbLocalClient;
    crudParamOptions.auditDbName = appDbLocal.database;
    crudParamOptions.auditTable = auditColl;

    const results: Array<UnitTestResult> = []

    const test1 = newTest({
        name: "should delete record by Id and return success or notFound or subItems [delete-record-method]:",
    });
    crudParams.tableName = groupCollDelete
    crudParams.recordIds = [DeleteGroupById]
    crudParams.queryParams = {}
    let res = await GroupModel.delete(crudParams, crudParamOptions);
    console.log("delete-by-id-res: ", res)
    let resCode = res.code === "success" || res.code === "notFound" || res.code === "subItems"
    test1.setTestFunction(() => {
        test1.assertEquals(resCode, true, `res-code should be success or notFound or subItems:`);
    });

    const test1Result = test1.runTest();
    results.push(test1Result);

    const test2 = newTest({
        name: "should delete record by Ids and return success or notFound or subItems [delete-record-method]:",
    });
    crudParams.tableName = groupCollDelete;
    crudParams.recordIds = DeleteGroupByIds;
    crudParams.queryParams = {};
    res = await GroupModel.delete(crudParams, crudParamOptions);
    console.log("delete-by-ids-res: ", res)
    resCode = res.code === "success" || res.code === "notFound" || res.code === "subItems"
    test2.setTestFunction(() => {
        test2.assertEquals(resCode, true, `res-code should be success or notFound or subItems`);
    });
    const test2Result = test2.runTest();
    results.push(test2Result);

    const test3 = newTest({
        name: "should delete records by queryParams and return success or notFound or subItems[delete-record-method]:",
    });
    crudParams.tableName = groupCollDelete
    crudParams.recordIds = []
    crudParams.queryParams = DeleteGroupByParams
    res = await GroupModel.delete(crudParams, crudParamOptions);
    console.log("delete-by-params-res: ", res)
    resCode = res.code === "success" || res.code === "notFound" || res.code === "subItems"
    test3.setTestFunction(() => {
        test3.assertEquals(resCode, true, `res-code should be success or notFound or subItems:`);
    });
    const test3Result = test3.runTest();
    results.push(test3Result);

    const test4 = newTest({
        name: "should prevent deletion of all records, only by recordIds or queryParams only [delete-record-method]:",
    })
    crudParams.tableName = groupCollDeleteAll
    crudParams.recordIds = []
    crudParams.queryParams = {}
    res = await GroupModel.delete(crudParams, crudParamOptions);
    console.log("delete-all-res: ", res)
    resCode = res.code !== "success"

    test4.setTestFunction(() => {
        test4.assertEquals(res.code, "removeError", `res-code should be removeError:`);
        test4.assertEquals(resCode, true, `res-code should be removeError:`);
    });
    const test4Result = test4.runTest();
    results.push(test4Result);

    testResult(results);
    await appDbLocalInstance?.closeDb();
    await auditDbLocalInstance?.closeDb();
    process.exit(0);

})();
