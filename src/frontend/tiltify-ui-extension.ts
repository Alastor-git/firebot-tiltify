import { TILTIFY_FRONTEND_ID, TILTIFY_PAGE_ID } from "@/constants";
import { TiltifyDonationEventData } from "@/events/donation-event-data";
import { logger } from "@/tiltify-logger";
import { TiltifyDonation } from "@/types/donation";
import { AngularJsComponent, AngularJsPage, UIExtension } from "@crowbartools/firebot-custom-scripts-types/types/modules/ui-extension-manager";
import { IComponentOptions, IController, IScope } from "angular";

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

const DonationRowComponent: AngularJsComponent = {
    name: "tiltifyDonationsRow",
    bindings: {
        donation: "="
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
                        <span class="status-dot" ng-class="{'active': $ctrl.donation.active, 'notactive': !$ctrl.donation.active}"></span>
                        {{$ctrl.donation.active ? "Active" : "Disabled"}}
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

const DonationTableComponent: AngularJsComponent = {
    name: "tiltifyDonationsTable",
    bindings: {
        donations: "="
    },
    template: `
    <tiltify-donations-row
        ng-repeat="donation in $ctrl.donations track by $index"
        donation="donation"
    ></tiltify-donations-row>
    `,
    controller: function($scope: IScope) {
        const $ctrl: IController = this;

        logger.debug(JSON.stringify($scope));
        logger.debug(JSON.stringify($ctrl));

        $ctrl.$onInit = function () {
            const donations: TiltifyDonationEventData[] = [
                {
                    campaignInfo: {
                        campaignId: "318d3436-1ff9-4d24-8720-70271943023e",
                        name: "GOTEL",
                        cause: "Lupus Foundation of America",
                        causeLegalName: "Lupus Foundation of America, Inc.",
                        fundraisingGoal: 1000,
                        originalGoal: 500,
                        supportingRaised: 500,
                        amountRaised: 1000,
                        totalRaised: 1500
                    },
                    from: "Tiltify",
                    donationAmount: 4.2,
                    rewards: [
                        {
                            id: "",
                            name: "Default reward",
                            quantityAvailable: 10,
                            quantityRedeemed: 1,
                            quantityRemaining: 5,
                            cost: 5,
                            description: "This is a dummy reward"
                        }
                    ],
                    matches: [],
                    matchMultiplier: 1,
                    comment: "Thanks for the stream!",
                    pollOptionId: "",
                    challengeId: "",
                    isMatchDonation: false
                }
            ];

            $ctrl.donations = donations;
        };

    }
};

export const tiltifyUIExtension: UIExtension = {
    id: TILTIFY_FRONTEND_ID,
    pages: [
        tiltifyPage
    ],
    providers: {
        components: [
            DonationRowComponent,
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