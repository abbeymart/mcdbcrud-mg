import { CrudParamsType, newDbMongo } from "../../src";
import { appDb, auditDb, dbOptions } from "../config";
import {
    auditColl, crudParamOptions, DeleteGroupById, DeleteGroupByIds, DeleteGroupByParams, groupCollDelete,
    groupCollDeleteAll, GroupModel,
    testUserInfo
} from "./testData";
import { assertEquals, mcTest, postTestResult } from "@mconnect/mctest";

(async () => {
    // DB clients/handles
    const appDbInstance = newDbMongo(appDb, dbOptions);
    const auditDbInstance = newDbMongo(auditDb, dbOptions);

    const appDbHandle = await appDbInstance.openDb();
    const appDbClient = await appDbInstance.mgServer();
    const auditDbHandle = await auditDbInstance.openDb();
    const auditDbClient = await auditDbInstance.mgServer();

    const crudParams: CrudParamsType = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        tableName  : groupCollDelete,
        userInfo   : testUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditTable = auditColl;

    await mcTest({
        name    : "should delete record by Id and return success [delete-record-method]:",
        testFunc: async () => {
            crudParams.tableName = groupCollDelete
            crudParams.recordIds = [DeleteGroupById]
            crudParams.queryParams = {}
            const res = await GroupModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-id-res: ", res)
            const resCode = res.code === "success"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await mcTest({
        name    : "should delete record by Ids and return success [delete-record-method]:",
        testFunc: async () => {
            crudParams.tableName = groupCollDelete;
            crudParams.recordIds = DeleteGroupByIds;
            crudParams.queryParams = {};
            const res = await GroupModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-ids-res: ", res)
            const resCode = res.code === "success"
            assertEquals(resCode, true, `res-code should be success`);
        }
    });

    await mcTest({
        name    : "should delete records by query-params and return success[delete-record-method]:",
        testFunc: async () => {
            crudParams.tableName = groupCollDelete
            crudParams.recordIds = []
            crudParams.queryParams = DeleteGroupByParams
            const res = await GroupModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-params-res: ", res)
            const resCode = res.code === "success"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await mcTest({
        name    : "should prevent deletion of all records, only by docIds or queryParams only [delete-record-method]:",
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
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
