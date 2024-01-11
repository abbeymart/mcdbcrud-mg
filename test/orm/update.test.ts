import { CrudParamsType, CrudResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../config";
import {
    auditColl, crudParamOptions, groupCollUpdate, GroupModel,
    GroupUpdateActionParams, GroupUpdateRecordById, GroupUpdateRecordByParam,
    testUserInfo, UpdateGroupById, UpdateGroupByIds, UpdateGroupByParams
} from "./testData";
import { assertEquals, mcTest, postTestResult } from "@mconnect/mctest";

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
        tableName  : groupCollUpdate,
        userInfo   : testUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDbLocal.database;
    crudParamOptions.auditTable = auditColl;

    await mcTest({
        name    : "should update two existing documents and return success:",
        testFunc: async () => {
            crudParams.tableName = groupCollUpdate;
            crudParams.actionParams = GroupUpdateActionParams;
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams?.length || 0
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType;
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should update a record by Id and return success:",
        testFunc: async () => {
            crudParams.tableName = groupCollUpdate
            crudParams.actionParams = [GroupUpdateRecordById]
            crudParams.recordIds = [UpdateGroupById]
            crudParams.queryParams = {}
            const recLen = crudParams.recordIds.length;
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType;
            const recCount = resValue.recordsCount || 0;
            assertEquals(res.code, "success", `update-by-id-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should update records by query-params and return success for updating single record:",
        testFunc: async () => {
            crudParams.tableName = groupCollUpdate;
            crudParams.actionParams = [GroupUpdateRecordByParam]
            crudParams.recordIds = []
            crudParams.queryParams = UpdateGroupByParams;
            const recLen = 0
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType;
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `create-task should return code: success`);
            assertEquals(recCount > recLen, true, `response-value-recordsCount should be >: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should return unique-error [paramsError, exists or saveError] for updating multiple-records by Ids:",
        testFunc: async () => {
            crudParams.tableName = groupCollUpdate
            crudParams.actionParams = [GroupUpdateRecordById]
            crudParams.recordIds = UpdateGroupByIds
            crudParams.queryParams = {}
            const recLen = crudParams.recordIds.length;
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType;
            const recCount = resValue.recordsCount || 0;
            assertEquals(res.code === "paramsError" || res.code === "exists" || res.code === "recExists" || res.code === "saveError", true, `update-task should return paramsError for multiple records update`);
            assertEquals(res.code !== "success", true, `create-task should return existError or updateError`);
            assertEquals(recCount < recLen, true, `response-value-recordsCount < ${recLen} should be true`);
        }
    });

    await mcTest({
        name    : "should return error updating a non-unique/existing document:",
        testFunc: async () => {
            crudParams.tableName = groupCollUpdate
            crudParams.actionParams = [GroupUpdateRecordByParam]
            crudParams.recordIds = [UpdateGroupById]
            crudParams.queryParams = {};
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("create-result: ", res);
            assertEquals(res.code === "recordExist" || res.code === "exists", true, `create-task should return recordExist/exist`);
            assertEquals(res.code !== "success", true, `create-task should return recordExist or updateError`);
        }
    });

    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();
    process.exit(0);

})();
