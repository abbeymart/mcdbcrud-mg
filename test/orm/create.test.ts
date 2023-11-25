import { assertEquals, mcTest, postTestResult } from "../../test_deps.ts";
import { CrudParamsType, CrudResultType, newDbMongo, } from "../../src/index.ts";
import {
    groupColl, GroupCreateRecNameConstraint, GroupModel,
    GroupType, GroupCreateRec1, GroupCreateActionParams,
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

    const crudParams: CrudParamsType<GroupType> = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        coll       : groupColl,
        userInfo   : testUserInfo,
        docIds     : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditColl = auditColl;

    await mcTest({
        name    : "should create ten new records and return success:",
        testFunc: async () => {
            crudParams.actionParams = GroupCreateActionParams;
            crudParams.docIds = [];
            crudParams.queryParams = {};
            const recLen = crudParams.actionParams?.length || 0;
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("create-result: ", res);
            const resValue = res.value as unknown as CrudResultType<GroupType>;
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
            crudParams.docIds = [];
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
            crudParams.docIds = [];
            crudParams.queryParams = {};
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("create-result: ", res);
            assertEquals(res.code === "paramsError", true, `create-task should return existError`);
            assertEquals(res.code !== "success", true, `create-task should return createError`);
        }
    });

    postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
