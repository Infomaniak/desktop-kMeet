// @flow

import { Spotlight } from '@atlaskit/onboarding';

import React, { Component } from 'react';
import { connect } from 'react-redux';
import type { Dispatch } from 'redux';

import { closeDrawer } from '../../navbar';

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
 * Start Muted Toggles Spotlight Component.
 */
class StartMutedTogglesSpotlight extends Component<Props, *> {
    /**
     * Initializes a new {@code StartMutedTogglesSpotlight} instance.
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
                target = { 'start-muted-toggles' } >
                { this.props.t('onboarding.toggles') }
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
        const { dispatch } = this.props;

        dispatch(continueOnboarding());

        // FIXME: find a better way to do this.
        setTimeout(() => {
            dispatch(closeDrawer());
        }, 300);
    }
}

export default withTranslation()(connect()(StartMutedTogglesSpotlight));

