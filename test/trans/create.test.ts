import { CrudParamsType, CrudResultType, newDbMongo } from "../../src";
import { appDb, auditDb, dbOptions } from "../config";
import {
    auditColl, crudParamOptions,
    groupColl, GroupCreateActionParams, GroupCreateRec1, GroupCreateRecNameConstraint, GroupModel, testUserInfo
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
        tableName  : groupColl,
        userInfo   : testUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditTable = auditColl;

    await mcTest({
        name    : "should create ten new records and return success:",
        testFunc: async () => {
            crudParams.actionParams = GroupCreateActionParams;
            crudParams.recordIds = [];
            crudParams.queryParams = {};
            const recLen = crudParams.actionParams?.length || 0;
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("create-result: ", res);
            const resValue = res.value as unknown as CrudResultType;
            const idLen = resValue.recordIds?.length || 0;
            const recCount = resValue.recordsCount || 0;
            assertEquals(res.code, "success", `create-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should return error creating a non-unique/existing document:",
        testFunc: async () => {
            crudParams.actionParams = [GroupCreateRec1];
            crudParams.recordIds = [];
            crudParams.queryParams = {};
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("create-result: ", res);
            assertEquals(res.code === "recordExist", true, `create-task should return recordExist`);
            assertEquals(res.code !== "success", true, `create-task should return existError`);
        }
    });

    await mcTest({
        name    : "should return error creating a document due to name-length constraint error:",
        testFunc: async () => {
            crudParams.actionParams = [GroupCreateRecNameConstraint];
            crudParams.recordIds = [];
            crudParams.queryParams = {};
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("create-result: ", res);
            assertEquals(res.code === "paramsError", true, `create-task should return existError`);
            assertEquals(res.code !== "success", true, `create-task should return createError`);
        }
    });

    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();