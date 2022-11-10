/**
 * @Author: abbeymart | Abi Akindele | @Created: 2020-07-30
 * @Company: Copyright 2020 Abi Akindele  | mConnect.biz
 * @License: All Rights Reserved | LICENSE.md
 * @Description: mc-central-ts: function types
 */

// types
export interface IPredicate {
    (val: number): boolean;
}

export interface StringPredicate {
    (val: string): boolean;
}

export interface Predicate<T> {
    (val: T): boolean;
}

export interface BinaryPredicate<T, U> {
    (valA: T, valB: U): boolean;
}

export interface UnaryOperator<T> {
    (val: T): T;
}

export interface BinaryOperator<T> {
    (valA: T, valB: T): T;
}

export interface Function<T, R> {
    (val: T): R;
}

export interface BiFunction<T, U, R> {
    (valA: T, valB: U): R;
}

export interface Consumer<T> {
    (val: T): void;
}

export interface BiConsumer<T, U> {
    (valA: T, valB: U): void;
}

export interface Supplier<R> {
    (): R;
}

export interface Comparator<T> {
    (valA: T, valB: T): number;
}
