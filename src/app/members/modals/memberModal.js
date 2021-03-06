angular.module('proton.core')
    .factory('memberModal', (pmModal, CONSTANTS, gettextCatalog, organizationModel, subscriptionModel, editMemberProcess) => {

        const GIGA = CONSTANTS.BASE_SIZE ** 3;

        const I18N = {
            USED: gettextCatalog.getString('Already used', null, 'Memory info'),
            ALLOCATED: gettextCatalog.getString('Allocated', null, 'Memory info'),
            ALREADY_ALLOCATED: gettextCatalog.getString('Already allocated', null, 'Memory info')
        };

        const getConfigKeys = ({ member = {} }) => {
            const fiveGigabit = 5 * GIGA;
            const organization = organizationModel.get();
            const minPadding = member.UsedSpace || 0;
            const maxPadding = member.ID ? (organization.MaxSpace - organization.AssignedSpace + member.MaxSpace) : organization.MaxSpace - organization.AssignedSpace;
            const startNewMember = (maxPadding > fiveGigabit) ? fiveGigabit : maxPadding;
            const startValue = member.ID ? member.MaxSpace : startNewMember;
            return { organization, minPadding, maxPadding, startValue };
        };

        return pmModal({
            controllerAs: 'ctrl',
            templateUrl: 'templates/modals/member.tpl.html',
            /* @ngInject */
            controller: function (params) {

                const { organization, minPadding, maxPadding, startValue } = getConfigKeys(params);

                // Default Parameters
                this.ID = null;
                this.step = 'member';
                this.size = CONSTANTS.ENCRYPTION_DEFAULT;
                this.organization = params.organization;
                this.organizationKey = params.organizationKey;
                this.domains = _.filter(params.domains, ({ State }) => State);
                this.domain = this.domains.length && this.domains[0];
                this.name = '';
                this.temporaryPassword = '';
                this.confirmPassword = '';
                this.address = '';
                this.cancel = params.cancel;

                // sliders legends
                const allocatedLegend = { label: I18N.ALLOCATED, classes: 'background-primary' };
                const minPaddingLegend = { label: I18N.USED, classes: 'background-red-striped' };
                const maxPaddingLegend = { label: I18N.ALREADY_ALLOCATED, classes: 'background-yellow-striped' };

                // Quota
                this.unit = GIGA;
                this.min = 0;
                this.max = organization.MaxSpace;
                this.hasVPN = organization.MaxVPN && subscriptionModel.hasPaid('vpn');
                this.storageSliderOptions = {
                    animate: false,
                    start: startValue / this.unit,
                    step: 0.1,
                    connect: [true, false],
                    tooltips: true,
                    range: { min: this.min / this.unit, max: this.max / this.unit },
                    pips: {
                        mode: 'values',
                        values: [0, this.max / this.unit],
                        density: 4
                    },
                    minPadding: minPadding / this.unit,
                    maxPadding: maxPadding / this.unit
                };
                this.storageLegends = [allocatedLegend];
                minPadding > 0 && this.storageLegends.push(minPaddingLegend);
                maxPadding > 0 && this.storageLegends.push(maxPaddingLegend);

                // VPN
                const allocatedVPN = (params.member) ? params.member.MaxVPN : 0;
                const UsedVPN = organization.UsedVPN;
                const maxVPNPadding = (organization.MaxVPN - UsedVPN + allocatedVPN);
                this.availableVPN = (maxVPNPadding > 0) ? allocatedVPN : (organization.MaxVPN - UsedVPN + allocatedVPN);

                this.vpnSliderOptions = {
                    animate: false,
                    start: allocatedVPN,
                    step: 1,
                    connect: [true, false],
                    tooltips: true,
                    range: { min: 0, max: organization.MaxVPN },
                    pips: {
                        mode: 'values',
                        values: [0, organization.MaxVPN],
                        density: organization.MaxVPN
                    },
                    minPadding: 0,
                    maxPadding: maxVPNPadding - 0.0000001 /* remove a small int to avoid a maxPadding === MaxVPN */
                };
                this.vpnLegends = [allocatedLegend];
                maxVPNPadding < organization.MaxVPN && this.vpnLegends.push(maxPaddingLegend);

                this.private = false;
                this.showAddress = true;
                this.showKeys = true;

                // Edit mode
                if (params.member) {
                    this.oldMember = _.extend({}, params.member);
                    this.ID = params.member.ID;
                    this.name = params.member.Name;
                    this.private = !!(params.member.Private);
                    this.showAddress = params.member.Addresses.length === 0 && params.member.Type === 1;
                    this.showKeys = params.member.Keys.length === 0 && !this.private;
                }

                // Functions
                this.submit = () => {
                    editMemberProcess(this, { params, maxPadding, minPadding, maxVPNPadding })
                        .edit();
                };
            }
        });
    });
