import { assertEquals, mcTest, postTestResult } from "../../test_deps.ts";
import {
    AuditType, CrudParamsType, CrudResultType,
    newDbMongo,
} from "../../src/index.ts";
import {
    categoryColl, CategoryModel, CategoryUpdateActionParams,
    CategoryUpdateActionParamsUniqueConstraint, groupColl, GroupUpdateCategoryCascade,
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
        coll       : categoryColl,
        userInfo   : testUserInfo,
        docIds     : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditColl = auditColl;

    // await mcTest({
    //     name    : "should update two existing records and return success:",
    //     testFunc: async () => {
    //         crudParams.coll = categoryColl;
    //         crudParams.actionParams = CategoryUpdateActionParams;
    //         crudParams.docIds = []
    //         crudParams.queryParams = {}
    //         const recLen = crudParams.actionParams?.length || 0
    //         const res = await CategoryModel.save(crudParams, crudParamOptions);
    //         console.log("update-result: ", res);
    //         const resValue = res.value as unknown as CrudResultType<AuditType>;
    //         const recCount = resValue.recordsCount || 0
    //         assertEquals(res.code, "success", `update-task should return code: success`);
    //         assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
    //     }
    // });

    // await mcTest({
    //     name    : "should return recordExist for unique-constraint update:",
    //     testFunc: async () => {
    //         crudParams.coll = categoryColl;
    //         crudParams.actionParams = [CategoryUpdateActionParamsUniqueConstraint]
    //         crudParams.docIds = []
    //         crudParams.queryParams = {};
    //         const recLen = crudParams.actionParams.length
    //         const res = await CategoryModel.save(crudParams, crudParamOptions);
    //         console.log("update-result: ", res);
    //         const resValue = res.value as unknown as CrudResultType<AuditType>;
    //         const recCount = resValue.recordsCount || 0
    //         assertEquals(res.code === "recordExist" || res.code === "updateError", true, `create-task should return recordExist`);
    //         assertEquals(res.code !== "success", true, `create-task should return existError or updateError`);
    //         assertEquals(recCount < recLen, true, `response-value-recordsCount < ${recLen} should be true`);
    //     }
    // });

    await mcTest({
        name    : "should update group and cascade changes to foreign collection/categories and return success:",
        testFunc: async () => {
            crudParams.coll = groupColl;
            crudParams.actionParams = [GroupUpdateCategoryCascade];
            crudParams.docIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams.length
            const res = await CategoryModel.save(crudParams, crudParamOptions);
            console.log("update-result: ", res);
            const resValue = res.value as unknown as CrudResultType<AuditType>;
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
