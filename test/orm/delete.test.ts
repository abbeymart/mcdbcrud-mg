import { assertEquals, mcTest, postTestResult, } from "../../test_deps.ts";
import { CrudParamsType, newDbMongo, AuditType } from "../../src/index.ts";
import {
    DeleteGroupById, DeleteGroupByIds, DeleteGroupByParams, groupCollDelete, groupCollDeleteAll, GroupModel
} from "./testData.ts";
import { appDb, auditDb, dbOptions } from "../config/secure/config.ts";
import { auditColl, crudParamOptions, testUserInfo } from "../testData.ts";

(async () => {
    // DB clients/handles
    const appDbInstance = newDbMongo(appDb, dbOptions);
    const auditDbInstance = newDbMongo(auditDb, dbOptions);

    const appDbHandle = await appDbInstance.openDb();
    const appDbClient = await appDbInstance.mgServer();
    const auditDbHandle = await auditDbInstance.openDb();
    const auditDbClient = await auditDbInstance.mgServer();

    const crudParams: CrudParamsType<AuditType> = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        coll       : groupCollDelete,
        userInfo   : testUserInfo,
        docIds     : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditColl = auditColl;

    await mcTest({
        name    : "should delete record by Id and return success [delete-record-method]:",
        testFunc: async () => {
            crudParams.coll = groupCollDelete
            crudParams.docIds = [DeleteGroupById]
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
            crudParams.coll = groupCollDelete;
            crudParams.docIds = DeleteGroupByIds;
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
            crudParams.coll = groupCollDelete
            crudParams.docIds = []
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
            crudParams.coll = groupCollDeleteAll
            crudParams.docIds = []
            crudParams.queryParams = {}
            const res = await GroupModel.delete(crudParams, crudParamOptions);
            console.log("delete-all-res: ", res)
            const resCode = res.code !== "success"
            assertEquals(res.code, "removeError", `res-code should be removeError:`);
            assertEquals(resCode, true, `res-code should be removeError:`);
        }
    });

    postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
