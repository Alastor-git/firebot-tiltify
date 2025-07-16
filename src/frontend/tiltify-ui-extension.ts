import { TILTIFY_FRONTEND_ID, TILTIFY_PAGE_ID } from "@/constants";
import { AngularJsPage, UIExtension } from "@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager";
import ng from "angular";

/*const tiltifyPage: AngularJsPage = {
    id: `${TILTIFY_FRONTEND_ID} ${TILTIFY_PAGE_ID}`,
    name: "Tiltify",
    icon: "fa-hands-heart",
    fullPage: true,
    disableScroll: true,
    type: "angularjs",
    template: "<div>Some template</div>",
    controller: () => {}
};

export const tiltifyUIExtension: UIExtension = {
    id: TILTIFY_FRONTEND_ID,
    pages: [
        tiltifyPage
    ]
};*/

interface TestService {
    someFunction: () => string;
}

interface Scope extends ng.IScope {
    test: string;
}

export const tiltifyUIExtension: UIExtension = {
    id: "test",
    pages: [
        {
            id: "test-page",
            name: "Test Page",
            icon: "fa-dice",
            template:
                `<div>
                    <div>Test Page: {{test}} </div>
                    <test-component foo="foobar"></test-component>
                    <test-directive></test-directive>
                </div>'`,
            type: "angularjs",
            fullPage: true,
            disableScroll: true,
            controller: ($scope: Scope, testService: TestService) => {
                $scope.test = testService.someFunction();
            }
        },
        {
            id: "test-page-two",
            name: "Test Page 2",
            icon: "fa-search",
            template:
                `<div>
                    <span>Test Page 2: {{test}}</span>
                </div>`,
            type: "angularjs",
            controller: ($scope: Scope, testService: TestService) => {
                $scope.test = `foo bar ${testService.someFunction()}`;
            }
        }
    ],
    providers: {
        factories: [
            {
                name: "testService",
                function: () => {
                    return {
                        someFunction: () => "Hello world from service"
                    };
                }
            }
        ],
        components: [
            {
                name: "testComponent",
                bindings: {
                    foo: "@"
                },
                template: "<div>{{test}} {{$ctrl.foo | testFilter}}</div>",
                controller: ($scope: Scope) => {
                    $scope.test = "Hello world from component";
                }
            }
        ],
        directives: [
            {
                name: "testDirective",
                function: () => {
                    return {
                        restrict: "E",
                        link: ($scope: Scope, element: { text: (arg0: string) => void; }) => {
                            element.text("Hello world from directive");
                        }
                    };
                }
            }
        ],
        filters: [
            {
                name: "testFilter",
                function: () => {
                    return (input: string) => {
                        return `${input} from filter`;
                    };
                }
            }
        ]
    }
};