// @ts-check
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import js from "@eslint/js";
//import { plugin as ex } from "eslint-plugin-exception-handling";
import pluginPromise from "eslint-plugin-promise";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: [
            "**/.git/",
            "**/node_modules/",
            "**/eslintrc.js",
            "**/package.json",
            "**/package-lock.json",
            "**/dist/"
        ]
    },
    // Extend from recommened eslint rules
    // Indicated by a wrench @ https://eslint.org/docs/rules/
    js.configs.recommended,
    tseslint.configs.recommended,
    pluginPromise.configs["flat/recommended"],
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
            // @ts-ignore
            promise: pluginPromise
            //ex: ex
        },

        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
                ...globals.es2015,
                ...globals.es2020,
                // Project specific globals
                renderWindow: true,
                $: true,
                firebotAppDetails: true
            },

            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "commonjs"
        },

        rules: {
            // Deviations from https://eslint.org/docs/rules/#possible-errors
            "no-console": 0, // Enable the use of console

            // Deviations from < https://eslint.org/docs/rules/#best-practices >
            eqeqeq: ["warn", "smart"], // No coersion unless comparing against null
            "guard-for-in": "warn", // require an if statement with for-in loops
            "no-else-return": "warn", // no 'if () { return } else { ... }
            "no-eval": "warn", // no eval()
            "no-floating-decimal": "warn", // no trailing decimals after numbers
            "no-lone-blocks": "warn", // see: https://eslint.org/docs/rules/no-lone-blocks
            "no-multi-spaces": "warn", // no repeating spaces
            "no-throw-literal": "warn", // must throw an error instance
            "no-unused-expressions": "warn", // see: https://eslint.org/docs/rules/no-unused-expressions#disallow-unused-expressions-no-unused-expressions
            "no-with": "warn", // no with statements
            "wrap-iife": "warn", // immediately called functions must be wrapped in ()'s
            "no-async-promise-executor": "off",
            "no-prototype-builtins": "off",

            // Deviation from < https://eslint.org/docs/rules/#strict-mode >
            strict: "off", // disabled b/c typescript

            // Deviation from < https://eslint.org/docs/rules/#variables >
            // Turned on as typescript
            "no-use-before-define": "off", // require vars to be defined before use

            "prefer-const": "warn",

            // Deviation from < https://eslint.org/docs/rules/#stylistic-issues >
            "arrow-parens": [
                "warn",
                "as-needed",
                { requireForBlockBody: true }
            ], // Parentheses around arrow function parameters
            "array-bracket-spacing": "warn", // Spaces around array []'s
            "block-spacing": "warn", // {}'s must have whitespace around them
            "brace-style": "warn", // See: https://eslint.org/docs/rules/brace-style#require-brace-style-brace-style
            camelcase: "warn", // useCamelCasePleaseKThanks
            "comma-dangle": "warn", // No trailing commas
            "comma-spacing": "warn", // Reqire space after commas

            "computed-property-spacing": "warn", // No whitespace when using object[thing]
            curly: "warn", // Must wrap blocks with {}
            indent: "off", // Superseded by TS
            "key-spacing": ["warn", { mode: "strict" }], // Exactly one space after object key colons
            "keyword-spacing": "warn", // Spaces around keywords
            "linebreak-style": "warn", // Line breaks must be \n
            "new-cap": "warn", // Constructors must start with capital letter
            "no-trailing-spaces": "warn", // no trailing spaces
            semi: "warn", // semi-colons required
            "semi-spacing": ["warn", { before: false, after: true }], // space after semi-colon, no space before
            "semi-style": "warn", // See: https://eslint.org/docs/rules/semi-style
            "space-before-blocks": "warn", // whitespace required before and after {}
            "space-in-parens": ["warn", "never"], // See: https://eslint.org/docs/rules/space-in-parens
            "space-infix-ops": "warn", // Spaces required areound operators
            "space-unary-ops": "warn", // See: https://eslint.org/docs/rules/space-unary-ops
            "switch-colon-spacing": "warn", // Spaces after case colon

            // Deviation from < https://eslint.org/docs/rules/#ecmascript-6 >
            "arrow-spacing": "warn", // Spaces required around fat-arrow function's "=>"
            "no-confusing-arrow": "warn", // Don't use arrows functions in conditions
            "no-var": "warn", // Use let/const instead of var

            // Other deviations
            "no-unused-vars": "off",
            "prefer-template": "warn", // Use template strings instead of + concat
            "template-curly-spacing": ["warn", "never"],
            "no-useless-concat": "error", // no concat'ing literal strings
            "no-empty": ["error", { allowEmptyCatch: true }],
            "no-debugger": "warn",
            "no-extra-boolean-cast": "off",
            "no-warning-comments": [
                "warn",
                {
                    terms: ["todo", "to do", "fix", "fixme", "fix me", "need"],
                    location: "start"
                }
            ], // warn about todo comments

            // typescript
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-var-requires": "off",
            "@typescript-eslint/no-empty-function": "off",
            "@typescript-eslint/no-this-alias": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-use-before-define": "warn"
            //"@typescript-eslint/indent": ["warn", 4],
            //"@typescript-eslint/ban-types": "warn",

            // eslint-plugin-exception-handling
            //"ex/no-unhandled": "error",
            //"ex/might-throw": "warn",
            //"ex/use-error-cause": "warn"
        }
    }
);