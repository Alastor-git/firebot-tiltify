/** @type {import('ts-jest').JestConfigWithTsJest} **/
import { pathsToModuleNameMapper } from "ts-jest";
import { compilerOptions } from "./tsconfig.json";

module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}]
  },
  moduleDirectories: ["node_modules", "<rootDir>"],
    moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, {
        prefix: `<rootDir>/`
    })
};