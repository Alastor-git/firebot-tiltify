import { TILTIFY_FRONTEND_ID, TILTIFY_PAGE_ID } from "@/constants";
import { AngularJsComponent, AngularJsPage, UIExtension } from "@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager";
import { IScope } from "@crowbartools/firebot-custom-scripts-types/node_modules/@types/angular";

const tiltifyPage: AngularJsPage = {
    id: `${TILTIFY_FRONTEND_ID} ${TILTIFY_PAGE_ID}`,
    name: "Tiltify",
    icon: "fa-hands-heart",
    fullPage: true,
    disableScroll: true,
    type: "angularjs",
    template: "<div><tiltify-donations-table></tiltify-donations-table></div>",
    controller: () => {}
};

const DonationTableComponent: AngularJsComponent = {
    name: "tiltifyDonationsTable",
    bindings: {
        subcommand: "=",
        fullyEditable: "<",
        cmdTrigger: "@",
        onDelete: "&",
        onEdit: "&"
    },
    template: `
        <div class="mb-4">
            <div class="sys-command-row" ng-init="hidePanel = true" ng-click="hidePanel = !hidePanel" ng-class="{'expanded': !hidePanel}">
                <div class="pl-8"" style="flex-basis: 30%;">
                    name
                </div>

                <div style="width: 25%">
                    <span style="text-transform: capitalize;">thing thing 1</span>
                </div>

                <div style="width: 25%">
                    <span style="text-transform: capitalize;">thing 2</span>
                    <tooltip type="info" text="tooltip"></tooltip>
                </div>

                <div style="width: 25%">
                    <div style="min-width: 75px">
                        <span class="status-dot" ng-class="{'active': $ctrl.subcommand.active, 'notactive': !$ctrl.subcommand.active}"></span>
                        {{$ctrl.subcommand.active ? "Active" : "Disabled"}}
                    </div>
                </div>

                <div style="flex-basis:30px; flex-shrink: 0;">
                    <i class="fas" ng-class="{'fa-chevron-right': hidePanel, 'fa-chevron-down': !hidePanel}"></i>
                </div>
            </div>

            <div uib-collapse="hidePanel" class="sys-command-expanded">
                <div class="sub-command p-8">
                    Hidden part
                </div>
            </div>
        </div>
    `,
    controller: function() {
        const $ctrl = this;
    }
};

export const tiltifyUIExtension: UIExtension = {
    id: TILTIFY_FRONTEND_ID,
    pages: [
        tiltifyPage
    ],
    providers: {
        components: [
            DonationTableComponent
        ]
    }
};

/*
interface TestService {
    someFunction: () => string;
}

interface Scope extends IScope {
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
*/