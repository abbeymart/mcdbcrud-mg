// @Description: test-cases data: for get, delete and save record(s)

import {
    ActionParamType, QueryParamsType, ModelRelationType, RelationTypes, RelationActionTypes,
    ModelDescType, BaseModel, DataTypes, ModelCrudOptionsType, newModel,
    BaseModelType,
} from "../../src/index.ts"
import { collections } from "../collections.ts";

// Models

export interface GroupType extends BaseModelType {
    name: string;
}

export interface CategoryType extends BaseModelType {
    name: string;
    groupName: string;
    priority?: number;
    iconStyle?: string;
    parentId?: string;
    path?: string;
}

export const groupModel: ModelDescType = {
    collName   : collections.GROUPS,
    docDesc    : {
        ...BaseModel,
        name: {
            fieldType  : DataTypes.STRING,
            fieldLength: 25,
            allowNull  : false,
        },
    },
    timeStamp  : true,
    activeStamp: true,
    actorStamp : true,
};

export const categoryModel: ModelDescType = {
    collName   : collections.CATEGORIES,
    docDesc    : {
        ...BaseModel,
        name     : {
            fieldType  : DataTypes.STRING,
            fieldLength: 100,
            allowNull  : false,
        },
        groupName: {
            fieldType: DataTypes.STRING,
            allowNull: false,
        },
        priority : {
            fieldType   : DataTypes.INTEGER,
            allowNull   : false,
            defaultValue: 100,
        },
        iconStyle: {
            fieldType   : DataTypes.STRING,
            allowNull   : false,
            defaultValue: "fa fa-briefcase",
        },
        parentId : DataTypes.MONGODB_ID,
        path     : DataTypes.STRING,

    },
    timeStamp  : true,
    activeStamp: true,
    actorStamp : true,
};

export const groupRelations: Array<ModelRelationType> = [
    {
        sourceColl  : collections.GROUPS,
        targetColl  : collections.CATEGORIES,
        sourceField : "name",
        targetField : "groupName",
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "groupName",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.CASCADE,
    },
];

export const categoryRelations: Array<ModelRelationType> = [
    {
        sourceColl  : collections.CATEGORIES,
        targetColl  : collections.CATEGORIES,
        sourceField : "_id",
        targetField : "parentId",
        targetModel : categoryModel,
        relationType: RelationTypes.ONE_TO_MANY,
        foreignField: "parentId",
        onDelete    : RelationActionTypes.RESTRICT,
        onUpdate    : RelationActionTypes.NO_ACTION,
    },
];

export const centralRelations: Array<ModelRelationType> = [
    ...groupRelations,
    ...categoryRelations,
];

const groupOptions: ModelCrudOptionsType = {
    relations   : centralRelations,
    uniqueFields: [
        ["name"],
    ],
};

const categoryOptions: ModelCrudOptionsType = {
    relations   : centralRelations,
    uniqueFields: [
        ["name", "parentId",],
        ["name", "groupName",],
    ]
};

// instantiate model
export const GroupModel = newModel(groupModel, groupOptions);

// instantiate model
export const CategoryModel = newModel(categoryModel, categoryOptions);

export const groupColl = collections.GROUPS;
export const groupCollUpdate = "groups_update";
export const groupCollDelete = "groups_delete";
export const groupCollDeleteAll = "groups_delete_all";
export const categoryColl = collections.CATEGORIES;
export const categoryCollUpdate = "categories_update";
export const categoryCollDelete = "categories_delete";
export const categoryCollDeleteAll = "categories_delete_all";

// export const UserId = "c85509ac-7373-464d-b667-425bb59b5738"

// TODO: groups collection test-data

export const GroupCreateRec1: GroupType = {
    "name": "User",
}

export const GroupCreateRec2: GroupType = {
    "name": "Location",
}

export const GroupCreateRec3: GroupType = {
    name: "Business",
}

export const GroupCreateRec4: GroupType = {
    name: "Industry",
}

export const GroupCreateRec5: GroupType = {
    name: "Locale",
}

export const GroupCreateRec6: GroupType = {
    name: "Tax",
}

export const GroupCreateRec7: GroupType = {
    name: "Income",
}

export const GroupCreateRec8: GroupType = {
    name: "Expense",
}

export const GroupCreateRec9: GroupType = {
    name: "Activity",
}

export const GroupCreateRec10: GroupType = {
    name: "Project",
}

export const GroupCreateRecNameConstraint: GroupType = {
    name: "Group name length greater than the model specified length",
}

export const GroupCreateActionParams: Array<GroupType> = [
    GroupCreateRec1,
    GroupCreateRec2,
    GroupCreateRec3,
    GroupCreateRec4,
    GroupCreateRec5,
    GroupCreateRec6,
    GroupCreateRec7,
    GroupCreateRec8,
    GroupCreateRec9,
    GroupCreateRec10,
]

export const GroupCreateNonUniqueDocuments: Array<GroupType> = [
    GroupCreateRec1,
    GroupCreateRec1,
    GroupCreateRec1,
    GroupCreateRec1,
    GroupCreateRec1,
]

// change Expense to Expenses
export const GroupUpdateRec1: GroupType = {
    _id : "6393ef7f9a2eeb643b67e7db",
    name: "Expenses",
}

// change Income to Incomes
export const GroupUpdateRec2: GroupType = {
    _id : "6393ef7f9a2eeb643b67e7da",
    name: "Incomes",
}

// update name: User to name: Incomes (exists)
export const GroupUpdateRecExist: GroupType = {
    _id : "6393ef7f9a2eeb643b67e7d4",
    name: "Incomes",
}

export const GroupUpdateActionParams: Array<GroupType> = [
    GroupUpdateRec1,
    GroupUpdateRec2,
]

// change Project to Projects
export const GroupUpdateRecordById: GroupType = {
    // "_id" : "6393ef7f9a2eeb643b67e7d4",
    "name": "Users",
}

// change Location to Locations
export const GroupUpdateRecordByParam: GroupType = {
    "name"   : "Locations",
    updatedAt: new Date("2022-12-10T02:58:59.188Z"),
}

export const UpdateGroupById = "6393ef7f9a2eeb643b67e7d4"

// ??
export const UpdateGroupByIds: Array<string> = [
    "6393ef7f9a2eeb643b67e7d6",
    "6393ef7f9a2eeb643b67e7d7",
    "6393ef7f9a2eeb643b67e7d8",
]

export const UpdateGroupByParams: QueryParamsType = {
    "name": "Location",
}

export const GetGroupById = "6393ef7f9a2eeb643b67e7d4"
export const GetGroupByIds = ["6393ef7f9a2eeb643b67e7d4",
    "6393ef7f9a2eeb643b67e7d5"] as Array<string>
export const GetGroupByParams: QueryParamsType = {
    "name": "Locale",
}

export const DeleteGroupById = "6393ef7f9a2eeb643b67e7d9";

// ??
export const DeleteGroupByIds: Array<string> = [
    "6393ef7f9a2eeb643b67e7da",
    "6393ef7f9a2eeb643b67e7db",
    "6393ef7f9a2eeb643b67e7dc",
    "6393ef7f9a2eeb643b67e7dd",
]

// ??
export const DeleteGroupByParams: QueryParamsType = {
    "name": "Locale",
}


// TODO: categories collection test-data

// create record(s)

export const CategoryCreateRec1: CategoryType = {
    name     : "Toronto",
    groupName: "Location",
}

export const CategoryCreateRec2: CategoryType = {
    name     : "Oyo",
    groupName: "Location",
}


export const CategoryCreateRec3: CategoryType = {
    name     : "Full Time",
    groupName: "Income",
}

export const CategoryCreateRec4: CategoryType = {
    name     : "Part Time",
    groupName: "Income",
}

export const CategoryCreateRec5: CategoryType = {
    name     : "Groceries",
    groupName: "Expense",
}

export const CategoryCreateRec6: CategoryType = {
    name     : "mcpa",
    groupName: "Project",
}

export const CategoryCreateRec7: CategoryType = {
    name     : "mcship",
    groupName: "Project",
}

export const CategoryCreateRec8: CategoryType = {
    name     : "mcproject",
    groupName: "Project",
}

export const CategoryCreateRec9: CategoryType = {
    name     : "Get Auto",
    groupName: "Activity",
}

export const CategoryCreateRec10: CategoryType = {
    name     : "Get Home",
    groupName: "Activity",
}

export const CategoryCreateActionParams: Array<CategoryType> = [
    CategoryCreateRec1,
    CategoryCreateRec2,
    CategoryCreateRec3,
    CategoryCreateRec4,
    CategoryCreateRec5,
    CategoryCreateRec6,
    CategoryCreateRec7,
    CategoryCreateRec8,
    CategoryCreateRec9,
    CategoryCreateRec10,
]

export const CategoryCreateActionParamsUniqueConstraint = CategoryCreateRec2;

export const CategoryUpdateRec1: CategoryType = {
    _id      : "63992eb9c97fa04b78e8f046",
    name     : "Toronto Updated",
    groupName: "Location",
    parentId : "63992eb9c97fa04b78e8f047",
}

export const CategoryUpdateRec2: CategoryType = {
    _id      : "63992eb9c97fa04b78e8f047",
    name     : "Oyo Updated",
    groupName: "Location",
    parentId : "",
}

export const CategoryUpdateActionParamsUniqueConstraint: CategoryType = {
    _id      : "63992eb9c97fa04b78e8f04a",      // ID for Groceries
    name     : "Toronto Updated",
    groupName: "Location",
    parentId : "63992eb9c97fa04b78e8f047",
};

export const CategoryUpdateActionParams: Array<CategoryType> = [
    CategoryUpdateRec1,
    CategoryUpdateRec2,
]

// TODO: update and delete params, by ids / queryParams | test update-cascade

export const CategoryUpdateRecordById: ActionParamType = {
    // "_id" : "638fd873a02862d754fa0247",
    "name": "mcpa",
}
export const CategoryUpdateRecordByParam: ActionParamType = {
    "_id" : "638fd873a02862d754fa0248",
    "name": "mcpa",                                 // TODO: test against unique constraint??
}
export const UpdateCategoryById = "638fd835c77947991e7f7e11"
export const UpdateCategoryByIds: Array<string> = [
    "638fd835c77947991e7f7e11",
    "638fd835c77947991e7f7e12",
    "638fd835c77947991e7f7e13",
]
export const UpdateCategoryByParams: QueryParamsType = {
    "groupName": "Project",
}

export const GetCategoryById = "63992eb9c97fa04b78e8f047"
export const GetCategoryByIds = ["63992eb9c97fa04b78e8f047",
    "63992eb9c97fa04b78e8f046"] as Array<string>
export const GetCategoryByParams: QueryParamsType = {
    "groupName": "Project",
}

export const GroupUpdateCategoryCascade: GroupType = {
    _id : "6393ef7f9a2eeb643b67e7da",
    name: "Incomes",
}

export const CategoryUpdateCategoryCascade: CategoryType = {
    _id      : "63992eb9c97fa04b78e8f047",
    name     : "Oyo Updated2",
    groupName: "Location",
    parentId : "",
}

// TODO: test delete constraint group-category, update ID
export const DeleteGroupWithCategoriesById = "6393ef7f9a2eeb643b67e7d5";

// TODO: with sub-items in categories collection, i.e. same collection, update ID
export const DeleteCategoryWithSubItemById = "63992eb9c97fa04b78e8f047";




