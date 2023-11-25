import { assertEquals, mcTest, postTestResult } from "../../test_deps.ts";
import { CrudParamsType, CrudResultType, newDbMongo, } from "../../src/index.ts";
import { groupColl, GroupModel, GroupType, GroupCreateNonUniqueDocuments } from "./testData.ts";
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

    const crudParams: CrudParamsType<GroupType> = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        coll       : groupColl,
        userInfo   : testUserInfo,
        docIds     : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditColl = auditColl;

    await mcTest({
        name    : "should return recordExist or updateError for creating duplicate documents:",
        testFunc: async () => {
            crudParams.actionParams = GroupCreateNonUniqueDocuments;
            crudParams.docIds = [];
            crudParams.queryParams = {};
            const recLen = crudParams.actionParams?.length || 0;
            const res = await GroupModel.save(crudParams, crudParamOptions);
            console.log("create-result: ", res);
            const resValue = res.value as unknown as CrudResultType<GroupType>;
            const recCount = resValue.recordsCount || 0;
            assertEquals(res.code === "recordExist" || res.code === "updateError", true, `create-task should return recordExist`);
            assertEquals(res.code !== "success", true, `create-task should return existError or updateError`);
            assertEquals(recCount < recLen, true, `response-value-recordsCount < ${recLen} should be true`);
        }
    });

    postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();

})();
