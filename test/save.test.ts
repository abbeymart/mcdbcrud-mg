import {assertEquals, mcTest, postTestResult} from '@mconnect/mctest';
import {
    CrudOptionsType,
    CrudParamsType, CrudResultType, newSaveRecord
} from "../src";
import {
    AuditCreateActionParams, AuditTable, AuditUpdateActionParams, AuditUpdateRecordById, AuditUpdateRecordByParam,
    CrudParamOptions,
    GetTable, GroupModel, TestUserInfo, UpdateAuditById, UpdateAuditByIds, UpdateAuditByParams, UpdateTable
} from "./testData";
import {appDb, appDbMongo, auditDbMongo} from "./config";
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
    }

    await mcTest({
        name    : 'should create two new records [groups] and return success:',
        testFunc: async () => {
            crudParams.coll = UpdateTable
            crudParams.actionParams = AuditCreateActionParams
            crudParams.docIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams.length
            // const crud = newSaveRecord(crudParams, CrudParamOptions);
            const res = await GroupModel.save(crudParams, crudOptions)
            // console.log("create-result: ", res, res.code, res.value.docIds, res.value.recordCount)
            const resValue = res.value as CrudResultType
            const idLen = resValue.recordIds?.length || 0
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `create-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : 'should update two existing records and return success:',
        testFunc: async () => {
            crudParams.coll = UpdateTable
            crudParams.actionParams = AuditUpdateActionParams
            crudParams.docIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams.length
            const crud = newSaveRecord(crudParams, CrudParamOptions);
            const res = await crud.saveRecord()
            const resValue = res.value as CrudResultType
            const idLen = resValue.recordIds?.length || 0
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : 'should update a record by Id and return success:',
        testFunc: async () => {
            crudParams.coll = UpdateTable
            crudParams.actionParams = [AuditUpdateRecordById]
            crudParams.docIds = [UpdateAuditById]
            crudParams.queryParams = {}
            const recLen = crudParams.docIds.length
            const crud = newSaveRecord(crudParams, CrudParamOptions);
            const res = await crud.saveRecord()
            const resValue = res.value as CrudResultType
            const idLen = resValue.recordIds?.length || 0
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-by-id-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : 'should update records by Ids and return success:',
        testFunc: async () => {
            crudParams.coll = UpdateTable
            crudParams.actionParams = [AuditUpdateRecordById]
            crudParams.docIds = UpdateAuditByIds
            crudParams.queryParams = {}
            const recLen = crudParams.docIds.length
            const crud = newSaveRecord(crudParams, CrudParamOptions);
            const res = await crud.saveRecord()
            const resValue = res.value as CrudResultType
            const idLen = resValue.recordIds?.length || 0
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-by-id-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : 'should update records by query-params and return success:',
        testFunc: async () => {
            crudParams.coll = UpdateTable
            crudParams.actionParams = [AuditUpdateRecordByParam]
            crudParams.docIds = []
            crudParams.queryParams = UpdateAuditByParams
            const recLen = 0
            const crud = newSaveRecord(crudParams, CrudParamOptions);
            const res = await crud.saveRecord()
            const resValue = res.value as CrudResultType
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `create-task should return code: success`);
            assertEquals(recCount > recLen, true, `response-value-recordsCount should be >: ${recLen}`);
        }
    });

    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
