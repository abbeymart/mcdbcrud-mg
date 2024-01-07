import {assertEquals, mcTest, postTestResult} from '@mconnect/mctest';
import {
    CrudOptionsType,
    CrudParamsType, CrudResultType, newDbMongo, newSaveRecord
} from "../src";
import {
    AuditCreateActionParams, AuditTable, AuditUpdateActionParams, AuditUpdateRecordById, AuditUpdateRecordByParam,
    GetTable, TestUserInfo, UpdateAuditById, UpdateAuditByIds, UpdateAuditByParams, UpdateTable
} from "./testData";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "./config";

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
        tableName  : GetTable,
        userInfo   : TestUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    const crudOptions: CrudOptionsType = {
        auditDb      : auditDbHandle,
        auditDbClient: auditDbClient,
        auditDbName  : auditDbLocal.database || "mcdevaudit",
        auditTable   : AuditTable,
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
        name    : 'should create two new records and return success:',
        testFunc: async () => {
            crudParams.actionParams = AuditCreateActionParams
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams.length
            const crud = newSaveRecord(crudParams, crudOptions);
            const res = await crud.saveRecord()
            console.log("create-result: ", res)
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
            crudParams.tableName = UpdateTable
            crudParams.actionParams = AuditUpdateActionParams
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams.length
            const crud = newSaveRecord(crudParams, crudOptions);
            const res = await crud.saveRecord()
            console.log("update-result: ", res)
            const resValue = res.value as CrudResultType
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : 'should update a record by Id and return success:',
        testFunc: async () => {
            crudParams.tableName = UpdateTable
            crudParams.actionParams = [AuditUpdateRecordById]
            crudParams.recordIds = [UpdateAuditById]
            crudParams.queryParams = {}
            const recLen = crudParams.recordIds.length
            const crud = newSaveRecord(crudParams, crudOptions);
            const res = await crud.saveRecord()
            console.log("update-by-id-res: ", res)
            const resValue = res.value as CrudResultType
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-by-id-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : 'should update records by Ids and return success:',
        testFunc: async () => {
            crudParams.tableName = UpdateTable
            crudParams.actionParams = [AuditUpdateRecordById]
            crudParams.recordIds = UpdateAuditByIds
            crudParams.queryParams = {}
            const recLen = crudParams.recordIds.length
            const crud = newSaveRecord(crudParams, crudOptions);
            const res = await crud.saveRecord()
            console.log("update-by-ids-res: ", res)
            const resValue = res.value as CrudResultType
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-by-id-task should return code: success`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await mcTest({
        name    : 'should update records by query-params and return success:',
        testFunc: async () => {
            crudParams.tableName = UpdateTable
            crudParams.actionParams = [AuditUpdateRecordByParam]
            crudParams.recordIds = []
            crudParams.queryParams = UpdateAuditByParams
            const recLen = 0
            const crud = newSaveRecord(crudParams, crudOptions);
            const res = await crud.saveRecord()
            console.log("update-by-queryParams-res: ", res)
            const resValue = res.value as CrudResultType
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `update-task should return code: success`);
            assertEquals(recCount > recLen, true, `response-value-recordsCount should be >: ${recLen}`);
        }
    });

    await postTestResult();
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();

})();
