/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-25
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mc-central-ts: model types
 */

export enum RelationTypes {
    ONE_TO_ONE,
    ONE_TO_MANY,
    MANY_TO_MANY,
    MANY_TO_ONE,
}

export enum RelationActionTypes {
    RESTRICT,       // must remove target-record(s), prior to removing source-record
    CASCADE,        // default for ON UPDATE | update foreignKey value or delete foreignKey record/value
    NO_ACTION,      // leave the foreignKey value, as-is
    SET_DEFAULT,    // set foreignKey to specified default value
    SET_NULL,       // set foreignKey value to null or ""
}

export interface ModelRelationType {
    sourceColl: string;
    targetColl: string;
    sourceField: string;
    targetField: string;
    relationType: RelationTypes;
    foreignField?: string; // source-to-targetField map
    relationField?: string; // relation-targetField, for many-to-many
    relationColl?: string;  // optional collName for many-to-many | default: sourceColl_targetColl
    onDelete?: RelationActionTypes;
    onUpdate?: RelationActionTypes;
}

export interface ModelOptionsType {
    timeStamp?: boolean;        // auto-add: createdAt and updatedAt | default: true
    actorStamp?: boolean;       // auto-add: createdBy and updatedBy | default: true
    activeStamp?: boolean;      // auto-add isActive, if not already set | default: true
}

export type UniqueFieldsType = Array<Array<string>>;

export interface ModelCrudOptionsType extends ModelOptionsType {
    uniqueFields?: UniqueFieldsType;
}

export interface MessageObject {
    [key: string]: string;
}

export interface ValidateResponseType {
    ok: boolean;
    errors: MessageObject;
}

export type ValidateMethodType = <T>(docValue?: T) => boolean;  // may/optionally receive docValue-object as parameter
export type ValidateMethodResponseType = <T>(docValue: T) => ValidateResponseType;
