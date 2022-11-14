import {assertEquals, assertNotEquals, mcTest, postTestResult} from '@mconnect/mctest';
import {appDb, appDbMongo, auditDbMongo} from "./config";
import {CrudOptionsType, CrudParamsType, GetResultType, newGetRecord} from "../src";
import {
    CrudParamOptions, GetTable, TestUserInfo, AuditModel, GetAuditById, GetAuditByIds, GetAuditByParams, AuditTable
} from "./testData";
import {Db, MongoClient} from "mongodb";

const appDbInstance = appDbMongo;
const auditDbInstance = auditDbMongo;

let appDbHandle: Db;
let appDbClient: MongoClient;
let auditDbHandle: Db;
let auditDbClient: MongoClient;


(async () => {
    // DB clients/handles
    appDbHandle = await appDbInstance.openDb()
    appDbClient = await appDbInstance.mgServer()
    auditDbHandle = await auditDbInstance.openDb()
    auditDbClient = await auditDbInstance.mgServer()

    const crudParams: CrudParamsType = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database,
        coll       : GetTable,
        userInfo   : TestUserInfo,
        docIds     : [],
        queryParams: {},
    };

    const crudOptions: CrudOptionsType = {
        auditDb      : auditDbHandle,
        auditDbClient: auditDbClient,
        auditDbName  : appDb.database,
        auditColl    : AuditTable,
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
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
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
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
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
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
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
            CrudParamOptions.getAllRecords = true
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
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
            CrudParamOptions.getAllRecords = true
            const crud = newGetRecord(crudParams, CrudParamOptions);
            const res = await crud.getRecord()
            const resValue = res.value as GetResultType
            const recLen = resValue.records?.length || 0
            const recCount = resValue.stats?.recordsCount || 0
            assertEquals(res.code, "success", `response-code should be: success`);
            assertNotEquals(res.code, 'unAuthorized', `response-code should be: success not unAuthorized`);
            assertEquals(recLen, 20, `response-value-records-length should be: 20`);
            assertEquals(recCount, 20, `response-value-stats-recordsCount should be: 20`);
        }
    });

    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
