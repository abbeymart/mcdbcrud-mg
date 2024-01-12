import { CrudParamsType, GetResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../config";
import {
    auditColl, categoryColl, CategoryModel, crudParamOptions, GetCategoryById, GetCategoryByIds,
    GetCategoryByParams, testUserInfo
} from "./testData";
import { assertEquals, assertNotEquals, mcTest, postTestResult } from "@mconnect/mctest";

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

    await mcTest({
        name    : "should get records by Id and return success:",
        testFunc: async () => {
            crudParams.recordIds = [GetCategoryById]
            crudParams.queryParams = {}
            const res = await CategoryModel.get(crudParams, crudParamOptions);
            const resValue = res.value as unknown as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 1, `response-value-records-length should be: 1`);
            assertEquals(recCount, 1, `response-value-stats-recordsCount should be: 1`);
        }
    });

    await mcTest({
        name    : "should get records by Ids and return success:",
        testFunc: async () => {
            crudParams.recordIds = GetCategoryByIds;
            crudParams.queryParams = {};
            const res = await CategoryModel.get(crudParams, crudParamOptions);
            const resValue = res.value as unknown as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 2, `response-value-records-length should be: 2`);
            assertEquals(recCount, 2, `response-value-stats-recordsCount should be: 2`);
        }
    });

    await mcTest({
        name    : "should get records by query-params and return success:",
        testFunc: async () => {
            crudParams.recordIds = [];
            crudParams.queryParams = GetCategoryByParams;
            const res = await CategoryModel.get(crudParams, crudParamOptions);
            const resValue = res.value as unknown as GetResultType;
            const recLen = resValue.records?.length || 0;
            const recCount = resValue.stats?.recordsCount || 0;
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen > 0, true, `response-value-records-length should be: > 0`);
            assertEquals(recCount > 0, true, `response-value-stats-recordsCount should be:  > 0`);
        }
    });

    await mcTest({
        name    : "should get all records and return success:",
        testFunc: async () => {
            crudParams.tableName = categoryColl
            crudParams.recordIds = []
            crudParams.queryParams = {}
            crudParamOptions.getAllRecords = true
            crudParamOptions.checkAccess = false;
            const res = await CategoryModel.lookupGet(crudParams, crudParamOptions);
            const resValue = res.value as unknown as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen > 5, true, `response-value-records-length should be: > 5`);
            assertEquals(recCount > 5, true, `response-value-stats-recordsCount should be:  > 5`);
        }
    });

    await mcTest({
        name    : "should get all records by limit/skip(offset) and return success:",
        testFunc: async () => {
            crudParams.tableName = categoryColl
            crudParams.recordIds = []
            crudParams.queryParams = {}
            crudParams.skip = 0
            crudParams.limit = 5
            crudParamOptions.getAllRecords = true
            const res = await CategoryModel.get(crudParams, crudParamOptions);
            const resValue = res.value as unknown as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, "unAuthorized", `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 5, `response-value-records-length should be: 5`);
            assertEquals(recCount, 5, `response-value-stats-recordsCount should be: 5`);
        }
    });

    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();
    process.exit(0);

})();
