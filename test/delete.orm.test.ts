import { assertEquals, mcTest, postTestResult } from '@mconnect/mctest';
import {CrudOptionsType, CrudParamsType, newDbMongo, newDeleteRecord,} from "../src";
import {
    AuditTable, DeleteAllTable, DeleteAuditById, DeleteAuditByIds, DeleteAuditByParams, DeleteTable,
    GetTable, TestUserInfo,
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
        name    : 'should prevent the delete of all table records and return removeError:',
        testFunc: async () => {
            crudParams.coll = DeleteAllTable
            crudParams.docIds = []
            crudParams.queryParams = {}
            const crud = newDeleteRecord(crudParams, crudOptions);
            const res = await crud.deleteRecord()
            console.log("delete-all-res: ", res)
            assertEquals(res.code, "removeError", `delete-task permitted by ids or queryParams only: removeError code expected`);
        }
    });

    await mcTest({
        name    : 'should delete record by Id and return success or notFound[delete-record-method]:',
        testFunc: async () => {
            crudParams.coll = DeleteTable
            crudParams.docIds = [DeleteAuditById]
            crudParams.queryParams = {}
            const crud = newDeleteRecord(crudParams, crudOptions);
            const res = await crud.deleteRecord()
            console.log("delete-by-id-res: ", res)
            const resCode = res.code == "success" || res.code == "notFound"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await mcTest({
        name    : 'should delete record by Ids and return success or notFound[delete-record-method]:',
        testFunc: async () => {
            crudParams.coll = DeleteTable
            crudParams.docIds = DeleteAuditByIds
            crudParams.queryParams = {}
            const crud = newDeleteRecord(crudParams, crudOptions);
            const res = await crud.deleteRecord()
            console.log("delete-by-ids-res: ", res)
            const resCode = res.code == "success" || res.code == "notFound"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await mcTest({
        name    : 'should delete records by query-params and return success or notFound[delete-record-method]:',
        testFunc: async () => {
            crudParams.coll = DeleteTable
            crudParams.docIds = []
            crudParams.queryParams = DeleteAuditByParams
            const crud = newDeleteRecord(crudParams, crudOptions);
            const res = await crud.deleteRecord()
            console.log("delete-by-params-res: ", res)
            const resCode = res.code == "success" || res.code == "notFound"
            assertEquals(resCode, true, `res-code should be success or notFound:`);
        }
    });

    await postTestResult();
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();

})();
