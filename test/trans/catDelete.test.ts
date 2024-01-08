import { assertEquals, mcTest, postTestResult } from "@mconnect/mctest";
import {
    auditColl, categoryColl, CategoryModel, crudParamOptions, DeleteCategoryWithSubItemById,
    DeleteGroupWithCategoriesById, groupColl, testUserInfo
} from "./testData";
import { appDb, auditDb, dbOptions } from "../config";
import { CrudParamsType, newDbMongo } from "../../src";

(async () => {
    // DB clients/handles
    const appDbInstance = newDbMongo(appDb, dbOptions);
    const auditDbInstance = newDbMongo(auditDb, dbOptions);

    const appDbHandle = await appDbInstance.openDb();
    const appDbClient = await appDbInstance.mgServer();
    const auditDbHandle = await auditDbInstance.openDb();
    const auditDbClient = await auditDbInstance.mgServer();

    const crudParams: CrudParamsType = {
        appDb      : appDbHandle,
        dbClient   : appDbClient,
        dbName     : appDb.database || "",
        tableName  : categoryColl,
        userInfo   : testUserInfo,
        recordIds  : [],
        queryParams: {},
    };

    crudParamOptions.auditDb = auditDbHandle;
    crudParamOptions.auditDbClient = auditDbClient;
    crudParamOptions.auditDbName = appDb.database;
    crudParamOptions.auditTable = auditColl;

    await mcTest({
        name    : "should return subItems for document with related-child-collection (i.e. foreignKey):",
        testFunc: async () => {
            crudParams.tableName = groupColl
            crudParams.recordIds = [DeleteGroupWithCategoriesById]
            crudParams.queryParams = {}
            const res = await CategoryModel.delete(crudParams, crudParamOptions);
            console.log("delete-by-id-res: ", res)
            assertEquals(res.code, "subItems", `res-code should be subItems:`);
        }
    });

    await mcTest({
        name    : "should return subItems for document with sub-items (i.e. parentId):",
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

})();
