import {assertEquals, mcTest, postTestResult} from '@mconnect/mctest';
import {
    checkTaskType, CrudParamsType, newDbMongo, TaskTypes
} from "../src";
import {
    AuditCreateActionParams, AuditUpdateActionParams, AuditUpdateRecordById,
    GetTable, TestUserInfo, UpdateAuditById, UpdateTable
} from "./testData";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "./config";

const appDbInstance = newDbMongo(appDbLocal, dbOptionsLocal);
const auditDbInstance = newDbMongo(auditDbLocal, dbOptionsLocal);

(async () => {
    // DB clients/handles
    const appDbHandle = await appDbInstance.openDb()
    const appDbClient = await appDbInstance.mgServer()
    // const auditDbHandle = await auditDbInstance.openDb()
    // const auditDbClient = await auditDbInstance.mgServer()

    const crudParams: CrudParamsType = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDbLocal.database || "mcdev",
        tableName  : GetTable,
        userInfo   : TestUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    await mcTest({
        name    : 'check task-type - CREATE',
        testFunc: async () => {
            crudParams.actionParams = AuditCreateActionParams
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const taskType = checkTaskType(crudParams);
            console.log("taskType: ", taskType)
            assertEquals(taskType, TaskTypes.CREATE, `task type should be: ${TaskTypes.CREATE}`);
        }
    });

    await mcTest({
        name    : 'check task-type - UPDATE',
        testFunc: async () => {
            crudParams.tableName = UpdateTable
            crudParams.actionParams = AuditUpdateActionParams
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const taskType = checkTaskType(crudParams);
            console.log("taskType: ", taskType)
            assertEquals(taskType, TaskTypes.UPDATE, `task type should be: ${TaskTypes.UPDATE}`);
        }
    });

    await mcTest({
        name    : 'check task-type - UPDATE',
        testFunc: async () => {
            crudParams.tableName = UpdateTable
            crudParams.actionParams = [AuditUpdateRecordById]
            crudParams.recordIds = [UpdateAuditById]
            crudParams.queryParams = {}
            const taskType = checkTaskType(crudParams);
            console.log("taskType: ", taskType)
            assertEquals(taskType, TaskTypes.UPDATE, `task type should be: ${TaskTypes.UPDATE}`);
        }
    });

    await mcTest({
        name    : 'check task-type - UNKNOWN',
        testFunc: async () => {
            crudParams.tableName = UpdateTable
            crudParams.actionParams = [...AuditCreateActionParams, ...AuditUpdateActionParams]
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const taskType = checkTaskType(crudParams);
            console.log("taskType: ", taskType)
            assertEquals(taskType, TaskTypes.UNKNOWN, `task type should be: ${TaskTypes.UNKNOWN}`);
        }
    });

    await postTestResult();
    await appDbInstance?.closeDb();
    await auditDbInstance?.closeDb();
    process.exit(0)
})();
