import { CrudParamsType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptions } from "../config";
import {
    auditColl, crudParamOptions, DeleteGroupById, DeleteGroupByIds, DeleteGroupByParams, groupCollDelete,
    groupCollDeleteAll, GroupModel,
    testUserInfo
} from "./testData";
import { assertEquals, mcTest, postTestResult } from "@mconnect/mctest";

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

    await mcTest({
        name    : "should delete record by Id and return success or notFound or subItems [delete-record-method]:",
        testFunc: async () => {
            crudParams.tableName = groupCollDelete
            crudParams.recordIds = [DeleteGroupById]
            crudParams.queryParams = {}
            const res = await GroupModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-id-res: ", res)
            const resCode = res.code === "success" || res.code === "notFound" || res.code === "subItems"
            assertEquals(resCode, true, `res-code should be success or notFound or subItems:`);
        }
    });

    await mcTest({
        name    : "should delete record by Ids and return success or notFound or subItems [delete-record-method]:",
        testFunc: async () => {
            crudParams.tableName = groupCollDelete;
            crudParams.recordIds = DeleteGroupByIds;
            crudParams.queryParams = {};
            const res = await GroupModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-ids-res: ", res)
            const resCode = res.code === "success" || res.code === "notFound" || res.code === "subItems"
            assertEquals(resCode, true, `res-code should be success or notFound or subItems`);
        }
    });

    await mcTest({
        name    : "should delete records by queryParams and return success or notFound or subItems[delete-record-method]:",
        testFunc: async () => {
            crudParams.tableName = groupCollDelete
            crudParams.recordIds = []
            crudParams.queryParams = DeleteGroupByParams
            const res = await GroupModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-params-res: ", res)
            const resCode = res.code === "success" || res.code === "notFound" || res.code === "subItems"
            assertEquals(resCode, true, `res-code should be success or notFound or subItems:`);
        }
    });

    await mcTest({
        name    : "should prevent deletion of all records, only by recordIds or queryParams only [delete-record-method]:",
        testFunc: async () => {
            crudParams.tableName = groupCollDeleteAll
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const res = await GroupModel.delete(crudParams, crudParamOptions);
            console.log("delete-all-res: ", res)
            const resCode = res.code !== "success"
            assertEquals(res.code, "removeError", `res-code should be removeError:`);
            assertEquals(resCode, true, `res-code should be removeError:`);
        }
    });

    await postTestResult();
    await appDbLocalInstance.closeDb();
    await auditDbLocalInstance.closeDb();
    process.exit(0);

})();
