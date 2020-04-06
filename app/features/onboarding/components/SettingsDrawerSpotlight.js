// @flow

import { Spotlight } from '@atlaskit/onboarding';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

import { openDrawer } from '../../navbar';
import { SettingsDrawer } from '../../settings';

import { continueOnboarding } from '../actions';
import { withTranslation } from 'react-i18next';

type Props = {

    /**
     * Redux dispatch.
     */
    dispatch: Dispatch<*>;

    t: any;
};

/**
 * Settings Drawer Spotlight Component.
 */
class SettingsDrawerSpotlight extends Component<Props, *> {
    /**
     * Initializes a new {@code SettingsDrawerSpotlight} instance.
     *
     * @inheritdoc
     */
    constructor(props: Props) {
        super(props);

        this._next = this._next.bind(this);
    }

    /**
     * Render function of component.
     *
     * @returns {ReactElement}
     */
    render() {
        return (
            <Spotlight
                dialogPlacement = 'right top'
                target = { 'settings-drawer-button' }
                targetOnClick = { this._next }>
                { this.props.t('onboarding.settings') }
            </Spotlight>
        );
    }

    _next: (*) => void;

    /**
     * Close the spotlight component and opens Settings Drawer and shows
     * onboarding.
     *
     * @returns {void}
     */
    _next() {
        this.props.dispatch(openDrawer(SettingsDrawer));
        this.props.dispatch(continueOnboarding());
    }
}

export default withTranslation()(connect()(SettingsDrawerSpotlight));

