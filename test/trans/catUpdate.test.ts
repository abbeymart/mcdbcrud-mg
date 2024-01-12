import { CrudParamsType, CrudResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../config";
import {
    auditColl, categoryColl, CategoryModel, CategoryUpdateActionParams, CategoryUpdateActionParamsUniqueConstraint,
    crudParamOptions, groupColl, GroupModel,
    GroupUpdateCategoryCascade, testUserInfo,
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
        tableName  : categoryColl,
        userInfo   : testUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    // let crudParamOptions: CrudOptionsType = {};
    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDbLocal.database;
    crudParamOptions.auditTable = auditColl;

    await mcTest({
        name    : "should update two existing records and return success:",
        testFunc: async () => {
            crudParams.tableName = categoryColl;
            crudParams.actionParams = CategoryUpdateActionParams;
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams?.length || 0
            const res = await CategoryModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType;
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : "should return recordExist for unique-constraint update:",
        testFunc: async () => {
            crudParams.tableName = categoryColl;
            crudParams.actionParams = [CategoryUpdateActionParamsUniqueConstraint]
            crudParams.recordIds = []
            crudParams.queryParams = {};
            const recLen = crudParams.actionParams.length
            const res = await CategoryModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType;
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code === "exists" || res.code === "saveError", true, `create-task should return recordExist`);
            assertEquals(res.code !== "success", true, `create-task should return existError or updateError`);
            assertEquals(recCount < recLen, true, `response-value-recordsCount < ${recLen} should be true`);
        }
    });

    await mcTest({
        name    : "should update group and return success:",
        testFunc: async () => {
            crudParams.tableName = groupColl;
            crudParams.actionParams = [GroupUpdateCategoryCascade];
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams.length
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType;
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();
    process.exit(0);

})();
