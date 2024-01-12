import { assertEquals, mcTest, postTestResult } from "@mconnect/mctest";
import {
    auditColl, categoryColl, CategoryModel, crudParamOptions, DeleteCategoryWithSubItemById,
    DeleteGroupWithCategoriesById, groupColl, GroupModel, testUserInfo
} from "./testData";
import { appDbLocal, auditDbLocal, dbOptionsLocal } from "../config";
import { CrudParamsType, newDbMongo } from "../../src";

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
        name    : "should return subItems for record/document with sub-items (different table/collection, i.e. foreignKey):",
        testFunc: async () => {
            crudParams.tableName = groupColl
            crudParams.recordIds = [DeleteGroupWithCategoriesById]
            crudParams.queryParams = {}
            const res = await GroupModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-id-res: ", res)
            assertEquals(res.code, "subItems", `res-code should be subItems:`);
        }
    });

    await mcTest({
        name    : "should return subItems for record/document with sub-items (same table/collection, i.e. parentId):",
        testFunc: async () => {
            crudParams.tableName = categoryColl
            crudParams.recordIds = [DeleteCategoryWithSubItemById]
            crudParams.queryParams = {}
            const res = await CategoryModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-id-res: ", res)
            const resCode = res.code === "subItems"
            assertEquals(resCode, true, `res-code should be subItems:`);
            assertEquals(res.code, "subItems", `res-code should be subItems:`);
        }
    });


    await postTestResult();
    await appDbInstance.closeDb();
    await auditDbInstance.closeDb();
    process.exit(0);

})();
