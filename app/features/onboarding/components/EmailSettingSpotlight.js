// @flow

import { Spotlight } from '@atlaskit/onboarding';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

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
 * Email Setting Spotlight Component.
 */
class EmailSettingSpotlight extends Component<Props, *> {
    /**
     * Initializes a new {@code EmailSettingSpotlight} instance.
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
                actions = { [
                    {
                        onClick: this._next,
                        text: this.props.t('onboarding.btnNext')
                    }
                ] }
                dialogPlacement = 'left top'
                target = { 'email-setting' } >
                { this.props.t('onboarding.email') }
            </Spotlight>
        );
    }

    _next: (*) => void;

    /**
     * Close the spotlight component.
     *
     * @returns {void}
     */
    _next() {
        this.props.dispatch(continueOnboarding());
    }
}

export default withTranslation()(connect()(EmailSettingSpotlight));

