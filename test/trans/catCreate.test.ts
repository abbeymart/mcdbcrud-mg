import { CrudParamsType, CrudResultType, newDbMongo } from "../../src";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../config";
import {
    auditColl, categoryColl, CategoryCreateActionParams, CategoryModel, crudParamOptions, testUserInfo
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

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDbLocal.database;
    crudParamOptions.auditTable = auditColl;

    await mcTest({
        name    : "should create ten new category documents and return success:",
        testFunc: async () => {
            crudParams.actionParams = CategoryCreateActionParams;
            crudParams.recordIds = []
            crudParams.queryParams = {}
            const recLen = crudParams.actionParams?.length || 0
            const res = await CategoryModel.save(crudParams, crudParamOptions);
            console.log("create-result: ", res);
            const resValue = res.value as unknown as CrudResultType
            const idLen = resValue.recordIds?.length || 0
            const recCount = resValue.recordsCount || 0
            assertEquals(res.code, "success", `create-task should return code: success`);
            assertEquals(idLen, recLen, `response-value-records-length should be: ${recLen}`);
            assertEquals(recCount, recLen, `response-value-recordsCount should be: ${recLen}`);
        }
    });

    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();
    process.exit(0);
})();
