import { assertEquals, assertNotEquals, mcTest, postTestResult } from '@mconnect/mctest';
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "./config";
import { CrudOptionsType, CrudParamsType, GetResultType, newDbMongo, newGetRecord } from "../src";
import {
    GetTable, TestUserInfo, GetAuditById, GetAuditByIds, GetAuditByParams, AuditTable,
} from "./testData";

const appDbInstance = newDbMongo(appDbLocal, dbOptionsLocal);
const auditDbInstance = newDbMongo(auditDbLocal, dbOptionsLocal);

(async () => {
    // DB clients/handles
    const appDbHandle = await appDbInstance.openDb()
    const appDbClient = await appDbInstance.mgServer()
    const auditDbHandle = await auditDbInstance.openDb()
    const auditDbClient = await auditDbInstance.mgServer()

    const crudParams: CrudParamsType = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDbLocal.database || "mcdev",
        coll       : GetTable,
        userInfo   : TestUserInfo,
        docIds     : [],
        queryParams: {},
    };

    const crudOptions: CrudOptionsType = {
        auditDb      : auditDbHandle,
        auditDbClient: auditDbClient,
        auditDbName  : auditDbLocal.database || "mcdevaudit",
        auditColl    : AuditTable,
        userId       : TestUserInfo.userId,
        checkAccess  : false,
        logCrud      : true,
        logRead      : true,
        logCreate    : true,
        logDelete    : true,
        logUpdate    : true,
        cacheResult  : false,
    }

    await mcTest({
        name    : 'should get records by Id and return success:',
        testFunc: async () => {
            crudParams.docIds = [GetAuditById]
            crudParams.queryParams = {}
            const crud = newGetRecord(crudParams, crudOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType<any>
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 1, `response-value-records-length should be: 1`);
            assertEquals(recCount, 1, `response-value-stats-recordsCount should be: 1`);
        }
    });

    await mcTest({
        name    : 'should get records by Ids and return success:',
        testFunc: async () => {
            crudParams.docIds = GetAuditByIds
            crudParams.queryParams = {}
            const crud = newGetRecord(crudParams, crudOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType<any>
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 2, `response-value-records-length should be: 2`);
            assertEquals(recCount, 2, `response-value-stats-recordsCount should be: 2`);
        }
    });

    await mcTest({
        name    : 'should get records by query-params and return success:',
        testFunc: async () => {
            crudParams.docIds = []
            crudParams.queryParams = GetAuditByParams
            const crud = newGetRecord(crudParams, crudOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType<any>
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
            assertEquals(recLen > 0, true, `response-value-records-length should be: > 0`);
            assertEquals(recCount > 0, true, `response-value-stats-recordsCount should be:  > 0`);
        }
    });

    await mcTest({
        name    : 'should get all records and return success:',
        testFunc: async () => {
            crudParams.coll = GetTable
            crudParams.docIds = []
            crudParams.queryParams = {}
            crudOptions.getAllRecords = true
            const crud = newGetRecord(crudParams, crudOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType<any>
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
            assertEquals(recLen > 20, true, `response-value-records-length should be: > 20`);
            assertEquals(recCount > 20, true, `response-value-stats-recordsCount should be:  > 20`);
        }
    });

    await mcTest({
        name    : 'should get all records by limit/skip(offset) and return success:',
        testFunc: async () => {
            crudParams.coll = GetTable
            crudParams.docIds = []
            crudParams.queryParams = {}
            crudParams.skip = 0
            crudParams.limit = 20
            crudOptions.getAllRecords = true
            const crud = newGetRecord(crudParams, crudOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType<any>
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 20, `response-value-records-length should be: 20`);
            assertEquals(recCount, 20, `response-value-stats-recordsCount should be: 20`);
        }
    });

    await postTestResult();
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();

})();
