// @flow

import {
    OnboardingModal,
    ConferenceURLSpotlight,
    SettingsDrawerSpotlight,
    NameSettingSpotlight,
    EmailSettingSpotlight,
    StartMutedTogglesSpotlight
} from './components';

export const onboardingSteps = {
    'welcome-page': [
        'onboarding-modal',
        'conference-url',
        'settings-drawer-button'
    ],
    'settings-drawer': [
        'name-setting',
        'email-setting',
        'start-muted-toggles'
    ]
};

export const onboardingComponents = {
    'onboarding-modal': OnboardingModal,
    'conference-url': ConferenceURLSpotlight,
    'settings-drawer-button': SettingsDrawerSpotlight,
    'name-setting': NameSettingSpotlight,
    'email-setting': EmailSettingSpotlight,
    'start-muted-toggles': StartMutedTogglesSpotlight
};
